import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appearances, paths, PATH_LIMITS } from "../src/scan.ts";

const PAID = "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U";
const PAYMENT_RECEIVED = "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL";
const bytes = (s: string) => new TextEncoder().encode(s);
const paid = new Uint8Array(readFileSync(new URL(`../fixtures/compact/${PAID}.json`, import.meta.url)));

test("the example in the design", () => {
  assert.deepEqual(appearances(paid, PAID), [
    "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1",
    "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB",
    "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL",
  ]);
  assert.deepEqual(paths(paid, PAYMENT_RECEIVED), { parsed: true, count: 1, paths: ["/rely_on/0/said"] });
});

test("the boundary rule", () => {
  const s = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
  assert.deepEqual(appearances(bytes(`{"k":"x${s}"}`)), [], "a base64url character before");
  assert.deepEqual(appearances(bytes(`{"k":"${s}y"}`)), [], "a base64url character after");
  assert.deepEqual(appearances(bytes(`{"${s}":1}`)), [s], "an object key");
  assert.deepEqual(appearances(bytes(`{"k":"https://x.example/${s}/index.json"}`)), [s], "inside an address");
  assert.deepEqual(appearances(bytes(`{"d":"${s}"}`), s), [], "the own SAID is excluded");
  assert.deepEqual(appearances(bytes(`{"a":"${s}","b":"${s}"}`)), [s], "each once");
});

test("paths: pointer escaping, keys, limits", () => {
  const s = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
  assert.deepEqual(paths(bytes(`{"a/b":{"~":"${s}"},"${s}":0}`), s).paths, ["/a~1b/~0", `/${s}`]);
  const many = "[" + Array.from({ length: 20 }, () => `"${s}"`).join(",") + "]";
  const r = paths(bytes(many), s);
  assert.equal(r.count, 20);
  assert.equal(r.paths.length, PATH_LIMITS.maxPaths);
  const longKey = "k".repeat(300);
  assert.deepEqual(paths(bytes(`{"${longKey}":"${s}"}`), s), { parsed: true, count: 1, paths: [] }, "a path over 256 characters is left out");
});

test("paths: too deep or not JSON gives the count and no paths", () => {
  const s = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
  const deep = "[".repeat(100_000) + `"${s}"` + "]".repeat(100_000);
  assert.deepEqual(paths(bytes(deep), s), { parsed: false, count: 1, paths: [] });
  assert.deepEqual(paths(bytes(`(define ${s})`), s), { parsed: false, count: 1, paths: [] });
});
