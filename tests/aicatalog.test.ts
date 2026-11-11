import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { aiCatalog, isHostRoot, WELL_KNOWN_PATH } from "../src/aicatalog.ts";
import { isSaid } from "../src/said.ts";
import { definitionAddress } from "../src/address.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const { inputs } = readInputs(fileURLToPath(new URL("compact/", fixtures)));
const gymConfig = JSON.parse(readFileSync(new URL("gym-config.json", fixtures), "utf8")) as Record<string, unknown>;
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const at = (source: string) => planBuild(inputs, parseConfig(JSON.stringify({ ...gymConfig, source })));

// The structural rules of the specification's CDDL at commit 6e26a18 (AICatalog, HostInfo, CatalogEntry, Publisher), as a checker.
// Every member it names is one the schema recognizes; a member it does not name is reported, because this build must write none.
const isString = (v: unknown): boolean => typeof v === "string";
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const unrecognized = (o: Record<string, unknown>, names: string[]): string[] => Object.keys(o).filter((k) => !names.includes(k));
function problems(catalog: unknown): string[] {
  const out: string[] = [];
  if (!isObject(catalog)) return ["not an object"];
  out.push(...unrecognized(catalog, ["specVersion", "host", "entries", "signature", "additionalSignatures", "extensions"]).map((k) => `unrecognized member ${k}`));
  if (!isString(catalog["specVersion"]) || !/^\d+\.\d+$/.test(catalog["specVersion"] as string)) out.push("specVersion is not Major.Minor");
  if (catalog["host"] !== undefined) {
    const h = catalog["host"];
    if (!isObject(h) || !isString(h["displayName"])) out.push("host without displayName");
    else out.push(...unrecognized(h, ["displayName", "identifier", "documentationUrl", "logoUrl"]).map((k) => `host: unrecognized member ${k}`));
  }
  if (!Array.isArray(catalog["entries"])) return [...out, "entries is not an array"];
  catalog["entries"].forEach((e, i) => {
    const where = `entries[${i}]`;
    if (!isObject(e)) { out.push(`${where} is not an object`); return; }
    out.push(...unrecognized(e, ["identifier", "displayName", "type", "url", "data", "version", "description", "tags", "publisher", "digest", "trustManifests", "updatedAt", "extensions"]).map((k) => `${where}: unrecognized member ${k}`));
    if (!isString(e["identifier"])) out.push(`${where}: identifier`);
    if (!isString(e["type"])) out.push(`${where}: type`);
    if ((e["url"] === undefined) === (e["data"] === undefined)) out.push(`${where}: exactly one of url and data`);
    if (e["url"] !== undefined && !isString(e["url"])) out.push(`${where}: url`);
    for (const k of ["displayName", "version", "description", "digest", "updatedAt"]) if (e[k] !== undefined && !isString(e[k])) out.push(`${where}: ${k}`);
    if (e["tags"] !== undefined && !(Array.isArray(e["tags"]) && e["tags"].every(isString))) out.push(`${where}: tags`);
    if (e["publisher"] !== undefined) { const p = e["publisher"]; if (!isObject(p) || !isString(p["identifier"]) || !isString(p["displayName"])) out.push(`${where}: publisher`); }
    if (e["trustManifests"] !== undefined && !Array.isArray(e["trustManifests"])) out.push(`${where}: trustManifests`);
    if (e["extensions"] !== undefined && !isObject(e["extensions"])) out.push(`${where}: extensions`);
  });
  return out;
}

test("the checker accepts the specification's own example at commit 6e26a18 and refuses broken catalogs", () => {
  const example = JSON.parse(readFileSync(new URL("ai-catalog/example-6e26a18.json", fixtures), "utf8")) as unknown;
  assert.deepEqual(problems(example), []);
  assert.deepEqual(problems({ entries: [] }), ["specVersion is not Major.Minor"]);
  assert.deepEqual(problems({ specVersion: "1.0", entries: [{ identifier: "x", type: "t" }] }), ["entries[0]: exactly one of url and data"]);
  assert.deepEqual(problems({ specVersion: "1.0", entries: [{ identifier: "x", type: "t", url: "u", data: 1 }] }), ["entries[0]: exactly one of url and data"]);
  assert.deepEqual(problems({ specVersion: "1.0", entries: [], extra: 1 }), ["unrecognized member extra"]);
  assert.deepEqual(problems({ specVersion: "1.0", entries: [{ identifier: "x", type: "t", url: "u", digest: 5 }] }), ["entries[0]: digest"]);
});

test("a root-hosted source gets a valid catalog: one entry per served definition, text only from its own publications", () => {
  const plan = at("https://gym.example/source.json");
  const bytes = plan.files.get(WELL_KNOWN_PATH);
  assert.ok(bytes, "the file is written");
  const catalog = JSON.parse(new TextDecoder().decode(bytes)) as { specVersion: string; entries: Record<string, unknown>[]; host?: unknown };
  assert.deepEqual(problems(catalog), []);
  assert.equal(catalog.specVersion, "1.0");
  assert.equal(catalog.host, undefined);
  assert.deepEqual(catalog.entries.map((e) => e["identifier"]), plan.document.serves.map((s) => s.said));
  for (const e of catalog.entries) {
    const said = e["identifier"] as string;
    assert.ok(isSaid(said));
    assert.equal(e["type"], "application/json");
    assert.equal(e["url"], definitionAddress("https://gym.example/", said));
    assert.equal(e["digest"], undefined);
    const p = plan.document.publications.find((x) => x.target === said);
    if (p === undefined) assert.deepEqual(Object.keys(e).sort(), ["identifier", "type", "url"], said);
    else { assert.equal(e["displayName"], p.name); assert.equal(e["description"], p.description); assert.deepEqual(e["tags"], p.tags); }
  }
  assert.equal(catalog.entries.filter((e) => e["displayName"] !== undefined).length, 3, "the three selections have publications");
  assert.equal(plan.aiCatalog, "https://gym.example/.well-known/ai-catalog.json");
  assert.deepEqual(aiCatalog(plan.document, "https://gym.example/"), catalog, "the file is the object, serialized");
  assert.deepEqual(at("https://gym.example/source.json").files.get(WELL_KNOWN_PATH), bytes, "two builds, one file");
  assert.equal(new TextDecoder().decode(bytes).endsWith("\n"), true);
});

test("a source under a path gets no catalog file", () => {
  const plan = at("https://gym.example/mad/source.json");
  assert.equal(plan.files.has(WELL_KNOWN_PATH), false);
  assert.equal(plan.aiCatalog, null);
  assert.equal(isHostRoot("https://gym.example/"), true);
  assert.equal(isHostRoot("https://gym.example/mad/"), false);
});

test("the first publication of a SAID names the entry; a second is not used", () => {
  const pub = (name: string) => ({ target: SELECTION, name, description: `about ${name}`, tags: [name], collection: "c" });
  const plan = planBuild(inputs, parseConfig(JSON.stringify({ source: "https://gym.example/source.json", serve: [SELECTION], publications: [pub("first"), pub("second")] })));
  const entry = aiCatalog(plan.document, "https://gym.example/").entries.find((e) => e.identifier === SELECTION)!;
  assert.equal(entry.displayName, "first");
  assert.deepEqual(entry.tags, ["first"]);
});
