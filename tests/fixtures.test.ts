import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { isSaid } from "../src/said.ts";

const names = (dir: string) => readdirSync(new URL(`../fixtures/${dir}/`, import.meta.url)).filter((f) => f.endsWith(".json")).sort();

test("fixture folders have the expected shape", () => {
  const compact = names("compact");
  const pretty = names("pretty");
  assert.equal(compact.length, 37);
  assert.equal(pretty.length, 29);
  for (const f of [...compact, ...pretty]) assert.ok(isSaid(f.slice(0, -5)), `${f} is named by a SAID`);
  for (const f of pretty) assert.ok(compact.includes(f), `${f} has a compact twin`);
  const refused = JSON.parse(readFileSync(new URL("../fixtures/refused/index.json", import.meta.url), "utf8")) as { file: string; said: string; why: string }[];
  assert.equal(refused.length, 2);
  for (const r of refused) assert.ok(isSaid(r.said));
});
