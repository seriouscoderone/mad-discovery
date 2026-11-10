import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fetchJson, USER_AGENT, type Resolve } from "../src/fetch.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
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
    origin.behave = (_req, res) => { res.statusCode = status; res.setHeader("location", "http://elsewhere.test/y.json"); res.end(); return true; };
    const r = await fetchLocal("x.json");
    assert.equal(r.outcome, "redirected");
    if (r.outcome === "redirected") assert.equal(r.target, "http://elsewhere.test/y.json");
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
  const resolve: Resolve = async (h) => { calls.push(h); return ["93.184.216.34"]; };
  for (const bad of ["https://1.2.3.4/x.json", "https://localhost/x.json", "https://a.test:8443/x.json", "https://a.test/x.json?q", "ftp://a.test/x.json"]) {
    assert.equal((await fetchJson(bad, { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", bad);
  }
  assert.equal((await fetchJson(url("x.json"), { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", "plain http outside tests");
  assert.deepEqual(calls, []);
});

test("the name is resolved once and the socket gets the checked answer", async () => {
  const port = new URL(origin.origin).port;
  const answers = [["127.0.0.1"], ["203.0.113.1"]];
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
  for (const answers of [["127.0.0.1"], ["93.184.216.34", "10.0.0.1"], ["::1"], []]) {
    const r = await fetchJson("https://a.test/x.json", { timeoutMs: 1000, maxBytes: 1000, resolve: async () => answers });
    assert.equal(r.outcome, "refused-address", JSON.stringify(answers));
  }
  assert.equal(origin.requests.length, before);
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
