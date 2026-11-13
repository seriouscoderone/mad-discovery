import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { Robots } from "../src/robots.ts";
import { CATALOG, ROW, CONTAINED, PATH_LIMITS, PUBLICATION, type Limits, type RowLimits } from "../src/limits.ts";
import { buildCatalog, readCandidateFile, toolCommit, type CandidateFile, type Row } from "../src/catalog.ts";
import { SEEDED_NOTE } from "../src/catalogpages.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const robotsOk: NonNullable<Origin["behave"]> = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
const start = async () => { const o = await Origin.start(); o.behave = robotsOk; origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...CATALOG, requestMs: 2000, ...more }, { test: true });
const build = (from: string[], more: Partial<Limits> = {}, row: RowLimits = ROW, candidates: CandidateFile[] = []) => { const s = session(more); return buildCatalog({ from, candidates: candidates.map((file) => ({ file, bytes: new TextEncoder().encode(JSON.stringify(file)) })), session: s, robots: new Robots(s), row, contained: CONTAINED, toolCommit: "0123456789abcdef0123456789abcdef01234567" }); };
const text = (files: Map<string, Uint8Array>, path: string) => new TextDecoder().decode(files.get(path)!);
const json = (files: Map<string, Uint8Array>, path: string) => JSON.parse(text(files, path)) as Record<string, unknown>;
const row = (files: Map<string, Uint8Array>, said: string) => json(files, `said/${said}.json`) as unknown as Row;
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};
/** Every JSON file the build composes is ASCII-only; the copied candidate files are the bytes read, and pages are UTF-8 by design. */
const assertAsciiJson = (files: Map<string, Uint8Array>) => { for (const path of files.keys()) if (path.endsWith(".json") && !path.startsWith("candidates/")) assert.ok(/^[\x20-\x7e\n]*$/.test(text(files, path)), `${path} is ASCII-only`); };
const bySource = <T extends { source: string }>(xs: T[]) => [...xs].sort((p, q) => (p.source < q.source ? -1 : 1));

test("two sources that never link, named with --from, meet in one row; two builds are byte-identical", async () => {
  const [a, b] = [await start(), await start()];
  const aAddr = a.source("mad/", { serve: [SELECTION], by: "EKxyAID", publications: [{ target: SELECTION, name: "from a \u00e9", description: "d", tags: ["t"], collection: "c" }] }, inputs).address;
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const r = await build([bAddr, aAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  const sel = row(r.files, SELECTION);
  assert.deepEqual(sel.serves.map((s) => s.source), [aAddr, bAddr].sort(), "the build's order is sorted at depth 0");
  assert.deepEqual(sel.publications, [{ source: aAddr, by: "EKxyAID", publication: { target: SELECTION, name: "from a \u00e9", description: "d", tags: ["t"], collection: "c" } }], "the source's stated by rides with a publication that has none");
  assert.deepEqual(sel.counts, bySource([{ source: aAddr, publications: 1, referrers: 0 }, { source: bAddr, publications: 0, referrers: 0 }]));
  assert.ok(/^[\x20-\x7e\n]*$/.test(text(r.files, `said/${SELECTION}.json`)), "ASCII-only: the e-acute is escaped");
  const index = json(r.files, "index.json") as { saids: { said: string; sources: number; names: { name: string; source: string }[] }[] };
  assert.equal(index.saids.length, 12, "the selection's closure");
  assert.deepEqual(index.saids.find((x) => x.said === SELECTION), { said: SELECTION, sources: 2, names: [{ name: "from a \u00e9", source: aAddr }] });
  assert.deepEqual(index.saids.map((x) => x.said), [...index.saids.map((x) => x.said)].sort());
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[]; outcome: string; limits: string[]; digest: string | null; definitions: unknown[]; untried: number; omittedContained: number; refers: unknown[] }[] };
  assert.deepEqual(sources.sources.map((s) => s.address), [aAddr, bAddr].sort());
  for (const s of sources.sources) { assert.deepEqual(s.found, [{ by: "from" }]); assert.equal(s.outcome, "ok"); assert.deepEqual(s.limits, []); assert.match(s.digest!, /^[0-9a-f]{64}$/); assert.deepEqual(s.definitions, []); assert.equal(s.untried, 0); assert.equal(s.omittedContained, 0); assert.deepEqual(s.refers, []); }
  const meta = json(r.files, "catalog.json") as Record<string, unknown>;
  assert.deepEqual(meta["from"], [aAddr, bAddr].sort());
  assert.equal(meta["seeded"], true);
  assert.equal(meta["note"], SEEDED_NOTE, "one sentence for the seeded catalog, on the index page and here");
  assertAsciiJson(r.files);
  assert.deepEqual(meta["tool"], { commit: "0123456789abcdef0123456789abcdef01234567" });
  assert.deepEqual(meta["limits"], { ...CATALOG, requestMs: 2000, paths: PATH_LIMITS, publication: PUBLICATION, row: ROW, contained: CONTAINED });
  assert.deepEqual(meta["candidates"], []);
  const all = text(r.files, "catalog.json") + text(r.files, "sources.json");
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(all), "no time anywhere");
  assert.ok(!all.includes("catalog.json\""), "no catalog address");
  const again = await build([bAddr, aAddr]);
  assert.ok(again.ok); if (!again.ok) return;
  for (const [path, bytes] of r.files) assert.deepEqual(again.files.get(path), bytes, path);
  assert.equal(again.files.size, r.files.size);
});

test("a row exists only for verified served bytes; attribution follows the fetched address; contained-only and case-variant SAIDs create nothing", async () => {
  const [honest, hostile] = [await start(), await start()];
  const x = definition([]);
  const y = definition([x.said]);
  // A letter past the two pattern-fixed characters, case-flipped: still matches the pattern. (x.said is deterministic and its eleventh character is a digit, whose case cannot flip.)
  const at = [...x.said].findIndex((ch, i) => i >= 2 && /[A-Za-z]/.test(ch));
  const flipped = x.said[at] === x.said[at]!.toUpperCase() ? x.said[at]!.toLowerCase() : x.said[at]!.toUpperCase();
  const variant = x.said.slice(0, at) + flipped + x.said.slice(at + 1);
  assert.notEqual(variant, x.said);
  const z = definition([variant], ',"n":"z"');
  const ghost = "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";   // SAID-shaped, served by nobody
  const g = definition([ghost], ',"n":"g"');
  const hAddr = `${honest.origin}/s/source.json`;
  honest.put("s/source.json", JSON.stringify({ source: hAddr, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said, refers: [variant] }, { said: g.said, refers: [ghost] }] }));
  for (const d of [x, y, z, g]) honest.put(`s/definitions/${d.said}.json`, d.bytes);
  const kAddr = `${hostile.origin}/s/source.json`;
  // The hostile source claims x and y, serves wrong bytes for x and nothing for y, publishes y and the ghost, and publishes y again under a name that is not well-formed Unicode (Ruling 12): JSON.stringify writes the lone surrogate as the six-character escape, which is what a hostile source puts on the wire.
  const lone = String.fromCharCode(0xd83d);
  hostile.put("s/source.json", JSON.stringify({ source: kAddr, serves: [{ said: x.said }, { said: y.said }], publications: [{ target: y.said, name: "mine", description: "d", tags: [], collection: "c" }, { target: ghost, name: "ghost", description: "d", tags: [], collection: "c" }, { target: y.said, name: "bad " + lone, description: "d", tags: [], collection: "c" }] }));
  hostile.put(`s/definitions/${x.said}.json`, '{"d":"' + x.said + '","r":[1]}');
  const r = await build([hAddr, kAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  assert.deepEqual([...r.files.keys()].filter((p) => p.startsWith("said/")).sort(), [x.said, y.said, z.said, g.said].map((s) => `said/${s}.json`).sort(), "no row for the ghost, none for the variant");
  const rx = row(r.files, x.said);
  assert.deepEqual(rx.serves, [{ source: hAddr }], "the hostile source's wrong bytes do not make it a server");
  assert.deepEqual(rx.referrers.map((e) => [e.source, e.said]), [[hAddr, y.said]], "z contains the variant, not x");
  const ry = row(r.files, y.said);
  assert.deepEqual(ry.serves, [{ source: hAddr }]);
  assert.deepEqual(ry.publications.map((p) => [p.source, p.publication.name]), [[kAddr, "mine"]], "a publication from a source that does not serve, in a row that exists; the ill-formed one was dropped by the reader");
  const everything = [...r.files.keys()].map((p) => text(r.files, p)).join("\n");
  assert.ok(!everything.includes(ghost), "the ghost appears nowhere: no row, no referrer, no index entry, no refers entry");
  assert.ok(!everything.includes("ud83d") && !everything.includes("bad "), "the ill-formed name reaches no file");
  const sources = json(r.files, "sources.json") as { sources: { address: string; dropped: { entries: number; publications: number }; definitions: { said: string; outcome: string }[]; refers: { in: string; said: string }[] }[] };
  const k = sources.sources.find((s) => s.address === kAddr)!;
  assert.deepEqual(k.dropped, { entries: 0, publications: 1 }, "the drop is counted");
  assert.deepEqual(k.definitions.sort((p, q) => (p.said < q.said ? -1 : 1)), [{ said: x.said, outcome: "failed-check" }, { said: y.said, outcome: "not-found" }].sort((p, q) => (p.said < q.said ? -1 : 1)));
  const h = sources.sources.find((s) => s.address === hAddr)!;
  assert.deepEqual(h.refers, [], "z's refers names the variant and z's bytes contain it: contained; g's refers names the ghost and contains it: contained");
});

test("one publication and at most referrersPerSource referrers from one source, counted; a row never exceeds rowBytes and omits only contributors", async () => {
  const a = await start();
  const x = definition([]);
  const refs = Array.from({ length: 5 }, (_, i) => definition([x.said], `,"n":${i}`));
  const pub = (n: number) => ({ target: x.said, name: `name ${n}`, description: "d", tags: [], collection: "c" });
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, ...refs.map((d) => ({ said: d.said, refers: [x.said] }))], publications: Array.from({ length: 3000 }, (_, n) => pub(n)) }));
  for (const d of [x, ...refs]) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await build([address], {}, { referrersPerSource: 3, rowBytes: ROW.rowBytes });
  assert.ok(r.ok); if (!r.ok) return;
  const rx = row(r.files, x.said);
  assert.deepEqual(rx.publications.map((p) => p.publication.name), ["name 0"]);
  assert.deepEqual(rx.referrers.map((e) => e.said), refs.map((d) => d.said).sort().slice(0, 3), "lowest SAID first");
  assert.deepEqual(rx.counts, [{ source: address, publications: 3000, referrers: 5 }]);
  assert.equal(rx.omittedSources, undefined);

  // One leaf of the fixture (it contains no SAID, and served alone nothing contains it) from b and c, so one row exists; d reads but contributes nothing to it.
  // The limit falls on every row, so the SELECTION closure cannot serve here: 11 of its 12 rows exceed 400 bytes with one source (up to 924).
  // Measured with this row shape: the leaf row is 325 bytes with one source, 348 with omittedSources, 512 with two; d's row is 321.
  const LEAF = "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1";
  const [b, c, d] = [await start(), await start(), await start()];
  const bAddr = b.source("mad/", { serve: [LEAF] }, inputs).address;
  const cAddr = c.source("mad/", { serve: [LEAF] }, inputs).address;
  const other = definition([], ',"n":"other"');
  const dAddr = `${d.origin}/s/source.json`;
  d.put("s/source.json", JSON.stringify({ source: dAddr, serves: [{ said: other.said }] }));   // a read source that contributes nothing to the LEAF row
  d.put(`s/definitions/${other.said}.json`, other.bytes);
  const small = await build([bAddr, cAddr, dAddr], {}, { referrersPerSource: 50, rowBytes: 400 });
  assert.ok(small.ok); if (!small.ok) return;
  const leaf = row(small.files, LEAF);
  assert.ok(small.files.get(`said/${LEAF}.json`)!.length <= 400, "within the row limit");
  assert.equal(leaf.omittedSources, 1, "one contributing source removed; the non-contributing one is not counted");
  assert.deepEqual(leaf.serves, [{ source: [bAddr, cAddr].sort()[0] }], "contributors kept in the build's order");
  const index = json(small.files, "index.json") as { saids: { said: string; sources: number }[] };
  assert.equal(index.saids.find((s) => s.said === LEAF)!.sources, 2, "the index counts what was verified, before the cut");
  const tiny = await build([bAddr], {}, { referrersPerSource: 50, rowBytes: 100 });
  assert.ok(!tiny.ok && tiny.problem.includes(LEAF) && tiny.problem.includes(bAddr), "one contributor alone over the limit fails the build");
});

test("candidate files: read, copied into the output, de-duplicated with --from, sorted; bad addresses dropped and counted; too many stops the build", async () => {
  const [a, b] = [await start(), await start()];
  const aAddr = a.source("mad/", { serve: [SELECTION] }, inputs).address;
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const file: CandidateFile = { finder: "robots", snapshot: "CC-MAIN-2026-43", candidates: [{ address: bAddr, place: { file: "x.warc.gz", offset: 12 } }, { address: aAddr, place: { file: "y.warc.gz", offset: 7 } }, { address: "https://1.2.3.4/source.json", place: {} }, { address: "not an address", place: {} }] };
  assert.deepEqual(readCandidateFile(JSON.stringify(file)), file);
  assert.equal(readCandidateFile("{}"), null);
  assert.equal(readCandidateFile(JSON.stringify({ finder: "robots", snapshot: "x", candidates: [{ address: 5 }] })), null);
  assert.equal(readCandidateFile(JSON.stringify({ finder: "../etc", snapshot: "x", candidates: [] })), null, "finder and snapshot become a path");
  assert.equal(readCandidateFile(JSON.stringify({ finder: "..", snapshot: "index", candidates: [] })), null, "a dot-led name is refused: candidates/../index.json would replace the index");
  // The text form, so that __proto__ is an own key of the parsed object (in an object literal it would set the prototype instead); the lone surrogate is written as its six-character escape.
  assert.deepEqual(readCandidateFile(`{"finder":"github","snapshot":"2026-11-10","candidates":[{"address":${JSON.stringify(aAddr)},"place":{"repository":"a/b","__proto__":"x","bad key":1,"nested":{},"lone":"\\ud83d"}}]}`)!.candidates[0]!.place, { repository: "a/b" }, "__proto__, keys outside the pattern, objects and ill-formed strings are dropped");
  const r = await build([aAddr], {}, ROW, [file]);
  assert.ok(r.ok); if (!r.ok) return;
  const meta = json(r.files, "catalog.json") as Record<string, unknown>;
  assert.equal(meta["seeded"], false); assert.equal(meta["note"], undefined);
  assert.deepEqual(meta["candidates"], [{ finder: "robots", snapshot: "CC-MAIN-2026-43", count: 4, path: "candidates/robots/CC-MAIN-2026-43.json" }]);
  assert.equal(meta["droppedCandidates"], 2);
  assertAsciiJson(r.files);
  assert.equal(text(r.files, "candidates/robots/CC-MAIN-2026-43.json"), JSON.stringify(file), "copied byte for byte");
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[] }[] };
  assert.deepEqual(sources.sources.map((s) => s.address), [aAddr, bAddr].sort());
  assert.deepEqual(sources.sources.find((s) => s.address === aAddr)!.found, [{ by: "from" }, { by: "finder", finder: "robots", snapshot: "CC-MAIN-2026-43", place: { file: "y.warc.gz", offset: 7 } }]);
  const asked = a.requests.length + b.requests.length;
  assert.deepEqual(await build([aAddr], {}, ROW, [file, { ...file, finder: "Robots" }]), { ok: false, problem: "two candidate files would both be written as candidates/Robots/CC-MAIN-2026-43.json" }, "one path per file, on a case-insensitive file system too");
  assert.equal(a.requests.length + b.requests.length, asked, "the colliding build fetched nothing");
  const twice = await build([aAddr, aAddr], {}, ROW, [{ ...file, candidates: [file.candidates[1]!, file.candidates[1]!] }]);
  assert.ok(twice.ok); if (!twice.ok) return;
  assert.deepEqual((json(twice.files, "sources.json") as { sources: { address: string; found: unknown[] }[] }).sources.find((s) => s.address === aAddr)!.found, [{ by: "from" }, { by: "finder", finder: "robots", snapshot: "CC-MAIN-2026-43", place: { file: "y.warc.gz", offset: 7 } }], "the same way twice is recorded once");
  assert.deepEqual((json(twice.files, "catalog.json") as { from: string[] }).from, [aAddr]);
  const reordered = readCandidateFile(JSON.stringify({ finder: "robots", snapshot: "s2", candidates: [{ address: aAddr, place: { file: "y.warc.gz", offset: 7 } }, { address: aAddr, place: { offset: 7, file: "y.warc.gz" } }] }))!;
  const once = await build([], {}, ROW, [reordered]);
  assert.ok(once.ok); if (!once.ok) return;
  assert.equal(JSON.stringify((json(once.files, "sources.json") as { sources: { address: string; found: unknown[] }[] }).sources.find((s) => s.address === aAddr)!.found), JSON.stringify([{ by: "finder", finder: "robots", snapshot: "s2", place: { file: "y.warc.gz", offset: 7 } }]), "one place with its keys in two orders is recorded once, keys sorted");
  const fetches = () => a.requests.filter((p) => p === "mad/source.json").length;
  const before = fetches();   // r and twice each fetched a's document once
  const tooMany = await build([aAddr, bAddr], { sourcesPerRun: 1 });
  assert.deepEqual(tooMany, { ok: false, problem: "2 candidates, more than the limit of 1 sources per run" });
  assert.equal(fetches(), before, "the refused build fetched nothing");
});

test("every introducing address is recorded; a build where nothing was read writes nothing", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const cAddr = c.source("mad/", { serve: [SELECTION] }, inputs).address;
  const bAddr = b.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr }] }, inputs).address;
  const aAddr = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }, { source: cAddr }] }, inputs).address;
  const r = await build([aAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[] }[] };
  assert.deepEqual(sources.sources.find((s) => s.address === bAddr)!.found, [{ by: "introduction", from: aAddr }]);
  assert.deepEqual(sources.sources.find((s) => s.address === cAddr)!.found, [{ by: "introduction", from: aAddr }, { by: "introduction", from: bAddr }].sort((p, q) => (p.from < q.from ? -1 : 1)), "both introducers, although c was taken once");
  assert.deepEqual(row(r.files, SELECTION).serves.map((s) => s.source), [aAddr, ...[bAddr, cAddr].sort()], "depth 0, then depth 1 in address order");
  const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
  assert.deepEqual(await build([deadAddr]), { ok: false, problem: "no source could be read" });
});

test("the tool's commit comes from the checkout, or is null", () => {
  const dir = mkdtempSync(join(tmpdir(), "git-"));
  mkdirSync(join(dir, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(dir, ".git", "refs", "heads", "main"), "abcdefabcdefabcdefabcdefabcdefabcdefabcd\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "abcdefabcdefabcdefabcdefabcdefabcdefabcd");
  writeFileSync(join(dir, ".git", "HEAD"), "0123456789012345678901234567890123456789\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "0123456789012345678901234567890123456789");
  writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/other\n");
  writeFileSync(join(dir, ".git", "packed-refs"), "# pack-refs\nfedcbafedcbafedcbafedcbafedcbafedcbafedc refs/heads/other\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "fedcbafedcbafedcbafedcbafedcbafedcbafedc");
  const tree = mkdtempSync(join(tmpdir(), "worktree-"));
  writeFileSync(join(tree, ".git"), `gitdir: ${join(dir, ".git")}\n`);
  assert.equal(toolCommit(pathToFileURL(tree + "/")), "fedcbafedcbafedcbafedcbafedcbafedcbafedc", "a .git file naming the repository's folder is followed");
  // A real worktree: its own folder holds HEAD, and commondir names the folder that holds the refs.
  mkdirSync(join(dir, ".git", "worktrees", "w"), { recursive: true });
  writeFileSync(join(dir, ".git", "worktrees", "w", "HEAD"), "ref: refs/heads/other\n");
  writeFileSync(join(dir, ".git", "worktrees", "w", "commondir"), "../..\n");
  const tree2 = mkdtempSync(join(tmpdir(), "worktree2-"));
  writeFileSync(join(tree2, ".git"), `gitdir: ${join(dir, ".git", "worktrees", "w")}\n`);
  assert.equal(toolCommit(pathToFileURL(tree2 + "/")), "fedcbafedcbafedcbafedcbafedcbafedcbafedc", "a worktree's refs are read from its commondir");
  // A repository folder whose name holds a # (or % or ?): gitdir and commondir are file paths, not URL references.
  const hashed = mkdtempSync(join(tmpdir(), "git#-"));
  mkdirSync(join(hashed, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(hashed, ".git", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(hashed, ".git", "refs", "heads", "main"), "1111111111111111111111111111111111111111\n");
  mkdirSync(join(hashed, ".git", "worktrees", "w"), { recursive: true });
  writeFileSync(join(hashed, ".git", "worktrees", "w", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(hashed, ".git", "worktrees", "w", "commondir"), join(hashed, ".git") + "\n");
  const tree3 = mkdtempSync(join(tmpdir(), "worktree3-"));
  writeFileSync(join(tree3, ".git"), `gitdir: ${join(hashed, ".git")}\n`);
  assert.equal(toolCommit(pathToFileURL(tree3 + "/")), "1111111111111111111111111111111111111111", "a gitdir path holding #");
  writeFileSync(join(tree3, ".git"), `gitdir: ${join(hashed, ".git", "worktrees", "w")}\n`);
  assert.equal(toolCommit(pathToFileURL(tree3 + "/")), "1111111111111111111111111111111111111111", "an absolute commondir holding #");
  assert.equal(toolCommit(pathToFileURL(mkdtempSync(join(tmpdir(), "nogit-")) + "/")), null);
  assert.match(toolCommit(new URL("../", import.meta.url))!, /^[0-9a-f]{40}$/, "this checkout");
});
