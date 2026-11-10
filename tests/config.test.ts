import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseConfig, ConfigError } from "../src/config.ts";

const gym = readFileSync(new URL("../fixtures/gym-config.json", import.meta.url), "utf8");
const S = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
const base = { source: "https://gym.example/mad/source.json" };
const pub = { target: S, name: "n", description: "d", tags: ["t"], collection: "c" };
const problems = (cfg: unknown) => { try { parseConfig(JSON.stringify(cfg)); return []; } catch (e) { return (e as ConfigError).problems; } };

test("the gym configuration parses", () => {
  const c = parseConfig(gym);
  assert.equal(c.source.base, "https://gym.example/mad/");
  assert.equal(c.serve.length, 3);
  assert.equal(c.publications.length, 3);
  assert.equal(c.by, undefined);
});

test("refusals name the member", () => {
  assert.match(problems({ ...base, extra: 1 }).join(), /unknown member: extra/);
  assert.match(problems({}).join(), /source/);
  assert.match(problems({ ...base, by: "not an aid!" }).join(), /by/);
  assert.match(problems({ ...base, oobi: "http://x.example/o" }).join(), /oobi/);
  assert.match(problems({ ...base, serve: ["nope"] }).join(), /serve\[0\]/);
  assert.match(problems({ ...base, publications: [{ ...pub, name: "x".repeat(201) }] }).join(), /publications\[0\].*name/);
  assert.match(problems({ ...base, publications: [{ ...pub, description: "a\u001bb" }] }).join(), /control/);
  assert.match(problems({ ...base, publications: [{ ...pub, tags: "gym" }] }).join(), /tags/);
  assert.match(problems({ ...base, publications: [{ ...pub, by: "ok-aid", other: 1 }] }).join(), /unknown member: other/);
  assert.match(problems({ ...base, introductions: [{ source: "https://x.example/mad/other.json", for: [] }] }).join(), /introductions\[0\].source/);
  assert.match(problems({ ...base, catalogs: ["https://x.example/c/source.json"] }).join(), /catalogs\[0\]/);
  assert.match(problems({ ...base, introductions: [[1]] }).join(), /introductions\[0\] is not an object/);
  assert.match(problems({ ...base, publications: [{ ...pub, target: "nope" }] }).join(), /target is not a SAID/);
  assert.deepEqual(problems({ ...base, by: "EKxy", oobi: "https://x.example/oobi/EKxy", publications: [{ ...pub, by: "EKxy" }] }), []);
});
