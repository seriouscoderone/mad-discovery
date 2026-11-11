# AI Catalog entries (step 3 of the first epic's build order) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** When a source sits at the root of a host, `build` also writes `/.well-known/ai-catalog.json`, a Level 1 AI Catalog with one entry per served definition, checked by a test against the specification at commit `6e26a18`; then the deployed root-hosted source `mad.seriouscoder.one` is rebuilt and serves it.

**Architecture:** One new module, `src/aicatalog.ts`, builds the catalog object from the source document the build already has (`serves` for the entries, `publications` for the optional text) and the derived definition addresses; `build.ts` writes it when the base is a host root; the command reports the file's address. The test carries a checker written from the specification's CDDL and proves it against the specification's own example, committed as a fixture, before applying it to the build's output. No network, no new dependency.

**Tech Stack:** Node 24, TypeScript 7.0.2 as a type check only, `node --test`. No new dependency: the specification has no JSON Schema, only CDDL, so the structural rules are a small hand-written checker in the test.

**Scope:** Design section "AI Catalog entries", Ruling 9 (kept, without the optional `digest`; ARD's file is not written) and Ruling 5 (the one dot-folder a source may have). Outside the closed first epic's acceptance. The deployment part touches only the resources that already exist for `mad.seriouscoder.one` (an upload and an invalidation); it creates nothing.

## Global Constraints

From `docs/design.md` and the specification at `github.com/Agent-Card/ai-catalog` commit `6e26a18` (2026-11-05; `specification/ai-catalog.md`); every task's requirements include these, and the step 1 and 2 plans' constraints still hold.

- The file is written only when the source's base is the root of its host (`https://host/`), at `.well-known/ai-catalog.json` beside `source.json`. A source under a path gets no such file. Nothing probes a well-known location; this is an advertisement, not a foundation (design: "This is an advertisement, not a foundation").
- Level 1 (Minimal Catalog) of the specification: a JSON object with `specVersion` (`"1.0"`, "Major.Minor") and `entries`, each entry with `identifier`, `type` and exactly one of `url` or `data`. Every member written is one the CDDL recognizes (`AICatalog`: `specVersion`, `host`, `entries`, `signature`, `additionalSignatures`, `extensions`; `CatalogEntry`: `identifier`, `displayName`, `type`, `url`/`data`, `version`, `description`, `tags`, `publisher`, `digest`, `trustManifests`, `updatedAt`, `extensions`).
- One entry per served definition, in `serves` order (SAID order): `identifier` is the SAID, `type` is `application/json`, `url` is the definition's derived address `<base>definitions/<SAID>.json`. `displayName`, `description` and `tags`, when present, come only from this source's own publication of that SAID (its `name`, `description`, `tags`; the first publication of the SAID in the document when there are several). Nothing in the file is copied from a definition's content. `digest` is left out (Ruling 9); `host`, `publisher`, `version`, `updatedAt`, `extensions`, `signature` are left out.
- The file's bytes are `JSON.stringify(catalog, null, 2) + "\n"`, like `source.json`, so two builds of one input are byte-identical.
- Serving: the specification identifies the document by the media type `application/ai-catalog+json`; the deploy procedure sets that content type on the uploaded file (`aws s3 sync` would guess `application/json`). GitHub Pages skips dot-folders unless told otherwise (a branch deploy needs an empty `.nojekyll`, an Actions deploy `include-hidden-files: true`); the README says so.
- Tests use outside vectors where one exists: the specification's own example catalog (`specification/examples/ai-catalog.json` at `6e26a18`) is committed as a fixture with its provenance in `fixtures/README.md`, and the checker must accept it before it judges the build's output. The repository's split license puts machine-readable assets under Apache-2.0 and the specification text under CC BY 4.0; the README attributes either way.
- Node 24, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `.ts` in relative imports; exactly three dependencies, this step adds none; source and test files ASCII-only.
- Workspace rules: small commits with the bead id and the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; files staged by name; mutating `bd` from `/Users/seriouscoderone/code/bpm`; push after each unit of work; `AWS_PROFILE=personal` for every AWS command; no new paid resource.

## File structure

```
mad-discovery/
  src/aicatalog.ts                  the catalog object and its bytes; isHostRoot; the well-known path
  src/build.ts                      writes the file when the base is a host root; BuildPlan.aiCatalog
  src/cli.ts                        build's output gains aiCatalog
  tests/aicatalog.test.ts           the checker, proven on the specification's example; the gym build at a root; under a path
  tests/cli.test.ts                 build at a root reports and writes the file
  fixtures/ai-catalog/example-6e26a18.json   the specification's own example
  fixtures/README.md                its provenance
  README.md, CLAUDE.md, deploy/README.md, docs/design.md (one clause), workspace CLAUDE.md
```

---

### Task 1: The catalog, its file, and the checker

**Files:**
- Create: `src/aicatalog.ts`, `tests/aicatalog.test.ts`, `fixtures/ai-catalog/example-6e26a18.json`
- Modify: `src/build.ts` (write the file at a root; `BuildPlan.aiCatalog`), `src/cli.ts` (report it), `tests/cli.test.ts` (a root build), `fixtures/README.md` (provenance)

**Interfaces:**
- Consumes: `definitionAddress(base, said)` from `src/address.ts`; `SourceDocument`, `Publication` from `src/source.ts`; `planBuild`'s `document` and `config.source.base` in `src/build.ts`.
- Produces: in `src/aicatalog.ts`: `SPEC_VERSION = "1.0"`, `WELL_KNOWN_PATH = ".well-known/ai-catalog.json"`, `type CatalogEntry = { identifier: string; type: "application/json"; url: string; displayName?: string; description?: string; tags?: string[] }`, `type AiCatalog = { specVersion: string; entries: CatalogEntry[] }`, `isHostRoot(base: string): boolean`, `aiCatalog(document: SourceDocument, base: string): AiCatalog`, `aiCatalogJson(document: SourceDocument, base: string): string`. In `src/build.ts`: `BuildPlan.aiCatalog: string | null` (the file's address when written).

**Acceptance Criteria:**
- The checker in the test accepts the specification's own example at `6e26a18` and refuses a catalog without `specVersion`, an entry with neither or both of `url` and `data`, and an unrecognized top-level member.
- A gym build at `https://gym.example/source.json` writes `.well-known/ai-catalog.json`; the checker finds no problem; `specVersion` is `"1.0"`; the identifiers are exactly the served SAIDs in order; every entry has `type` `application/json` and `url` equal to the derived definition address; the three selections, which have publications, carry `displayName`, `description` and `tags` equal to their publication's; every other entry has exactly `identifier`, `type`, `url`; no entry has `digest`; there is no `host`; `plan.aiCatalog` is the file's address; two builds give identical bytes.
- A build at `https://gym.example/mad/source.json` writes no such file and `plan.aiCatalog` is `null`.
- When a SAID has two publications, the first in the document names the entry.
- `build` on the command line reports `aiCatalog` (the address, or `null`) and a root build writes the file into `--out/.well-known/`.
- `npm run check` and `npm test` pass; the fixture's provenance is in `fixtures/README.md`.

- [ ] **Step 1: Commit the specification's example as a fixture**

```bash
mkdir -p fixtures/ai-catalog
gh api 'repos/Agent-Card/ai-catalog/contents/specification/examples/ai-catalog.json?ref=6e26a18' --jq .content | base64 -d > fixtures/ai-catalog/example-6e26a18.json
python3 -c 'import json; json.load(open("fixtures/ai-catalog/example-6e26a18.json")); print("valid JSON")'
```

Add to `fixtures/README.md` as a new list item: "`ai-catalog/example-6e26a18.json`: the AI Catalog specification's own example catalog, `specification/examples/ai-catalog.json` at commit `6e26a18` (2026-11-05) of `github.com/Agent-Card/ai-catalog`, whose split license puts machine-readable assets under Apache-2.0 and the specification text under CC BY 4.0. The checker in `tests/aicatalog.test.ts` must accept it before it judges the build's output." (`.gitattributes` already covers `fixtures/**`.)

- [ ] **Step 2: Write the failing tests**

`tests/aicatalog.test.ts`:

```ts
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
```

Append to `tests/cli.test.ts` (it already imports `run`, `gymDir`, `fixtures`, `mkdtempSync`, `tmpdir`, `join`, `existsSync`, `writeFileSync`, `readFileSync`):

```ts
test("build at a host root writes and reports the AI Catalog file; under a path it reports null", () => {
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  const config = join(mkdtempSync(join(tmpdir(), "cfg-")), "root.json");
  writeFileSync(config, readFileSync(join(fixtures, "gym-config.json"), "utf8").replace("https://gym.example/mad/source.json", "https://gym.example/source.json"));
  const r = run("build", gymDir(), "--config", config, "--out", out);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json.aiCatalog, "https://gym.example/.well-known/ai-catalog.json");
  assert.equal(r.json.written, 26 * 2 + 5, "26 definitions, 26 pages, source.json, index, style, sitemap, the catalog");
  assert.ok(existsSync(join(out, ".well-known", "ai-catalog.json")));
  const under = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", join(mkdtempSync(join(tmpdir(), "out-")), "site"));
  assert.equal(under.json.aiCatalog, null);
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/aicatalog.test.ts`
Expected: FAIL, cannot find module `../src/aicatalog.ts`.

- [ ] **Step 4: Write `src/aicatalog.ts`**

```ts
import { definitionAddress } from "./address.ts";
import type { Publication, SourceDocument } from "./source.ts";

/** Written against the AI Catalog specification at github.com/Agent-Card/ai-catalog commit 6e26a18 (2026-11-05), Level 1. */
export const SPEC_VERSION = "1.0";
/** The one dot-folder a source may have, and only at the root of a host (Ruling 5). */
export const WELL_KNOWN_PATH = ".well-known/ai-catalog.json";

export type CatalogEntry = {
  identifier: string;
  type: "application/json";
  url: string;
  displayName?: string;
  description?: string;
  tags?: string[];
};

export type AiCatalog = { specVersion: string; entries: CatalogEntry[] };

/** True when the source's base is the root of its host, the only place the well-known file can live. */
export function isHostRoot(base: string): boolean {
  return new URL(base).pathname === "/";
}

/**
 * docs/design.md "AI Catalog entries": one entry per served definition, in SAID order; identifier the SAID, type application/json,
 * url the definition's derived address. displayName, description and tags come only from this source's own publication of the
 * SAID (the first, when there are several). Nothing is read from a definition's content; digest, host and every other optional
 * member are left out.
 */
export function aiCatalog(document: SourceDocument, base: string): AiCatalog {
  const first = new Map<string, Publication>();
  for (const p of document.publications) if (!first.has(p.target)) first.set(p.target, p);
  return {
    specVersion: SPEC_VERSION,
    entries: document.serves.map(({ said }) => {
      const p = first.get(said);
      const entry: CatalogEntry = { identifier: said, type: "application/json", url: definitionAddress(base, said) };
      if (p !== undefined) { entry.displayName = p.name; entry.description = p.description; entry.tags = p.tags; }
      return entry;
    }),
  };
}

/** The file's bytes, in the shape source.json has, so two builds of one input are byte-identical. */
export function aiCatalogJson(document: SourceDocument, base: string): string {
  return JSON.stringify(aiCatalog(document, base), null, 2) + "\n";
}
```

- [ ] **Step 5: Write the file from the build and report it**

In `src/build.ts`: import `{ aiCatalogJson, isHostRoot, WELL_KNOWN_PATH } from "./aicatalog.ts"`; add `aiCatalog: string | null;` to `BuildPlan` (the file's address when written); after the line that sets `sitemap.xml`, add:

```ts
  const root = isHostRoot(config.source.base);
  if (root) files.set(WELL_KNOWN_PATH, encoder.encode(aiCatalogJson(document, config.source.base)));
```

and in the returned object `aiCatalog: root ? config.source.base + WELL_KNOWN_PATH : null,`.

In `src/cli.ts`, in `build`'s success output, add `aiCatalog: plan.aiCatalog,` after `sitemap: plan.sitemapLine,`.

- [ ] **Step 6: Run the checks and the whole suite**

Run: `npm run check && npm test`
Expected: all pass (128 from before plus 5 here). The existing build and cli tests still hold: a source under `/mad/` writes 56 files.

- [ ] **Step 7: Commit**

```bash
git add src/aicatalog.ts src/build.ts src/cli.ts tests/aicatalog.test.ts tests/cli.test.ts fixtures/ai-catalog/example-6e26a18.json fixtures/README.md
git commit -m "feat: a root-hosted source gets /.well-known/ai-catalog.json, Level 1 of the specification at 6e26a18 (<bead id>)"
```

---

### Task 2: Documentation, the design's clause, and the deployed source

Run by the controller: the deployment half uses the maintainer's AWS credentials and touches only the resources that exist.

**Files:**
- Modify: `README.md` (Status; Running it), `CLAUDE.md` (the plans list), `docs/design.md` (one clause: tags beside display name and description), `deploy/README.md` (the content type of the well-known file in the update procedure), `/Users/seriouscoderone/code/bpm/CLAUDE.md` (the step 3 sentence).

**Acceptance Criteria:**
- README Status says step 3 is built and what it writes; Running it notes the dot-folder on GitHub Pages. CLAUDE.md lists the three plans. The design's AI Catalog sentence reads "A display name, description or tags, when present, come only from this source's own publication of that definition." The workspace CLAUDE.md says step 3 is built and names the plan.
- `https://mad.seriouscoder.one/.well-known/ai-catalog.json` answers 200 with content type `application/ai-catalog+json`, parses as JSON, and the checker's rules hold on it (26 entries, 3 with `displayName`); `https://mad.seriouscoder.one/source.json` is unchanged in content.

- [ ] **Step 1: Documentation**

README `## Status`: replace "Step 3 of the first epic's build order, AI Catalog entries, is outside that acceptance and not yet built." with "Step 3 of the first epic's build order is built: a source at the root of a host also gets `/.well-known/ai-catalog.json`, a Level 1 AI Catalog (specification commit `6e26a18`) with one entry per served definition and no digest; the deployed source serves it." README `## Running it`, after the sentence about local origins: "A source at a host root also writes `.well-known/ai-catalog.json`; GitHub Pages skips dot-folders unless a branch deploy has an empty `.nojekyll` or an Actions deploy sets `include-hidden-files: true`."

`CLAUDE.md`: "The plans are `docs/plans/source-build.md` (step 1), `docs/plans/walk-and-get.md` (step 2) and `docs/plans/ai-catalog.md` (step 3, current)."

`docs/design.md`, section "AI Catalog entries": change "A display name or description, when present, comes only from this source's own publication of that definition." to "A display name, description or tags, when present, come only from this source's own publication of that definition (the first, when it has several)."

`deploy/README.md`: in the update commands, after the `aws s3 cp ... definitions` line, add `aws s3 cp /tmp/mad-site/.well-known/ai-catalog.json s3://mad-seriouscoder-one/.well-known/ai-catalog.json --content-type application/ai-catalog+json --cache-control "public, max-age=300"` and add `"/.well-known/*"` to the invalidation paths; in the prose add: "The source sits at the host root, so the build also writes `.well-known/ai-catalog.json`; it is uploaded with the media type the specification names, `application/ai-catalog+json`, which `aws s3 sync` would not guess."

Workspace `CLAUDE.md`: replace "Step 3 (AI Catalog entries) is outside the epic's acceptance." with "Step 3 (AI Catalog entries) is built; plan `mad-discovery/docs/plans/ai-catalog.md`."

- [ ] **Step 2: Rebuild and upload the deployed source**

```bash
cd /Users/seriouscoderone/code/bpm/mad-discovery && export AWS_PROFILE=personal
node bin/mad-discovery.ts build fixtures/pretty --config deploy/mad.seriouscoder.one/config.json --out /tmp/mad-site
aws s3 sync /tmp/mad-site s3://mad-seriouscoder-one --delete --cache-control "public, max-age=300"
aws s3 cp s3://mad-seriouscoder-one/definitions s3://mad-seriouscoder-one/definitions --recursive --metadata-directive REPLACE --content-type application/json --cache-control "public, max-age=31536000, immutable"
aws s3 cp /tmp/mad-site/.well-known/ai-catalog.json s3://mad-seriouscoder-one/.well-known/ai-catalog.json --content-type application/ai-catalog+json --cache-control "public, max-age=300"
aws cloudfront create-invalidation --distribution-id E3PDWZWR269C2D --paths "/source.json" "/pages/*" "/sitemap.xml" "/.well-known/*"
```

Then: `curl -sS -D - -o /tmp/aic.json https://mad.seriouscoder.one/.well-known/ai-catalog.json | grep -i -E '^(HTTP|content-type)'` shows 200 and `application/ai-catalog+json`; `python3 -c 'import json; c=json.load(open("/tmp/aic.json")); print(c["specVersion"], len(c["entries"]), sum("displayName" in e for e in c["entries"]))'` prints `1.0 26 3`.

- [ ] **Step 3: Commit both repositories**

```bash
cd /Users/seriouscoderone/code/bpm/mad-discovery && git add README.md CLAUDE.md docs/design.md deploy/README.md && git commit -m "docs: step 3 is built; the deployed source serves its AI Catalog (<bead id>)" && git push
cd /Users/seriouscoderone/code/bpm && git add CLAUDE.md && git commit -m "docs: mad-discovery step 3 is built (<bead id>)" && git push
```

---

## Self-review

**Spec coverage.** Design "AI Catalog entries": root only (Task 1, `isHostRoot`); one entry per served definition with `identifier`, `type`, `url` (Task 1); display name and description only from this source's own publication (Task 1; tags added, written into the design in Task 2 as a decision for the gate); nothing from a definition's content (the module reads only `document.serves` and `document.publications`); the one dot-folder, GitHub Pages note (Task 2 README); `digest` left out (Task 1 test asserts); written against `6e26a18` with a test validating against it (Task 1: the checker from the CDDL, proven on the example at that commit); ARD's file not written (nothing writes it). Design "Tests": "AI Catalog. The file validates against the specification at commit `6e26a18`" (Task 1). Ruling 9 and Ruling 5 honoured.

**Decision for the gate.** `tags` is written from the publication beside `displayName` and `description`. The design sentence named only the two; the specification's `tags` are "keywords for filtering and discovery", which is exactly what a publication's tags are, and they come from the same source, not from a definition's content. Task 2 writes the clause into the design.

**Placeholders.** `<bead id>` in commit messages is filled by the orchestrator. No other.

**Type consistency.** `BuildPlan.aiCatalog: string | null` is set in Task 1's build change and read in `cli.ts` and in both tests. `aiCatalog(document, base)` returns the object the file serializes; the test asserts that equality. `WELL_KNOWN_PATH` is the map key in the build and the test.
