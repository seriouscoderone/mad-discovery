import type { Readable } from "node:stream";

export type WarcRecord = { offset: number; type: string; uri: string | null; payload: Uint8Array };

export class WarcError extends Error {}

const MAX_HEADER = 8 * 1024;               // a record's header block
const MAX_PAYLOAD = 16 * 1024 * 1024;      // a record's payload; a robots.txt capture is kilobytes
export const MAX_FILE = 256 * 1024 * 1024; // one archive file decompressed; measured files inflate to about 2.7 MB
const CRLFCRLF = Buffer.from("\r\n\r\n", "latin1");

/**
 * The records of a WARC file (WARC/1.0 and 1.1 as Common Crawl writes them): a header block of CRLF lines ending in an empty line,
 * Content-Length bytes of payload, then two CRLFs; a record starts with its WARC/ line, after any blank lines. Yields each record with
 * the decompressed byte offset of that line. A stranger's file: every length is bounded, chunks are joined once per record, nothing is
 * interpreted beyond the headers the finder needs, and the stream is destroyed when the generator ends, throws or is returned early.
 */
export async function* warcRecords(stream: Readable, maxFile: number = MAX_FILE): AsyncGenerator<WarcRecord> {
  let buf = Buffer.alloc(0);      // bytes not yet consumed, as one buffer
  let pending: Buffer[] = [];     // chunks received since, joined only when needed
  let pendingBytes = 0;
  let consumed = 0;               // decompressed bytes before buf[0]
  let total = 0;                  // decompressed bytes read so far
  let ended = false;
  const iterator = stream[Symbol.asyncIterator]();
  const more = async (): Promise<boolean> => {
    if (ended) return false;
    const n = await iterator.next();
    if (n.done) { ended = true; return false; }
    const chunk = n.value as Buffer;
    total += chunk.length;
    if (total > maxFile) throw new WarcError(`more than ${maxFile} decompressed bytes`);
    pending.push(chunk);
    pendingBytes += chunk.length;
    return true;
  };
  const join = (): void => { if (pending.length > 0) { buf = Buffer.concat([buf, ...pending]); pending = []; pendingBytes = 0; } };
  try {
    for (;;) {
      join();
      for (;;) {   // blank lines between records: CR and LF bytes before a record's first line
        let lead = 0;
        while (lead < buf.length && (buf[lead] === 0x0d || buf[lead] === 0x0a)) lead++;
        buf = buf.subarray(lead);
        consumed += lead;
        if (buf.length > 0 || !(await more())) break;
        join();
      }
      if (buf.length === 0) return;   // end of file
      let headEnd = buf.indexOf(CRLFCRLF);
      while (headEnd < 0 && buf.length <= MAX_HEADER + 4 && (await more())) { join(); headEnd = buf.indexOf(CRLFCRLF); }
      if (headEnd < 0) throw new WarcError(`a header block without an end, or over ${MAX_HEADER} bytes, at ${consumed}`);
      if (headEnd > MAX_HEADER) throw new WarcError(`a header block over ${MAX_HEADER} bytes at ${consumed}`);
      const offset = consumed;
      const headText = buf.subarray(0, headEnd).toString("latin1");
      if (!headText.startsWith("WARC/")) throw new WarcError(`not a WARC record at ${offset}`);
      const headers = new Map<string, string>();
      for (const line of headText.split("\r\n").slice(1)) {
        const colon = line.indexOf(":");
        if (colon > 0) headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
      }
      const length = decimal(headers.get("content-length"));
      if (length === null || length > MAX_PAYLOAD) throw new WarcError(`a payload length missing, malformed or out of bounds at ${offset}`);
      const need = headEnd + 4 + length + 4;
      while (buf.length + pendingBytes < need) if (!(await more())) throw new WarcError(`a record cut short at ${offset}`);
      join();
      const payload = new Uint8Array(buf.subarray(headEnd + 4, headEnd + 4 + length));
      if (!buf.subarray(headEnd + 4 + length, need).equals(CRLFCRLF)) throw new WarcError(`a record without its trailing CRLFs at ${offset}`);
      yield { offset, type: headers.get("warc-type") ?? "", uri: headers.get("warc-target-uri") ?? null, payload };
      buf = buf.subarray(need);
      consumed += need;
    }
  } finally {
    stream.destroy();   // on a throw, at the end, and when the consumer stops early: the source is released
  }
}

/** A header value of 1 to 9 ASCII digits and nothing else, as a number; null otherwise (no sign, no hex, no fraction, not empty). */
function decimal(value: string | undefined): number | null {
  if (value === undefined || value.length < 1 || value.length > 9) return null;
  for (let i = 0; i < value.length; i++) { const c = value.charCodeAt(i); if (c < 0x30 || c > 0x39) return null; }
  return Number(value);
}

const MAX_VALUE = 512;              // the address rule's bound; the finder applies the rule itself
const BODY_LIMIT = 512 * 1024;      // RFC 9309 asks a crawler to read at least 500 KiB; a line beyond that is one nobody honours
const HTTP_HEAD_LIMIT = 64 * 1024;  // where the HTTP header block must have ended

/** The HTTP status line is exactly a 200: "HTTP/1.1 200" or "HTTP/1.0 200", alone or followed by a space and a reason. */
function isOk(status: string): boolean {
  return (status.startsWith("HTTP/1.1 200") || status.startsWith("HTTP/1.0 200")) && (status.length === 12 || status[12] === " ");
}

/**
 * The first Mad-Source value of a status-200 HTTP response payload, or null (docs/design.md "The robots.txt line": the field name
 * matched without regard to case, text after a # ignored). One line at a time over at most 512 KiB of body, no pattern over the text;
 * a line the 512 KiB cut runs through is not read. The first Mad-Source line decides: an empty or over-long value names nothing.
 */
export function robotsLine(payload: Uint8Array): string | null {
  const head = Buffer.from(payload.subarray(0, Math.min(payload.length, HTTP_HEAD_LIMIT))).toString("latin1");
  const headEnd = head.indexOf("\r\n\r\n");
  if (headEnd < 0) return null;
  const status = head.slice(0, headEnd).split("\r\n")[0] ?? "";
  if (!isOk(status)) return null;
  const bodyStart = headEnd + 4;
  const cut = payload.length > bodyStart + BODY_LIMIT;
  const body = Buffer.from(payload.subarray(bodyStart, Math.min(payload.length, bodyStart + BODY_LIMIT))).toString("utf8");
  let from = 0;
  while (from < body.length) {
    let end = from;
    while (end < body.length && body[end] !== "\n" && body[end] !== "\r") end++;   // RFC 9309: a line ends in LF, CR or CRLF
    if (end === body.length && cut) return null;   // the line runs past the scan limit: its value is not all here
    const line = body.slice(from, end).trim();   // leading and trailing whitespace around a line
    from = end + 1;
    const colon = line.indexOf(":");
    if (colon < 0 || line.slice(0, colon).trim().toLowerCase() !== "mad-source") continue;   // RFC 9309: whitespace may precede the colon
    let value = line.slice(colon + 1);
    const hash = value.indexOf("#");             // an address holds no #: text after it is a comment
    if (hash >= 0) value = value.slice(0, hash);
    value = value.trim();
    return value.length >= 1 && value.length <= MAX_VALUE ? value : null;
  }
  return null;
}
