import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSourceAddress, parseCatalogAddress, definitionAddress, parseHttpsAddress } from "../src/address.ts";

const S = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";

test("a source address has one form", () => {
  assert.deepEqual(parseSourceAddress("https://gym.example/mad/source.json"), { address: "https://gym.example/mad/source.json", base: "https://gym.example/mad/" });
  assert.deepEqual(parseSourceAddress("https://GYM.example/source.json"), { address: "https://gym.example/source.json", base: "https://gym.example/" });
  for (const bad of [
    "http://gym.example/mad/source.json",
    "https://gym.example:8443/mad/source.json",
    "https://127.1/mad/source.json",
    "https://[::1]/mad/source.json",
    "https://gym.example./mad/source.json",
    "https://user@gym.example/mad/source.json",
    "https://gym.example/mad/source.json?x=1",
    "https://gym.example/mad/source.json#frag",
    "https://gym.example/mad/sources.json",
    "https://gym.example/" + "a".repeat(500) + "/source.json",
    "https://gym.example/mad/source.json?",
    "https://gym.example/mad/source.json#",
    "https://gym.example/mad/source.json?#",
    "https://localhost/mad/source.json",
    "https://a.localhost/mad/source.json",
    "https://0x7f.1/mad/source.json",
    "https://gym.example/" + "\u00e9".repeat(480) + "/source.json",
    "not an address",
  ]) assert.equal(parseSourceAddress(bad), null, bad);
  assert.deepEqual(parseSourceAddress("https://gym.example:443/mad/source.json"), { address: "https://gym.example/mad/source.json", base: "https://gym.example/mad/" });
  assert.equal(parseHttpsAddress("https://gym.example/oobi/EKxy?"), null);
});

test("the test option relaxes scheme, port and loopback only", () => {
  assert.deepEqual(parseSourceAddress("http://127.0.0.1:8080/mad/source.json", { test: true }), { address: "http://127.0.0.1:8080/mad/source.json", base: "http://127.0.0.1:8080/mad/" });
  assert.equal(parseSourceAddress("http://127.0.0.1:8080/mad/source.json?x", { test: true }), null);
  assert.equal(parseSourceAddress("http://127.0.0.1:8080/mad/other.json", { test: true }), null);
  assert.deepEqual(parseSourceAddress("http://localhost:8080/mad/source.json", { test: true }), { address: "http://localhost:8080/mad/source.json", base: "http://localhost:8080/mad/" });
});

test("catalog addresses and plain https addresses", () => {
  assert.deepEqual(parseCatalogAddress("https://gym.example/catalog/catalog.json"), { address: "https://gym.example/catalog/catalog.json", base: "https://gym.example/catalog/" });
  assert.equal(parseCatalogAddress("https://gym.example/catalog/source.json"), null);
  assert.equal(parseHttpsAddress("https://gym.example/oobi/EKxy"), "https://gym.example/oobi/EKxy");
  assert.equal(parseHttpsAddress("http://gym.example/oobi/EKxy"), null);
});

test("a definition's address is derived", () => {
  assert.equal(definitionAddress("https://gym.example/mad/", S), `https://gym.example/mad/definitions/${S}.json`);
  assert.throws(() => definitionAddress("https://gym.example/mad/", "../../x"));
  assert.throws(() => definitionAddress("https://gym.example/mad", S));
});
