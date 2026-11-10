import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { readSourceDocument } from "../src/document.ts";

const A = "https://a.example/mad/source.json";
const X = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const Y = "EFQ6ngR2kib-dwmW8mizJ4k5IdO0YysG0xSty9ESHDE4";
const enc = (v: unknown) => new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v));
const read = (v: unknown, address = A) => readSourceDocument(enc(v), address);

test("what build wrote reads back as the plan's document", () => {
  const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
  // Introductions in address order here, because the build keeps the configuration's order and the reader sorts.
  const config = parseConfig(JSON.stringify({ source: A, serve: [X, Y], publications: [{ target: X, name: "x", description: "d", tags: ["t"], collection: "c" }], introductions: [{ source: "https://b.example/source.json" }, { source: "https://z.example/source.json", for: [Y] }], catalogs: ["https://c.example/catalog.json"] }));
  const plan = planBuild(inputs, config);
  const r = readSourceDocument(plan.files.get("source.json")!, A);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.document, plan.document);
    assert.deepEqual(r.dropped, { entries: 0, publications: 0 });
  }
  const swapped = JSON.parse(new TextDecoder().decode(plan.files.get("source.json")!)) as { introductions: unknown[] };
  swapped.introductions.reverse();
  const r2 = readSourceDocument(enc(swapped), A);
  assert.ok(r2.ok && r2.document.introductions.map((i) => i.source).join() === "https://b.example/source.json,https://z.example/source.json", "the reader sorts introductions by address");
});

test("a document is refused whole when it is not this source's, not JSON, not an object, too deep, or mistyped", () => {
  assert.deepEqual(read({ source: "https://b.example/mad/source.json" }), { ok: false }, "a copy of someone else's files");
  assert.deepEqual(read({ source: A }, "https://a.example/mad/source.json/"), { ok: false });
  assert.deepEqual(readSourceDocument(enc("{not json"), A), { ok: false });
  assert.deepEqual(read([A]), { ok: false });
  assert.deepEqual(readSourceDocument(enc("[".repeat(100_000) + "]".repeat(100_000)), A), { ok: false }, "deep, and no stack overflow");
  assert.deepEqual(read({ source: A, serves: { said: X } }), { ok: false });
  assert.deepEqual(read({ source: A, pages: "yes" }), { ok: false });
  assert.deepEqual(read({ source: A, by: 7 }), { ok: false });
  assert.deepEqual(read({ source: A, introductions: "https://b.example/source.json" }), { ok: false });
});

test("unknown members are ignored, prototype names included", () => {
  // Hand-written text: in an object literal, __proto__ would set the prototype and never reach JSON.stringify.
  const text = `{"source":"${A}","extra":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}`;
  const r = readSourceDocument(enc(text), A);
  assert.ok(r.ok);
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  if (r.ok) {
    assert.deepEqual(r.document, { source: A, pages: false, serves: [], publications: [], introductions: [], catalogs: [] });
    assert.ok(!Object.hasOwn(r.document, "__proto__") && !Object.hasOwn(r.document, "constructor"), "the keys were not copied");
  }
});

test("an unknown member inside a publication is ignored; the configuration alone refuses it", () => {
  const good = { target: X, name: "fine", description: "d", tags: [], collection: "c" };
  const r = read({ source: A, publications: [{ ...good, extra: 1 }] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.document.publications, [good]);
    assert.deepEqual(r.dropped, { entries: 0, publications: 0 });
  }
});

test("entries that fail their rule are dropped and counted; the rest is read", () => {
  const r = read({
    source: A,
    by: "a".repeat(65),
    oobi: "http://a.example/oobi/x",
    serves: [{ said: "../../x" }, { said: X, refers: [Y, "not-a-said", X] }, { said: X }, { said: Y, refers: "nope" }, "bare"],
    introductions: [{ source: "https://1.2.3.4/source.json" }, { source: "https://b.example/source.json?x" }, { source: "https://b.example/source.json", for: [Y, 5] }, { source: "https://b.example/source.json" }, { source: "https://c.example/source.json", for: "nope" }],
    catalogs: ["https://c.example/source.json", "https://c.example/catalog.json", "https://c.example/catalog.json", 3],
  });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.document.by, undefined);
    assert.equal(r.document.oobi, undefined);
    assert.deepEqual(r.document.serves, [{ said: X, refers: [Y] }]);
    assert.deepEqual(r.document.introductions, [{ source: "https://b.example/source.json", for: [Y] }]);
    assert.deepEqual(r.document.catalogs, ["https://c.example/catalog.json"]);
    // by, oobi; "../../x", "not-a-said", X in its own refers, duplicate X, Y with refers "nope", "bare"; IP literal, query, 5, duplicate b, c with for "nope"; source.json, duplicate catalog, 3
    assert.equal(r.dropped.entries, 2 + 6 + 5 + 3);
    assert.equal(r.dropped.publications, 0);
  }
});

test("publications that break a limit are dropped and counted while the rest stand", () => {
  const good = { target: X, name: "fine", description: "d", tags: [], collection: "c" };
  const r = read({ source: A, publications: [good, { ...good, description: "x".repeat(100_000) }, { ...good, name: "\u001b[31mred" }, { ...good, by: "EKxy" }, "bare"] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.document.publications, [good, { ...good, by: "EKxy" }]);
    assert.deepEqual(r.dropped, { entries: 0, publications: 3 });
  }
});

test("a document with only source reads with defaults", () => {
  const r = read({ source: A });
  assert.deepEqual(r, { ok: true, document: { source: A, pages: false, serves: [], publications: [], introductions: [], catalogs: [] }, dropped: { entries: 0, publications: 0 } });
});

test("the test option admits test addresses in introductions, and only then", () => {
  const local = "http://127.0.0.1:8080/source.json";
  const r1 = readSourceDocument(enc({ source: local, introductions: [{ source: "http://127.0.0.1:8081/source.json" }] }), local, { test: true });
  assert.ok(r1.ok && r1.document.introductions.length === 1);
  const r2 = readSourceDocument(enc({ source: A, introductions: [{ source: "http://127.0.0.1:8081/source.json" }] }), A);
  assert.ok(r2.ok && r2.document.introductions.length === 0 && r2.dropped.entries === 1);
});
