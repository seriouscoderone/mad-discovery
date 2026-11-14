// Runs in a child process so that NODE_USE_ENV_PROXY and NODE_TLS_REJECT_UNAUTHORIZED, read at startup, are in force.
// "routine" uses fetchJson and "input" a finder's Input; "global" (the proxy control) and "lax" (the TLS control) show the environment
// did take effect.
import http from "node:http";
import https from "node:https";
import { fetchJson } from "../../src/fetch.ts";
import { Input, InputError } from "../../src/finders/input.ts";

const [mode, address] = process.argv.slice(2) as [string, string];
if (mode === "routine") {
  const r = await fetchJson(address, { test: true, timeoutMs: 3000, maxBytes: 1_000_000, resolve: async () => ["127.0.0.1"] });
  process.stdout.write(JSON.stringify({ outcome: r.outcome }));
} else if (mode === "input") {
  // The address is under the archive base; a failed try is not waited for, so the input's retries take no time.
  const archive = `${new URL(address).origin}/`;
  const input = new Input({ archive, index: `${archive}index/`, github: `${archive}github/` }, { test: true, sleep: async () => {}, resolve: async () => ["127.0.0.1"] });
  let outcome = "ok";
  try { await input.readAll(address, 1_000_000); } catch (e) { outcome = e instanceof InputError ? e.reason : "error"; }
  input.close();
  process.stdout.write(JSON.stringify({ outcome }));
} else if (mode === "lax") {
  // The TLS control: a plain https request with rejectUnauthorized left to its default, which NODE_TLS_REJECT_UNAUTHORIZED=0 turns off.
  const url = new URL(address);
  const outcome = await new Promise<string>((resolve) => {
    const req = https.request({ hostname: url.hostname, port: url.port, path: url.pathname, agent: new https.Agent({ keepAlive: false }) }, (res) => { res.resume(); res.on("end", () => resolve("ok")); });
    req.on("error", () => resolve("error"));
    req.end();
  });
  process.stdout.write(JSON.stringify({ outcome }));
} else {
  const url = new URL(address);
  const outcome = await new Promise<string>((resolve) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, agent: http.globalAgent, lookup: (_h, o, cb) => { if (o.all) cb(null, [{ address: "127.0.0.1", family: 4 }]); else cb(null, "127.0.0.1", 4); } }, (res) => { res.resume(); res.on("end", () => resolve("ok")); });
    req.on("error", () => resolve("error"));
    req.setTimeout(3000, () => { req.destroy(); resolve("error"); });
    req.end();
  });
  process.stdout.write(JSON.stringify({ outcome }));
}
