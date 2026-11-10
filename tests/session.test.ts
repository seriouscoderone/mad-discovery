import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
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

test("each finishes when an item's work rejects, and with no items", async () => {
  const s = new Session(limits({}), { test: true });
  const done: string[] = [];
  await s.each(["x", "y"], (i) => i, async (i) => { if (i === "x") throw new Error("boom"); done.push(i); });
  assert.deepEqual(done, ["y"]);
  await s.each([], () => "", async () => {});
});
