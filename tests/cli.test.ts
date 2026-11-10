import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { asciiJson } from "../src/cli.ts";

const bin = fileURLToPath(new URL("../bin/mad-discovery.ts", import.meta.url));
const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, json: r.stdout.trim() === "" ? null : JSON.parse(r.stdout) };
};
const gymDir = () => { const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(join(fixtures, "pretty"), d, { recursive: true }); return d; };
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";

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
  assert.equal(run("verify", "https://gym.example/mad/definitions/x.json", QVI).code, 2);
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
