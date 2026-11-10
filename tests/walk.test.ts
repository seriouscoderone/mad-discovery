import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { paths } from "../src/scan.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { walk } from "../src/walk.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";   // class-brick
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const quick = (more: Partial<Limits> = {}): Limits => ({ ...WALK, requestMs: 2000, runMs: 10_000, ...more });
const session = (more: Partial<Limits> = {}) => new Session(quick(more), { test: true });
const publication = (target: string, name: string) => ({ target, name, description: `about ${name}`, tags: ["t"], collection: "c" });
/** A definition that verifies, holding the SAIDs given; made here because the digest module is proven against outside vectors already. */
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};

test("one source: serves, publications and referrers of a leaf definition, nothing else asked for", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION], by: "EKxyAID", oobi: "https://gym.example/oobi/EKxyAID", publications: [publication(SELECTION, "class-brick")], catalogs: ["https://c.example/catalog.json"] }, inputs);
  const leaf = plan.document.serves.find((s) => s.refers.length === 0)!.said;
  const containing = plan.document.serves.filter((s) => s.refers.includes(leaf)).map((s) => s.said);
  assert.ok(containing.length > 0, "the fixture has a definition that contains the leaf");
  // The build's document, with a publication of the leaf added by hand, so publications of the looked-up SAID are exercised.
  const doc = JSON.parse(new TextDecoder().decode(a.files.get("mad/source.json")!)) as { publications: unknown[] };
  doc.publications.push(publication(leaf, "the leaf"));
  a.put("mad/source.json", JSON.stringify(doc));

  const r = await walk(leaf, address, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.sources, [{ address, via: [], by: "EKxyAID", oobi: "https://gym.example/oobi/EKxyAID" }], "the source read, with what its operator states");
  assert.deepEqual(r.report.serves, [{ source: address, via: [] }]);
  assert.deepEqual(r.report.publications.map((p) => p.publication.name), ["the leaf"]);
  assert.deepEqual(r.report.referrers.map((x) => x.said), containing);
  for (const x of r.report.referrers) {
    const expected = paths(inputs.get(x.said)!, leaf);
    assert.deepEqual(x.paths, expected.paths);
    assert.equal(x.appearances, expected.count);
    assert.deepEqual(x.via, []);
  }
  assert.deepEqual(r.report.unresolved, []);
  assert.deepEqual(r.report.dropped, []);
  assert.deepEqual(r.report.catalogs, ["https://c.example/catalog.json"]);
  assert.equal(r.report.reached, 1);
  assert.equal(r.report.said, leaf);
  assert.equal(r.report.from, address);
  const asked = a.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.deepEqual(asked.sort(), [leaf, ...containing].sort(), "only the leaf and what the document says contains it were requested");
});

test("one source: each failure is a named entry and nothing else", async () => {
  const a = await start();
  // The helper derives a SAID from its inputs, so each document here carries a filler that keeps its SAID apart from the others'.
  const x = definition([]);
  const y = definition([x.said]);
  const z = definition([], ',"n":"z"');           // claims to contain x in refers, does not
  const w = definition([x.said], ',"n":"w"');     // served with wrong bytes
  const t = definition([x.said], ',"n":"t"');     // served as text/plain
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said, refers: [x.said] }, { said: w.said, refers: [x.said] }, { said: t.said, refers: [x.said] }], catalogs: [] }));
  a.put(`s/definitions/${x.said}.json`, x.bytes);
  a.put(`s/definitions/${y.said}.json`, y.bytes);
  a.put(`s/definitions/${z.said}.json`, z.bytes);
  a.put(`s/definitions/${w.said}.json`, '{"d":"' + w.said + '","r":["tampered"]}');
  a.put(`s/definitions/${t.said}.json`, t.bytes);
  a.behave = (req, res) => { if (req.url === `/s/definitions/${t.said}.json`) { res.setHeader("content-type", "text/plain"); res.end(Buffer.from(t.bytes)); return true; } return false; };
  const r = await walk(x.said, address, session());
  a.behave = null;
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: address, via: [] }]);
  assert.deepEqual(r.report.referrers.map((e) => e.said), [y.said]);
  assert.ok(r.report.unresolved.some((u) => u.reason === "not-contained" && u.said === z.said));
  assert.ok(r.report.unresolved.some((u) => u.reason === "failed-check" && u.said === w.said));
  assert.ok(r.report.unresolved.some((u) => u.reason === "invalid" && u.said === t.said), "a wrong content type on a definition");
  assert.equal(r.report.unresolved.length, 3);

  // the served definition itself fails the check: no serves entry, one failed-check
  a.put(`s/definitions/${x.said}.json`, '{"d":"' + x.said + '","r":[1]}');
  const r2 = await walk(x.said, address, session());
  assert.ok(r2.ok && r2.report.serves.length === 0 && r2.report.unresolved.some((u) => u.reason === "failed-check" && u.said === x.said));

  // 404 and a redirect on definitions
  a.files.delete(`s/definitions/${x.said}.json`);
  a.behave = (req, res) => { if (req.url === `/s/definitions/${y.said}.json`) { res.statusCode = 302; res.setHeader("location", "https://elsewhere.test/y.json"); res.end(); return true; } return false; };
  const r3 = await walk(x.said, address, session());
  a.behave = null;
  assert.ok(r3.ok);
  if (r3.ok) {
    assert.ok(r3.report.unresolved.some((u) => u.reason === "not-found" && u.said === x.said));
    assert.ok(r3.report.unresolved.some((u) => u.reason === "redirected" && u.said === y.said && u.target === "https://elsewhere.test/y.json"));
  }
});

test("a copy of another source's files is invalid", async () => {
  const a = await start();
  const b = await start();
  a.source("mad/", { serve: [SELECTION] }, inputs);
  for (const [p, bytes] of a.files) b.files.set(p, bytes);        // b serves a byte-for-byte copy of a
  const copied = `${b.origin}/mad/source.json`;
  const r = await walk(SELECTION, copied, session());
  assert.deepEqual(r, { ok: false, reason: "invalid" });
  assert.ok(!b.requests.some((p) => p.startsWith("mad/definitions/")), "nothing was read from the copy");
});

test("hostile definitions: deep, many appearances, and a long key; each verified and bounded in the report", async () => {
  const a = await start();
  const x = definition([]);
  const deep = definition([x.said], `,"x":${"[".repeat(100_000)}${"]".repeat(100_000)}`);
  const many = definition(new Array<string>(10_000).fill(x.said));
  const wide = definition([], `,"${"k".repeat(500_000)}":${JSON.stringify(new Array<string>(10_000).fill(x.said))}`);   // the design's vector: near 1 MB, every pointer over 256 characters
  assert.ok(many.bytes.length > 400_000 && many.bytes.length < 1_000_000);
  assert.ok(wide.bytes.length > 900_000 && wide.bytes.length < 1_000_000);
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: deep.said, refers: [x.said] }, { said: many.said, refers: [x.said] }, { said: wide.said, refers: [x.said] }] }));
  for (const d of [x, deep, many, wide]) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await walk(x.said, address, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, []);
  const byId = new Map(r.report.referrers.map((e) => [e.said, e]));
  assert.deepEqual(byId.get(deep.said), { source: address, via: [], said: deep.said, paths: [], appearances: 1 }, "too deep to parse: verified, counted, no paths");
  const m = byId.get(many.said)!;
  assert.equal(m.appearances, 10_000);
  assert.deepEqual(m.paths, Array.from({ length: 16 }, (_, i) => `/r/${i}`), "cut at sixteen paths");
  assert.deepEqual(byId.get(wide.said), { source: address, via: [], said: wide.said, paths: [], appearances: 10_000 }, "every pointer longer than 256 characters: none reported");
});

test("the definitions limit cuts in SAID order and is recorded", async () => {
  const a = await start();
  const x = definition([]);
  const refs = Array.from({ length: 5 }, (_, i) => definition([x.said], `,"n":${i}`));
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, ...refs.map((d) => ({ said: d.said, refers: [x.said] }))] }));
  a.put(`s/definitions/${x.said}.json`, x.bytes);
  for (const d of refs) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await walk(x.said, address, session({ definitionsPerSource: 3 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const all = [x.said, ...refs.map((d) => d.said)].sort();
  const asked = a.requests.filter((p) => p.startsWith("s/definitions/")).map((p) => p.slice("s/definitions/".length, -5)).sort();
  assert.deepEqual(asked, all.slice(0, 3));
  assert.deepEqual(r.report.unresolved, [{ address, via: [], reason: "truncated", limit: "definitions" }]);
  assert.equal(r.report.reached, 1);
  assert.equal(r.report.serves.length + r.report.referrers.length, 3);
});

test("a host that uses up its bytes during a source gives one timed-out entry and nothing of the source", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const sourceBytes = a.files.get("mad/source.json")!.length;
  const leaf = plan.document.serves.find((s) => s.refers.length === 0)!.said;
  const r = await walk(leaf, address, session({ hostBytes: sourceBytes + 10 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, []);
  assert.deepEqual(r.report.referrers, []);
  assert.deepEqual(r.report.unresolved, [{ address, via: [], reason: "timed-out" }]);
  assert.equal(r.report.reached, 0);
});

test("the starting source that cannot be read is the walk's one failure", async () => {
  const dead = await Origin.start();
  const address = `${dead.origin}/mad/source.json`;
  await dead.close();
  assert.deepEqual(await walk(SELECTION, address, session()), { ok: false, reason: "unreachable" });
  const a = await start();
  a.behave = (_req, res) => { res.statusCode = 301; res.setHeader("location", "https://moved.test/source.json"); res.end(); return true; };
  assert.deepEqual(await walk(SELECTION, `${a.origin}/mad/source.json`, session()), { ok: false, reason: "redirected", target: "https://moved.test/source.json" });
  a.behave = null;
});

test("three origins: the first introduces the second, the second the third; one lookup finds all three, each visited once", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const cAddr = `${c.origin}/mad/source.json`;
  const bAddr = `${b.origin}/mad/source.json`;
  c.source("mad/", { serve: [SELECTION] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr, for: [SELECTION] }] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: aAddr, via: [] }, { source: bAddr, via: [aAddr] }, { source: cAddr, via: [aAddr, bAddr] }]);
  assert.deepEqual(r.report.sources, [{ address: aAddr, via: [] }, { address: bAddr, via: [aAddr] }, { address: cAddr, via: [aAddr, bAddr] }], "no by or oobi: none stated");
  assert.equal(r.report.reached, 3);
  assert.deepEqual(r.report.unresolved, []);
  for (const o of [a, b, c]) assert.equal(o.requests.filter((p) => p === "mad/source.json").length, 1);
  const again = await walk(SELECTION, aAddr, session());
  assert.deepEqual(again, r, "two runs, one report");
});

test("a 'for' introduction that leads to a source with nothing about the SAID is not-there", async () => {
  const c = await start();
  const d = await start();
  const cAddr = `${c.origin}/mad/source.json`;
  c.put("mad/source.json", JSON.stringify({ source: cAddr, serves: [] }));
  const { address: dAddr } = d.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr, for: [SELECTION] }] }, inputs);
  const r = await walk(SELECTION, dAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, [{ address: cAddr, via: [dAddr], reason: "not-there" }]);
  assert.equal(r.report.reached, 2, "c was read; it simply has nothing");
});

test("an oversized source document at depth 1 is invalid and nothing is read from it", async () => {
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const big = JSON.parse(new TextDecoder().decode(b.files.get("mad/source.json")!)) as Record<string, unknown>;
  big["note"] = "x".repeat(20_000);   // an unknown member: the document would read fine were it not over the limit
  b.put("mad/source.json", JSON.stringify(big));
  const { address: aAddr, plan } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  const limit = plan.files.get("source.json")!.length + 1000;   // a's document and its 241-byte definition fit; b's padded document does not
  const r = await walk(SELECTION, aAddr, session({ fileBytes: limit }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, [{ address: bAddr, via: [aAddr], reason: "invalid" }]);
  assert.ok(!b.requests.some((p) => p.startsWith("mad/definitions/")), "nothing was read from the oversized source");
  assert.equal(r.report.reached, 1);
});

test("a cycle of introductions ends, with each source visited once", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr] = [a, b, c].map((o) => `${o.origin}/mad/source.json`);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr }] }, inputs);
  c.source("mad/", { serve: [SELECTION], introductions: [{ source: aAddr }, { source: bAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session());
  assert.ok(r.ok && r.report.reached === 3 && r.report.unresolved.length === 0);
  for (const o of [a, b, c]) assert.equal(o.requests.filter((p) => p === "mad/source.json").length, 1);
});

test("within a depth: 'for' first, then one from each introducing source in turn, in address order", async () => {
  const { nextLevel } = await import("../src/walk.ts");
  const visited = (address: string, intros: { source: string; for: string[] }[]) => ({ address, via: [], fetched: true, read: true, serves: false, publications: [], referrers: [], unresolved: [], dropped: null, catalogs: [], introductions: intros });
  const X = SELECTION;
  const here = [
    visited("https://a.example/source.json", [{ source: "https://a1.example/source.json", for: [] }, { source: "https://a2.example/source.json", for: [X] }, { source: "https://a3.example/source.json", for: [] }]),
    visited("https://b.example/source.json", [{ source: "https://b1.example/source.json", for: [X] }, { source: "https://b2.example/source.json", for: [] }, { source: "https://a1.example/source.json", for: [] }, { source: "https://seen.example/source.json", for: [] }]),
  ];
  const next = nextLevel(X, here, new Set(["https://seen.example/source.json"]));
  assert.deepEqual(next.map((c) => [c.address.slice(8, 10), c.named]), [["a2", true], ["b1", true], ["a1", false], ["b2", false], ["a3", false]]);
  assert.deepEqual(next[0]!.via, ["https://a.example/source.json"]);
  assert.deepEqual(next[1]!.via, ["https://b.example/source.json"]);
});

test("a flood of introductions sorting ahead of the honest ones does not keep the honest one out", async () => {
  const dead = await Origin.start();
  const deadBase = dead.origin;
  await dead.close();
  const [a, b, c, d] = [await start(), await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr, dAddr] = [a, b, c, d].map((o) => `${o.origin}/mad/source.json`);
  d.source("mad/", { serve: [SELECTION] }, inputs);
  c.source("mad/", { serve: [SELECTION], introductions: Array.from({ length: 10 }, (_, i) => ({ source: `${deadBase}/a${i}/source.json` })) }, inputs);   // ports differ, so c's flood sorts by its own port, which may be ahead of or behind d
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: dAddr }] }, inputs);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }, { source: cAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session({ sourcesPerRun: 5 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.report.serves.some((s) => s.source === dAddr), "d, introduced by b beside c's ten, is visited: one from each introducing source in turn");
  assert.equal(r.report.reached, 4, "a, b, c, d; the fifth slot went to one dead address");
  assert.equal(r.report.unresolved.filter((u) => u.reason === "unreachable").length, 1);
  assert.equal(r.report.unresolved.filter((u) => u.reason === "skipped" && u.limit === "sources").length, 9);
});

test("the depth limit, the introductions limit, and the source limit each leave a named entry", async () => {
  const chain = [await start(), await start(), await start(), await start(), await start()];
  const addrs = chain.map((o) => `${o.origin}/mad/source.json`);
  for (let i = 0; i < chain.length; i++) chain[i]!.source("mad/", { serve: [SELECTION], introductions: i + 1 < chain.length ? [{ source: addrs[i + 1]! }] : [] }, inputs);
  const r = await walk(SELECTION, addrs[0]!, session({ introductionDepth: 2 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.report.reached, 3, "depths 0, 1 and 2");
  assert.deepEqual(r.report.unresolved, [{ address: addrs[3]!, via: [addrs[0]!, addrs[1]!, addrs[2]!], reason: "skipped", limit: "depth" }]);

  const r2 = await walk(SELECTION, addrs[0]!, session({ sourcesPerRun: 2 }));
  assert.ok(r2.ok);
  if (r2.ok) {
    assert.equal(r2.report.reached, 2);
    assert.deepEqual(r2.report.unresolved, [{ address: addrs[2]!, via: [addrs[0]!, addrs[1]!], reason: "skipped", limit: "sources" }]);
  }

  const many = await start();
  const manyAddr = `${many.origin}/mad/source.json`;
  many.source("mad/", { serve: [SELECTION], introductions: addrs.slice(1).map((source) => ({ source })) }, inputs);
  const r3 = await walk(SELECTION, manyAddr, session({ introductionsPerSource: 2 }));
  assert.ok(r3.ok);
  if (r3.ok) {
    const followed = [...addrs.slice(1)].sort().slice(0, 2);
    assert.deepEqual(r3.report.serves.filter((s) => s.via.length === 1).map((s) => s.source).sort(), followed, "the first two in address order were followed at depth 1");
    assert.deepEqual(r3.report.unresolved, [{ address: manyAddr, via: [], reason: "truncated", limit: "introductions" }]);
  }
});

test("a dead introduced source, a copy, and an exhausted host are named and the walk goes on", async () => {
  const dead = await Origin.start();
  const deadAddr = `${dead.origin}/mad/source.json`;
  await dead.close();
  const [a, b, copy] = [await start(), await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  for (const [p, bytes] of b.files) copy.files.set(p, bytes);
  const copyAddr = `${copy.origin}/mad/source.json`;
  const { address: aAddr, plan } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: deadAddr }, { source: bAddr }, { source: copyAddr }, { source: `${b.origin}/second/source.json` }] }, inputs);
  const sourceBytes = plan.files.get("source.json")!.length;
  b.source("second/", { serve: [SELECTION] }, inputs);
  // Room for a's document and its definition, and for b's first source, but not for b's second document (measured: a's document is about 2.5 KB, b's about 2.2 KB, the definition 241 bytes).
  const r = await walk(SELECTION, aAddr, session({ hostBytes: sourceBytes + 1000 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.report.unresolved.some((u) => u.address === deadAddr && u.reason === "unreachable" && u.via[0] === aAddr));
  assert.ok(r.report.unresolved.some((u) => u.address === copyAddr && u.reason === "invalid"));
  const onB = r.report.unresolved.filter((u) => Session.hostOf(u.address) === Session.hostOf(bAddr));
  assert.ok(onB.some((u) => u.reason === "timed-out") || onB.some((u) => u.reason === "skipped" && u.limit === "host-bytes"), "b's second source finds the host used up: dropped whole or not started");
});

test("a run whose clock runs out keeps nothing of the source it was reading and skips the rest", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const [bAddr, cAddr] = [b, c].map((o) => `${o.origin}/mad/source.json`);
  b.source("mad/", { serve: [SELECTION] }, inputs);
  c.source("mad/", { serve: [SELECTION] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }, { source: cAddr }] }, inputs);
  let clock = 0;
  const [first, second] = bAddr < cAddr ? [b, c] : [c, b];
  // The clock jumps past the run limit while the first depth-1 source's document is being served: that source is dropped whole,
  // and the other depth-1 source, whichever host reaches it first, either is skipped before it starts or is dropped whole too.
  first.behave = (_req, _res) => { clock = 1000; return false; };
  const s = new Session(quick({ runMs: 500 }), { test: true, now: () => clock });
  const r = await walk(SELECTION, aAddr, s);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: aAddr, via: [] }], "the start was read before the clock ran out; nothing from depth 1 is kept");
  assert.equal(r.report.reached, 1);
  const firstAddr = `${first.origin}/mad/source.json`;
  const secondAddr = `${second.origin}/mad/source.json`;
  assert.ok(r.report.unresolved.some((u) => u.address === firstAddr && u.reason === "timed-out"));
  assert.ok(r.report.unresolved.some((u) => u.address === secondAddr && (u.reason === "timed-out" || (u.reason === "skipped" && u.limit === "run"))));
  assert.equal(r.report.unresolved.length, 2);
});
