import { gzipSync } from "node:zlib";

export type Capture = { uri: string; status: number; body: string; date?: string };

const CRLF = "\r\n";
const reason = (status: number): string => ({ 200: "OK", 301: "Moved Permanently", 302: "Found", 403: "Forbidden", 404: "Not Found", 429: "Too Many Requests", 503: "Service Unavailable" } as Record<number, string>)[status] ?? "Unknown";

function record(headers: [string, string][], payload: Uint8Array): Uint8Array {
  const head = ["WARC/1.0", ...headers.map(([k, v]) => `${k}: ${v}`), `Content-Length: ${payload.length}`, "", ""].join(CRLF);
  return Buffer.concat([Buffer.from(head, "latin1"), payload, Buffer.from(CRLF + CRLF, "latin1")]);
}

/**
 * A robots.txt WARC file in the shape of Common Crawl's archive (measured 2026-11-12): a warcinfo record, then for each capture a
 * request record and a response record whose payload is the HTTP response; every record its own gzip member; CRLF line ends.
 */
export function warcGz(captures: Capture[]): Uint8Array {
  const members: Uint8Array[] = [];
  const info = Buffer.from(["isPartOf: FIXTURE", "publisher: mad-discovery tests", "format: WARC File Format 1.1", ""].join(CRLF), "latin1");
  members.push(gzipSync(record([["WARC-Type", "warcinfo"], ["WARC-Date", "2026-01-01T00:00:00Z"], ["WARC-Record-ID", "<urn:uuid:00000000-0000-0000-0000-000000000000>"], ["Content-Type", "application/warc-fields"], ["WARC-Filename", "sample.warc.gz"]], info)));
  captures.forEach((c, i) => {
    const date = c.date ?? "2026-01-01T00:00:00Z";
    const host = new URL(c.uri).host;
    const request = Buffer.from([`GET ${new URL(c.uri).pathname} HTTP/1.1`, "User-Agent: CCBot/2.0 (https://commoncrawl.org/faq/)", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", `Host: ${host}`, "Connection: Keep-Alive", "", ""].join(CRLF), "latin1");
    members.push(gzipSync(record([["WARC-Type", "request"], ["WARC-Date", date], ["WARC-Record-ID", `<urn:uuid:${String(i).padStart(8, "0")}-0000-0000-0000-000000000001>`], ["Content-Type", "application/http; msgtype=request"], ["WARC-Target-URI", c.uri]], request)));
    const body = Buffer.from(c.body, "utf8");
    const response = Buffer.concat([Buffer.from([`HTTP/1.1 ${c.status} ${reason(c.status)}`, `content-length: ${body.length}`, "content-type: text/plain", "", ""].join(CRLF), "latin1"), body]);
    members.push(gzipSync(record([["WARC-Type", "response"], ["WARC-Date", date], ["WARC-Record-ID", `<urn:uuid:${String(i).padStart(8, "0")}-0000-0000-0000-000000000002>`], ["Content-Type", "application/http; msgtype=response"], ["WARC-Target-URI", c.uri], ["WARC-Identified-Payload-Type", "text/plain"]], response)));
  });
  return new Uint8Array(Buffer.concat(members));
}

/** The committed fixture's captures: sources named in several spellings, 200 and non-200 answers, two captures of one host, and lines that name nothing. */
export const SAMPLE_CAPTURES: Capture[] = [
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n" },
  { uri: "http://beta.example/robots.txt", status: 200, body: "# a comment\nUser-agent: *\nDisallow: /private/\nmad-source:   https://beta.example/discovery/source.json   \nMad-Source: https://beta.example/second/source.json\n" },
  { uri: "http://gamma.example/robots.txt", status: 404, body: "Mad-Source: https://gamma.example/source.json\n" },
  { uri: "http://delta.example/robots.txt", status: 301, body: "" },
  { uri: "http://epsilon.example/robots.txt", status: 200, body: "User-agent: *\nDisallow:\n" },
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n", date: "2026-01-02T00:00:00Z" },
  { uri: "http://zeta.example/robots.txt", status: 200, body: "Mad-Source\nMad-Source: \nMad-Source: https://zeta.example/source.json\n" },
  { uri: "http://theta.example/robots.txt", status: 200, body: "Mad-Source: https://theta.example/source.json # the primary\n" },
  { uri: "http://iota.example/robots.txt", status: 200, body: "   mad-source: https://iota.example/source.json\r\n" },
  { uri: "http://kappa.example/robots.txt", status: 200, body: "Mad-Source: not an address\n" },
];
