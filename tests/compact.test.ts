import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { compactJson } from "../src/compact.ts";
import { checkSaid } from "../src/said.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const read = (rel: string) => new Uint8Array(readFileSync(new URL(rel, fixtures)));
const names = (dir: string) => readdirSync(new URL(`${dir}/`, fixtures)).filter((f) => f.endsWith(".json")).sort();

test("pretty copies fail as stored and compact to the hashed bytes", () => {
  for (const f of names("pretty")) {
    const said = f.slice(0, -5);
    const pretty = read(`pretty/${f}`);
    assert.equal(checkSaid(pretty, said), false, `${f} as stored`);
    const compact = compactJson(pretty);
    assert.deepEqual(Buffer.from(compact), Buffer.from(read(`compact/${f}`)), `${f} compacted`);
    assert.equal(checkSaid(compact, said), true);
  }
});

test("compact input is unchanged", () => {
  for (const f of names("compact")) {
    const bytes = read(`compact/${f}`);
    assert.deepEqual(Buffer.from(compactJson(bytes)), Buffer.from(bytes), f);
  }
});

test("strings are untouched", () => {
  const text = '{ "a" : "x  y \\" z" ,\n "b" : [ 1 , 2.0 ] }';
  assert.equal(Buffer.from(compactJson(Buffer.from(text))).toString(), '{"a":"x  y \\" z","b":[1,2.0]}');
});

test("why parse-then-stringify is not used", () => {
  const f = names("compact").find((n) => Buffer.from(read(`compact/${n}`)).includes("integer-like key"))!;
  const text = Buffer.from(read(`compact/${f}`)).toString();
  assert.notEqual(JSON.stringify(JSON.parse(text)), text, "JavaScript moves the key 1 to the front");
});
