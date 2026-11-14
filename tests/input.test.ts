import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Input, InputError, PUBLIC_INPUTS } from "../src/finders/input.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const slept: number[] = [];
let clock = 0;   // a sleep moves the clock, as time would
const sleep = async (ms: number) => { slept.push(ms); clock += ms; };
const now = () => clock;
const input = (more: Record<string, unknown> = {}) => new Input(bases, { test: true, sleep, now, ...more });
const reason = (r: string, status?: number) => (e: unknown) => e instanceof InputError && e.reason === r && (status === undefined || e.status === status);

test("the public inputs are the three hosts the design names, and nothing else is opened", async () => {
  assert.deepEqual(PUBLIC_INPUTS, { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" });
  const i = input();
  const before = origin.requests.length;
  for (const url of ["https://data.commoncrawl.org/x", `${origin.origin}/elsewhere/x`, "http://evil.test/archive/x", `${origin.origin}/archive`, `${origin.origin}/archive/`]) {
    await assert.rejects(i.open(url), reason("refused-url"), url);
  }
  assert.equal(origin.requests.length, before, "a refused URL costs no request");
  const prod = new Input(PUBLIC_INPUTS, { sleep });
  await assert.rejects(prod.open(`${origin.origin}/archive/x`), reason("refused-url"), "a URL outside the public bases is refused");
  const notTest = new Input(bases, { sleep });
  await assert.rejects(notTest.open(`${origin.origin}/archive/x`), reason("refused-url"), "a loopback base needs the test option");
  i.close(); prod.close(); notTest.close();
});

test("open streams a 200 as served, with identity encoding and the tool's user agent; readAll bounds the body; an encoded answer is refused", async () => {
  origin.put("archive/a.bin", new Uint8Array([1, 2, 3, 4, 5]));
  let seen: Record<string, unknown> = {};
  origin.behave = (req, res) => {
    seen = { ...req.headers };
    if (req.url === "/archive/zipped") { res.setHeader("content-encoding", "gzip"); res.end("x"); return true; }
    return false;
  };
  try {
    const i = input();
    const r = await i.open(`${origin.origin}/archive/a.bin`, { accept: "application/octet-stream" });
    assert.equal(r.status, 200);
    const chunks: Buffer[] = []; for await (const c of r.stream) chunks.push(c as Buffer);
    assert.deepEqual(new Uint8Array(Buffer.concat(chunks)), new Uint8Array([1, 2, 3, 4, 5]));
    assert.equal(seen["accept-encoding"], "identity");
    assert.equal(seen["accept"], "application/octet-stream");
    assert.match(String(seen["user-agent"]), /^mad-discovery /);
    assert.deepEqual(new Uint8Array(await i.readAll(`${origin.origin}/archive/a.bin`, 5)), new Uint8Array([1, 2, 3, 4, 5]));
    await assert.rejects(i.readAll(`${origin.origin}/archive/a.bin`, 4), reason("too-large"));
    await assert.rejects(i.open(`${origin.origin}/archive/zipped`), reason("encoded"));
    i.close();
  } finally { origin.behave = null; }
});

test("a redirect is not followed; a 404 fails at once; a 503, a 429 or a rate-limited 403 is retried eight times, after 1, 2, 4, 8, 16, 32, 60, 60 seconds, and then fails; a connection error likewise; an idle connection is given up", async () => {
  let calls = 0;
  origin.behave = (req, res) => {
    calls++;
    if (req.url === "/archive/moved") { res.statusCode = 302; res.setHeader("location", `${origin.origin}/archive/a.bin`); res.end(); return true; }
    if (req.url === "/archive/busy") { res.statusCode = 503; res.end(); return true; }
    if (req.url === "/archive/slow") { res.statusCode = 429; res.end(); return true; }
    if (req.url === "/archive/limited") { res.statusCode = 403; res.setHeader("x-ratelimit-remaining", "0"); res.end(); return true; }
    if (req.url === "/archive/forbidden") { res.statusCode = 403; res.end(); return true; }
    if (req.url === "/archive/flaky") { res.statusCode = calls <= 2 ? 503 : 200; res.end(calls > 2 ? "ok" : undefined); return true; }
    if (req.url === "/archive/stalled") { res.writeHead(200); res.flushHeaders(); return true; }   // headers, then nothing
    return false;
  };
  try {
    const i = input();
    const before = origin.requests.length;
    await assert.rejects(i.open(`${origin.origin}/archive/moved`), reason("redirected"));
    assert.deepEqual(origin.requests.slice(before), ["archive/moved"], "the redirect's target was not requested");
    await assert.rejects(i.open(`${origin.origin}/archive/missing`), reason("status", 404));
    await assert.rejects(i.open(`${origin.origin}/archive/forbidden`), reason("status", 403));
    assert.equal(origin.requests.filter((p) => p === "archive/forbidden").length, 1, "a plain 403 is not retried");
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/busy`), reason("status", 503));
    assert.deepEqual(slept, [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000], "eight retries, doubling from one second, at most a minute");
    assert.equal(origin.requests.filter((p) => p === "archive/busy").length, 9);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/slow`), reason("status", 429));
    assert.equal(slept.length, 8);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/limited`), reason("status", 403));
    assert.equal(slept.length, 8, "a 403 with x-ratelimit-remaining 0 is GitHub's rate limit: retried like a 429");
    calls = 0; slept.length = 0;
    const r = await i.open(`${origin.origin}/archive/flaky`);
    assert.equal(r.status, 200); assert.deepEqual(slept, [1000, 2000], "recovered on the third try");
    r.stream.resume();
    const dead = await Origin.start(); const deadBases = { ...bases, archive: `${dead.origin}/archive/` }; await dead.close();
    slept.length = 0;
    await assert.rejects(new Input(deadBases, { test: true, sleep, now }).open(`${deadBases.archive}x`), reason("unreachable"));
    assert.equal(slept.length, 8);
    slept.length = 0;
    const quick = input({ idleMs: 50 });
    await assert.rejects(quick.readAll(`${origin.origin}/archive/stalled`, 100), reason("unreachable"), "no bytes for idleMs: the connection is given up");
    quick.close(); i.close();
  } finally { origin.behave = null; }
});

test("Retry-After in seconds is honoured up to two minutes, and a host's slow-down pauses every request of the input", async () => {
  let calls: Record<string, number> = {};
  origin.behave = (req, res) => {
    const u = req.url ?? ""; calls[u] = (calls[u] ?? 0) + 1;
    if (u === "/archive/once-busy" && calls[u] === 1) { res.statusCode = 503; res.setHeader("retry-after", "5"); res.end(); return true; }
    if (u === "/archive/very-busy" && calls[u] === 1) { res.statusCode = 429; res.setHeader("retry-after", "999"); res.end(); return true; }
    if (u === "/archive/dated" && calls[u] === 1) { res.statusCode = 503; res.setHeader("retry-after", "Wed, 21 Oct 2026 07:28:00 GMT"); res.end(); return true; }
    if (u === "/archive/zero" && calls[u] === 1) { res.statusCode = 503; res.setHeader("retry-after", "0"); res.end(); return true; }
    if (u === "/archive/secondary" && calls[u] === 1) { res.statusCode = 403; res.setHeader("retry-after", "2"); res.setHeader("x-ratelimit-remaining", "10"); res.end(); return true; }
    if (u.startsWith("/archive/")) { res.end("ok"); return true; }
    return false;
  };
  try {
    let t = 0; const waits: number[] = [];
    const j = new Input(bases, { test: true, now: () => t, sleep: async (ms) => { waits.push(ms); } });   // a clock that does not move
    await j.readAll(`${origin.origin}/archive/once-busy`, 10);
    assert.deepEqual(waits, [5000], "Retry-After: 5");
    await j.readAll(`${origin.origin}/archive/a.bin`, 10);
    assert.deepEqual(waits, [5000, 5000], "another request waits out the same pause");
    t = 6000;
    await j.readAll(`${origin.origin}/archive/a.bin`, 10);
    assert.deepEqual(waits, [5000, 5000], "once the pause is over, no wait");
    await j.readAll(`${origin.origin}/archive/very-busy`, 10);
    assert.equal(waits.at(-1), 120000, "capped at two minutes");
    t = 200000;
    await j.readAll(`${origin.origin}/archive/dated`, 10);
    assert.equal(waits.at(-1), 1000, "the date form is ignored: the doubling pause applies");
    t = 300000;
    await j.readAll(`${origin.origin}/archive/zero`, 10);
    assert.equal(waits.at(-1), 1000, "Retry-After: 0 still waits the one-second floor");
    t = 400000;
    await j.readAll(`${origin.origin}/archive/secondary`, 10);
    assert.equal(waits.at(-1), 2000, "GitHub's secondary limit: a 403 with Retry-After is a slow-down");
    j.close();
  } finally { origin.behave = null; }
});

test("an https host must resolve to public addresses only; a private or loopback answer is refused without connecting or retrying", async () => {
  const far = { archive: "https://archive.example/", index: "https://index.example/", github: "https://github.example/" };
  for (const answers of [["127.0.0.1"], ["10.0.0.1"], ["93.184.216.34", "192.168.1.1"], ["::1"]]) {
    slept.length = 0;
    const i = new Input(far, { sleep, now, resolve: async () => answers });
    await assert.rejects(i.open("https://archive.example/x"), reason("refused-address"), answers.join(","));
    assert.deepEqual(slept, [], "not retried");
    i.close();
  }
});

test("at most the configured connections to a host are open at once", async () => {
  let open = 0, peak = 0;
  origin.behave = (_req, res) => { open++; peak = Math.max(peak, open); setTimeout(() => { open--; res.end("x"); }, 30); return true; };
  try {
    const i = new Input(bases, { test: true, sleep, connections: 3 });
    await Promise.all(Array.from({ length: 9 }, (_, k) => i.readAll(`${origin.origin}/archive/c${k}`, 10)));
    assert.equal(peak, 3);
    i.close();
  } finally { origin.behave = null; }
});
