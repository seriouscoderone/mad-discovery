import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { readInputs } from "../src/inputs.ts";
import { appearances, paths } from "../src/scan.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { Robots } from "../src/robots.ts";
import { CATALOG, type Limits } from "../src/limits.ts";
import { visitAll } from "../src/visit.ts";
import { byKey } from "../src/source.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}, resolve?: (h: string) => Promise<string[]>) => new Session({ ...CATALOG, requestMs: 2000, ...more }, { test: true, ...(resolve ? { resolve } : {}) });
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};
const robotsOk = (o: Origin) => { o.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; }; };
const cand = (address: string) => ({ address, via: [], named: false });

test("a source is read whole: every served definition fetched in SAID order, verified, and scanned for what it contains", async () => {
  const a = await start(); robotsOk(a);
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const s = session();
  const v = await visitAll(cand(address), s, new Robots(s));
  assert.equal(v.outcome, "ok"); assert.deepEqual(v.limits, []);
  assert.equal(v.fetched, true); assert.equal(v.read, true);
  assert.equal(v.digest, bytesToHex(blake3(plan.files.get("source.json")!)));
  assert.equal(a.requests.filter((p) => p === "mad/source.json").length, 1, "the document is fetched once; the digest comes from the bytes readSource returned");
  const asked = a.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.deepEqual(asked, plan.document.serves.map((x) => x.said), "SAID order");
  assert.deepEqual(v.verified.map((d) => d.said), plan.document.serves.map((x) => x.said));
  for (const d of v.verified) {
    const bytes = inputs.get(d.said)!;
    assert.deepEqual(d.contains.map((c) => c.said), [...appearances(bytes, d.said)].sort(), "lowest SAID first");
    assert.equal(d.omittedContained, 0);
    for (const c of d.contains) { const p = paths(bytes, c.said); assert.deepEqual(c.paths, p.paths); assert.equal(c.appearances, p.count); }
  }
  assert.deepEqual(v.failed, []); assert.equal(v.untried, 0); assert.equal(v.omittedContained, 0); assert.deepEqual(v.notContained, []);
  assert.equal(v.pages, true); assert.equal(v.base, `${a.origin}/mad/`);
  assert.deepEqual(v.publications, plan.document.publications); assert.equal(v.by, plan.document.by);
  assert.ok(!("document" in v), "the parsed document is not kept: only what the build reads");
  assert.equal(a.requests.filter((p) => p === "robots.txt").length, 1);
});

test("failures are named per definition and per refers entry; the definitions and introductions limits cut and are recorded", async () => {
  const a = await start(); robotsOk(a);
  const x = definition([]);
  const y = definition([x.said]);
  const z = definition([], ',"n":"z"');                  // claims to contain x, does not
  const w = definition([x.said], ',"n":"w"');            // wrong bytes served
  const address = `${a.origin}/s/source.json`;
  const intros = Array.from({ length: 11 }, (_, i) => ({ source: `https://i${i}.example/source.json` }));
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said, refers: [x.said] }, { said: w.said, refers: [x.said] }], introductions: intros }));
  a.put(`s/definitions/${x.said}.json`, x.bytes); a.put(`s/definitions/${y.said}.json`, y.bytes); a.put(`s/definitions/${z.said}.json`, z.bytes);
  a.put(`s/definitions/${w.said}.json`, '{"d":"' + w.said + '","r":["tampered"]}');
  const s = session();
  const v = await visitAll(cand(address), s, new Robots(s));
  assert.equal(v.outcome, "truncated"); assert.deepEqual(v.limits, ["introductions"]);
  assert.equal(v.introductions.length, 10);
  assert.deepEqual(v.verified.map((d) => d.said).sort(), [x.said, y.said, z.said].sort());
  assert.deepEqual(v.failed, [{ said: w.said, outcome: "failed-check" }]);
  assert.deepEqual(v.notContained, [{ in: z.said, said: x.said }], "w's refers is not listed: its definition failed");

  const cut = session({ definitionsPerSource: 2 });
  const v2 = await visitAll(cand(address), cut, new Robots(cut));
  assert.equal(v2.outcome, "truncated"); assert.deepEqual(v2.limits, ["definitions", "introductions"]);
  assert.equal(v2.untried, 2);
  assert.deepEqual([...v2.verified.map((d) => d.said), ...v2.failed.map((f) => f.said)].sort(), [x.said, y.said, z.said, w.said].sort().slice(0, 2));
});

test("robots.txt: a disallowed document ends the source disallowed; a disallowed definition ends only that definition; a refused address keeps its outcome", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const first = plan.document.serves[0]!.said;
  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end(`User-agent: mad-discovery\nDisallow: /mad/definitions/${first}.json\n`); return true; } return false; };
  const s = session();
  const v = await visitAll(cand(address), s, new Robots(s));
  assert.equal(v.outcome, "ok");
  assert.deepEqual(v.failed, [{ said: first, outcome: "disallowed" }]);
  assert.ok(!a.requests.includes(`mad/definitions/${first}.json`), "never requested");

  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow: /mad/\n"); return true; } return false; };
  const before = a.requests.length;
  const s2 = session();
  const v2 = await visitAll(cand(address), s2, new Robots(s2));
  assert.equal(v2.outcome, "disallowed"); assert.equal(v2.fetched, false);
  assert.deepEqual(a.requests.slice(before), ["robots.txt"], "nothing but the robots.txt");

  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.statusCode = 500; res.end(); return true; } return false; };
  const s3 = session();
  assert.equal((await visitAll(cand(address), s3, new Robots(s3))).outcome, "disallowed", "unreadable robots.txt");
  a.behave = null;

  const s4 = session({}, async () => ["10.0.0.1"]);
  assert.equal((await visitAll(cand("https://a.test/mad/source.json"), s4, new Robots(s4))).outcome, "refused-address");
});

test("a host used up during the source is dropped whole but keeps its digest; one skipped before it starts says why", async () => {
  const a = await start(); robotsOk(a);
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const robotsBytes = "User-agent: *\nDisallow:\n".length;
  const s = session({ hostBytes: robotsBytes + plan.files.get("source.json")!.length + 10 });
  const v = await visitAll(cand(address), s, new Robots(s));
  assert.equal(v.outcome, "timed-out"); assert.equal(v.fetched, true); assert.equal(v.read, false);
  assert.deepEqual(v.verified, []);
  assert.equal(v.digest, bytesToHex(blake3(plan.files.get("source.json")!)), "the document was read: its digest stays for comparison");
  const v2 = await visitAll(cand(`${a.origin}/other/source.json`), s, new Robots(s));
  assert.equal(v2.outcome, "skipped"); assert.deepEqual(v2.limits, ["host-bytes"]);
});

test("contained SAIDs recorded from one definition and from one source are bounded, lowest SAID first; the rest are counted", async () => {
  const a = await start(); robotsOk(a);
  const inner = Array.from({ length: 5 }, (_, i) => definition([], `,"n":${i}`));
  const saids = inner.map((d) => d.said).sort();
  const big = definition(saids, ',"n":"big"');
  const big2 = definition(saids, ',"n":"big2"');
  const served = [big, big2].sort(byKey("said"));
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: served.map((d) => ({ said: d.said, refers: saids })) }));   // refers names all five: checked against the full scan, not the cut
  for (const d of served) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const s = session();
  const v = await visitAll(cand(address), s, new Robots(s), { perDefinition: 3, perSource: 4 });
  assert.equal(v.outcome, "truncated"); assert.deepEqual(v.limits, ["contained"]);
  const [d1, d2] = v.verified;
  assert.deepEqual(d1!.contains.map((c) => c.said), saids.slice(0, 3), "the first definition takes three, the lowest");
  assert.equal(d1!.omittedContained, 2);
  assert.deepEqual(d2!.contains.map((c) => c.said), saids.slice(0, 1), "one slot of the source's four is left");
  assert.equal(d2!.omittedContained, 4);
  assert.equal(v.omittedContained, 6);
  assert.deepEqual(v.notContained, [], "every refers entry is in the full scan, although the record was cut");
  const loose = session();
  const w = await visitAll(cand(address), loose, new Robots(loose));
  assert.equal(w.outcome, "ok"); assert.equal(w.omittedContained, 0); assert.equal(w.verified[0]!.contains.length, 5);
});
