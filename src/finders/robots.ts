import { createGunzip, gunzipSync } from "node:zlib";
import { Input, InputError } from "./input.ts";
import { warcRecords, robotsLine } from "./warc.ts";
import { parseSourceAddress } from "../address.ts";
import { printableAscii, type FinderCandidate, type FinderResult, type Journal, type RobotsCounts, type RobotsRecord } from "./candidates.ts";

export const CRAWL = /^CC-MAIN-\d{4}-\d{2}$/;
const MAX_PATHS = 16 * 1024 * 1024;           // the compressed path listing; 100,000 lines are about 3 MB
const MAX_PATHS_INFLATED = 64 * 1024 * 1024;  // and about 10 MB inflated
const MAX_INFO = 1024 * 1024;
const MAX_URI = 512;
const PATH_CHARS = /^[A-Za-z0-9._\/-]+$/;     // a fixed pattern, anchored, over one listing line: linear
const IN_FLIGHT = 16;
const FILE_RETRIES = 8;                       // a file whose body broke off is read again from the start

export type RobotsHooks = {
  progress?: (done: number, total: number) => void;   // after each file
  listing?: (files: number) => void;                  // once, before any archive file is requested
  journal?: Journal;                                  // finished files, so a failed or killed run resumes
};

/** The crawls Common Crawl lists, by their own names, newest first (the name sorts by date). */
export async function listCrawls(input: Input): Promise<string[]> {
  const bytes = await input.readAll(`${input.bases.index}collinfo.json`, MAX_INFO, { accept: "application/json" });
  let value: unknown;
  try { value = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { throw new Error("collinfo.json is not JSON"); }   // Node's message quotes the input
  if (!Array.isArray(value)) throw new Error("collinfo.json is not a list");
  const ids = value.map((v) => (typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : "")).filter((id) => CRAWL.test(id));
  if (ids.length === 0) throw new Error("collinfo.json names no crawl");
  return ids.sort().reverse();
}

/** A file's body broke off or stalled after a 200 answer: the one failure worth reading the whole file again for. */
class BodyError extends InputError {
  constructor(url: string) { super(url, "unreachable"); }
}

/** One archive file, streamed through gunzip and the record parser. */
async function readFile(input: Input, file: string, test: boolean): Promise<RobotsRecord> {
  const url = `${input.bases.archive}${file}`;
  const { stream } = await input.open(url);   // a failure here has had the input's own retries
  const gunzip = createGunzip();
  stream.on("error", () => gunzip.destroy(new BodyError(url)));
  const candidates: FinderCandidate[] = [];
  const counts: RobotsCounts = { records: 0, responses: 0, lines: 0, candidates: 0, notAddresses: 0, skipped: 0 };
  try {
    for await (const record of warcRecords(stream.pipe(gunzip))) {
      counts.records++;
      if (record.type !== "response") continue;
      counts.responses++;
      const value = robotsLine(record.payload);
      if (value === null) continue;
      counts.lines++;
      const parsed = parseSourceAddress(value, { test });
      if (parsed === null) { counts.notAddresses++; continue; }
      if (record.uri === null || record.uri.length > MAX_URI || !printableAscii(record.uri)) { counts.skipped++; continue; }
      candidates.push({ address: parsed.address, place: { file, offset: record.offset, robots: record.uri } });
      counts.candidates++;
    }
  } finally {
    stream.destroy();   // whether the parser ran to the end or threw, the socket is released now
    gunzip.destroy();
  }
  return { file, candidates, counts };
}

/**
 * One archive file, read again from the start when its body broke off or stalled; a bad file (gunzip, WARC), a refusal, or a request
 * the input has already retried fails at once, and so does a file another file's failure has stopped, before and after its pause.
 */
async function readFileRetried(input: Input, file: string, test: boolean, stop: () => boolean): Promise<RobotsRecord> {
  for (let attempt = 0; ; attempt++) {
    try { return await readFile(input, file, test); } catch (e) {
      if (!(e instanceof BodyError) || attempt >= FILE_RETRIES || stop()) throw e;
      await input.sleep(Math.min(1000 * 2 ** attempt, 60_000));
      if (stop()) throw e;
    }
  }
}

/** The listing's distinct paths in order, each checked; a bad line is named by its line number (blank lines counted) and length only. */
function listedFiles(listing: string, snapshot: string): string[] {
  const prefix = `crawl-data/${snapshot}/`;
  const files: string[] = [];
  const seen = new Set<string>();
  for (let from = 0, line = 1; from < listing.length; line++) {
    let end = listing.indexOf("\n", from);
    if (end < 0) end = listing.length;
    const f = listing.slice(from, end).trim();
    from = end + 1;
    if (f === "") continue;
    if (!f.startsWith(prefix) || !f.endsWith(".warc.gz") || f.includes("..") || !PATH_CHARS.test(f)) throw new Error(`line ${line} of the path listing is not a path of this crawl (${f.length} characters)`);
    if (seen.has(f)) continue;   // a path named twice is read once: positions count distinct paths
    seen.add(f);
    files.push(f);
  }
  return files;
}

/**
 * The robots finder (docs/design.md "Finding sources nobody linked"): every robots.txt WARC file of one crawl, streamed through gunzip
 * and the record parser; from each response with status 200, the first Mad-Source line that is a source address, with the file, the
 * record's offset and the robots.txt address as its place. All of the crawl or nothing: one unreadable file fails the snapshot and
 * stops the others; with a journal, what was finished is kept, and the next run reads only the rest.
 */
export async function robotsFinder(snapshot: string, input: Input, opts: { test?: boolean } = {}, hooks: RobotsHooks = {}): Promise<FinderResult> {
  if (!CRAWL.test(snapshot)) throw new Error(`not a crawl snapshot name: ${snapshot}`);
  const compressed = await input.readAll(`${input.bases.archive}crawl-data/${snapshot}/robotstxt.paths.gz`, MAX_PATHS);
  const listing = gunzipSync(Buffer.from(compressed), { maxOutputLength: MAX_PATHS_INFLATED }).toString("latin1");
  const files = listedFiles(listing, snapshot);
  if (files.length === 0) throw new Error("the path listing names no file");
  hooks.listing?.(files.length);
  const candidates: FinderCandidate[] = [];
  const summary = { files: 0, records: 0, responses: 0, lines: 0, candidates: 0, notAddresses: 0, skipped: 0 };
  const add = (record: RobotsRecord): void => {
    candidates.push(...record.candidates);
    for (const k of Object.keys(record.counts) as (keyof RobotsCounts)[]) summary[k] += record.counts[k];
    summary.files++;
    hooks.progress?.(summary.files, files.length);
  };
  let failed: unknown = null;
  let next = 0;
  const worker = async (): Promise<void> => {
    while (failed === null && next < files.length) {
      const n = next++;
      const file = files[n]!;
      try {
        const kept = hooks.journal?.read(n, file) ?? null;
        if (kept !== null) { add(kept); continue; }
        const record = await readFileRetried(input, file, opts.test === true, () => failed !== null);
        if (failed !== null) return;   // another file failed meanwhile: nothing more is recorded
        hooks.journal?.write(n, record);
        add(record);
      } catch (e) { if (failed === null) failed = e; }
    }
  };
  await Promise.allSettled(Array.from({ length: Math.min(IN_FLIGHT, files.length) }, worker));
  if (failed !== null) throw failed;
  return { finder: "robots", snapshot, candidates, summary };
}
