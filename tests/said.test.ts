import { test } from "node:test";
import assert from "node:assert/strict";
import { blake3 } from "@noble/hashes/blake3.js";
import { readdirSync, readFileSync } from "node:fs";
import { SAID_PATTERN, isSaid, encodeSaid, saidOf, checkSaid, replaceAll, FILL } from "../src/said.ts";

const abc = new TextEncoder().encode("abc");

test("the worked value: the bytes abc", () => {
  assert.equal(encodeSaid(blake3(abc)), "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F");
  assert.equal(saidOf(abc), "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F");
});

test("the wrong encoding is also 44 characters and is different", () => {
  const wrong = "E" + Buffer.from(blake3(abc)).toString("base64url");
  assert.equal(wrong.length, 44);
  assert.notEqual(wrong, encodeSaid(blake3(abc)));
});

test("the pattern", () => {
  assert.equal(isSaid("EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F"), true);
  assert.equal(isSaid("EA" + "/".repeat(42)), false, "slashes are not base64url");
  assert.equal(isSaid("EQ" + "A".repeat(42)), false, "the second character is A to P");
  assert.equal(isSaid("F" + "A".repeat(43)), false, "another digest code");
  assert.equal(isSaid("EA" + "A".repeat(41)), false, "43 characters");
  assert.equal(SAID_PATTERN.source, "^E[A-P][A-Za-z0-9_-]{42}$");
});

const fixtures = new URL("../fixtures/", import.meta.url);
const read = (rel: string) => new Uint8Array(readFileSync(new URL(rel, fixtures)));
const compactNames = readdirSync(new URL("compact/", fixtures)).filter((f) => f.endsWith(".json")).sort();
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";

test("every compact fixture verifies against its name", () => {
  for (const f of compactNames) assert.equal(checkSaid(read(`compact/${f}`), f.slice(0, -5)), true, f);
});

test("the refused fixtures are refused", () => {
  const index = JSON.parse(Buffer.from(read("refused/index.json")).toString()) as { file: string; said: string }[];
  for (const r of index) assert.equal(checkSaid(read(`refused/${r.file}`), r.said), false, r.file);
});

test("failing variants of a real document", () => {
  const good = read(`compact/${QVI}.json`);
  assert.equal(checkSaid(good, QVI), true);
  const changed = Uint8Array.from(good); changed[changed.length - 2] ^= 1;
  assert.equal(checkSaid(changed, QVI), false, "one byte changed");
  assert.equal(checkSaid(good, "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F"), false, "a wrong SAID");
  assert.equal(checkSaid(Uint8Array.from([...good, 0x0a]), QVI), false, "a trailing newline");
  assert.equal(checkSaid(Uint8Array.from([0xef, 0xbb, 0xbf, ...good]), QVI), false, "a leading byte-order mark");
  const filler = replaceAll(good, Buffer.from(QVI), FILL);
  assert.equal(checkSaid(filler, QVI), false, "the 44 # in place of the SAID");
  assert.equal(checkSaid(new TextEncoder().encode("abc"), "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F"), false, "bytes that do not contain the SAID");
});

test("an invalid UTF-8 byte where the hashed bytes hold U+FFFD", () => {
  const f = compactNames.find((n) => Buffer.from(read(`compact/${n}`)).includes("\uFFFD"))!;
  const good = read(`compact/${f}`);
  const bad = Buffer.from(Buffer.from(good).toString("latin1").replace("\u00ef\u00bf\u00bd", "\u00ff"), "latin1");
  assert.equal(bad.length, good.length - 2);
  assert.equal(checkSaid(new Uint8Array(bad), f.slice(0, -5)), false);
});

test("a # beside the SAID fixes the direction of the rebuild", () => {
  const f = compactNames.find((n) => Buffer.from(read(`compact/${n}`)).toString().startsWith('{"a":"E'))!;
  const said = f.slice(0, -5);
  const after = read(`compact/${f}`);                       // {"a":"<SAID>#"}
  assert.equal(checkSaid(after, said), true);
  const before = Buffer.from('{"a":"#' + said + '"}');       // same hashed form, SAID after the #
  assert.equal(checkSaid(new Uint8Array(before), said), false);
});
