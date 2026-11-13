import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, type Io } from "../src/cli.ts";
import { asciiJson } from "../src/json.ts";
import { readInputs } from "../src/inputs.ts";
import { saidOf } from "../src/said.ts";
import { WALK, CATALOG } from "../src/limits.ts";
import { Origin } from "./helpers/servers.ts";

const bin = fileURLToPath(new URL("../bin/mad-discovery.ts", import.meta.url));
const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, json: r.stdout.trim() === "" ? null : JSON.parse(r.stdout) };
};
const gymDir = () => { const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(join(fixtures, "pretty"), d, { recursive: true }); return d; };
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";
const capture = () => { const o: string[] = [], e: string[] = []; const io: Io = { out: (s) => { o.push(s); }, err: (s) => { e.push(s); } }; return { io, out: () => o.join(""), err: () => e.join(""), json: () => JSON.parse(o.join("")) as Record<string, unknown> }; };
const local = { test: true, limits: { ...WALK, requestMs: 2000, runMs: 10_000 } };
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const compactInputs = readInputs(join(fixtures, "compact")).inputs;
const CAN_READ = "can read this file: it was sent with Access-Control-Allow-Origin: *";
const CANNOT_READ = "cannot read this file: it was sent without Access-Control-Allow-Origin: *";

test("build writes a source and reports", () => {
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  const r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", out);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json.written, 26 * 2 + 4, "26 definitions, 26 pages, source.json, index, style, sitemap");
  assert.equal(r.json.serves.length, 26);
  assert.equal(r.json.robots, "Mad-Source: https://gym.example/mad/source.json");
  assert.equal(r.json.sitemap, "Sitemap: https://gym.example/mad/sitemap.xml");
  assert.ok(/^[\x20-\x7e\n]*$/.test(r.out), "ASCII-only output");
  assert.equal(readdirSync(join(out, "definitions")).length, 26);
  assert.ok(!("refused" in r.json), "a refusal exits 1, so success carries no refused list");
  assert.ok(!("warnings" in r.json), "well-formed inputs give no warnings");
});

test("build refuses and writes nothing", () => {
  const dir = gymDir();
  writeFileSync(join(dir, "notes.json"), "{}");
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  let r = run("build", dir, "--config", join(fixtures, "gym-config.json"), "--out", out);
  assert.equal(r.code, 1);
  assert.ok(!existsSync(out));
  assert.ok(r.json.problems.some((p: string) => p.includes("notes.json")));
  const cfg = join(mkdtempSync(join(tmpdir(), "cfg-")), "c.json");
  writeFileSync(cfg, JSON.stringify({ source: "https://g.example/mad/source.json", extra: 1 }));
  r = run("build", gymDir(), "--config", cfg, "--out", out);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("unknown member: extra")));
  const full = mkdtempSync(join(tmpdir(), "full-")); writeFileSync(join(full, "x"), "x");
  r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", full);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("not empty")));
  assert.deepEqual(readdirSync(full), ["x"]);
  const file = join(mkdtempSync(join(tmpdir(), "file-")), "site");
  writeFileSync(file, "keep");
  r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", file);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("is not a folder")));
  assert.equal(readFileSync(file, "utf8"), "keep");
});

test("verify a file", () => {
  let r = run("verify", join(fixtures, "compact", `${QVI}.json`), QVI);
  assert.equal(r.code, 0);
  assert.equal(r.json.verified, true);
  r = run("verify", join(fixtures, "pretty", `${QVI}.json`), QVI);
  assert.equal(r.code, 1);
  assert.equal(r.json.verified, false);
  assert.equal(r.json.expected, QVI);
  assert.match(r.json.reason, /digest/);
});

test("usage errors exit 2", () => {
  assert.equal(run("verify", join(fixtures, "compact", `${QVI}.json`)).code, 2);
  assert.equal(run("nonsense").code, 2);
  assert.equal(run().code, 2);
  const config = join(fixtures, "gym-config.json");
  for (const args of [["build", gymDir(), "--out", "--config", config], ["build", gymDir(), "--config", "--out", "o"]]) {
    const cwd = mkdtempSync(join(tmpdir(), "cwd-"));
    const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8", cwd });
    assert.equal(r.status, 2, args.join(" "));
    assert.ok(!existsSync(join(cwd, "--config")), "no --config folder written");
    assert.deepEqual(readdirSync(cwd), [], "nothing written");
  }
});

test("asciiJson escapes everything outside printable ASCII", () => {
  const value = { a: "\u00e9\u007f\u{1F600}\u2028\u0001" };
  const s = asciiJson(value);
  assert.match(s, /^[\x20-\x7e\n]*$/);
  assert.ok(s.includes("\\u00e9"));
  assert.ok(s.includes("\\ud83d\\ude00"));
  assert.ok(s.includes("\\u2028"));
  assert.deepEqual(JSON.parse(s), value);
});

test("who prints the report and exits 0; a start that cannot be read exits 1; usage errors exit 2", async () => {
  const [a, b] = [await Origin.start(), await Origin.start()];
  try {
    const bAddr = `${b.origin}/mad/source.json`;
    b.source("mad/", { serve: [SELECTION], publications: [{ target: SELECTION, name: "caf\u00e9", description: "d", tags: [], collection: "c" }] }, compactInputs);
    // A control character in a publication's name cannot pass the configuration; a hostile source puts one on the wire by hand and the
    // reader drops and counts it. A definition whose key holding the SAID is an escape sequence reaches the report as a path. The key is
    // written with the JSON escape, six characters on the wire: a raw control character inside a JSON string is not JSON.
    const bDoc = JSON.parse(new TextDecoder().decode(b.files.get("mad/source.json")!)) as { serves: unknown[]; publications: unknown[] };
    bDoc.publications.push({ target: SELECTION, name: "\u001b[31m", description: "d", tags: [], collection: "c" });
    const shape = (said: string) => `{"d":"${said}","\\u001b[31m":"${SELECTION}"}`;
    const evil = saidOf(new TextEncoder().encode(shape("#".repeat(44))));
    bDoc.serves.push({ said: evil, refers: [SELECTION] });
    b.put("mad/source.json", JSON.stringify(bDoc));
    b.put(`mad/definitions/${evil}.json`, shape(evil));
    const { address } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, compactInputs);
    let c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address], c.io, local), 0);
    assert.equal((c.json().serves as unknown[]).length, 2);
    assert.ok(/^[\x20-\x7e\n]*$/.test(c.out()), "ASCII-only");
    assert.ok(c.out().includes("caf\\u00e9"), "non-ASCII escaped");
    assert.ok(c.out().includes("\\u001b[31m") && !c.out().includes("\u001b"), "the escape sequence in the path is written as text, never raw");
    assert.deepEqual(c.json().dropped, [{ source: bAddr, entries: 0, publications: 1 }], "the hostile publication was dropped and counted");
    assert.deepEqual((c.json().referrers as { said: string; paths: string[] }[]).map((e) => [e.said, e.paths]), [[evil, ["/\u001b[31m"]]]);
    assert.equal(c.err(), "");

    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    c = capture();
    assert.equal(await main(["who", SELECTION, "--from", deadAddr], c.io, local), 1);
    assert.deepEqual(c.json(), { said: SELECTION, from: deadAddr, problem: "the starting source could not be read: unreachable" });

    for (const args of [["who"], ["who", "nope", "--from", address], ["who", SELECTION], ["who", SELECTION, "--from", `${a.origin}/mad/other.json`]]) {
      c = capture();
      assert.equal(await main(args, c.io, local), 2, args.join(" "));
      assert.equal(c.out(), "");
      assert.ok(c.err().startsWith("usage:"));
    }
  } finally { await a.close(); await b.close(); }
});

test("get checks --out first, writes verified files only, and reports", async () => {
  const a = await Origin.start();
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const full = mkdtempSync(join(tmpdir(), "full-")); writeFileSync(join(full, "x"), "x");
    let c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", full], c.io, local), 1);
    assert.deepEqual(c.json(), { problems: [`${full} is not empty`] });
    assert.equal(a.requests.length, 0, "no request before the out-folder check");

    const out = join(mkdtempSync(join(tmpdir(), "get-")), "home");
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", out], c.io, local), 0);
    const written = c.json().written as string[];
    assert.deepEqual(readdirSync(out).sort(), written.map((s) => `${s}.json`).sort());
    assert.equal(c.json().said, SELECTION);

    a.put(`mad/definitions/${SELECTION}.json`, "{}");
    const out2 = join(mkdtempSync(join(tmpdir(), "get-")), "home");
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", out2], c.io, local), 1);
    assert.equal(c.json().problem, "the definition asked for was not fetched and verified");
    assert.ok(!existsSync(out2));
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address], c.io, local), 2, "--out is required");
  } finally { await a.close(); }
});

test("verify over an address fetches through the routine", async () => {
  const a = await Origin.start();
  try {
    a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const address = `${a.origin}/mad/definitions/${SELECTION}.json`;
    let c = capture();
    assert.equal(await main(["verify", address, SELECTION], c.io, local), 0);
    assert.deepEqual(c.json(), { verified: true, said: SELECTION, address, bytes: compactInputs.get(SELECTION)!.length, browserWallets: CANNOT_READ });
    c = capture();
    assert.equal(await main(["verify", address, QVI], c.io, local), 1);
    assert.equal(c.json().reason, "the SAID is not in the bytes");
    assert.equal(c.json().address, address);
    c = capture();
    assert.equal(await main(["verify", `${a.origin}/mad/definitions/missing.json`, SELECTION], c.io, local), 1);
    assert.deepEqual(c.json(), { verified: false, expected: SELECTION, address: `${a.origin}/mad/definitions/missing.json`, reason: "not-found" });
    c = capture();
    assert.equal(await main(["verify", "https://1.2.3.4/x.json", SELECTION], c.io, local), 1);
    assert.deepEqual(c.json(), { verified: false, expected: SELECTION, address: "https://1.2.3.4/x.json", reason: "refused-address" });
    c = capture();
    assert.equal(await main(["verify", address, SELECTION], c.io), 1, "outside tests the local address fails the rule");
    assert.equal(c.json().reason, "refused-address");
  } finally { await a.close(); }
});

test("verify over an address says whether browser wallets can read the file, and the header never changes the exit status", async () => {
  const a = await Origin.start();
  try {
    const { address: source } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const definition = `${a.origin}/mad/definitions/${SELECTION}.json`;
    // A mixed source: the source document carries the header, the definition does not.
    a.behave = (req, res) => { if (req.url === "/mad/source.json") res.setHeader("access-control-allow-origin", "*"); return false; };
    let c = capture();
    assert.equal(await main(["verify", definition, SELECTION], c.io, local), 0, "absence of the header is not a failure");
    assert.equal(c.json().verified, true);
    assert.equal(c.json().browserWallets, CANNOT_READ);
    c = capture();
    assert.equal(await main(["verify", source, SELECTION], c.io, local), 1, "the source document is not the definition: the byte check fails as before");
    assert.equal(c.json().browserWallets, CAN_READ, "reported after the existing checks, whatever they found");
    // The whole source carries it.
    a.behave = (_req, res) => { res.setHeader("access-control-allow-origin", "*"); return false; };
    c = capture();
    assert.equal(await main(["verify", definition, SELECTION], c.io, local), 0);
    assert.deepEqual(c.json(), { verified: true, said: SELECTION, address: definition, bytes: compactInputs.get(SELECTION)!.length, browserWallets: CAN_READ });
    // A wrong SAID still exits 1 with the header present.
    c = capture();
    assert.equal(await main(["verify", definition, QVI], c.io, local), 1);
    assert.equal(c.json().browserWallets, CAN_READ);
  } finally { a.behave = null; await a.close(); }
});

test("verify asks as a browser would: a host that sends the header only to a request with Origin is reported readable", async () => {
  const a = await Origin.start();
  try {
    a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const definition = `${a.origin}/mad/definitions/${SELECTION}.json`;
    const origins: unknown[] = [];
    // As CloudFront's SimpleCORS policy does: the header only when the request carries Origin.
    a.behave = (req, res) => { origins.push(req.headers.origin); if (req.headers.origin !== undefined) res.setHeader("access-control-allow-origin", "*"); return false; };
    const c = capture();
    assert.equal(await main(["verify", definition, SELECTION], c.io, local), 0);
    assert.deepEqual(c.json(), { verified: true, said: SELECTION, address: definition, bytes: compactInputs.get(SELECTION)!.length, browserWallets: CAN_READ });
    assert.deepEqual(origins, ["https://wallet.invalid"]);
    // A host that echoes the request's origin back allows that one origin, not every wallet.
    a.behave = (req, res) => { if (typeof req.headers.origin === "string") res.setHeader("access-control-allow-origin", req.headers.origin); return false; };
    const e = capture();
    assert.equal(await main(["verify", definition, SELECTION], e.io, local), 0);
    assert.equal(e.json().browserWallets, CANNOT_READ);
  } finally { a.behave = null; await a.close(); }
});

test("who and get send no Origin header: only verify asks as a browser", async () => {
  const a = await Origin.start();
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const seen: string[][] = [];
    a.behave = (req) => { seen.push(Object.keys(req.headers).sort()); return false; };
    assert.equal(await main(["who", SELECTION, "--from", address], capture().io, local), 0);
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", join(mkdtempSync(join(tmpdir(), "get-")), "out")], capture().io, local), 0);
    assert.ok(seen.length >= 4, "who and get each fetched the source and the definition");
    for (const names of seen) assert.deepEqual(names, ["accept", "accept-encoding", "connection", "host", "user-agent"]);
  } finally { a.behave = null; await a.close(); }
});

test("verify of a file says nothing about browsers: no answer, no header", () => {
  const r = run("verify", join(fixtures, "compact", `${QVI}.json`), QVI);
  assert.equal(r.code, 0);
  assert.ok(!("browserWallets" in r.json));
});

test("the usage names five commands", () => {
  const r = run();
  assert.equal(r.code, 2);
  for (const cmd of ["build <folder>", "verify <file or address> <SAID>", "verify <source address>", "who <SAID> --from <source address> [--catalog <catalog address>]", "get <SAID> --from <source address> --out <folder>", "catalog build --out <folder> [--candidates <file>]... [--from <source address>]..."]) assert.ok(r.err.includes(cmd), cmd);
});

test("an out folder filled during the run is a reported failure, never a crash", async () => {
  const a = await Origin.start();
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const out = mkdtempSync(join(tmpdir(), "filled-"));
    // Passes the check before any request; another process writes into it while the definition is fetched.
    a.behave = (req) => { if (req.url === `/mad/definitions/${SELECTION}.json`) writeFileSync(join(out, "intruder"), "x"); return false; };
    const c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", out], c.io, local), 1);
    assert.deepEqual(c.json(), { problems: [`${out} is not empty`] });
    assert.deepEqual(readdirSync(out), ["intruder"], "nothing of ours was written");
  } finally { a.behave = null; await a.close(); }
});

test("a redirect is reported with its target by verify and by who; a --from that fails the rule is usage for get", async () => {
  const a = await Origin.start();
  try {
    a.behave = (_req, res) => { res.statusCode = 302; res.setHeader("location", "https://moved.test/x.json"); res.end(); return true; };
    const address = `${a.origin}/mad/definitions/${SELECTION}.json`;
    let c = capture();
    assert.equal(await main(["verify", address, SELECTION], c.io, local), 1);
    assert.deepEqual(c.json(), { verified: false, expected: SELECTION, address, reason: "redirected", target: "https://moved.test/x.json" });
    const from = `${a.origin}/mad/source.json`;
    c = capture();
    assert.equal(await main(["who", SELECTION, "--from", from], c.io, local), 1);
    assert.deepEqual(c.json(), { said: SELECTION, from, problem: "the starting source could not be read: redirected", target: "https://moved.test/x.json" });
    const out = join(mkdtempSync(join(tmpdir(), "get-")), "home");
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", `${a.origin}/mad/other.json`, "--out", out], c.io, local), 2);
    assert.equal(c.out(), "");
    assert.ok(c.err().includes("--from must be a source address"));
    assert.ok(!existsSync(out));
    assert.ok(!a.requests.includes("mad/other.json"), "nothing was asked at the refused address");
  } finally { a.behave = null; await a.close(); }
});

test("build at a host root writes and reports the AI Catalog file; under a path it reports null", () => {
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  const config = join(mkdtempSync(join(tmpdir(), "cfg-")), "root.json");
  writeFileSync(config, readFileSync(join(fixtures, "gym-config.json"), "utf8").replace("https://gym.example/mad/source.json", "https://gym.example/source.json"));
  const r = run("build", gymDir(), "--config", config, "--out", out);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json.aiCatalog, "https://gym.example/.well-known/ai-catalog.json");
  assert.equal(r.json.written, 26 * 2 + 5, "26 definitions, 26 pages, source.json, index, style, sitemap, the catalog");
  assert.ok(existsSync(join(out, ".well-known", "ai-catalog.json")));
  const under = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", join(mkdtempSync(join(tmpdir(), "out-")), "site"));
  assert.equal(under.json.aiCatalog, null);
});

test("catalog build writes a catalog from --from sources and reports; usage and failures are named; its requests carry a walk's headers and no Origin", async () => {
  const [a, b] = [await Origin.start(), await Origin.start()];
  const headerNames: string[][] = [];
  const robotsOk: NonNullable<Origin["behave"]> = (req, res) => { headerNames.push(Object.keys(req.headers).sort()); if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
  a.behave = robotsOk; b.behave = robotsOk;
  try {
    const aAddr = a.source("mad/", { serve: [SELECTION] }, compactInputs).address;
    const bAddr = b.source("mad/", { serve: [SELECTION] }, compactInputs).address;
    const out = join(mkdtempSync(join(tmpdir(), "cat-")), "catalog");
    let c = capture();
    const catalogLocal = { ...local, limits: { ...CATALOG, requestMs: 2000 } };
    assert.equal(await main(["catalog", "build", "--out", out, "--from", aAddr, "--from", bAddr], c.io, catalogLocal), 0, c.out());
    const r = c.json();
    assert.equal(r.rows, 12); assert.deepEqual(r.sources, { ok: 2, truncated: 0, other: 0 }); assert.equal(r.seeded, true); assert.equal(r.from, 2); assert.equal(r.candidates, 0);
    assert.equal(r.written, 3 + 12 + 2 + 12, "catalog, index, sources; 12 rows; index page, style; 12 pages");
    for (const f of ["catalog.json", "index.json", "sources.json", `said/${SELECTION}.json`, "pages/index.html", `pages/${SELECTION}/index.html`, "pages/style.css"]) assert.ok(existsSync(join(out, f)), f);
    const meta = JSON.parse(readFileSync(join(out, "catalog.json"), "utf8")) as { tool: { commit: string | null } };
    assert.match(meta.tool.commit!, /^[0-9a-f]{40}$/);
    assert.ok(/^[\x20-\x7e\n]*$/.test(c.out()), "ASCII-only");
    assert.ok(headerNames.length >= 4, "robots.txt, the document and the definitions were asked");
    for (const names of headerNames) assert.deepEqual(names, ["accept", "accept-encoding", "connection", "host", "user-agent"]);

    c = capture();
    assert.equal(await main(["catalog", "build", "--out", out, "--from", aAddr], c.io, catalogLocal), 1, "the out folder is not empty now");
    assert.deepEqual(c.json(), { problems: [`${out} is not empty`] });
    const requests = a.requests.length;
    for (const args of [["catalog"], ["catalog", "find", "--finder", "robots", "--out", out], ["catalog", "build", "--out", join(out, "x")], ["catalog", "build", "--out", join(out, "x"), "--from", "https://1.2.3.4/source.json"], ["catalog", "build", "--out", join(out, "y"), "--from", aAddr, "--from", "https://1.2.3.4/source.json"]]) {
      c = capture();
      assert.equal(await main(args, c.io, catalogLocal), 2, args.join(" "));
      assert.equal(c.out(), "");
    }
    assert.equal(a.requests.length, requests, "usage errors fetch nothing");

    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    c = capture();
    const out2 = join(mkdtempSync(join(tmpdir(), "cat-")), "catalog");
    assert.equal(await main(["catalog", "build", "--out", out2, "--from", deadAddr], c.io, catalogLocal), 1);
    assert.deepEqual(c.json(), { problems: ["no source could be read"] });
    assert.ok(!existsSync(out2), "nothing written");

    const bad = join(mkdtempSync(join(tmpdir(), "cand-")), "bad.json");
    writeFileSync(bad, "{}");
    c = capture();
    assert.equal(await main(["catalog", "build", "--out", out2, "--candidates", bad], c.io, catalogLocal), 1);
    assert.deepEqual(c.json(), { problems: [`${bad} is not a candidate file`] });
  } finally { await a.close(); await b.close(); }
});

test("who --catalog passes the catalog through; a bad catalog address is a usage error", async () => {
  const [a, cat] = [await Origin.start(), await Origin.start()];
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const catalogAddr = `${cat.origin}/c/catalog.json`;
    cat.put(`c/said/${SELECTION}.json`, JSON.stringify({ said: SELECTION, serves: [{ source: address }] }));
    let c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address, "--catalog", catalogAddr], c.io, local), 0);
    assert.deepEqual(c.json().catalog, { address: catalogAddr, listed: 1, taken: 0 }, "the one listed source is the start, already visited");
    c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address, "--catalog", "https://c.example/not-a-catalog.json"], c.io, local), 2);
  } finally { await a.close(); await cat.close(); }
});

test("verify over a source document address: readable as a source exits 0 and reports browserWallets; nothing read exits 1", async () => {
  const a = await Origin.start();
  try {
    const { address, plan } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    let c = capture();
    assert.equal(await main(["verify", address], c.io, local), 0, "absence of the header is not a failure");
    assert.deepEqual(c.json(), { source: address, document: "ok", serves: plan.document.serves.length, publications: 0, introductions: 0, dropped: { entries: 0, publications: 0 }, browserWallets: CANNOT_READ });
    // As CloudFront's SimpleCORS policy does: the header only when the request carries Origin.
    const origins: unknown[] = [];
    a.behave = (req, res) => { origins.push(req.headers.origin); if (req.headers.origin !== undefined) res.setHeader("access-control-allow-origin", "*"); return false; };
    c = capture();
    assert.equal(await main(["verify", address], c.io, local), 0);
    assert.equal(c.json().document, "ok");
    assert.equal(c.json().browserWallets, CAN_READ);
    assert.deepEqual(origins, ["https://wallet.invalid"], "one request, asked as a browser would");
    a.behave = null;
    // Nothing served there: the fetch outcome, no browserWallets.
    const missing = `${a.origin}/gone/source.json`;
    c = capture();
    assert.equal(await main(["verify", missing], c.io, local), 1);
    assert.deepEqual(c.json(), { source: missing, document: "not-found" });
    // Bytes that do not read as this source's document.
    for (const body of ["{}", JSON.stringify({ source: "https://other.example/mad/source.json" })]) {
      a.put("bad/source.json", body);
      const bad = `${a.origin}/bad/source.json`;
      c = capture();
      assert.equal(await main(["verify", bad], c.io, local), 1, body);
      assert.deepEqual(c.json(), { source: bad, document: "not a source document", browserWallets: CANNOT_READ });
    }
    // One argument that is not a source address stays a usage error and fetches nothing.
    const requests = a.requests.length;
    c = capture();
    assert.equal(await main(["verify", `${a.origin}/mad/definitions/${SELECTION}.json`], c.io, local), 2);
    assert.equal(c.out(), "");
    assert.ok(c.err().includes("The SAID is required"));
    c = capture();
    assert.equal(await main(["verify", join(fixtures, "compact", `${QVI}.json`)], c.io, local), 2);
    assert.ok(c.err().includes("The SAID is required"));
    assert.equal(a.requests.length, requests, "usage errors fetch nothing");
  } finally { a.behave = null; await a.close(); }
});

/** A definition whose key and value each hold a lone surrogate, written by JSON.stringify as the six-character escape. */
const loneShape = (said: string) => JSON.stringify({ d: said, [String.fromCharCode(0xd83d)]: "v" + String.fromCharCode(0xdc00) });
const LONE = saidOf(new TextEncoder().encode(loneShape("#".repeat(44))));

test("verify of a definition that holds lone surrogates reports wellFormed: false and the count; the exit status is unchanged (Ruling 12)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lone-"));
  const file = join(dir, `${LONE}.json`);
  writeFileSync(file, loneShape(LONE));
  let r = run("verify", file, LONE);
  assert.equal(r.code, 0);
  assert.deepEqual(r.json, { verified: true, said: LONE, bytes: loneShape(LONE).length, wellFormed: false, illFormed: 2 });
  const tampered = join(dir, "tampered.json");
  writeFileSync(tampered, loneShape(LONE).replace('"v', '"w'));
  r = run("verify", tampered, LONE);
  assert.equal(r.code, 1);
  assert.equal(r.json.verified, false);
  assert.equal(r.json.wellFormed, false);
  assert.equal(r.json.illFormed, 2);
  const a = await Origin.start();
  try {
    a.put(`mad/definitions/${LONE}.json`, loneShape(LONE));
    const address = `${a.origin}/mad/definitions/${LONE}.json`;
    const c = capture();
    assert.equal(await main(["verify", address, LONE], c.io, local), 0);
    assert.deepEqual(c.json(), { verified: true, said: LONE, address, bytes: loneShape(LONE).length, browserWallets: CANNOT_READ, wellFormed: false, illFormed: 2 });
  } finally { await a.close(); }
});

test("build warns about inputs that hold lone surrogates and writes them unchanged (Ruling 12)", () => {
  const dir = mkdtempSync(join(tmpdir(), "lone-in-"));
  writeFileSync(join(dir, `${LONE}.json`), loneShape(LONE));
  const config = join(mkdtempSync(join(tmpdir(), "cfg-")), "c.json");
  writeFileSync(config, JSON.stringify({ source: "https://lone.example/mad/source.json", serve: [LONE] }));
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  const r = run("build", dir, "--config", config, "--out", out);
  assert.equal(r.code, 0, r.out + r.err);
  assert.deepEqual(r.json.warnings, [{ said: LONE, illFormed: 2 }]);
  assert.deepEqual(readFileSync(join(out, "definitions", `${LONE}.json`)), readFileSync(join(dir, `${LONE}.json`)), "the bytes as given");
});
