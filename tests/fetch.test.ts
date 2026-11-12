import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fetchJson, USER_AGENT, type Resolve } from "../src/fetch.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
// A failed assertion must not leave a hostile answer in place for the tests after it.
afterEach(() => { origin.behave = null; });
const body = new TextEncoder().encode('{"a":1}');
origin.put("x.json", body);
const url = (path: string) => `${origin.origin}/${path}`;
const quick = { test: true, timeoutMs: 2000, maxBytes: 1_000_000 };
const fetchLocal = (path: string, more: Partial<Parameters<typeof fetchJson>[1]> = {}) => fetchJson(url(path), { ...quick, ...more });

test("a JSON answer comes back as its bytes, with what was read", async () => {
  const r = await fetchLocal("x.json");
  assert.equal(r.outcome, "ok");
  if (r.outcome === "ok") { assert.deepEqual(r.bytes, body); assert.equal(r.read, body.length); assert.ok(r.ms >= 0); }
});

test("an answer says whether it was sent with Access-Control-Allow-Origin: *, and only * counts", async () => {
  for (const [value, expected] of [[null, false], ["*", true], [" * ", true], ["https://wallet.example", false], ["null", false]] as const) {
    origin.behave = (_req, res) => { if (value !== null) res.setHeader("access-control-allow-origin", value); return false; };
    const r = await fetchLocal("x.json");
    assert.equal(r.outcome, "ok", String(value));
    if (r.outcome === "ok") assert.equal(r.anyOrigin, expected, String(value));
  }
  origin.behave = null;
});

test("a repeated Access-Control-Allow-Origin is not *: browsers refuse more than one value", async () => {
  for (const values of [["*", "*"], ["*", "https://x.example"]]) {
    origin.behave = (_req, res) => { res.setHeader("access-control-allow-origin", values); return false; };
    const r = await fetchLocal("x.json");
    assert.equal(r.outcome, "ok", values.join(", "));
    if (r.outcome === "ok") assert.equal(r.anyOrigin, false, values.join(", "));
  }
});

// What every request carries today; Node adds host and connection.
const sentHeaders = (host: string) => ({ accept: "application/json", "accept-encoding": "identity", "user-agent": USER_AGENT, host, connection: "close" });

test("a request carries exactly the headers it always did, and no Origin", async () => {
  let seen: Record<string, unknown> | null = null;
  origin.behave = (req) => { seen = { ...req.headers }; return false; };
  assert.equal((await fetchLocal("x.json")).outcome, "ok");
  assert.deepEqual(seen, sentHeaders(new URL(origin.origin).host));
});

test("asked to fetch as a browser would, a request also carries Origin: https://wallet.invalid, and nothing else changes", async () => {
  let seen: Record<string, unknown> | null = null;
  origin.behave = (req) => { seen = { ...req.headers }; return false; };
  assert.equal((await fetchLocal("x.json", { asBrowser: true })).outcome, "ok");
  assert.deepEqual(seen, { ...sentHeaders(new URL(origin.origin).host), origin: "https://wallet.invalid" });
});

test("content types: application/json and +json pass, others are invalid", async () => {
  for (const [type, expected] of [["application/schema+json", "ok"], ["Application/JSON; charset=utf-8", "ok"], ["text/plain", "invalid"], ["text/json", "invalid"], ["application/octet-stream", "invalid"]] as const) {
    origin.behave = (_req, res) => { res.setHeader("content-type", type); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, expected, type);
  }
  origin.behave = null;
});

test("status codes map to outcomes", async () => {
  for (const [status, expected] of [[404, "not-found"], [410, "not-found"], [500, "unreachable"], [503, "unreachable"], [403, "invalid"], [401, "invalid"], [204, "invalid"]] as const) {
    origin.behave = (_req, res) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, expected, String(status));
  }
  origin.behave = null;
});

test("a redirect is not followed and names its target", async () => {
  for (const status of [301, 302, 307, 308]) {
    origin.behave = (req, res) => { if (req.url !== "/x.json") return false; res.statusCode = status; res.setHeader("location", `${origin.origin}/y.json`); res.end(); return true; };
    const r = await fetchLocal("x.json");
    assert.equal(r.outcome, "redirected");
    if (r.outcome === "redirected") assert.equal(r.target, `${origin.origin}/y.json`);
  }
  origin.behave = (_req, res) => { res.statusCode = 302; res.end(); return true; };
  const r = await fetchLocal("x.json");
  assert.equal(r.outcome, "redirected");
  if (r.outcome === "redirected") assert.equal(r.target, null);
  origin.behave = null;
  assert.ok(!origin.requests.includes("y.json"));
});

test("a content encoding is refused; identity names none and passes", async () => {
  for (const encoding of ["gzip", "br", "deflate", "identity, gzip"]) {
    origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.setHeader("content-encoding", encoding); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, "invalid", encoding);
  }
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.setHeader("content-encoding", "identity"); res.end("{}"); return true; };
  assert.equal((await fetchLocal("x.json")).outcome, "ok");
  origin.behave = null;
});

test("the size limit is enforced while reading", async () => {
  const big = new Uint8Array(1000).fill(0x20);
  origin.put("big.json", big);
  assert.equal((await fetchLocal("big.json", { maxBytes: 1000 })).outcome, "ok");
  const r = await fetchLocal("big.json", { maxBytes: 999 });
  assert.equal(r.outcome, "invalid");
  assert.ok(r.read >= 1000, "what was read is counted even when refused");
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.write("x".repeat(300)); res.write("x".repeat(300)); res.end(); return true; };
  assert.equal((await fetchLocal("x.json", { maxBytes: 100 })).outcome, "invalid", "chunked, no stated length: cut while reading");
  origin.behave = null;
});

test("a slow body and a silent server time out at the request limit", async () => {
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.write("["); const t = setInterval(() => res.write("1,"), 100); res.on("close", () => clearInterval(t)); return true; };
  const t0 = performance.now();
  const r = await fetchLocal("x.json", { timeoutMs: 300 });
  assert.equal(r.outcome, "timed-out");
  assert.ok(performance.now() - t0 < 2000);
  origin.behave = (_req, _res) => true;   // accepts and never answers
  assert.equal((await fetchLocal("x.json", { timeoutMs: 300 })).outcome, "timed-out");
  origin.behave = null;
});

test("a closed port is unreachable", async () => {
  const dead = await Origin.start();
  const address = `${dead.origin}/x.json`;
  await dead.close();
  assert.equal((await fetchJson(address, quick)).outcome, "unreachable");
});

test("the address rule is applied before anything is resolved", async () => {
  const calls: string[] = [];
  // Records and throws: were the rule to regress, the request would end unreachable here, never on a socket to anywhere.
  const resolve: Resolve = async (h) => { calls.push(h); throw new Error("the resolver must not be asked"); };
  // Literals are loopback, so even a regressed rule connects to nothing beyond this machine.
  for (const bad of ["https://127.0.0.1/x.json", "https://[::1]/x.json", "https://localhost/x.json", "https://a.test:8443/x.json", "https://a.test/x.json?q", "ftp://a.test/x.json"]) {
    assert.equal((await fetchJson(bad, { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", bad);
  }
  assert.equal((await fetchJson(url("x.json"), { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", "plain http outside tests");
  assert.deepEqual(calls, []);
});

test("the name is resolved once and the socket gets the checked answer", async () => {
  const port = new URL(origin.origin).port;
  const answers = [["127.0.0.1"], ["127.0.0.2"]];
  const calls: string[] = [];
  const resolve: Resolve = async (h) => { calls.push(h); return answers.shift()!; };
  const before = origin.requests.length;
  const r = await fetchJson(`http://a.test:${port}/x.json`, { ...quick, resolve });
  assert.equal(r.outcome, "ok", "a.test resolves nowhere; only the injected answer could have reached the server");
  assert.deepEqual(calls, ["a.test"]);
  assert.equal(answers.length, 1, "the second answer was never asked for");
  assert.equal(origin.requests.length, before + 1);
});

test("an answer that is not public is refused without a connection", async () => {
  const before = origin.requests.length;
  // Outside tests, loopback answers only: a regressed check would connect to this machine's port 443 and nowhere else.
  for (const answers of [["127.0.0.1"], ["::1"], []]) {
    const r = await fetchJson("https://a.test/x.json", { timeoutMs: 1000, maxBytes: 1000, resolve: async () => answers });
    assert.equal(r.outcome, "refused-address", JSON.stringify(answers));
  }
  // Every answer is checked, not the first: under test the loopback answer alone would pass, and it comes first, so a check of the
  // first answer only would reach the local origin, where the request log would show it.
  const port = new URL(origin.origin).port;
  const mixed = await fetchJson(`http://a.test:${port}/x.json`, { ...quick, resolve: async () => ["127.0.0.1", "10.0.0.1"] });
  assert.equal(mixed.outcome, "refused-address");
  assert.equal(origin.requests.length, before);
});

test("with two admitted answers the first is used, and the request names the host", async () => {
  const port = new URL(origin.origin).port;
  let host: string | undefined;
  origin.behave = (req) => { host = req.headers.host; return false; };
  try {
    const r = await fetchJson(`http://a.test:${port}/x.json`, { ...quick, resolve: async () => ["127.0.0.1", "127.0.0.2"] });
    assert.equal(r.outcome, "ok", "the origin listens on 127.0.0.1 only");
    assert.equal(host, `a.test:${port}`);
  } finally { origin.behave = null; }
});

test("a resolver that rejects with something that is not an error is unreachable", async () => {
  for (const reason of [undefined, null, "text"]) {
    const resolve: Resolve = () => Promise.reject(reason);
    assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve })).outcome, "unreachable", String(reason));
  }
});

test("a resolver that never answers times out; one that rejects is unreachable", async () => {
  const never: Resolve = () => new Promise(() => {});
  const t0 = performance.now();
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: never })).outcome, "timed-out");
  assert.ok(performance.now() - t0 < 2000);
  const rejects: Resolve = async () => { throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }); };
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: rejects })).outcome, "unreachable");
  const cancelled: Resolve = async () => { throw Object.assign(new Error("ECANCELLED"), { code: "ECANCELLED" }); };
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: cancelled })).outcome, "timed-out");
});

test("requests carry the tool's name, ask for no encoding, and send no cookie or referer", async () => {
  let seen: Record<string, string | string[] | undefined> = {};
  origin.behave = (req, res) => { seen = req.headers; res.setHeader("content-type", "application/json"); res.end("{}"); return true; };
  await fetchLocal("x.json");
  origin.behave = null;
  assert.equal(seen["user-agent"], USER_AGENT);
  assert.equal(USER_AGENT, "mad-discovery (+https://github.com/seriouscoderone/mad-discovery)");
  assert.equal(seen["accept-encoding"], "identity");
  assert.equal(seen["cookie"], undefined);
  assert.equal(seen["referer"], undefined);
});

test("proxy settings in the environment are ignored by the routine and obeyed by the global agent", async () => {
  const child = fileURLToPath(new URL("./helpers/fetch-child.ts", import.meta.url));
  const env = { ...process.env, NODE_USE_ENV_PROXY: "1", HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", http_proxy: "http://127.0.0.1:9", https_proxy: "http://127.0.0.1:9" };
  const port = new URL(origin.origin).port;
  const run = async (mode: string) => JSON.parse((await promisify(execFile)(process.execPath, [child, mode, `http://a.test:${port}/x.json`], { env })).stdout) as { outcome: string };
  assert.equal((await run("routine")).outcome, "ok");
  assert.equal((await run("global")).outcome, "error", "the control: the global agent went to the proxy and failed");
});

test("a certificate no authority signed is unreachable, and the environment cannot turn the check off", async () => {
  const secure = await Origin.start(true);
  try {
    secure.put("x.json", "{}");
    const address = `${secure.origin}/x.json`;
    assert.equal((await fetchJson(address, quick)).outcome, "unreachable", "self-signed: refused");
    const child = fileURLToPath(new URL("./helpers/fetch-child.ts", import.meta.url));
    const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
    const run = async (mode: string) => JSON.parse((await promisify(execFile)(process.execPath, [child, mode, address], { env })).stdout) as { outcome: string };
    assert.equal((await run("lax")).outcome, "ok", "the control: with the option left to its default, the variable turns the check off");
    assert.equal((await run("routine")).outcome, "unreachable", "the routine's explicit rejectUnauthorized: true wins over the variable");
  } finally { await secure.close(); }
});
