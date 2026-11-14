import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { WALK, CATALOG, ROW, CONTAINED, type Limits } from "../src/limits.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
origin.put("x.json", "{}");
const url = (p: string) => `${origin.origin}/${p}`;
const limits = (more: Partial<Limits>): Limits => ({ ...WALK, requestMs: 2000, ...more });

test("hostOf is the URL's host, port included", () => {
  assert.equal(Session.hostOf("https://a.example/mad/source.json"), "a.example");
  assert.equal(Session.hostOf("http://127.0.0.1:8080/mad/source.json"), "127.0.0.1:8080");
});

test("every request is charged to its host, and an exhausted host answers timed-out without a request", async () => {
  let clock = 0;
  const s = new Session(limits({ hostBytes: 5, hostMs: 10_000 }), { test: true, now: () => clock });
  const host = Session.hostOf(url("x.json"));
  assert.equal(s.exhausted(host), null);
  const r1 = await s.fetch(url("x.json"));
  assert.equal(r1.outcome, "ok");
  assert.equal(r1.read, 2);
  const r2 = await s.fetch(url("x.json"));
  assert.equal(r2.outcome, "ok");
  const before = origin.requests.length;
  const r3 = await s.fetch(url("x.json"));
  assert.equal(r3.outcome, "timed-out", "5 bytes allowed, 4 read, 2 more would not fit: the host is used up");
  assert.equal(origin.requests.length, before + 1, "the third request was made (budget left) and refused by its size");
  assert.equal(s.exhausted(host), "host-bytes");
  const r4 = await s.fetch(url("x.json"));
  assert.equal(r4.outcome, "timed-out");
  assert.equal(origin.requests.length, before + 1, "nothing more is asked of an exhausted host");
});

test("the host's time and the run clock bound a request's deadline", async () => {
  let clock = 0;
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); clock += 400; res.end("{}"); return true; };
  const s = new Session(limits({ hostMs: 1000, runMs: 10_000 }), { test: true, now: () => clock });
  const host = Session.hostOf(url("x.json"));
  await s.fetch(url("x.json")); await s.fetch(url("x.json"));
  assert.equal(s.exhausted(host), null, "800 ms spent of 1000");
  await s.fetch(url("x.json"));
  assert.equal(s.exhausted(host), "host-time", "1200 ms spent of 1000");
  assert.equal((await s.fetch(url("x.json"))).outcome, "timed-out");
  origin.behave = null;
  const r = new Session(limits({ runMs: 100 }), { test: true, now: () => clock });
  clock += 200;
  assert.equal(r.exhausted(host), "run");
  assert.equal((await r.fetch(url("x.json"))).outcome, "timed-out");
  const none = new Session(limits({ runMs: null }), { test: true, now: () => clock });
  assert.equal(none.remainingRun(), Infinity);
  assert.equal((await none.fetch(url("x.json"))).outcome, "ok");
});

test("each runs hostsInFlight hosts at a time and one item per host at a time, in order", async () => {
  const s = new Session(limits({ hostsInFlight: 2 }), { test: true });
  const items = ["a:1", "a:2", "b:1", "c:1", "a:3", "c:2"];
  const running = new Set<string>();
  const overlaps: string[] = [];
  let peak = 0;
  const order: string[] = [];
  const gate = new Map<string, () => void>();
  const started: string[] = [];
  const run = s.each(items, (i) => i.split(":")[0]!, (i) => new Promise<void>((done) => {
    const host = i.split(":")[0]!;
    if (running.has(host)) overlaps.push(i);
    running.add(host); peak = Math.max(peak, running.size); started.push(i);
    gate.set(i, () => { running.delete(host); order.push(i); done(); });
  }));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(started, ["a:1", "b:1"], "two hosts in flight, a's second item waits for a's first");
  gate.get("a:1")!();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(started, ["a:1", "b:1", "a:2"]);
  gate.get("b:1")!(); gate.get("a:2")!();
  await new Promise((r) => setTimeout(r, 20));
  for (const i of [...started]) { const g = gate.get(i); if (g && !order.includes(i)) g(); }
  await new Promise((r) => setTimeout(r, 20));
  for (const i of [...started]) { const g = gate.get(i); if (g && !order.includes(i)) g(); }
  await run;
  assert.deepEqual(overlaps, [], "never two items of one host at once");
  assert.equal(peak, 2);
  assert.equal(order.length, 6);
  assert.ok(order.indexOf("a:1") < order.indexOf("a:2") && order.indexOf("a:2") < order.indexOf("a:3"));
  assert.ok(order.indexOf("c:1") < order.indexOf("c:2"));
});

test("each runs every item when one item's work rejects, then rejects with that error; with no items it finishes", async () => {
  const s = new Session(limits({}), { test: true });
  const done: string[] = [];
  const boom = new Error("boom");
  await assert.rejects(s.each(["x", "y", "z"], (i) => i, async (i) => { if (i === "x") throw boom; done.push(i); }), (e) => e === boom);
  assert.deepEqual(done, ["y", "z"], "the other items still ran");
  const [first, second] = [new Error("first"), new Error("second")];
  let thrown = 0;
  await assert.rejects(s.each(["a", "a", "b"], () => "h", async (i) => { if (i === "a") throw thrown++ === 0 ? first : second; done.push(i); }), (e) => e === first, "the first error seen");
  assert.deepEqual(done, ["y", "z", "b"]);
  await s.each([], () => "", async () => {});
});

test("a malformed address answers refused-address without a request, as fetchJson does", async () => {
  const s = new Session(limits({}), { test: true });
  assert.deepEqual(await s.fetch("not a url"), { outcome: "refused-address", read: 0, ms: 0 });
});

test("each rejects before any work when an item's host cannot be computed", async () => {
  const s = new Session(limits({}), { test: true });
  const ran: string[] = [];
  const bad = new Error("no host");
  await assert.rejects(
    s.each(["a", "b"], (i) => { if (i === "b") throw bad; return i; }, async (i) => { ran.push(i); }),
    (e) => e === bad,
  );
  assert.deepEqual(ran, [], "no work started");
});

test("a synchronous throw in work is reported the same way, after every other item ran", async () => {
  const s = new Session(limits({}), { test: true });
  const done: string[] = [];
  const boom = new Error("sync boom");
  const work = (i: string): Promise<void> => { if (i === "x") throw boom; done.push(i); return Promise.resolve(); };
  await assert.rejects(s.each(["x", "y", "z"], (i) => i, work), (e) => e === boom);
  assert.deepEqual(done, ["y", "z"]);
});

test("a request's deadline is the host's remaining time when that is shorter than the request limit", async () => {
  let clock = 0;
  const s = new Session(limits({ requestMs: 2000, hostMs: 1000, runMs: null }), { test: true, now: () => clock });
  origin.behave = (_req, res) => { clock += 700; res.setHeader("content-type", "application/json"); res.end("{}"); return true; };
  try {
    assert.equal((await s.fetch(url("x.json"))).outcome, "ok");
    origin.behave = () => true;   // accepts and never answers
    const t0 = performance.now();
    assert.equal((await s.fetch(url("x.json"))).outcome, "timed-out");
    const waited = performance.now() - t0;
    assert.ok(waited >= 250 && waited < 1500, `cut at the host's 300 ms left, not the request's 2000: waited ${waited}`);
  } finally { origin.behave = null; }
});

test("when the run and a host are both used up, the run is the reason", async () => {
  let clock = 0;
  const s = new Session(limits({ hostBytes: 1, runMs: 100 }), { test: true, now: () => clock });
  const host = Session.hostOf(url("x.json"));
  await s.fetch(url("x.json"));
  assert.equal(s.exhausted(host), "host-bytes");
  clock = 200;
  assert.equal(s.exhausted(host), "run");
});

test("hostsInFlight below 1 is refused when the session is made", () => {
  assert.throws(() => new Session(limits({ hostsInFlight: 0 })), RangeError);
  assert.throws(() => new Session(limits({ hostsInFlight: -1 })), RangeError);
});

test("asking whether a host is used up records nothing about it", () => {
  const s = new Session(limits({}), { test: true });
  assert.equal(s.exhausted("never.example"), null);
  assert.equal((s as unknown as { hosts: Map<string, unknown> }).hosts.size, 0);
});

test("fetch takes its modes in one object: the text mode passes through and is charged like any request; asBrowser adds the wallet's headers", async () => {
  let sawOrigin: string | undefined, sawCache: unknown[] = [];
  origin.behave = (req, res) => { sawOrigin = req.headers.origin; sawCache = [req.headers["cache-control"], req.headers.pragma]; if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
  try {
    const s = new Session(limits({}), { test: true });
    const r = await s.fetch(url("robots.txt"), { type: "text" });
    assert.equal(r.outcome, "ok");
    if (r.outcome === "ok") assert.equal(new TextDecoder().decode(r.bytes), "User-agent: *\nDisallow:\n");
    assert.equal(sawOrigin, undefined, "no Origin unless asked");
    assert.equal((await s.fetch(url("robots.txt"))).outcome, "invalid", "as json, text/plain is refused");
    assert.equal((await s.fetch(url("x.json"), { asBrowser: true })).outcome, "ok");
    assert.equal(sawOrigin, "https://wallet.invalid");
    assert.deepEqual(sawCache, ["no-cache", "no-cache"]);
  } finally { origin.behave = null; }
});

test("the catalog's limits are the design's column", () => {
  assert.deepEqual(CATALOG, { requestMs: 10_000, fileBytes: 1_000_000, definitionsPerSource: 500, introductionsPerSource: 10, introductionDepth: 3, sourcesPerRun: 1_000, hostMs: 120_000, hostBytes: 100_000_000, hostsInFlight: 8, runMs: null });
  assert.deepEqual(ROW, { referrersPerSource: 50, rowBytes: 1_000_000 });
  assert.deepEqual(CONTAINED, { perDefinition: 200, perSource: 5_000 });
});
