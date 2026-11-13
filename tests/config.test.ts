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

test("a publication field that is not well-formed Unicode is refused, like a control character (Ruling 12)", () => {
  const lone = String.fromCharCode(0xd83d);   // a high surrogate with no low half: not text a browser wallet's store can hold
  assert.match(problems({ ...base, publications: [{ ...pub, name: "a" + lone }] }).join(), /well-formed Unicode/);
  assert.match(problems({ ...base, publications: [{ ...pub, tags: ["ok", lone] }] }).join(), /well-formed/);
  // Ruling 13: characters that reverse displayed text or do not show are refused like control characters; the joiners stay.
  const [RLO, ZWSP, SHY, ZWJ, ZWNJ] = [0x202e, 0x200b, 0x00ad, 0x200d, 0x200c].map((c) => String.fromCharCode(c));
  assert.match(problems({ ...base, publications: [{ ...pub, name: "Front desk at bank.example" + RLO }] }).join(), /control or format character/, "a bidirectional control");
  assert.match(problems({ ...base, publications: [{ ...pub, collection: "cashier" + ZWSP }] }).join(), /control or format character/, "a zero-width space");
  assert.match(problems({ ...base, publications: [{ ...pub, description: "Zu" + SHY + "sammen" }] }).join(), /control or format character/, "a soft hyphen");
  assert.match(problems({ ...base, publications: [{ ...pub, tags: [String.fromCodePoint(0xe0041)] }] }).join(), /control or format character/, "a tag character");
  const family = String.fromCodePoint(0x1f468) + ZWJ + String.fromCodePoint(0x1f469);
  const persian = [0x645, 0x6cc].map((c) => String.fromCharCode(c)).join("") + ZWNJ + [0x62e, 0x648, 0x627, 0x647, 0x645].map((c) => String.fromCharCode(c)).join("");
  assert.deepEqual(problems({ ...base, publications: [{ ...pub, name: "family " + family, description: "Persian: " + persian }] }), [], "the joiners U+200D and U+200C stay: emoji sequences and Persian need them");
  assert.deepEqual(problems({ ...base, publications: [{ ...pub, name: "a" + String.fromCharCode(0xe9) + " " + String.fromCodePoint(0x1f600) }] }), [], "a paired surrogate and a non-ASCII letter are well-formed");
});
