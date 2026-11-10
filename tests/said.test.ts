import { test } from "node:test";
import assert from "node:assert/strict";
import { blake3 } from "@noble/hashes/blake3.js";
import { SAID_PATTERN, isSaid, encodeSaid, saidOf } from "../src/said.ts";

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
  assert.equal(isSaid("E" + "/".repeat(43)), false, "slashes are not base64url");
  assert.equal(isSaid("EQ" + "A".repeat(42)), false, "the second character is A to P");
  assert.equal(isSaid("F" + "A".repeat(43)), false, "another digest code");
  assert.equal(isSaid("EA" + "A".repeat(41)), false, "43 characters");
  assert.equal(SAID_PATTERN.source, "^E[A-P][A-Za-z0-9_-]{42}$");
});
