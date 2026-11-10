import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { checkSaid } from "../src/said.ts";

const pretty = new URL("../fixtures/pretty/", import.meta.url);

test("pretty store files come out compact and verified", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const { inputs, refused } = readInputs(dir);
  assert.deepEqual(refused, []);
  assert.equal(inputs.size, readdirSync(dir).length);
  for (const [said, bytes] of inputs) assert.equal(checkSaid(bytes, said), true, said);
});

test("refusals are by name with a reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const good = readdirSync(dir)[0]!;
  writeFileSync(join(dir, "notes.json"), "{}");
  writeFileSync(join(dir, "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F.json"), '{"d":"wrong"}');
  writeFileSync(join(dir, "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.json"), "x".repeat(1_000_001));
  const { inputs, refused } = readInputs(dir);
  assert.ok(inputs.has(good.slice(0, -5)));
  assert.deepEqual(refused.map((r) => r.file).sort(), ["EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.json", "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F.json", "notes.json"]);
  assert.match(refused.find((r) => r.file === "notes.json")!.reason, /not named by a SAID/);
  assert.match(refused.find((r) => r.file.startsWith("EGQ3"))!.reason, /does not verify/);
  assert.match(refused.find((r) => r.file.startsWith("EAAA"))!.reason, /1 MB/);
});
