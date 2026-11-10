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
