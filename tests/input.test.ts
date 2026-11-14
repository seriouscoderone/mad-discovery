import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Input, InputError, PUBLIC_INPUTS } from "../src/finders/input.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const slept: number[] = [];
let clock = 0;   // a sleep moves the clock, as time would
const sleep = async (ms: number) => { slept.push(ms); clock += ms; };
const now = () => clock;
const input = (more: Record<string, unknown> = {}) => new Input(bases, { test: true, sleep, now, ccRate: Infinity, ...more });   // unpaced: the pace has its own tests
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
    const stream = await i.open(`${origin.origin}/archive/a.bin`, { accept: "application/octet-stream" });
    const chunks: Buffer[] = []; for await (const c of stream) chunks.push(c as Buffer);
    assert.deepEqual(new Uint8Array(Buffer.concat(chunks)), new Uint8Array([1, 2, 3, 4, 5]));
    assert.equal(seen["accept-encoding"], "identity");
    assert.equal(seen["accept"], "application/octet-stream");
    assert.match(String(seen["user-agent"]), /^mad-discovery /);
    (await i.open(`${origin.origin}/archive/a.bin`, { "accept-encoding": "gzip", "user-agent": "someone-else" })).resume();
    assert.equal(seen["accept-encoding"], "identity", "a caller cannot ask for an encoding");
    assert.match(String(seen["user-agent"]), /^mad-discovery /, "nor change the tool's name");
    assert.deepEqual(new Uint8Array(await i.readAll(`${origin.origin}/archive/a.bin`, 5)), new Uint8Array([1, 2, 3, 4, 5]));
    await assert.rejects(i.readAll(`${origin.origin}/archive/a.bin`, 4), reason("too-large"));
    await assert.rejects(i.open(`${origin.origin}/archive/zipped`), reason("encoded"));
    i.close();
  } finally { origin.behave = null; }
});

const THROTTLED = [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, 60000];   // 603 s: about ten minutes
const FAULTED = [1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000];

test("a redirect is not followed; a 404 fails at once; a plain 403 from GitHub fails at once; a 500, a 502 or a connection error is retried eight times, after 1, 2, 4, 8, 16, 32, 60, 60 seconds, and then fails; an idle connection is given up", async () => {
  let calls = 0;
  origin.behave = (req, res) => {
    calls++;
    if (req.url === "/archive/moved") { res.statusCode = 302; res.setHeader("location", `${origin.origin}/archive/a.bin`); res.end(); return true; }
    if (req.url === "/archive/broken") { res.statusCode = 500; res.end(); return true; }
    if (req.url === "/archive/gateway") { res.statusCode = 502; res.end(); return true; }
    if (req.url === "/github/forbidden") { res.statusCode = 403; res.end(); return true; }
    if (req.url === "/archive/flaky") { res.statusCode = calls <= 2 ? 500 : 200; res.end(calls > 2 ? "ok" : undefined); return true; }
    if (req.url === "/archive/stalled") { res.writeHead(200); res.flushHeaders(); return true; }   // headers, then nothing
    return false;
  };
  try {
    const i = input();
    const before = origin.requests.length;
    await assert.rejects(i.open(`${origin.origin}/archive/moved`), reason("redirected"));
    assert.deepEqual(origin.requests.slice(before), ["archive/moved"], "the redirect's target was not requested");
    await assert.rejects(i.open(`${origin.origin}/archive/missing`), reason("status", 404));
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/github/forbidden`), reason("status", 403));
    assert.equal(origin.requests.filter((p) => p === "github/forbidden").length, 1, "a 403 from GitHub without its rate-limit headers is not retried");
    assert.deepEqual(slept, []);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/broken`), reason("status", 500));
    assert.deepEqual(slept, FAULTED, "eight retries, doubling from one second, at most a minute");
    assert.equal(origin.requests.filter((p) => p === "archive/broken").length, 9);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/gateway`), reason("status", 502));
    assert.equal(origin.requests.filter((p) => p === "archive/gateway").length, 9, "a 502 likewise");
    calls = 0; slept.length = 0;
    (await i.open(`${origin.origin}/archive/flaky`)).resume();
    assert.deepEqual(slept, [1000, 2000], "recovered on the third try");
    const dead = await Origin.start(); const deadBases = { ...bases, archive: `${dead.origin}/archive/` }; await dead.close();
    slept.length = 0;
    await assert.rejects(new Input(deadBases, { test: true, sleep, now, ccRate: Infinity }).open(`${deadBases.archive}x`), reason("unreachable"));
    assert.deepEqual(slept, FAULTED, "a connection error: eight retries");
    slept.length = 0;
    const quick = input({ idleMs: 50 });
    await assert.rejects(quick.readAll(`${origin.origin}/archive/stalled`, 100), reason("unreachable"), "no bytes for idleMs: the connection is given up");
    quick.close(); i.close();
  } finally { origin.behave = null; }
});

test("a host saying slow down (a 503, a 429, GitHub's rate-limited 403, any 403 from Common Crawl) is retried fifteen times, about ten minutes, and then fails", async () => {
  origin.behave = (req, res) => {
    if (req.url === "/archive/busy") { res.statusCode = 503; res.end(); return true; }
    if (req.url === "/archive/slow") { res.statusCode = 429; res.end(); return true; }
    if (req.url === "/github/limited") { res.statusCode = 403; res.setHeader("x-ratelimit-remaining", "0"); res.end(); return true; }
    if (req.url === "/archive/waf") { res.statusCode = 403; res.end(); return true; }
    if (req.url === "/index/waf") { res.statusCode = 403; res.end(); return true; }
    return false;
  };
  try {
    const i = input();
    for (const [path, status] of [["archive/busy", 503], ["archive/slow", 429], ["github/limited", 403], ["archive/waf", 403], ["index/waf", 403]] as const) {
      slept.length = 0;
      await assert.rejects(i.open(`${origin.origin}/${path}`), reason("status", status), path);
      assert.deepEqual(slept, THROTTLED, `${path}: fifteen retries, doubling from one second, at most a minute`);
      assert.equal(origin.requests.filter((p) => p === path).length, 16, path);
    }
    i.close();
  } finally { origin.behave = null; }
});

test("a 403 from Common Crawl is its rate limit: it pauses every request of the input, and the request recovers when the host answers 200", async () => {
  let n = 0;
  origin.behave = (req, res) => {
    if (req.url === "/archive/blocked" && n++ < 3) { res.statusCode = 403; res.end(); return true; }
    if (req.url === "/archive/blocked") { res.end("ok"); return true; }
    if (req.url === "/archive/other") { res.end("ok"); return true; }
    return false;
  };
  try {
    let t = 0; const waits: number[] = [];
    const j = new Input(bases, { test: true, ccRate: Infinity, now: () => t, sleep: async (ms) => { waits.push(ms); t += ms; } });
    assert.equal(Buffer.from(await j.readAll(`${origin.origin}/archive/blocked`, 10)).toString(), "ok");
    assert.deepEqual(waits, [1000, 2000, 4000], "the shared pause, doubling");
    t -= 3000;   // back inside the last pause: another request waits out what is left of it
    await j.readAll(`${origin.origin}/archive/other`, 10);
    assert.equal(waits.at(-1), 3000, "another request waits out the same pause");
    j.close();
  } finally { origin.behave = null; }
});

test("onThrottle is told the host, the status and the pause each time a host says slow down, and never for a fault", async () => {
  const n: Record<string, number> = {};
  origin.behave = (req, res) => {
    const u = req.url ?? ""; const k = n[u] = (n[u] ?? 0) + 1;
    if (u === "/archive/twice" && k <= 2) { res.statusCode = k === 1 ? 403 : 429; if (k === 2) res.setHeader("retry-after", "7"); res.end(); return true; }
    if (u === "/archive/broken-once" && k === 1) { res.statusCode = 500; res.end(); return true; }
    if (req.url?.startsWith("/archive/")) { res.end("ok"); return true; }
    return false;
  };
  try {
    const told: [string, number, number][] = [];
    const j = input({ onThrottle: (host: string, status: number, ms: number) => { told.push([host, status, ms]); } });
    await j.readAll(`${origin.origin}/archive/twice`, 10);
    const host = new URL(origin.origin).hostname;
    assert.deepEqual(told, [[host, 403, 1000], [host, 429, 7000]]);
    await j.readAll(`${origin.origin}/archive/broken-once`, 10);
    assert.equal(n["/archive/broken-once"], 2, "the 500 was retried");
    assert.equal(told.length, 2, "a 500 is a fault, not a slow-down");
    j.close();
  } finally { origin.behave = null; }
});

test("one pause is reported once, however many answers arrive inside it; a Retry-After that extends it is reported again", async () => {
  const seen: Record<string, number> = {};
  origin.behave = (req, res) => {
    const u = req.url ?? ""; seen[u] = (seen[u] ?? 0) + 1;
    if (u.startsWith("/archive/wave") && seen[u] === 1) { res.statusCode = 403; res.end(); return true; }
    if (u === "/archive/longer" && seen[u] === 1) { res.statusCode = 429; res.setHeader("retry-after", "7"); res.end(); return true; }
    if (u.startsWith("/archive/")) { res.end("ok"); return true; }
    return false;
  };
  try {
    const told: [string, number, number][] = [];
    const j = new Input(bases, { test: true, now: () => 0, sleep: async () => {}, onThrottle: (h: string, s: number, ms: number) => { told.push([h, s, ms]); } });
    const host = new URL(origin.origin).hostname;
    await Promise.all(Array.from({ length: 16 }, (_, k) => j.readAll(`${origin.origin}/archive/wave${k}`, 10)));
    assert.deepEqual(told, [[host, 403, 1000]], "sixteen workers blocked together: one line");
    await j.readAll(`${origin.origin}/archive/longer`, 10);
    assert.deepEqual(told.at(-1), [host, 429, 7000], "a pause extended by a Retry-After is reported again");
    assert.equal(told.length, 2);
    j.close();
  } finally { origin.behave = null; }
});

test("slow-downs and faults have separate budgets: an archive URL answering 403 and 500 alternately is tried 18 times, then fails", async () => {
  let n = 0;
  origin.behave = (req, res) => {
    if (req.url !== "/archive/alternating") return false;
    res.statusCode = n++ % 2 === 0 ? 403 : 500; res.end(); return true;
  };
  try {
    const i = input();
    await assert.rejects(i.open(`${origin.origin}/archive/alternating`), reason("status", 500));
    assert.equal(n, 18, "9 slow-downs, 8 retried faults and the final fault");
    i.close();
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
    const j = new Input(bases, { test: true, ccRate: Infinity, now: () => t, sleep: async (ms) => { waits.push(ms); } });   // a clock that does not move
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

/** A clock that each sleep moves to its end, as time would, sleeps begun together ending together; `starts` records where each sleep ends, the start it waited for. */
const pacedClock = () => {
  let t = 0;
  const starts: number[] = [];
  const sleep = async (ms: number) => { const end = t + ms; starts.push(end); await new Promise((r) => setImmediate(r)); t = Math.max(t, end); };
  return { starts, now: () => t, sleep };
};
const spacing = (starts: number[]) => { const all = [0, ...[...starts].sort((a, b) => a - b)]; return all.slice(1).map((s, k) => s - all[k]!); };   // the first start is at 0

test("requests to Common Crawl's archive start at most five a second, shared by every worker of the input", async () => {
  origin.behave = (req, res) => { if (req.url?.startsWith("/archive/p")) { res.end("x"); return true; } return false; };
  try {
    const c = pacedClock();
    const i = new Input(bases, { test: true, now: c.now, sleep: c.sleep, ccRate: 5 });
    const before = origin.requests.length;
    await Promise.all(Array.from({ length: 10 }, (_, k) => i.readAll(`${origin.origin}/archive/p${k}`, 10)));
    assert.equal(origin.requests.length - before, 10);
    assert.equal(c.starts.length, 9, "the first starts at once, the other nine wait");
    assert.ok(spacing(c.starts).every((d) => d >= 200), `no two starts closer than 200 ms: ${c.starts.join(",")}`);
    assert.ok(Math.max(...c.starts) >= 1800, "ten starts span at least 1.8 s of clock");
    i.close();
  } finally { origin.behave = null; }
});

test("requests to Common Crawl's index are paced too, sharing the archive's spacing", async () => {
  origin.behave = (req, res) => { if (req.url?.startsWith("/archive/q") || req.url?.startsWith("/index/q")) { res.end("x"); return true; } return false; };
  try {
    const c = pacedClock();
    const i = new Input(bases, { test: true, now: c.now, sleep: c.sleep, ccRate: 5 });
    await Promise.all(Array.from({ length: 10 }, (_, k) => i.readAll(`${origin.origin}/${k % 2 === 0 ? "archive" : "index"}/q${k}`, 10)));
    assert.equal(c.starts.length, 9);
    assert.ok(spacing(c.starts).every((d) => d >= 200), `one spacing for both hosts: ${c.starts.join(",")}`);
    assert.ok(Math.max(...c.starts) >= 1800);
    i.close();
  } finally { origin.behave = null; }
});

test("requests to GitHub are not paced by Common Crawl's rate", async () => {
  origin.behave = (req, res) => { if (req.url?.startsWith("/github/r")) { res.end("x"); return true; } return false; };
  try {
    const c = pacedClock();
    const i = new Input(bases, { test: true, now: c.now, sleep: c.sleep, ccRate: 5 });
    await Promise.all(Array.from({ length: 10 }, (_, k) => i.readAll(`${origin.origin}/github/r${k}`, 10)));
    assert.deepEqual(c.starts, [], "no sleeps");
    i.close();
  } finally { origin.behave = null; }
});

test("a retry after a slow-down is spaced like any other start", async () => {
  let n = 0;
  origin.behave = (req, res) => {
    if (req.url !== "/archive/retried") return false;
    if (n++ === 0) { res.statusCode = 403; res.end(); return true; }
    res.end("ok"); return true;
  };
  try {
    const c = pacedClock();
    const waits: number[] = [];
    const i = new Input(bases, { test: true, now: c.now, sleep: async (ms) => { waits.push(ms); await c.sleep(ms); }, ccRate: 5, pause: 50 });
    assert.equal(Buffer.from(await i.readAll(`${origin.origin}/archive/retried`, 10)).toString(), "ok");
    assert.deepEqual(waits, [50, 150], "the 50 ms pause, then what is left of the 200 ms spacing since the first start");
    i.close();
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
    const i = new Input(bases, { test: true, sleep, connections: 3, ccRate: Infinity });
    await Promise.all(Array.from({ length: 9 }, (_, k) => i.readAll(`${origin.origin}/archive/c${k}`, 10)));
    assert.equal(peak, 3);
    i.close();
  } finally { origin.behave = null; }
});

test("an https input connects only to the address its name was checked to, and a certificate no authority signed is unreachable", async () => {
  const secure = await Origin.start(true);
  const resolved: number[] = [];   // at each connection the server sees, how many lookups had been made
  const calls: string[] = [];
  secure.server.on("connection", () => resolved.push(calls.length));
  try {
    secure.put("archive/x", "ok");
    const port = new URL(secure.origin).port;
    const far = { archive: `https://archive.test:${port}/archive/`, index: `https://index.test:${port}/`, github: `https://github.test:${port}/` };
    const i = new Input(far, { test: true, sleep: async () => {}, resolve: async (h) => { calls.push(h); return ["127.0.0.1"]; } });
    // archive.test resolves nowhere: only the injected answer can have brought these connections to the local origin.
    await assert.rejects(i.open(`https://archive.test:${port}/archive/x`), reason("unreachable"), "self-signed: refused, then retried");
    i.close();
    assert.ok(calls.length > 0 && calls.every((h) => h === "archive.test"), "the name was resolved through the injected resolver");
    assert.deepEqual(resolved, calls.map((_, k) => k + 1), "each try resolved the name once and then connected once, to the checked address");
    assert.equal(secure.requests.length, 0, "no request was sent over a connection whose certificate failed");
  } finally { await secure.close(); }
});

test("an https input verifies the certificate even with NODE_TLS_REJECT_UNAUTHORIZED=0 in the environment", async () => {
  const secure = await Origin.start(true);
  try {
    secure.put("x", "ok");
    const address = `${secure.origin}/x`;
    const child = fileURLToPath(new URL("./helpers/fetch-child.ts", import.meta.url));
    const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
    const run = async (mode: string) => JSON.parse((await promisify(execFile)(process.execPath, [child, mode, address], { env })).stdout) as { outcome: string };
    assert.equal((await run("lax")).outcome, "ok", "the control: with the option left to its default, the variable turns the check off");
    assert.equal((await run("input")).outcome, "unreachable", "the input's explicit rejectUnauthorized: true wins over the variable");
  } finally { await secure.close(); }
});
