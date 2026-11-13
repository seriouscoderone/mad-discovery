import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { levels, nextLevel, type Candidate, type Node } from "../src/crawl.ts";
import { readSource } from "../src/read.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...WALK, requestMs: 2000, runMs: 10_000, ...more }, { test: true });

/** The smallest visit: read the document, keep its introductions. */
async function visitDocument(c: Candidate, s: Session): Promise<Node & { depth: number }> {
  const r = await readSource(c.address, c.via, s);
  return { address: c.address, via: c.via, fetched: r.ok, read: r.ok, introductions: r.ok ? r.document.introductions.slice(0, s.limits.introductionsPerSource) : [], depth: -1 };
}

test("nextLevel with nothing named is plain round-robin in address order, first occurrence wins", () => {
  const node = (address: string, intros: string[]): Node => ({ address, via: [], fetched: true, read: true, introductions: intros.map((source) => ({ source, for: [] })) });
  const here = [node("https://a.example/source.json", ["https://a1.example/source.json", "https://x.example/source.json"]), node("https://b.example/source.json", ["https://b1.example/source.json", "https://x.example/source.json", "https://b3.example/source.json"])];
  const next = nextLevel(() => false, here, new Set());
  assert.deepEqual(next.map((c) => c.address.slice(8, 10)), ["a1", "b1", "x.", "b3"]);
  assert.ok(next.every((c) => !c.named));
});

test("an extra list joins the named round-robin under its key", () => {
  const node = (address: string, intros: string[]): Node => ({ address, via: [], fetched: true, read: true, introductions: intros.map((source) => ({ source, for: [] })) });
  const here = [node("https://b.example/source.json", ["https://b1.example/source.json"])];
  const extra = [{ key: "https://a.example/catalog.json", candidates: ["https://c1.example/source.json", "https://c2.example/source.json"].map((address) => ({ address, via: ["https://a.example/catalog.json"], named: true })) }];
  const next = nextLevel(() => false, here, new Set(), extra);
  assert.deepEqual(next.map((c) => c.address.slice(8, 10)), ["c1", "c2", "b1"], "the named extra list first, then the unnamed introductions");
});

test("levels visits two starts at depth 0, follows their introductions, and applies the room counting the starts", async () => {
  const [a, b, c, d] = [await start(), await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr, dAddr] = [a, b, c, d].map((o) => `${o.origin}/mad/source.json`);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr }] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: dAddr }, { source: cAddr }] }, inputs);
  c.source("mad/", { serve: [SELECTION] }, inputs);
  d.source("mad/", { serve: [SELECTION] }, inputs);
  const s = session({ sourcesPerRun: 3 });
  const starts: Candidate[] = [aAddr, bAddr].sort().map((address) => ({ address, via: [], named: false }));
  const { visits, skipped } = await levels(starts, s, (cand, depth) => visitDocument(cand, s).then((v) => ({ ...v, depth })), () => false);
  assert.deepEqual(visits.filter((v) => v.depth === 0).map((v) => v.address).sort(), [aAddr, bAddr].sort());
  assert.equal(visits.filter((v) => v.depth === 1).length, 1, "room for one more");
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]!.reason, "skipped");
  assert.equal(skipped[0]!.limit, "sources");
  assert.deepEqual(new Set([visits[2]!.address, skipped[0]!.address]), new Set([cAddr, dAddr]));
});

test("an asynchronous extra is awaited and its candidates visited at the next depth", async () => {
  const [a, b] = [await start(), await start()];
  const [aAddr, bAddr] = [a, b].map((o) => `${o.origin}/mad/source.json`);
  a.source("mad/", { serve: [SELECTION] }, inputs);
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const s = session();
  const { visits } = await levels([{ address: aAddr, via: [], named: false }], s, (cand, depth) => visitDocument(cand, s).then((v) => ({ ...v, depth })), () => false,
    async (depth) => (depth === 0 ? [{ key: "https://cat.example/catalog.json", candidates: [{ address: bAddr, via: ["https://cat.example/catalog.json"], named: true }] }] : []));
  assert.deepEqual(visits.map((v) => [v.address, v.depth]), [[aAddr, 0], [bAddr, 1]]);
  assert.deepEqual(visits[1]!.via, ["https://cat.example/catalog.json"]);
});
