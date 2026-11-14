import { test, after } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Input } from "../src/finders/input.ts";
import { listCrawls, robotsFinder, type RobotsHooks } from "../src/finders/robots.ts";
import { candidateFileBytes, type Journal, type RobotsRecord } from "../src/finders/candidates.ts";
import { FolderJournal } from "../src/finders/journal.ts";
import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const input = () => new Input(bases, { test: true, sleep: async () => {} });
const SNAP = "CC-MAIN-2026-43";
const paths = (names: string[]) => gzipSync(Buffer.from(names.map((n) => `crawl-data/${SNAP}/segments/1.2/robotstxt/${n}`).join("\n") + "\n"));
const find = (i = input(), hooks: RobotsHooks = {}) => robotsFinder(SNAP, i, { test: true }, hooks);
const ascii = (s: string): boolean => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c !== 10 && (c < 32 || c > 126)) return false; } return true; };
const warcRequests = () => origin.requests.filter((p) => p.endsWith(".warc.gz"));
class MemoryJournal implements Journal {
  readonly entries = new Map<number, RobotsRecord>();
  read(n: number, file: string): RobotsRecord | null { const r = this.entries.get(n); return r !== undefined && r.file === file ? structuredClone(r) : null; }
  write(n: number, record: RobotsRecord): void { this.entries.set(n, structuredClone(record)); }
}
const many = (count: number) => {
  const names = Array.from({ length: count }, (_, i) => `f${i}.warc.gz`);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(names));
  for (const n of names) origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/${n}`, warcGz([{ uri: `http://${n.slice(0, -8)}.example/robots.txt`, status: 200, body: `Mad-Source: https://${n.slice(0, -8)}.example/source.json\n` }]));
  return names;
};

test("listCrawls reads collinfo.json and gives the crawl ids newest first, whatever order the list has", async () => {
  origin.put("index/collinfo.json", JSON.stringify([{ id: "CC-MAIN-2026-39" }, { id: "CC-MAIN-2026-43", name: "October 2026 Index" }, { id: "weird" }, { id: "CC-MAIN-2026-34" }]));
  assert.deepEqual(await listCrawls(input()), ["CC-MAIN-2026-43", "CC-MAIN-2026-39", "CC-MAIN-2026-34"]);
  origin.put("index/collinfo.json", "not json");
  await assert.rejects(listCrawls(input()));
  origin.put("index/collinfo.json", JSON.stringify([{ id: "nope" }]));
  await assert.rejects(listCrawls(input()), /crawl/);
});

test("the robots finder reads every file of a crawl and takes the first Mad-Source line of each 200 response that is a source address, with its place", async () => {
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "b.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`, warcGz(SAMPLE_CAPTURES));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/b.warc.gz`, warcGz([{ uri: "http://eta.example/robots.txt", status: 200, body: "Mad-Source: https://eta.example/source.json\n" }]));
  const seen: [number, number][] = [];
  let listed: number | null = null, warcBeforeListing = -1;
  const before = warcRequests().length;
  const r = await find(input(), { progress: (done: number, total: number) => seen.push([done, total]), listing: (files: number) => { listed = files; warcBeforeListing = warcRequests().length - before; } });
  assert.equal(listed, 2); assert.equal(warcBeforeListing, 0, "the size is announced before any archive file is requested");
  assert.equal(r.finder, "robots"); assert.equal(r.snapshot, SNAP);
  assert.deepEqual(seen.map(([, t]) => t), [2, 2]); assert.deepEqual(seen.map(([d]) => d).sort(), [1, 2]);
  assert.deepEqual(r.summary, { files: 2, records: (1 + 2 * SAMPLE_CAPTURES.length) + (1 + 2), responses: SAMPLE_CAPTURES.length + 1, lines: 7, candidates: 6, notAddresses: 1, skipped: 0 });
  const addresses = r.candidates.map((c) => c.address).sort();
  assert.deepEqual(addresses, ["https://beta.example/discovery/source.json", "https://eta.example/source.json", "https://iota.example/source.json", "https://mad.alpha.example/source.json", "https://mad.alpha.example/source.json", "https://theta.example/source.json"]);
  const alpha = r.candidates.filter((c) => c.address === "https://mad.alpha.example/source.json");
  assert.equal(alpha.length, 2, "two captures of one host are two candidates; the build de-duplicates");
  for (const c of alpha) { assert.equal(c.place["file"], `crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`); assert.equal(c.place["robots"], "http://alpha.example/robots.txt"); assert.equal(typeof c.place["offset"], "number"); }
  assert.notEqual(alpha[0]!.place["offset"], alpha[1]!.place["offset"]);
  const bytes = candidateFileBytes(r);
  const text = new TextDecoder().decode(bytes);
  assert.ok(ascii(text), "ASCII");
  const parsed = JSON.parse(text) as { candidates: { address: string }[]; summary: Record<string, number> };
  assert.deepEqual(parsed.candidates.map((c) => c.address), addresses, "sorted by address");
  assert.equal(parsed.summary["candidates"], 6);
  assert.deepEqual(candidateFileBytes({ ...r, candidates: [...r.candidates].reverse() }), bytes, "the order of discovery does not change the file");
});

test("a robots URL that is not printable ASCII is not written into a place: the candidate is skipped and counted", async () => {
  const c1 = String.fromCharCode(0x85);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["odd.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/odd.warc.gz`, warcGz([
    { uri: `http://odd.example/r${c1}obots.txt`, status: 200, body: "Mad-Source: https://odd.example/source.json\n" },
    { uri: "http://plain.example/robots.txt", status: 200, body: "Mad-Source: https://plain.example/source.json\n" },
  ]));
  const r = await find();
  assert.deepEqual(r.candidates.map((c) => c.address), ["https://plain.example/source.json"]);
  assert.equal(r.summary["skipped"], 1);
});

test("a snapshot that is not a crawl name, a bad path listing, or one unreadable file fails the whole snapshot, and the message names no input text", async () => {
  await assert.rejects(robotsFinder("../etc", input(), { test: true }), /snapshot/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from(`crawl-data/OTHER/x.warc.gz\n`)));
  await assert.rejects(find(), (e: unknown) => e instanceof Error && e.message.startsWith("line 1 ") && e.message.includes("not a path") && !e.message.includes("OTHER"));
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from(`crawl-data/${SNAP}/../x.warc.gz\n`)));
  await assert.rejects(find(), /not a path/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "missing.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`, warcGz(SAMPLE_CAPTURES));
  await assert.rejects(find(), (e: unknown) => (e as { reason?: string }).reason === "status");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "bad.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, new Uint8Array([1, 2, 3]));
  await assert.rejects(find(), Error, "not gzip");
  const cut = warcGz(SAMPLE_CAPTURES); origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, cut.subarray(0, cut.length - 30));
  await assert.rejects(find(), Error, "a truncated member");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.alloc(80 * 1024 * 1024)));
  await assert.rejects(find(), (e: unknown) => e instanceof Error && (e as { code?: string }).code === "ERR_BUFFER_TOO_LARGE", "a listing that inflates past 64 MB");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from("\n")));
  await assert.rejects(find(), /names no file/, "an empty listing is not an empty crawl");
});

test("a file whose body breaks off is read again from the start; the snapshot fails only when it keeps breaking", async () => {
  many(20);
  const f3 = warcGz([{ uri: "http://f3.example/robots.txt", status: 200, body: "Mad-Source: https://f3.example/source.json\n" }]);   // as many() serves it
  let cut = 0;
  const breakOff = (times: number): NonNullable<Origin["behave"]> => (req, res) => {
    // Half of the real gzip file, then the connection is dropped: gunzip waits for more and sees the reset, not a format error.
    if (req.url?.endsWith("/f3.warc.gz") && cut < times) { cut++; res.writeHead(200); res.write(Buffer.from(f3.subarray(0, Math.floor(f3.length / 2)))); setTimeout(() => res.destroy(), 10); return true; }
    return false;
  };
  origin.behave = breakOff(1);
  try {
    const before = warcRequests().filter((p) => p.endsWith("/f3.warc.gz")).length;
    const r = await find();
    assert.equal(r.candidates.length, 20);
    assert.equal(warcRequests().filter((p) => p.endsWith("/f3.warc.gz")).length - before, 2, "read twice: broken, then whole");
  } finally { origin.behave = null; }
  cut = 0;
  origin.behave = breakOff(100);
  try {
    await assert.rejects(find(), (e: unknown) => (e as { reason?: string }).reason === "unreachable");
  } finally { origin.behave = null; }
});

test("many files run with at most 16 in flight; a 503 on one of them is retried; a failure stops the others", async () => {
  many(40);
  let open = 0, peak = 0, flaky = 0;
  origin.behave = (req, res) => {
    if (req.url?.endsWith("f7.warc.gz") && flaky++ === 0) { res.statusCode = 503; res.end(); return true; }
    if (req.url?.endsWith(".warc.gz")) { open++; peak = Math.max(peak, open); res.once("finish", () => open--); }
    return false;
  };
  try {
    const r = await find();
    assert.equal(r.candidates.length, 40); assert.equal(r.summary["files"], 40);
    assert.ok(peak <= 16, `peak ${peak}`);
  } finally { origin.behave = null; }
  // One file answers 404 and the others are slow: after the rejection the request count stops growing.
  origin.behave = (req, res) => {
    if (req.url?.endsWith("f2.warc.gz")) { res.statusCode = 404; res.end(); return true; }
    if (req.url?.endsWith(".warc.gz")) { setTimeout(() => { if (!res.writableEnded) res.end(); }, 200); res.writeHead(200); res.flushHeaders(); return true; }
    return false;
  };
  try {
    const before = origin.requests.length;
    await assert.rejects(find(), (e: unknown) => (e as { reason?: string }).reason === "status");
    const afterFailure = origin.requests.length;
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(afterFailure - before <= 17, `the first wave only: ${afterFailure - before}`);
    assert.equal(origin.requests.length, afterFailure, "no file was requested after the failure");
  } finally { origin.behave = null; }
});

test("a run that fails partway leaves its finished files in the journal; the next run reads only the rest and writes the bytes of one clean run", async () => {
  many(30);
  const clean = candidateFileBytes(await find(input(), { journal: new MemoryJournal() }));
  const journal = new MemoryJournal();
  origin.behave = (req, res) => { if (req.url?.endsWith("f20.warc.gz")) { res.statusCode = 404; res.end(); return true; } return false; };
  try { await assert.rejects(find(input(), { journal })); } finally { origin.behave = null; }
  const done = journal.entries.size;
  assert.ok(done >= 1 && done < 30, `finished before the failure: ${done}`);
  const before = warcRequests().length;
  const again = await find(input(), { journal });
  assert.equal(warcRequests().length - before, 30 - done, "only the files without an entry are read");
  assert.deepEqual(candidateFileBytes(again), clean, "the same bytes as one clean run");
});

test("FolderJournal keeps one entry per finished file, written whole; a damaged or foreign entry is read again, never trusted", async () => {
  many(6);
  const folder = join(mkdtempSync(join(tmpdir(), "journal-")), `${SNAP}.progress`);
  const first = new FolderJournal(folder, { test: true });
  const clean = candidateFileBytes(await find(input(), { journal: first }));
  assert.deepEqual(readdirSync(folder).sort(), ["0.json", "1.json", "2.json", "3.json", "4.json", "5.json"], "no .part left behind");
  writeFileSync(join(folder, "1.json"), "{");   // damaged
  writeFileSync(join(folder, "4.json"), JSON.stringify({ file: "crawl-data/elsewhere.warc.gz", candidates: [], counts: { records: 0, responses: 0, lines: 0, candidates: 0, notAddresses: 0, skipped: 0 } }));   // another file's entry
  const two = JSON.parse(readFileSync(join(folder, "2.json"), "utf8")) as { candidates: { address: string }[] };
  two.candidates[0]!.address = "not an address";
  writeFileSync(join(folder, "2.json"), JSON.stringify(two));   // an entry whose address would not pass the rule
  const second = new FolderJournal(folder, { test: true });
  const before = warcRequests();
  const again = await find(input(), { journal: second });
  assert.deepEqual(warcRequests().slice(before.length).map((p) => p.slice(p.lastIndexOf("/") + 1)).sort(), ["f1.warc.gz", "f2.warc.gz", "f4.warc.gz"]);
  assert.equal(second.reused, 3);
  assert.deepEqual(candidateFileBytes(again), clean);
  second.remove();
  assert.equal(existsSync(folder), false);
});
