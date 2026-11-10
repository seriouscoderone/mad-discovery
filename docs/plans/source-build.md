# Source build (step 1 of the first epic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent bpm-5g1`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Executed 2026-11-09.** All eleven tasks were implemented by subagents, each reviewed, with fix rounds where a review found a defect, then a final review of the whole step and one fix pass (bead bpm-5g1.25). The code blocks below were updated where that changed them, so this plan matches the code as built at commit `d3f453d`; the notes marked "added at execution" say what changed and why.

**Goal:** A TypeScript tool that turns a folder of frozen definitions plus one configuration file into a source: `source.json`, the definitions' compact bytes, a readable page per definition, an index page, a stylesheet and a sitemap, every file checked against its SAID before it is written; plus `verify <file> <SAID>`.

**Architecture:** One package, run from a checkout with Node 24 stripping types; no bundler, no build step, no server. Small modules with one job each (`said`, `compact`, `scan`, `address`, `source`, `config`, `inputs`, `build`, `pages`, `cli`), tested with `node --test` against committed outside fixtures. Everything is computed in memory and written only when every check passes.

**Tech Stack:** Node 24, TypeScript 7.0.2 as a type check only, `node --test`, `@noble/hashes` for Blake3, `@types/node`. No other dependency.

**Scope:** Build order step 1 of `docs/design.md` (the design, approved 2026-11-09): the SAID check, `build`, the readable pages and the source's index page, over gym-bp's frozen documents, with no network. Steps 2 (introductions, the walk, `get`) and 3 (AI Catalog entries) get their own plans when this one lands, as the design's build order says. Deployment is out of scope: nothing here touches AWS or any host.

## Global Constraints

From `docs/design.md`; every task's requirements include these.

- Node 24, stated in `engines`. Source files are `.ts` and Node runs them directly; relative imports name the `.ts` extension; syntax limited to what can be erased (`erasableSyntaxOnly`). TypeScript 7.0.2 is a type check only (`tsc --noEmit`). Tests run with `node --test`.
- Exactly three dependencies, pinned exactly: `typescript` 7.0.2, `@types/node` 24.19.2, `@noble/hashes` 2.4.0. Lockfile committed; install scripts disabled (`.npmrc`: `ignore-scripts=true`, `save-exact=true`).
- A SAID is `^E[A-P][A-Za-z0-9_-]{42}$`. Encoding: one zero byte before the 32 digest bytes, base64url, first character replaced by `E`. Worked value: `abc` gives `EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F`.
- The byte check: the SAID must be present in the served bytes; replace every occurrence with 44 `#`; the Blake3-256 digest of the result, encoded, must equal the SAID; rebuilding by replacing every run of 44 `#` left to right with the SAID must give the served bytes. It runs on octets, never on decoded text.
- The build recovers compact bytes by removing whitespace between JSON tokens only; it never parses and re-serializes a definition.
- A source is one folder: `source.json`, `definitions/<SAID>.json`, `pages/index.html`, `pages/<SAID>/index.html`, `pages/style.css`, `sitemap.xml`. The build never writes `robots.txt`; it prints the `Mad-Source:` and `Sitemap:` lines.
- A source address is `https`, default port, DNS host name (no IP literal, no trailing dot), no user name, password, query or fragment, path ending `/source.json`, at most 512 characters; the WHATWG serialization is the address. Base = address without `source.json`. A definition's address is `<base>definitions/<SAID>.json`, derived, never declared.
- Source document members: `source` (required), `by` (AID, optional), `oobi` (https address, optional), `pages` (boolean), `serves[{said, refers}]`, `publications[]`, `introductions[{source, for}]`, `catalogs[]`. A publication: `target`, `by` (optional), `name`, `description`, `tags[]`, `collection`. An AID is 1 to 64 characters of `A-Z a-z 0-9 - _`.
- Limits: a source document and a definition are each at most 1 MB; name and collection at most 200 characters, description 2,000, at most 32 tags of 64 characters each, no control characters. A publication that breaks a limit is dropped and counted.
- What a source serves: the SAIDs named in `serve`, or when none, every publication's target the input folder holds; plus every definition that appears in them, transitively, that the input folder holds, and nothing else. A `serve` SAID with no input file is refused by name.
- `refers` lists every SAID that appears in the definition's bytes (44 characters matching the pattern with no base64url character directly before or after), other than its own, each once, sorted.
- Pages: every string from a definition or a publication is escaped (`& < > " '`); no string becomes an element, attribute, id, class, style or link target; the only links are to other pages by SAID (relative, naming `index.html`), to source and catalog addresses that passed the address rule, and to fixed paths under such an address; no script; a `<meta>` Content-Security-Policy `default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'`. The template's own words are its labels and the check command; the build composes no sentence.
- Every command prints JSON on standard output, ASCII-only (every character outside printable ASCII as a `\u` escape), and exits 0 on success, 1 on failure, 2 on a usage error. `--out` must be absent or empty; `build` checks everything in memory first and writes nothing unless every check passes.
- Tests use outside vectors: no expected value and no passing input is produced by the code under test. Fixtures are committed as binary (`-text`) and kept out of any formatter.
- Workspace rules: small commits, each with a `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer and the bead id; stage files by name, never `-A`; run mutating `bd` commands from `/Users/seriouscoderone/code/bpm`; push after each unit of work. No AWS anywhere in this plan.

## File structure

```
mad-discovery/
  package.json, package-lock.json, tsconfig.json, .npmrc, .gitignore, .gitattributes
  bin/mad-discovery.ts        the command; calls src/cli.ts
  src/said.ts                 SAID pattern, encoding, the byte check
  src/compact.ts              whitespace removal between JSON tokens
  src/scan.ts                 SAIDs that appear in bytes; JSON Pointer paths
  src/address.ts              source and catalog address rule; base; derived definition address
  src/source.ts               the source document's types, the AID pattern, the limits
  src/config.ts               the operator's configuration file, read strictly
  src/inputs.ts               the input folder: one file per definition, named by its SAID
  src/build.ts                the build, in memory, then written
  src/pages.ts                the HTML writer: escape, definition page, index page, stylesheet, sitemap
  src/cli.ts                  argument handling, JSON output, exit codes
  tests/*.test.ts             one file per module, plus cli.test.ts
  fixtures/
    README.md                 what each fixture is and where it came from
    make.sh, make_fixtures.py, make_keri_fixtures.py
    compact/<SAID>.json       passing vectors, named by SAID
    pretty/<SAID>.json        pretty copies that fail as stored and compact to compact/<SAID>.json
    refused/*.json, refused/index.json   honest-looking documents the check must refuse
    gym-config.json           a configuration for the gym-bp fixtures
```

---

### Task 1: Package scaffold and the SAID encoding

**Files:**
- Create: `package.json`, `tsconfig.json`, `.npmrc`, `.gitignore`, `src/said.ts`, `tests/said.test.ts`

**Interfaces:**
- Produces: `SAID_PATTERN: RegExp`, `isSaid(s: string): boolean`, `encodeSaid(digest: Uint8Array): string`, `saidOf(hashed: Uint8Array): string` in `src/said.ts`.

**Acceptance Criteria:**
- `npm ci` installs exactly three packages and their dependencies from a committed lockfile without running install scripts.
- `npm run check` passes and `npm test` runs `tests/said.test.ts` under Node 24 with no build step.
- `encodeSaid(blake3("abc"))` is `EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F`, and the wrong encoding (`E` + base64url of the 32 bytes) differs from it.

- [ ] **Step 1: Write package.json, tsconfig.json, .npmrc and .gitignore**

`package.json`:

```json
{
  "name": "mad-discovery",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "check": "tsc --noEmit",
    "test": "node --test tests/*.test.ts"
  },
  "devDependencies": {
    "@types/node": "24.19.2",
    "typescript": "7.0.2"
  },
  "dependencies": {
    "@noble/hashes": "2.4.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "lib": ["ES2024"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "bin/**/*.ts"]
}
```

`.npmrc`:

```
ignore-scripts=true
save-exact=true
```

`.gitignore`:

```
node_modules/
```

- [ ] **Step 2: Install and commit the lockfile**

Run: `cd /Users/seriouscoderone/code/bpm/mad-discovery && npm install`
Expected: `package-lock.json` appears; `node_modules/@noble/hashes/package.json` says `2.4.0`; `node_modules/@types/node/package.json` says `24.19.2`.

- [ ] **Step 3: Write the failing test**

`tests/said.test.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/said.ts'`.

- [ ] **Step 5: Write the implementation**

`src/said.ts`:

```ts
import { blake3 } from "@noble/hashes/blake3.js";

/** The one text form of a SAID here: Blake3-256, CESR code E, 44 characters. */
export const SAID_PATTERN = /^E[A-P][A-Za-z0-9_-]{42}$/;

export function isSaid(s: string): boolean {
  return SAID_PATTERN.test(s);
}

/** One zero byte, then the 32 digest bytes, as base64url; the first character (always A) becomes E. */
export function encodeSaid(digest: Uint8Array): string {
  if (digest.length !== 32) throw new Error("a Blake3-256 digest is 32 bytes");
  const padded = new Uint8Array(33);
  padded.set(digest, 1);
  return "E" + Buffer.from(padded).toString("base64url").slice(1);
}

/** The SAID of a hashed form: the bytes with the SAID's slot holding 44 '#'. */
export function saidOf(hashed: Uint8Array): string {
  return encodeSaid(blake3(hashed));
}
```

- [ ] **Step 6: Run the type check and the test**

Run: `npm run check && npm test`
Expected: `tsc` prints nothing; the test run ends with `pass 3`, `fail 0`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .npmrc .gitignore src/said.ts tests/said.test.ts
git commit -m "feat: package scaffold and the SAID encoding (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 2: Outside fixtures

**Files:**
- Create: `.gitattributes`, `fixtures/README.md`, `fixtures/make.sh`, `fixtures/make_fixtures.py`, `fixtures/make_keri_fixtures.py`, `tests/fixtures.test.ts`
- Generated and committed: `fixtures/compact/*.json`, `fixtures/pretty/*.json`, `fixtures/refused/*.json`, `fixtures/refused/index.json`, `fixtures/gym-config.json`

**Interfaces:**
- Produces: for every `fixtures/compact/<SAID>.json`, bytes that verify against `<SAID>`; for every `fixtures/pretty/<SAID>.json`, bytes that fail as stored and equal `compact/<SAID>.json` once whitespace between tokens is removed; `fixtures/refused/index.json` as `[{ "file": string, "said": string, "why": string }]`; `fixtures/gym-config.json`, a configuration whose `serve` names gym-bp's three selections.

**Acceptance Criteria:**
- `fixtures/compact/` holds 37 files: gym-bp's 28, GLEIF's schema as served, a keripy inception event (SAID twice), a keripy schema with non-ASCII text, four documents saidified by bpm-core (integer-like key, `1.0`, `1e-05`, an integer above 2^53), one holding U+FFFD, and one whose SAID is directly followed by `#`.
- `fixtures/pretty/` holds 29 files: gym-bp's 28 store files as stored, and the vLEI repository's copy of GLEIF's schema.
- `fixtures/refused/` holds the two honest documents whose content contains 44 and 50 `#`, with `index.json` naming their SAIDs.
- Every fixture file name in `compact/` and `pretty/` matches the SAID pattern; `.gitattributes` marks `fixtures/**` as `-text`; `fixtures/README.md` carries the Apache-2.0 attribution for the vLEI schema and the commit it came from.

- [ ] **Step 1: Write the failing test**

`tests/fixtures.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { isSaid } from "../src/said.ts";

const names = (dir: string) => readdirSync(new URL(`../fixtures/${dir}/`, import.meta.url)).filter((f) => f.endsWith(".json")).sort();

test("fixture folders have the expected shape", () => {
  const compact = names("compact");
  const pretty = names("pretty");
  assert.equal(compact.length, 37);
  assert.equal(pretty.length, 29);
  for (const f of [...compact, ...pretty]) assert.ok(isSaid(f.slice(0, -5)), `${f} is named by a SAID`);
  for (const f of pretty) assert.ok(compact.includes(f), `${f} has a compact twin`);
  const refused = JSON.parse(readFileSync(new URL("../fixtures/refused/index.json", import.meta.url), "utf8")) as { file: string; said: string; why: string }[];
  assert.equal(refused.length, 2);
  for (const r of refused) assert.ok(isSaid(r.said));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `ENOENT ... fixtures/compact`.

- [ ] **Step 3: Write the fixture makers**

`fixtures/make_fixtures.py` (run with bpm-core's interpreter):

```python
"""Make the gym-bp, bpm-core and constructed fixtures. Usage: python -I make_fixtures.py <clean gym-bp store> <fixtures folder>"""
import base64, json, os, shutil, sys
from blake3 import blake3
from bpm_core.said import saidify

store, out = sys.argv[1], sys.argv[2]
FILL = "#" * 44

def compact(doc): return json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode()
def encode(digest): return "E" + base64.urlsafe_b64encode(b"\x00" + digest).decode()[1:]
def said_of(hashed): return encode(blake3(hashed).digest())
def write(folder, name, data):
    os.makedirs(os.path.join(out, folder), exist_ok=True)
    with open(os.path.join(out, folder, name), "wb") as f: f.write(data)

# 1. gym-bp: the store's pretty copies, and the compact bytes bpm-core hashed.
for fn in sorted(os.listdir(store)):
    if not fn.endswith(".json"): continue
    raw = open(os.path.join(store, fn), "rb").read()
    write("pretty", fn, raw)
    write("compact", fn, compact(json.loads(raw)))

# 2. bpm-core saidifies documents with awkward values; Node's JSON round trip would change these bytes.
for doc in [
    {"d": "", "kind": "fixture", "1": "an integer-like key comes first"},
    {"d": "", "kind": "fixture", "x": 1.0},
    {"d": "", "kind": "fixture", "y": 1e-05},
    {"d": "", "kind": "fixture", "z": 9007199254740993},
    {"d": "", "kind": "fixture", "u": "� and a non-ASCII word: Prüfung"},
]:
    frozen = saidify(doc)
    write("compact", frozen["d"] + ".json", compact(frozen))

# 3. A document whose SAID is directly followed by '#': fixes the direction of the rebuild step.
hashed = ('{"a":"' + FILL + '#"}').encode()
s = said_of(hashed)
write("compact", s + ".json", ('{"a":"' + s + '#"}').encode())

# 4. Honest documents the check must refuse: their content holds a run of '#'.
index = []
for n, name in [(44, "content-holds-44-hashes.json"), (50, "content-holds-50-hashes.json")]:
    hashed = ('{"d":"' + FILL + '","note":"' + "#" * n + '"}').encode()
    s = said_of(hashed)
    write("refused", name, ('{"d":"' + s + '","note":"' + "#" * n + '"}').encode())
    index.append({"file": name, "said": s, "why": f"its content holds {n} consecutive # beside the SAID slot"})
write("refused", "index.json", (json.dumps(index, indent=2) + "\n").encode())

# 5. A configuration for the gym fixtures: serve the three selections, each with a publication.
docs = {fn[:-5]: json.load(open(os.path.join(store, fn))) for fn in os.listdir(store) if fn.endswith(".json")}
selections = sorted((s, d["alias"]) for s, d in docs.items() if d.get("kind") == "selection")
config = {
    "source": "https://gym.example/mad/source.json",
    "serve": [s for s, _ in selections],
    "publications": [
        {"target": s, "name": alias, "description": f"Test data from gym-bp: the {alias} selection.", "tags": ["gym", "test-data"], "collection": "gym-bp test data"}
        for s, alias in selections
    ],
    "introductions": [],
    "catalogs": [],
}
with open(os.path.join(out, "gym-config.json"), "w") as f: json.dump(config, f, indent=2); f.write("\n")
print("made", len(os.listdir(os.path.join(out, "compact"))), "compact and", len(os.listdir(os.path.join(out, "pretty"))), "pretty fixtures")
```

`fixtures/make_keri_fixtures.py` (run with the `KERI/said-test` interpreter, which has keripy 2.1.0.dev0):

```python
"""Two keripy-written vectors. Usage: python -I make_keri_fixtures.py <fixtures folder>"""
import os, sys
from keri.core import eventing, signing, coring
from keri.core.coring import MtrDex
from keri.core.scheming import Schemer
from keri.kering import Kinds, Vrsn_1_0

out = sys.argv[1]
def write(name, data):
    with open(os.path.join(out, "compact", name), "wb") as f: f.write(data)

# An inception event with a self-addressing identifier: the SAID is in both d and i (JSON, KERI v1).
signer = signing.Signer(raw=b"\x01" * 32, transferable=True)
nxt = signing.Signer(raw=b"\x02" * 32, transferable=True)
icp = eventing.incept(keys=[signer.verfer.qb64], ndigs=[coring.Diger(ser=nxt.verfer.qb64b).qb64],
                      code=MtrDex.Blake3_256, version=Vrsn_1_0, kind=Kinds.json)
assert icp.raw.count(icp.said.encode()) == 2
write(icp.said + ".json", icp.raw)

# A schema with non-ASCII text; its SAID is in $id.
sch = Schemer(sed={"$id": "", "$schema": "https://json-schema.org/draft/2020-12/schema",
                   "title": "Übung: Prüfung", "description": "Ein Test mit Umlauten und 日本語", "type": "object"})
write(sch.said + ".json", sch.raw)
print("made", icp.said, sch.said)
```

`fixtures/make.sh`:

```sh
#!/bin/sh
# Makes every fixture from its outside source. Run once; the results are committed.
set -e
cd "$(dirname "$0")"
BPM_PY="${BPM_PY:-$(cd ../../bpm-core && pwd)/.venv/bin/python}"
KERI_PY="${KERI_PY:-$HOME/code/KERI/said-test/.venv/bin/python}"
VLEI_COMMIT="${VLEI_COMMIT:-main}"
QVI=EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao
rm -rf compact pretty refused && mkdir -p compact pretty refused
tmp=$(mktemp -d)
git clone -q ../../gym-bp "$tmp/gym-bp"
(cd "$tmp/gym-bp" && BPM="$(dirname "$BPM_PY")/bpm" ./rebuild.sh)
"$BPM_PY" -I make_fixtures.py "$tmp/gym-bp/.bpm/store" .
"$KERI_PY" -I make_keri_fixtures.py .
curl -fsSL "https://www.gleif.org/.well-known/oobi/$QVI/index.json" -o "compact/$QVI.json"
curl -fsSL "https://raw.githubusercontent.com/WebOfTrust/vLEI/$VLEI_COMMIT/schema/acdc/qualified-vLEI-issuer-vLEI-credential.json" -o "pretty/$QVI.json"
rm -rf "$tmp"
echo "compact: $(ls compact | wc -l | tr -d ' ')  pretty: $(ls pretty | wc -l | tr -d ' ')  refused: $(ls refused | wc -l | tr -d ' ')"
```

`.gitattributes`:

```
fixtures/** -text
```

- [ ] **Step 4: Run the makers**

Run: `chmod +x fixtures/make.sh && VLEI_COMMIT=$(git ls-remote https://github.com/WebOfTrust/vLEI HEAD | cut -f1) fixtures/make.sh`
Expected: `compact: 37  pretty: 29  refused: 3` (two documents and `index.json`). If `bpm-core/.venv` is missing, first run `cd ../bpm-core && uv pip install -e ".[dev,dcr]"`.

- [ ] **Step 5: Write fixtures/README.md**

```markdown
# Fixtures

Outside vectors for the tests. No file here is produced by the code under test. `make.sh` makes them all; the results are committed as binary (`.gitattributes`: `-text`) and never formatted. A compact fixture has no final newline. The makers record where every vector came from and were run once on the maintainer's machine, with bpm-core's and keripy's interpreters and two downloads; they are not expected to run elsewhere, and need not: a frozen document cannot drift from its SAID, so the committed copies stay valid.

- `compact/<SAID>.json`: bytes that verify against the SAID in the file name. 28 are gym-bp's frozen documents, written compactly by bpm-core's own serializer from a clean `rebuild.sh`. One is GLEIF's Qualified vLEI Issuer schema exactly as served from `www.gleif.org`. Two were written by keripy 2.1.0.dev0 (Apache-2.0): an inception event whose SAID is in both `d` and `i`, and a schema with non-ASCII text. Five were saidified by bpm-core and hold values Node's JSON round trip would change. One was constructed so that its SAID is directly followed by `#`.
- `pretty/<SAID>.json`: the same documents pretty-printed. 28 are gym-bp's store files as stored. One is the vLEI repository's copy of GLEIF's schema (`WebOfTrust/vLEI`, Apache-2.0, `schema/acdc/qualified-vLEI-issuer-vLEI-credential.json`, commit <fill in from make.sh's VLEI_COMMIT>), whose bytes with whitespace removed equal what GLEIF serves.
- `refused/`: two honest documents whose content holds 44 and 50 consecutive `#`; the check cannot tell their SAID slot from their content and refuses them. `index.json` names their SAIDs.
- `gym-config.json`: a configuration that serves gym-bp's three selections, each with a publication. gym-bp's documents carry no description, so these are hand-written.
```

Replace `<fill in from make.sh's VLEI_COMMIT>` with the hash printed by `git ls-remote` in Step 4.

- [ ] **Step 6: Run the test**

Run: `npm test`
Expected: `fixtures.test.ts` passes.

- [ ] **Step 7: Commit**

```bash
git add .gitattributes fixtures/README.md fixtures/make.sh fixtures/make_fixtures.py fixtures/make_keri_fixtures.py fixtures/compact fixtures/pretty fixtures/refused fixtures/gym-config.json tests/fixtures.test.ts
git commit -m "test: outside fixtures for the SAID check and the build (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: The byte check

**Files:**
- Modify: `src/said.ts`
- Modify: `tests/said.test.ts`

**Interfaces:**
- Consumes: `isSaid`, `saidOf` from Task 1; `fixtures/compact`, `fixtures/refused` from Task 2.
- Produces: `FILL: Uint8Array` (44 `#`), `replaceAll(bytes: Uint8Array, needle: Uint8Array, by: Uint8Array): Uint8Array`, `checkSaid(served: Uint8Array, said: string): boolean`.

**Acceptance Criteria:**
- Every file in `fixtures/compact/` verifies against its name; both files in `fixtures/refused/` are refused.
- Refused: one byte changed, a wrong SAID, a trailing newline, a leading byte-order mark, an invalid UTF-8 byte where the hashed bytes hold U+FFFD, the 44 `#` in place of the SAID, a `#` directly before the SAID, and bytes that do not contain the SAID.
- The check runs on bytes: the test passes a `Uint8Array`, never a string.

- [ ] **Step 1: Write the failing tests**

Append to `tests/said.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { checkSaid, replaceAll, FILL } from "../src/said.ts";

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
  const f = compactNames.find((n) => Buffer.from(read(`compact/${n}`)).includes("�"))!;
  const good = read(`compact/${f}`);
  const bad = Buffer.from(Buffer.from(good).toString("latin1").replace("ï¿½", "ÿ"), "latin1");
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL, `checkSaid` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/said.ts`:

```ts
/** 44 '#': what stands in the SAID's slot while the digest is computed. */
export const FILL: Uint8Array = new Uint8Array(44).fill(0x23);

function asBuffer(b: Uint8Array): Buffer {
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
}

/** Replace every occurrence of needle, scanning left to right without overlap. Works on octets. */
export function replaceAll(bytes: Uint8Array, needle: Uint8Array, by: Uint8Array): Uint8Array {
  const hay = asBuffer(bytes);
  const nee = asBuffer(needle);
  const parts: Uint8Array[] = [];
  let from = 0;
  for (;;) {
    const at = hay.indexOf(nee, from);
    if (at < 0) break;
    parts.push(bytes.subarray(from, at), by);
    from = at + needle.length;
  }
  parts.push(bytes.subarray(from));
  return new Uint8Array(Buffer.concat(parts));
}

/**
 * The byte check of docs/design.md, "Checking bytes against a SAID":
 * 1. the SAID is present; 2. every occurrence becomes 44 '#'; 3. the digest of that is the SAID;
 * 4. putting the SAID back for every run of 44 '#' (left to right) gives the served bytes.
 */
export function checkSaid(served: Uint8Array, said: string): boolean {
  if (!isSaid(said)) return false;
  const needle = Buffer.from(said, "ascii");
  if (asBuffer(served).indexOf(needle) < 0) return false;
  const hashed = replaceAll(served, needle, FILL);
  if (saidOf(hashed) !== said) return false;
  const rebuilt = replaceAll(hashed, FILL, needle);
  return asBuffer(rebuilt).equals(asBuffer(served));
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/said.ts tests/said.test.ts
git commit -m "feat: the byte check against a SAID (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: Whitespace removal

**Files:**
- Create: `src/compact.ts`, `tests/compact.test.ts`

**Interfaces:**
- Produces: `compactJson(bytes: Uint8Array): Uint8Array`, which removes whitespace between JSON tokens and leaves every string and number exactly as written.

**Acceptance Criteria:**
- Every `fixtures/pretty/<SAID>.json` fails the check as stored and, after `compactJson`, equals `fixtures/compact/<SAID>.json` byte for byte.
- `compactJson` of an already compact fixture is the same bytes.
- Whitespace inside a string, and escaped quotes inside a string, are untouched.
- The test records why parse-then-stringify is not used: for the fixture with the integer-like key, `JSON.stringify(JSON.parse(text))` differs from the hashed bytes.

- [ ] **Step 1: Write the failing test**

`tests/compact.test.ts`:

```ts
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
  assert.equal(Buffer.from(compactJson(Buffer.from('{ "a" : "x\\\\" , "b" : 1 }'))).toString(), '{"a":"x\\\\","b":1}');
});

test("why parse-then-stringify is not used", () => {
  const f = names("compact").find((n) => Buffer.from(read(`compact/${n}`)).includes("integer-like key"))!;
  const text = Buffer.from(read(`compact/${f}`)).toString();
  assert.notEqual(JSON.stringify(JSON.parse(text)), text, "JavaScript moves the key 1 to the front");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/compact.ts'`.

- [ ] **Step 3: Write the implementation**

`src/compact.ts`:

```ts
/**
 * Remove the whitespace between JSON tokens, without interpreting any value.
 * Inside a string every byte is kept, including escapes; outside, space, tab, LF and CR are dropped.
 */
export function compactJson(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  let n = 0;
  let inString = false;
  let escaped = false;
  for (const c of bytes) {
    if (inString) {
      out[n++] = c;
      if (escaped) escaped = false;
      else if (c === 0x5c) escaped = true;       // backslash
      else if (c === 0x22) inString = false;     // closing quote
    } else if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      continue;
    } else {
      out[n++] = c;
      if (c === 0x22) inString = true;
    }
  }
  return out.subarray(0, n);
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/compact.ts tests/compact.test.ts
git commit -m "feat: recover compact bytes by removing whitespace between tokens (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: SAIDs inside a definition

**Files:**
- Create: `src/scan.ts`, `tests/scan.test.ts`

**Interfaces:**
- Consumes: `isSaid` from `src/said.ts`.
- Produces: `appearances(bytes: Uint8Array, own?: string): string[]` (sorted, unique, boundary rule, own SAID excluded); `PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 }`; `depth(text: string): number` (nesting of JSON tokens outside strings); `paths(bytes: Uint8Array, said: string): { parsed: boolean; count: number; paths: string[] }`.

**Acceptance Criteria:**
- For gym-bp's `EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U`, `appearances` is exactly `["ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1", "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]`, and `paths` for `EMSaOVmC...` is `["/rely_on/0/said"]` with count 1.
- A SAID inside a longer run of base64url characters is not an appearance; a SAID as an object key or inside an address is; the definition's own SAID is excluded.
- `paths` returns at most 16 paths of at most 256 characters, states the full count, and returns `parsed: false` with no paths for bytes nested deeper than 64 or that are not JSON.

- [ ] **Step 1: Write the failing test**

`tests/scan.test.ts`:

```ts
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

test("paths: count and paths describe the same occurrences in the bytes", () => {
  const s = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
  assert.deepEqual(paths(bytes(`{"k":"line\\n${s}"}`), s), { parsed: true, count: 0, paths: [] }, "the n of an escape sits before the SAID");
  const escaped = s.slice(0, 4) + "\\u0047" + s.slice(5);
  assert.deepEqual(paths(bytes(`{"k":"${escaped}"}`), s), { parsed: true, count: 0, paths: [] }, "an escape inside the SAID");
  assert.deepEqual(paths(bytes(`{"k":"${s}\\u0041"}`), s), { parsed: true, count: 1, paths: ["/k"] }, "an escape after the SAID");
  assert.deepEqual(paths(bytes(`{"${s}":1,"${s}":2}`), s), { parsed: true, count: 2, paths: [`/${s}`, `/${s}`] }, "duplicate keys");
});

test("paths: too deep or not JSON gives the count and no paths", () => {
  const s = "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB";
  const deep = "[".repeat(100_000) + `"${s}"` + "]".repeat(100_000);
  assert.deepEqual(paths(bytes(deep), s), { parsed: false, count: 1, paths: [] });
  assert.deepEqual(paths(bytes(`(define ${s})`), s), { parsed: false, count: 1, paths: [] });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/scan.ts'`.

- [ ] **Step 3: Write the implementation**

`src/scan.ts`:

```ts
import { isSaid } from "./said.ts";

export const PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 } as const;

const B64 = /[A-Za-z0-9_-]/;
const CANDIDATE = /E[A-P][A-Za-z0-9_-]{42}/g;

/** Every position where a SAID-shaped run of 44 characters has no base64url character on either side. */
function occurrences(text: string): { said: string; at: number }[] {
  const found: { said: string; at: number }[] = [];
  CANDIDATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CANDIDATE.exec(text)) !== null) {
    const at = m.index;
    const before = text[at - 1];
    const after = text[at + 44];
    if ((before !== undefined && B64.test(before)) || (after !== undefined && B64.test(after))) {
      CANDIDATE.lastIndex = at + 1;
      continue;
    }
    found.push({ said: m[0], at });
  }
  return found;
}

/** Bytes as one character per byte, so positions are byte offsets and SAIDs (ASCII) are unchanged. */
function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
}

/** The SAIDs that appear in the bytes, other than own, each once, sorted as strings. */
export function appearances(bytes: Uint8Array, own?: string): string[] {
  const set = new Set<string>();
  for (const o of occurrences(latin1(bytes))) if (o.said !== own) set.add(o.said);
  return [...set].sort();
}

/** Nesting depth of the JSON tokens, counted outside strings; cheap, and safe on any bytes. */
export function depth(text: string): number {
  let d = 0, max = 0, inString = false, escaped = false;
  for (const c of text) {
    if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; }
    else if (c === '"') inString = true;
    else if (c === "{" || c === "[") { d++; if (d > max) max = d; }
    else if (c === "}" || c === "]") d--;
  }
  return max;
}

/** JSON.parse, refused before it starts when the nesting is deeper than PATH_LIMITS.maxDepth. */
export function parseBounded(bytes: Uint8Array): { ok: true; value: unknown } | { ok: false } {
  if (depth(latin1(bytes)) > PATH_LIMITS.maxDepth) return { ok: false };
  try { return { ok: true, value: JSON.parse(Buffer.from(bytes).toString("utf8")) }; } catch { return { ok: false }; }
}

const escapePointer = (s: string) => s.replace(/~/g, "~0").replace(/\//g, "~1");

type Frame =
  | { kind: "object"; pointer: string; expectKey: boolean; key: string }
  | { kind: "array"; pointer: string; index: number };

/** JSON Pointers of the strings and keys that hold the SAID, one per occurrence in the bytes, bounded; the count is of every occurrence. */
export function paths(bytes: Uint8Array, said: string): { parsed: boolean; count: number; paths: string[] } {
  const text = latin1(bytes);
  const occs = occurrences(text).filter((o) => o.said === said);
  const count = occs.length;
  if (!isSaid(said) || !parseBounded(bytes).ok) return { parsed: false, count, paths: [] };
  // Valid JSON from here: walk its tokens once, iteratively, and give each occurrence the pointer of the string token around it.
  const out: string[] = [];
  const stack: Frame[] = [];
  const valuePointer = (): string => {
    const top = stack[stack.length - 1];
    if (top === undefined) return "";
    return top.kind === "object" ? `${top.pointer}/${top.key}` : `${top.pointer}/${top.index}`;
  };
  let k = 0;
  let i = 0;
  while (i < text.length && k < count) {
    const c = text[i];
    const top = stack[stack.length - 1];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "{") { stack.push({ kind: "object", pointer: valuePointer(), expectKey: true, key: "" }); i++; continue; }
    if (c === "[") { stack.push({ kind: "array", pointer: valuePointer(), index: 0 }); i++; continue; }
    if (c === "}" || c === "]") { stack.pop(); i++; continue; }
    if (c === ",") { if (top?.kind === "object") top.expectKey = true; else if (top?.kind === "array") top.index++; i++; continue; }
    if (c === ":") { if (top?.kind === "object") top.expectKey = false; i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const end = j + 1;
      let pointer: string;
      if (top?.kind === "object" && top.expectKey) {
        top.key = escapePointer(JSON.parse(Buffer.from(bytes.subarray(i, end)).toString("utf8")) as string);
        pointer = `${top.pointer}/${top.key}`;
      } else pointer = valuePointer();
      while (k < count && occs[k]!.at + 44 <= end) {
        if (occs[k]!.at >= i && pointer.length <= PATH_LIMITS.maxLength && out.length < PATH_LIMITS.maxPaths) out.push(pointer);
        k++;
      }
      i = end;
      continue;
    }
    while (i < text.length && !/[\s{}\[\],:"]/.test(text[i]!)) i++;
  }
  return { parsed: true, count, paths: out };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass. The deep case must finish in well under a second and must not throw.

Note (added at execution): the first version of `paths` applied the boundary rule to the decoded string after `JSON.parse`, so `count` and `paths` disagreed when a JSON escape sat inside or beside a SAID. The review of Task 5 found it; the code above is the corrected form, which derives every pointer from the byte offset of an occurrence with a small iterative tokenizer, and the tests include the four cases that exposed it.

- [ ] **Step 5: Commit**

```bash
git add src/scan.ts tests/scan.test.ts
git commit -m "feat: scan bytes for the SAIDs that appear in a definition (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: Addresses

**Files:**
- Create: `src/address.ts`, `tests/address.test.ts`

**Interfaces:**
- Produces: `type Address = { address: string; base: string }`; `type AddressOptions = { test?: boolean }`; `parseSourceAddress(s: string, opts?: AddressOptions): Address | null`; `parseCatalogAddress(s: string, opts?: AddressOptions): Address | null`; `definitionAddress(base: string, said: string): string`; `parseHttpsAddress(s: string, opts?: AddressOptions): string | null` (for `oobi` and other plain addresses).

**Acceptance Criteria:**
- `https://gym.example/mad/source.json` parses with base `https://gym.example/mad/`; `https://gym.example/source.json` with base `https://gym.example/`.
- Refused: `http:`, an explicit port, an IP literal in any spelling (`127.1`, `[::1]`, `0x7f.1`), `localhost` and `*.localhost`, a trailing dot on the host, a user name, a query or a fragment including the empty forms `?` and `#`, a path not ending `/source.json`, an address whose serialization is over 512 characters.
- With `{ test: true }`, `http://127.0.0.1:8080/mad/source.json` parses, and nothing else is relaxed.
- `definitionAddress("https://gym.example/mad/", said)` is `https://gym.example/mad/definitions/<said>.json` and throws for a string that is not a SAID.

- [ ] **Step 1: Write the failing test**

`tests/address.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/address.ts'`.

- [ ] **Step 3: Write the implementation**

`src/address.ts`:

```ts
import { isSaid } from "./said.ts";

export type Address = { address: string; base: string };
/** test: relaxes the scheme, the port and loopback hosts, for local test servers only. Set by test code, never by a flag. */
export type AddressOptions = { test?: boolean };

const MAX_LENGTH = 512;
const IPV4 = /^\d+\.\d+\.\d+\.\d+$/;

function parseUrl(s: string, opts: AddressOptions): URL | null {
  if (s.length > MAX_LENGTH) return null;
  let url: URL;
  try { url = new URL(s); } catch { return null; }
  const test = opts.test === true;
  if (url.protocol !== "https:" && !(test && url.protocol === "http:")) return null;
  if (url.href.length > MAX_LENGTH) return null;
  // The canonical form: no user name, password, query or fragment, not even an empty one.
  if (url.href !== url.origin + url.pathname) return null;
  if (url.port !== "" && !test) return null;
  const host = url.hostname;
  if (host === "" || host.endsWith(".")) return null;
  const literal = IPV4.test(host) || host.startsWith("[");
  if (literal && !(test && (host === "127.0.0.1" || host === "[::1]"))) return null;
  if ((host === "localhost" || host.endsWith(".localhost")) && !test) return null;
  return url;
}

function parseEnding(s: string, ending: string, opts: AddressOptions): Address | null {
  const url = parseUrl(s, opts);
  if (url === null || !url.pathname.endsWith(ending)) return null;
  return { address: url.href, base: url.origin + url.pathname.slice(0, url.pathname.length - ending.length + 1) };
}

export function parseSourceAddress(s: string, opts: AddressOptions = {}): Address | null {
  return parseEnding(s, "/source.json", opts);
}

export function parseCatalogAddress(s: string, opts: AddressOptions = {}): Address | null {
  return parseEnding(s, "/catalog.json", opts);
}

/** A plain https address, for oobi and the like. Same rule without the ending. */
export function parseHttpsAddress(s: string, opts: AddressOptions = {}): string | null {
  const url = parseUrl(s, opts);
  return url === null ? null : url.href;
}

export function definitionAddress(base: string, said: string): string {
  if (!isSaid(said)) throw new Error(`not a SAID: ${said}`);
  if (!base.endsWith("/")) throw new Error("a base ends with /");
  return `${base}definitions/${said}.json`;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass.

Note (added at execution): the first version checked `search` and `hash`, which the WHATWG parser reports as empty for `source.json?` and `source.json#`, and measured the 512-character limit on the input rather than the serialization. The review of Task 6 found both; the code above is the corrected form: an address must equal `origin + pathname`, the serialization is bounded, `localhost` names are refused as IP literals are, and `definitionAddress` guards its base.

- [ ] **Step 5: Commit**

```bash
git add src/address.ts tests/address.test.ts
git commit -m "feat: the address rule for sources and catalogs (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: The configuration file and the input folder

**Files:**
- Create: `src/source.ts`, `src/config.ts`, `src/inputs.ts`, `tests/config.test.ts`, `tests/inputs.test.ts`

**Interfaces:**
- Consumes: `isSaid`, `checkSaid` (`src/said.ts`); `compactJson` (`src/compact.ts`); `parseSourceAddress`, `parseCatalogAddress`, `parseHttpsAddress`, `Address`, `AddressOptions` (`src/address.ts`).
- Produces in `src/source.ts`: `AID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/`; `LIMITS = { file: 1_000_000, name: 200, description: 2000, tags: 32, tag: 64, collection: 200 }`; types `Publication`, `Introduction`, `ServesEntry`, `SourceDocument`; `hasControlCharacters(s: string): boolean`; `validatePublication(value: unknown): { ok: true; publication: Publication } | { ok: false; problem: string }`.
- Produces in `src/config.ts`: `type Config = { source: Address; by?: string; oobi?: string; serve: string[]; publications: Publication[]; introductions: Introduction[]; catalogs: string[] }`; `class ConfigError extends Error { problems: string[] }`; `parseConfig(text: string, opts?: AddressOptions): Config`.
- Produces in `src/inputs.ts`: `type Inputs = Map<string, Uint8Array>`; `readInputs(dir: string): { inputs: Inputs; refused: { file: string; reason: string }[] }`.

**Acceptance Criteria:**
- `fixtures/gym-config.json` parses; a configuration with an unknown member, a missing `source`, a `by` that is not an AID, a `serve` entry that is not a SAID, or a publication over a limit or holding a control character is refused with a problem naming the member.
- `readInputs` over a copy of `fixtures/pretty/` returns compact verified bytes for every file; a file not named by a SAID, a file whose bytes do not verify even after whitespace removal, and a file over 1 MB are refused by name with a reason.
- An entry whose name starts with `.` is skipped without a refusal; a file that cannot be read is refused by name with the error's code.

- [ ] **Step 1: Write the failing tests**

`tests/config.test.ts`:

```ts
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
```

`tests/inputs.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, writeFileSync, readdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { checkSaid } from "../src/said.ts";

const pretty = new URL("../fixtures/pretty/", import.meta.url);

test("pretty store files come out compact and verified", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const { inputs, refused } = readInputs(dir);
  assert.deepEqual(refused, []);
  assert.equal(inputs.size, readdirSync(dir).length);
  for (const [said, bytes] of inputs) assert.equal(checkSaid(bytes, said), true, said);
});

test("refusals are by name with a reason", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const good = readdirSync(dir)[0]!;
  writeFileSync(join(dir, "notes.json"), "{}");
  writeFileSync(join(dir, "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F.json"), '{"d":"wrong"}');
  writeFileSync(join(dir, "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.json"), "x".repeat(1_000_001));
  const { inputs, refused } = readInputs(dir);
  assert.ok(inputs.has(good.slice(0, -5)));
  assert.deepEqual(refused.map((r) => r.file).sort(), ["EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.json", "EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F.json", "notes.json"]);
  assert.match(refused.find((r) => r.file === "notes.json")!.reason, /not named by a SAID/);
  assert.match(refused.find((r) => r.file.startsWith("EGQ3"))!.reason, /does not verify/);
  assert.match(refused.find((r) => r.file.startsWith("EAAA"))!.reason, /1 MB/);
});

test("dot-files in the folder are skipped, not refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const count = readdirSync(dir).length;
  writeFileSync(join(dir, ".DS_Store"), "junk");
  const { inputs, refused } = readInputs(dir);
  assert.deepEqual(refused, []);
  assert.equal(inputs.size, count);
});

test("a file that cannot be read is a named refusal and the rest is still read", () => {
  const dir = mkdtempSync(join(tmpdir(), "inputs-"));
  cpSync(pretty, dir, { recursive: true });
  const count = readdirSync(dir).length;
  const dangling = "EB" + "A".repeat(42) + ".json";
  symlinkSync("/nonexistent", join(dir, dangling));
  const { inputs, refused } = readInputs(dir);
  assert.equal(inputs.size, count);
  assert.equal(refused.length, 1);
  assert.equal(refused[0]!.file, dangling);
  assert.match(refused[0]!.reason, /cannot be read/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write src/source.ts**

```ts
/** The source document and its records, as docs/design.md defines them. */
import { isSaid } from "./said.ts";

export const AID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const LIMITS = {
  file: 1_000_000,       // a source document or a definition, in bytes
  name: 200,
  description: 2000,
  tags: 32,
  tag: 64,
  collection: 200,
} as const;

export type Publication = { target: string; by?: string; name: string; description: string; tags: string[]; collection: string };
export type Introduction = { source: string; for: string[] };
export type ServesEntry = { said: string; refers: string[] };
export type SourceDocument = {
  source: string;
  by?: string;
  oobi?: string;
  pages?: boolean;
  serves: ServesEntry[];
  publications: Publication[];
  introductions: Introduction[];
  catalogs: string[];
};

// C0 and C1 control characters, which must not reach a terminal or a page.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

function hasControlCharacters(s: string): boolean {
  return CONTROL.test(s);
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A publication's shape, limits and patterns. */
export function validatePublication(value: unknown): { ok: true; publication: Publication } | { ok: false; problem: string } {
  if (!isRecord(value)) return { ok: false, problem: "not an object" };
  const allowed = new Set(["target", "by", "name", "description", "tags", "collection"]);
  for (const k of Object.keys(value)) if (!allowed.has(k)) return { ok: false, problem: `unknown member: ${k}` };
  const text = (k: string, max: number): string | { problem: string } => {
    const v = value[k];
    if (typeof v !== "string") return { problem: `${k} is not a string` };
    if (v.length > max) return { problem: `${k} is longer than ${max} characters` };
    if (hasControlCharacters(v)) return { problem: `${k} holds a control character` };
    return v;
  };
  const target = value["target"]; if (typeof target !== "string" || !isSaid(target)) return { ok: false, problem: "target is not a SAID" };
  const name = text("name", LIMITS.name); if (typeof name !== "string") return { ok: false, problem: name.problem };
  const description = text("description", LIMITS.description); if (typeof description !== "string") return { ok: false, problem: description.problem };
  const collection = text("collection", LIMITS.collection); if (typeof collection !== "string") return { ok: false, problem: collection.problem };
  const tags = value["tags"];
  if (!Array.isArray(tags) || tags.length > LIMITS.tags) return { ok: false, problem: `tags is not a list of at most ${LIMITS.tags}` };
  for (const [i, t] of tags.entries()) if (typeof t !== "string" || t.length > LIMITS.tag || hasControlCharacters(t)) return { ok: false, problem: `tags[${i}] is not a string of at most 64 characters without control characters` };
  const publication: Publication = { target, name, description, tags: tags as string[], collection };
  if (value["by"] !== undefined) {
    if (typeof value["by"] !== "string" || !AID_PATTERN.test(value["by"])) return { ok: false, problem: "by is not an AID" };
    publication.by = value["by"];
  }
  return { ok: true, publication };
}
```

- [ ] **Step 4: Write src/config.ts**

```ts
import { isSaid } from "./said.ts";
import { parseSourceAddress, parseCatalogAddress, parseHttpsAddress, type Address, type AddressOptions } from "./address.ts";
import { AID_PATTERN, isRecord, validatePublication, type Publication, type Introduction } from "./source.ts";

/** The operator's one authored input. Read strictly: an unknown member is a mistake, not an extension. */
export type Config = {
  source: Address;
  by?: string;
  oobi?: string;
  serve: string[];
  publications: Publication[];
  introductions: Introduction[];
  catalogs: string[];
};

export class ConfigError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`the configuration has ${problems.length} problem(s)`);
    this.problems = problems;
  }
}

const ALLOWED = new Set(["source", "by", "oobi", "serve", "publications", "introductions", "catalogs"]);

export function parseConfig(text: string, opts: AddressOptions = {}): Config {
  const problems: string[] = [];
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ConfigError(["not JSON"]); }
  if (!isRecord(raw)) throw new ConfigError(["not an object"]);
  const r = raw;
  for (const k of Object.keys(r)) if (!ALLOWED.has(k)) problems.push(`unknown member: ${k}`);

  const source = typeof r["source"] === "string" ? parseSourceAddress(r["source"], opts) : null;
  if (source === null) problems.push("source is missing or is not a source address");

  let by: string | undefined;
  if (r["by"] !== undefined) {
    if (typeof r["by"] === "string" && AID_PATTERN.test(r["by"])) by = r["by"]; else problems.push("by is not an AID");
  }
  let oobi: string | undefined;
  if (r["oobi"] !== undefined) {
    const o = typeof r["oobi"] === "string" ? parseHttpsAddress(r["oobi"], opts) : null;
    if (o === null) problems.push("oobi is not an https address"); else oobi = o;
  }

  const list = (k: string): unknown[] => {
    const v = r[k];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { problems.push(`${k} is not a list`); return []; }
    return v;
  };
  const serve: string[] = [];
  list("serve").forEach((v, i) => { if (typeof v === "string" && isSaid(v)) serve.push(v); else problems.push(`serve[${i}] is not a SAID`); });

  const publications: Publication[] = [];
  list("publications").forEach((v, i) => {
    const res = validatePublication(v);
    if (!res.ok) { problems.push(`publications[${i}]: ${res.problem}`); return; }
    publications.push(res.publication);
  });

  const introductions: Introduction[] = [];
  list("introductions").forEach((v, i) => {
    if (!isRecord(v)) { problems.push(`introductions[${i}] is not an object`); return; }
    const o = v;
    for (const k of Object.keys(o)) if (k !== "source" && k !== "for") problems.push(`introductions[${i}]: unknown member: ${k}`);
    const addr = typeof o["source"] === "string" ? parseSourceAddress(o["source"], opts) : null;
    if (addr === null) { problems.push(`introductions[${i}].source is not a source address`); return; }
    const fors: string[] = [];
    const f = o["for"] === undefined ? [] : o["for"];
    if (!Array.isArray(f)) { problems.push(`introductions[${i}].for is not a list`); return; }
    f.forEach((s, j) => { if (typeof s === "string" && isSaid(s)) fors.push(s); else problems.push(`introductions[${i}].for[${j}] is not a SAID`); });
    introductions.push({ source: addr.address, for: fors });
  });

  const catalogs: string[] = [];
  list("catalogs").forEach((v, i) => {
    const c = typeof v === "string" ? parseCatalogAddress(v, opts) : null;
    if (c === null) problems.push(`catalogs[${i}] is not a catalog address`); else catalogs.push(c.address);
  });

  if (problems.length > 0 || source === null) throw new ConfigError(problems);
  const config: Config = { source, serve, publications, introductions, catalogs };
  if (by !== undefined) config.by = by;
  if (oobi !== undefined) config.oobi = oobi;
  return config;
}
```

- [ ] **Step 5: Write src/inputs.ts**

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isSaid, checkSaid } from "./said.ts";
import { compactJson } from "./compact.ts";
import { LIMITS } from "./source.ts";

/** SAID to the compact, verified bytes of that definition. */
export type Inputs = Map<string, Uint8Array>;

/**
 * One file per definition, named <SAID>.json as a bpm-core store names them. The file name is the expected SAID;
 * the bytes are taken as they are when they verify, else with whitespace removed, else refused.
 */
export function readInputs(dir: string): { inputs: Inputs; refused: { file: string; reason: string }[] } {
  const inputs: Inputs = new Map();
  const refused: { file: string; reason: string }[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (file.startsWith(".")) continue;
    const path = join(dir, file);
    let size: number;
    try {
      const st = statSync(path);
      if (st.isDirectory()) continue;
      size = st.size;
    } catch (e) { refused.push({ file, reason: `cannot be read: ${errorText(e)}` }); continue; }
    if (!file.endsWith(".json") || !isSaid(file.slice(0, -5))) { refused.push({ file, reason: "not named by a SAID" }); continue; }
    const said = file.slice(0, -5);
    if (size > LIMITS.file) { refused.push({ file, reason: "larger than 1 MB" }); continue; }
    let raw: Uint8Array;
    try { raw = new Uint8Array(readFileSync(path)); }
    catch (e) { refused.push({ file, reason: `cannot be read: ${errorText(e)}` }); continue; }
    if (checkSaid(raw, said)) { inputs.set(said, raw); continue; }
    const compact = compactJson(raw);
    if (checkSaid(compact, said)) { inputs.set(said, compact); continue; }
    refused.push({ file, reason: "does not verify against its name, as given or with whitespace removed; supply the compact bytes the SAID was computed over" });
  }
  return { inputs, refused };
}

function errorText(e: unknown): string {
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : e instanceof Error ? e.message : String(e);
}
```

- [ ] **Step 6: Run the tests**

Run: `npm run check && npm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/source.ts src/config.ts src/inputs.ts tests/config.test.ts tests/inputs.test.ts
git commit -m "feat: read the configuration strictly and the input folder by SAID (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: The build, in memory

**Files:**
- Create: `src/build.ts`, `tests/build.test.ts`

**Interfaces:**
- Consumes: `Inputs` (`src/inputs.ts`), `Config` (`src/config.ts`), `appearances` (`src/scan.ts`), `checkSaid` (`src/said.ts`), `definitionAddress` (`src/address.ts`), `LIMITS`, `SourceDocument`, `ServesEntry` (`src/source.ts`), and from Task 9 `renderPages(input: PagesInput): Map<string, string>` and `sitemapXml(base: string, saids: string[]): string` (`src/pages.ts`). Task 8 is written against those two signatures; until Task 9 lands, `src/pages.ts` holds the stubs given in Step 3.
- Produces: `type BuildPlan = { files: Map<string, Uint8Array>; document: SourceDocument; unserved: { said: string; appearsIn: string[] }[]; robotsLine: string; sitemapLine: string }`; `class BuildError extends Error { problems: string[] }`; `planBuild(inputs: Inputs, config: Config): BuildPlan`; `writePlan(plan: BuildPlan, outDir: string): void`.

**Acceptance Criteria:**
- Over the gym fixtures with `gym-config.json`: the plan serves the three selections and the 23 definitions they transitively contain (26 of 28), and nothing else from the folder; every `definitions/<SAID>.json` in the plan verifies; every `refers` equals `appearances` of those bytes; `source.json` carries `serves` sorted by SAID, `pages: true`, the publications in configuration order, and no `by` when the configuration has none.
- A `serve` SAID with no input file is refused by name; when `serve` is empty, the served set is the publication targets the folder holds plus what appears in them.
- Two plans over the same input are byte-identical in every file.
- `writePlan` refuses an output folder that exists and is not empty, and writes nothing in that case.
- The plan refuses a `source.json` over 1 MB.

- [ ] **Step 1: Write the failing test**

`tests/build.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild, writePlan, BuildError } from "../src/build.ts";
import { checkSaid } from "../src/said.ts";
import { appearances } from "../src/scan.ts";
import type { SourceDocument } from "../src/source.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const gymDir = () => { const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(new URL("pretty/", fixtures), d, { recursive: true }); return d; };
const gymConfig = readFileSync(new URL("gym-config.json", fixtures), "utf8");
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";

test("the gym build serves the selections and what they contain, and nothing else", () => {
  const dir = gymDir();
  const { inputs } = readInputs(dir);
  const config = parseConfig(gymConfig);
  const plan = planBuild(inputs, config);
  assert.equal(plan.document.serves.length, 26);
  assert.ok(!plan.document.serves.some((s) => s.said === QVI), "the GLEIF schema is in the folder and is not served");
  const saids = plan.document.serves.map((s) => s.said);
  assert.deepEqual(saids, [...saids].sort());
  for (const s of plan.document.serves) {
    const bytes = plan.files.get(`definitions/${s.said}.json`)!;
    assert.equal(checkSaid(bytes, s.said), true, s.said);
    assert.deepEqual(s.refers, appearances(bytes, s.said), s.said);
  }
  assert.equal(plan.document.pages, true);
  assert.equal(plan.document.by, undefined);
  assert.deepEqual(plan.document.publications.map((p) => p.name), config.publications.map((p) => p.name));
  assert.deepEqual(plan.unserved, [], "every appearance is served or introduced");
  assert.equal(plan.robotsLine, "Mad-Source: https://gym.example/mad/source.json");
  assert.equal(plan.sitemapLine, "Sitemap: https://gym.example/mad/sitemap.xml");
  for (const path of ["source.json", "pages/index.html", "pages/style.css", "sitemap.xml", `pages/${saids[0]}/index.html`]) assert.ok(plan.files.has(path), path);
});

test("two plans over the same input are byte-identical", () => {
  const a = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  const b = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  assert.deepEqual([...a.files.keys()].sort(), [...b.files.keys()].sort());
  for (const [k, v] of a.files) assert.deepEqual(Buffer.from(v), Buffer.from(b.files.get(k)!), k);
});

test("a serve SAID with no input file is refused by name", () => {
  const cfg = JSON.parse(gymConfig); cfg.serve.push("EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F");
  assert.throws(() => planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg))), (e: BuildError) => e.problems.join().includes("EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F"));
});

test("with serve empty, the publication targets the folder holds are served", () => {
  const cfg = JSON.parse(gymConfig); cfg.serve = []; cfg.publications = [cfg.publications[0]];
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg)));
  assert.ok(plan.document.serves.some((s) => s.said === cfg.publications[0].target));
  assert.ok(plan.document.serves.length < 26);
});

test("an unserved appearance is reported", () => {
  const dir = gymDir();
  const cfg = JSON.parse(gymConfig);
  const { inputs } = readInputs(dir);
  const first = cfg.serve[0] as string;
  const contained = appearances(inputs.get(first)!, first)[0]!;
  inputs.delete(contained);
  const plan = planBuild(inputs, parseConfig(JSON.stringify(cfg)));
  assert.ok(plan.unserved.some((u) => u.said === contained && u.appearsIn.includes(first)));
});

test("writePlan needs an absent or empty folder and writes every file", () => {
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  writePlan(plan, out);
  assert.ok(existsSync(join(out, "source.json")));
  const doc = JSON.parse(readFileSync(join(out, "source.json"), "utf8")) as SourceDocument;
  assert.equal(doc.source, "https://gym.example/mad/source.json");
  assert.equal(readdirSync(join(out, "definitions")).length, 26);
  writeFileSync(join(out, "stray.txt"), "x");
  assert.throws(() => writePlan(plan, out), /not empty/);
});

test("a publication's by is its second member", () => {
  const cfg = JSON.parse(gymConfig);
  cfg.publications[0].by = "EKxy";
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg)));
  assert.deepEqual(Object.keys(plan.document.publications[0]!), ["target", "by", "name", "description", "tags", "collection"]);
});

test("a source.json over 1 MB is refused", () => {
  const cfg = JSON.parse(gymConfig);
  const first = cfg.publications[0];
  cfg.publications = Array.from({ length: 600 }, () => ({ ...first, description: "x".repeat(2000) }));
  const { inputs } = readInputs(gymDir());
  assert.throws(
    () => planBuild(inputs, parseConfig(JSON.stringify(cfg))),
    (e: unknown) => e instanceof BuildError && e.problems.join("\n").includes("source.json"),
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/build.ts'`.

- [ ] **Step 3: Write the stubs for src/pages.ts** (replaced in Task 9)

```ts
import type { Publication, SourceDocument } from "./source.ts";

export type PagesInput = {
  document: SourceDocument;
  base: string;
  definitions: Map<string, Uint8Array>;
};

/** Task 9 replaces this. Until then every page is one line, so the build has files to write. */
export function renderPages(input: PagesInput): Map<string, string> {
  const files = new Map<string, string>();
  files.set("pages/index.html", "<!doctype html>\n");
  files.set("pages/style.css", "");
  for (const s of input.document.serves) files.set(`pages/${s.said}/index.html`, "<!doctype html>\n");
  return files;
}

export function sitemapXml(base: string, saids: string[]): string {
  const urls = [`${base}pages/index.html`, ...saids.map((s) => `${base}pages/${s}/index.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
}

export function publicationsFor(document: SourceDocument, said: string): Publication[] {
  return document.publications.filter((p) => p.target === said);
}
```

- [ ] **Step 4: Write src/build.ts**

```ts
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import { LIMITS, type ServesEntry, type SourceDocument } from "./source.ts";
import type { Inputs } from "./inputs.ts";
import type { Config } from "./config.ts";
import { renderPages, sitemapXml } from "./pages.ts";

export type BuildPlan = {
  files: Map<string, Uint8Array>;
  document: SourceDocument;
  unserved: { said: string; appearsIn: string[] }[];
  robotsLine: string;
  sitemapLine: string;
};

export class BuildError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`the build has ${problems.length} problem(s)`);
    this.problems = problems;
  }
}

const encoder = new TextEncoder();

/** Everything in memory, every output checked. Nothing is written here. */
export function planBuild(inputs: Inputs, config: Config): BuildPlan {
  const problems: string[] = [];

  // What a source serves: the named SAIDs, or the publication targets the folder holds; then what appears in them.
  const start = config.serve.length > 0 ? config.serve : config.publications.map((p) => p.target).filter((t) => inputs.has(t));
  for (const said of config.serve) if (!inputs.has(said)) problems.push(`serve names ${said}, which has no input file`);
  if (problems.length > 0) throw new BuildError(problems);

  const served = new Set<string>();
  const refersOf = new Map<string, string[]>();
  const unserved = new Map<string, Set<string>>();
  const queue = [...start];
  while (queue.length > 0) {
    const said = queue.shift()!;
    if (served.has(said)) continue;
    const bytes = inputs.get(said)!;
    served.add(said);
    const found = appearances(bytes, said);
    refersOf.set(said, found);
    for (const inner of found) {
      if (inputs.has(inner)) queue.push(inner);
      else { if (!unserved.has(inner)) unserved.set(inner, new Set()); unserved.get(inner)!.add(said); }
    }
  }
  const introducedFor = new Set(config.introductions.flatMap((i) => i.for));

  const saids = [...served].sort();
  const serves: ServesEntry[] = saids.map((said) => ({ said, refers: refersOf.get(said)! }));

  // Built once in a fixed member order, so two builds of one input are byte-identical.
  const document: SourceDocument = {
    source: config.source.address,
    ...(config.by !== undefined ? { by: config.by } : {}),
    ...(config.oobi !== undefined ? { oobi: config.oobi } : {}),
    pages: true,
    serves,
    publications: config.publications.map((p) => ({
      target: p.target,
      ...(p.by !== undefined ? { by: p.by } : {}),
      name: p.name,
      description: p.description,
      tags: p.tags,
      collection: p.collection,
    })),
    introductions: config.introductions,
    catalogs: config.catalogs,
  };

  const files = new Map<string, Uint8Array>();
  const sourceBytes = encoder.encode(JSON.stringify(document, null, 2) + "\n");
  if (sourceBytes.length > LIMITS.file) problems.push(`source.json would be ${sourceBytes.length} bytes, over 1 MB; split the source`);
  files.set("source.json", sourceBytes);
  for (const said of saids) {
    const bytes = inputs.get(said)!;
    if (!checkSaid(bytes, said)) problems.push(`definitions/${said}.json does not verify`);
    files.set(`definitions/${said}.json`, bytes);
  }
  for (const [path, text] of renderPages({ document, base: config.source.base, definitions: new Map(saids.map((s) => [s, inputs.get(s)!] as [string, Uint8Array])) })) files.set(path, encoder.encode(text));
  files.set("sitemap.xml", encoder.encode(sitemapXml(config.source.base, saids)));
  if (problems.length > 0) throw new BuildError(problems);

  return {
    files,
    document,
    unserved: [...unserved.keys()].sort().map((said) => ({ said, appearsIn: [...unserved.get(said)!].sort() })).filter((u) => !introducedFor.has(u.said)),
    robotsLine: `Mad-Source: ${config.source.address}`,
    sitemapLine: `Sitemap: ${config.source.base}sitemap.xml`,
  };
}

/** --out must be absent or an empty folder: null when it is, otherwise the problem. */
export function outDirProblem(outDir: string): string | null {
  let isDirectory: boolean;
  try { isDirectory = statSync(outDir).isDirectory(); } catch { return null; }
  if (!isDirectory) return `${outDir} is not a folder`;
  return readdirSync(outDir).length > 0 ? `${outDir} is not empty` : null;
}

/** Writes every planned file, creating folders as needed, after checking the out-folder rule. */
export function writePlan(plan: BuildPlan, outDir: string): void {
  const problem = outDirProblem(outDir);
  if (problem !== null) throw new Error(problem);
  mkdirSync(outDir, { recursive: true });
  for (const [path, bytes] of plan.files) {
    const full = join(outDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `npm run check && npm test`
Expected: all pass. If the `serves.length` is not 26, compare against `appearances` over the clean store: the three selections contain 23 further documents.

Note (added at execution): the review of Task 8 found that a publication's `by` was written last instead of second; the code above is the corrected form, with the 1 MB refusal now tested.

- [ ] **Step 6: Commit**

```bash
git add src/build.ts src/pages.ts tests/build.test.ts
git commit -m "feat: plan a source in memory and write it to an empty folder (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: Readable pages

**Files:**
- Modify: `src/pages.ts` (replace the stubs)
- Create: `tests/pages.test.ts`

**Interfaces:**
- Consumes: `PagesInput`, `SourceDocument`, `Publication`, `isSaid`, `paths`, `depth`, `PATH_LIMITS`, `definitionAddress`, `parseCatalogAddress`.
- Produces: `escapeHtml(s: string): string`; `renderPages(input: PagesInput): Map<string, string>` writing `pages/index.html`, `pages/style.css`, `pages/<SAID>/index.html`; `sitemapXml(base: string, saids: string[]): string`; `publicationsFor(document, said)`.

**Acceptance Criteria:**
- Every served SAID has a page; the index page lists every served SAID by the names its publications give, or by SAID when it has none.
- A definition page shows: the publications' names, descriptions and `by` (or the source's `by`); the SAID and the command `mad-discovery verify <definition address> <SAID>`; the content as an outline, with SAIDs inside it linked to their pages when this source serves them (never to the page itself); the served definitions that contain it, each with the places of the appearance; the introductions `for` it, by address; the catalogs, each linked to `<catalog base>pages/<SAID>/index.html`.
- Hostile strings (`</script><script>`, `"><img src=x onerror=...>`, `javascript:alert(1)`, bidirectional controls) appear only as escaped text, never as markup or a link target; the page has no `<script`; every `<` in the page starts one of the writer's own tags; every `href` is a relative page link, the stylesheet, or an address from the document.
- The page carries the Content-Security-Policy `<meta>` and no inline style attribute; links are relative and name `index.html`.
- A definition nested deeper than 64 levels, or one that is not JSON, is shown as escaped text instead of an outline, and `build` does not fail on it.

- [ ] **Step 1: Write the failing test**

`tests/pages.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { escapeHtml, renderPages } from "../src/pages.ts";
import { saidOf } from "../src/said.ts";
import type { SourceDocument } from "../src/source.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const gymConfig = () => readFileSync(new URL("gym-config.json", fixtures), "utf8");
const gymPlan = (config = gymConfig()) => {
  const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(new URL("pretty/", fixtures), d, { recursive: true });
  return planBuild(readInputs(d).inputs, parseConfig(config));
};
const text = (b: Uint8Array) => Buffer.from(b).toString("utf8");
const ALLOWED_TAGS = /^<\/?(!doctype|html|head|meta|title|link|body|header|main|nav|section|h1|h2|h3|p|a|ul|ol|li|dl|dt|dd|code|pre|span|footer)\b/i;

test("every served SAID has a page and the index names them", () => {
  const plan = gymPlan();
  const index = text(plan.files.get("pages/index.html")!);
  for (const s of plan.document.serves) {
    const page = text(plan.files.get(`pages/${s.said}/index.html`)!);
    assert.ok(page.includes(s.said));
    assert.ok(page.includes(`mad-discovery verify https://gym.example/mad/definitions/${s.said}.json ${s.said}`));
    assert.ok(index.includes(`href="${s.said}/index.html"`));
  }
  for (const p of plan.document.publications) assert.ok(index.includes(escapeHtml(p.name)));
});

test("what a page shows", () => {
  const plan = gymPlan();
  const [selection] = plan.document.publications;
  const page = text(plan.files.get(`pages/${selection!.target}/index.html`)!);
  assert.ok(page.includes(escapeHtml(selection!.description)));
  assert.ok(page.includes(`<title>${escapeHtml(selection!.name)} ${selection!.target}</title>`), "the title carries the SAID");
  assert.ok(!page.includes(`href="../${selection!.target}/index.html"`), "no self-link");
  const entry = plan.document.serves.find((s) => s.said === selection!.target)!;
  for (const inner of entry.refers) assert.ok(page.includes(`href="../${inner}/index.html"`), `links ${inner}`);
  const contained = plan.document.serves.find((s) => s.refers.length > 0 && plan.document.serves.some((o) => o.refers.includes(s.said)))!;
  const containedPage = text(plan.files.get(`pages/${contained.said}/index.html`)!);
  const container = plan.document.serves.find((o) => o.refers.includes(contained.said))!;
  assert.ok(containedPage.includes(`href="../${container.said}/index.html"`), "contained-by links back");
  assert.ok(page.includes('http-equiv="Content-Security-Policy"'));
  assert.ok(page.includes('href="../style.css"'));
  assert.ok(!/ style=/.test(page));
});

test("every string on a page is a stranger's", () => {
  const hostile = ["</script><script>alert(1)</script>", '"><img src=x onerror=alert(1)>', "javascript:alert(1)", "\u202eright-to-left\u202c"];
  const content = JSON.stringify({ d: "#".repeat(44), note: hostile, [hostile[1]!]: hostile[2] });
  const said = saidOf(new TextEncoder().encode(content));
  const bytes = new TextEncoder().encode(content.replace("#".repeat(44), said));
  const document: SourceDocument = {
    source: "https://x.example/mad/source.json", pages: true,
    serves: [{ said, refers: [] }],
    publications: [{ target: said, name: hostile[0]!, description: hostile[1]!, tags: [hostile[2]!], collection: hostile[3]! }],
    introductions: [{ source: "https://y.example/mad/source.json", for: [said] }],
    catalogs: ["https://c.example/cat/catalog.json"],
  };
  const files = renderPages({ document, base: "https://x.example/mad/", definitions: new Map([[said, bytes]]) });
  for (const [path, page] of files) {
    if (!path.endsWith(".html")) continue;
    assert.ok(!page.includes("<script"), path);
    assert.ok(!page.includes(hostile[1]!), `${path} shows the markup string raw`);
    assert.ok(!page.includes("\u202e"), `${path} holds a raw bidirectional control`);
    assert.ok(!page.includes('href="javascript:'), `${path} makes a stranger's string a link`);
    for (const m of page.matchAll(/<[^>]*>/g)) assert.match(m[0], ALLOWED_TAGS, `${path}: ${m[0]}`);
    for (const m of page.matchAll(/href="([^"]*)"/g)) {
      const href = m[1]!;
      assert.ok(/^(\.\.\/)?(style\.css|[A-Za-z0-9_-]{44}\/index\.html|index\.html)$/.test(href) || href === "https://y.example/mad/source.json" || href === `https://c.example/cat/pages/${said}/index.html`, `${path}: ${href}`);
    }
  }
  const page = files.get(`pages/${said}/index.html`)!;
  assert.ok(page.includes("Introductions"), "a fixed label");
  assert.ok(page.includes(escapeHtml(hostile[0]!)));
});

test("a definition too deep for an outline is shown as text and still has a page", () => {
  const content = "[".repeat(100_000) + '"' + "#".repeat(44) + '"' + "]".repeat(100_000);
  const said = saidOf(new TextEncoder().encode(content));
  const bytes = new TextEncoder().encode(content.replace("#".repeat(44), said));
  const document: SourceDocument = { source: "https://x.example/mad/source.json", pages: true, serves: [{ said, refers: [] }], publications: [], introductions: [], catalogs: [] };
  const files = renderPages({ document, base: "https://x.example/mad/", definitions: new Map([[said, bytes]]) });
  const page = files.get(`pages/${said}/index.html`)!;
  assert.ok(page.includes("<pre>"), "shown as text");
  assert.ok(!page.includes("<ol>"), "not as an outline");
});

test("a source's by is shown on a published definition's page", () => {
  const plan = gymPlan(JSON.stringify({ ...JSON.parse(gymConfig()), by: "EKxy" }));
  const [selection] = plan.document.publications;
  const page = text(plan.files.get(`pages/${selection!.target}/index.html`)!);
  assert.ok(page.includes("Offered by: <code>EKxy</code>"));
});

const oneServed = (content: string) => {
  const said = saidOf(new TextEncoder().encode(content));
  const bytes = new TextEncoder().encode(content.replace("#".repeat(44), said));
  return { said, definitions: new Map([[said, bytes]]) };
};

test("a link target that is not an address is refused", () => {
  const { said, definitions } = oneServed(JSON.stringify({ d: "#".repeat(44) }));
  const doc = (introductions: SourceDocument["introductions"], catalogs: string[]): SourceDocument =>
    ({ source: "https://x.example/mad/source.json", pages: true, serves: [{ said, refers: [] }], publications: [], introductions, catalogs });
  assert.throws(() => renderPages({ document: doc([{ source: "javascript:alert(1)", for: [said] }], []), base: "https://x.example/mad/", definitions }), /not an address/);
  assert.throws(() => renderPages({ document: doc([], ["nope"]), base: "https://x.example/mad/", definitions }), /not an address/);
});

test("a definition that is not JSON is shown as text", () => {
  const { said, definitions } = oneServed(`(define ${"#".repeat(44)})`);
  const document: SourceDocument = { source: "https://x.example/mad/source.json", pages: true, serves: [{ said, refers: [] }], publications: [], introductions: [], catalogs: [] };
  const page = renderPages({ document, base: "https://x.example/mad/", definitions }).get(`pages/${said}/index.html`)!;
  assert.ok(page.includes("<pre>(define"));
  assert.ok(!page.includes("<dl>"));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL (the stubs render one line per page).

- [ ] **Step 3: Write src/pages.ts** (replacing the stubs)

```ts
import { isSaid } from "./said.ts";
import { paths, parseBounded } from "./scan.ts";
import { definitionAddress, parseCatalogAddress, parseSourceAddress, parseHttpsAddress } from "./address.ts";
import type { Publication, SourceDocument } from "./source.ts";

export type PagesInput = {
  document: SourceDocument;
  base: string;
  definitions: Map<string, Uint8Array>;
};

/**
 * The one way text reaches a page. There is no way to emit raw markup from a string.
 * Bidirectional and zero-width control characters become numeric references, so the markup never holds them raw.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
    .replace(/[\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, (c) => `&#x${c.codePointAt(0)!.toString(16)};`);
}

function publicationsFor(document: SourceDocument, said: string): Publication[] {
  return document.publications.filter((p) => p.target === said);
}

const CSP = "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'";

function shell(title: string, stylesheet: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${stylesheet}">
</head>
<body>
${body}
</body>
</html>
`;
}

/** A link to another page of this source, by SAID, relative to a definition page. Only a SAID can be a target. */
function pageLink(said: string, fromIndex: boolean): string {
  if (!isSaid(said)) throw new Error("only a SAID can be a page link");
  return `<a href="${fromIndex ? "" : "../"}${said}/index.html"><code>${said}</code></a>`;
}

/** A link to an address that passed the address rule; null (it did not) is refused. */
function addressLink(address: string | null, text: string): string {
  if (address === null) throw new Error("not an address");
  return `<a href="${escapeHtml(address)}">${escapeHtml(text)}</a>`;
}

/** The definition's content as an outline. Strings that are linkable SAIDs become links; everything else is text. */
function outline(value: unknown, linkable: Set<string>): string {
  if (typeof value === "string") return isSaid(value) && linkable.has(value) ? pageLink(value, false) : `<span>${escapeHtml(value)}</span>`;
  if (value === null || typeof value !== "object") return `<span>${escapeHtml(String(value))}</span>`;
  if (Array.isArray(value)) return `<ol>${value.map((v) => `<li>${outline(v, linkable)}</li>`).join("")}</ol>`;
  return `<dl>${Object.entries(value as Record<string, unknown>).map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${outline(v, linkable)}</dd>`).join("")}</dl>`;
}

function offered(p: Publication, sourceBy: string | undefined): string {
  const by = p.by ?? sourceBy;
  return `<section><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description)}</p>` +
    (p.tags.length > 0 ? `<p>Tags: ${p.tags.map((t) => `<code>${escapeHtml(t)}</code>`).join(" ")}</p>` : "") +
    `<p>Collection: ${escapeHtml(p.collection)}</p>` +
    (by !== undefined ? `<p>Offered by: <code>${escapeHtml(by)}</code></p>` : "") + `</section>`;
}

function definitionPage(said: string, input: PagesInput, served: Set<string>): string {
  const { document, base, definitions } = input;
  const bytes = definitions.get(said)!;
  const address = definitionAddress(base, said);
  const pubs = publicationsFor(document, said);
  const title = pubs[0]?.name ?? said;
  const text = Buffer.from(bytes).toString("utf8");
  const linkable = new Set(served);
  linkable.delete(said);                                  // a page does not link to itself
  const parsed = parseBounded(bytes);                     // not JSON, or too deep for a recursive walk: shown as text
  const content = parsed.ok ? outline(parsed.value, linkable) : `<pre>${escapeHtml(text)}</pre>`;

  const containers = document.serves.filter((s) => s.refers.includes(said)).map((s) => {
    const where = paths(definitions.get(s.said)!, said);
    return `<li>${pageLink(s.said, false)}${where.paths.length > 0 ? ` at ${where.paths.map((p) => `<code>${escapeHtml(p)}</code>`).join(", ")}` : ""}${where.count > where.paths.length ? ` (${where.count} appearances)` : ""}</li>`;
  });
  const introductions = document.introductions.filter((i) => i.for.includes(said)).map((i) => `<li>${addressLink(parseSourceAddress(i.source)?.address ?? null, i.source)}</li>`);
  const catalogs = document.catalogs.map((c) => {
    const cat = parseCatalogAddress(c);
    return `<li>${addressLink(cat === null ? null : `${cat.base}pages/${said}/index.html`, c)}</li>`;
  });

  const body = `<header><p><a href="../index.html">This source</a></p><h1>${escapeHtml(title)}</h1></header>
<main>
${pubs.map((p) => offered(p, document.by)).join("\n")}
<section><h2>SAID</h2><p><code>${said}</code></p><p>Check it:</p><pre>mad-discovery verify ${escapeHtml(address)} ${said}</pre></section>
<section><h2>Content</h2>${content}</section>
<section><h2>Contained by</h2>${containers.length > 0 ? `<ul>${containers.join("")}</ul>` : "<p>No definition on this source contains it.</p>"}</section>
<section><h2>Introductions</h2>${introductions.length > 0 ? `<ul>${introductions.join("")}</ul>` : "<p>None for this definition.</p>"}</section>
<section><h2>Catalogs</h2>${catalogs.length > 0 ? `<ul>${catalogs.join("")}</ul>` : "<p>None named.</p>"}</section>
</main>
<footer><p>Served at <code>${escapeHtml(address)}</code>. A page is a rendering and is evidence of nothing; the check runs on the bytes.</p></footer>`;
  return shell(pubs[0] ? `${title} ${said}` : said, "../style.css", body);
}

function indexPage(input: PagesInput): string {
  const { document } = input;
  const items = document.serves.map((s) => {
    const pubs = publicationsFor(document, s.said);
    const name = pubs[0]?.name;
    return `<li>${pageLink(s.said, true)}${name !== undefined ? ` ${escapeHtml(name)}` : ""}</li>`;
  });
  const by = document.by !== undefined ? `<p>Run by: <code>${escapeHtml(document.by)}</code>${document.oobi !== undefined ? ` (${addressLink(parseHttpsAddress(document.oobi), document.oobi)})` : ""}</p>` : "";
  const body = `<header><h1>Definitions served here</h1><p>Source document: <code>${escapeHtml(document.source)}</code></p>${by}</header>
<main><ul>${items.join("")}</ul></main>`;
  return shell("Definitions served here", "style.css", body);
}

const STYLE_CSS = `body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:48rem;padding:1rem}
code,pre{font-family:ui-monospace,monospace;overflow-wrap:anywhere}
pre{background:#f4f4f4;padding:.5rem;white-space:pre-wrap}
dl{margin:0 0 0 1rem}dt{font-weight:600}dd{margin:0 0 .25rem 1rem}
section{margin:1.5rem 0}footer{color:#555;font-size:.9rem}
`;

export function renderPages(input: PagesInput): Map<string, string> {
  const served = new Set(input.document.serves.map((s) => s.said));
  const files = new Map<string, string>();
  files.set("pages/index.html", indexPage(input));
  files.set("pages/style.css", STYLE_CSS);
  for (const said of served) files.set(`pages/${said}/index.html`, definitionPage(said, input, served));
  return files;
}

export function sitemapXml(base: string, saids: string[]): string {
  const urls = [`${base}pages/index.html`, ...saids.map((s) => `${base}pages/${s}/index.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`).join("\n")}\n</urlset>\n`;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass, including the build tests from Task 8, which now exercise the real pages.

- [ ] **Step 5: Commit**

```bash
git add src/pages.ts tests/pages.test.ts
git commit -m "feat: readable pages, the index page, the stylesheet and the sitemap (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 10: The command

**Files:**
- Create: `src/cli.ts`, `bin/mad-discovery.ts`, `tests/cli.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `main(argv: string[], io: { out: (s: string) => void; err: (s: string) => void }): number` in `src/cli.ts`; `bin/mad-discovery.ts` runs it with `process.argv.slice(2)` and sets `process.exitCode`. Commands: `build <folder> --config <file> --out <folder>` and `verify <file> <SAID>`.

**Acceptance Criteria:**
- `node bin/mad-discovery.ts build <gym fixtures copy> --config fixtures/gym-config.json --out <new folder>` exits 0, writes the source, and prints one JSON object with `written`, `serves`, `unserved`, `robots` and `sitemap`.
- The same command against a non-empty `--out`, a missing config, a config with an unknown member, or an input that does not verify exits 1, writes nothing, and names every problem in the JSON.
- `verify <file> <SAID>` exits 0 and prints `{"verified":true,...}` for a compact fixture, exits 1 with the expected and computed SAID for a pretty copy, and exits 2 with a usage message when the SAID is missing or an address is given.
- Standard output is ASCII-only JSON; a usage error goes to standard error and exits 2.

- [ ] **Step 1: Write the failing test**

`tests/cli.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { asciiJson } from "../src/cli.ts";

const bin = fileURLToPath(new URL("../bin/mad-discovery.ts", import.meta.url));
const fixtures = fileURLToPath(new URL("../fixtures/", import.meta.url));
const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr, json: r.stdout.trim() === "" ? null : JSON.parse(r.stdout) };
};
const gymDir = () => { const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(join(fixtures, "pretty"), d, { recursive: true }); return d; };
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";

test("build writes a source and reports", () => {
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  const r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", out);
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json.written, 26 * 2 + 4, "26 definitions, 26 pages, source.json, index, style, sitemap");
  assert.equal(r.json.serves.length, 26);
  assert.equal(r.json.robots, "Mad-Source: https://gym.example/mad/source.json");
  assert.equal(r.json.sitemap, "Sitemap: https://gym.example/mad/sitemap.xml");
  assert.ok(/^[\x20-\x7e\n]*$/.test(r.out), "ASCII-only output");
  assert.equal(readdirSync(join(out, "definitions")).length, 26);
  assert.ok(!("refused" in r.json), "a refusal exits 1, so success carries no refused list");
});

test("build refuses and writes nothing", () => {
  const dir = gymDir();
  writeFileSync(join(dir, "notes.json"), "{}");
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  let r = run("build", dir, "--config", join(fixtures, "gym-config.json"), "--out", out);
  assert.equal(r.code, 1);
  assert.ok(!existsSync(out));
  assert.ok(r.json.problems.some((p: string) => p.includes("notes.json")));
  const cfg = join(mkdtempSync(join(tmpdir(), "cfg-")), "c.json");
  writeFileSync(cfg, JSON.stringify({ source: "https://g.example/mad/source.json", extra: 1 }));
  r = run("build", gymDir(), "--config", cfg, "--out", out);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("unknown member: extra")));
  const full = mkdtempSync(join(tmpdir(), "full-")); writeFileSync(join(full, "x"), "x");
  r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", full);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("not empty")));
  assert.deepEqual(readdirSync(full), ["x"]);
  const file = join(mkdtempSync(join(tmpdir(), "file-")), "site");
  writeFileSync(file, "keep");
  r = run("build", gymDir(), "--config", join(fixtures, "gym-config.json"), "--out", file);
  assert.equal(r.code, 1);
  assert.ok(r.json.problems.some((p: string) => p.includes("is not a folder")));
  assert.equal(readFileSync(file, "utf8"), "keep");
});

test("verify a file", () => {
  let r = run("verify", join(fixtures, "compact", `${QVI}.json`), QVI);
  assert.equal(r.code, 0);
  assert.equal(r.json.verified, true);
  r = run("verify", join(fixtures, "pretty", `${QVI}.json`), QVI);
  assert.equal(r.code, 1);
  assert.equal(r.json.verified, false);
  assert.equal(r.json.expected, QVI);
  assert.match(r.json.reason, /digest/);
});

test("usage errors exit 2", () => {
  assert.equal(run("verify", join(fixtures, "compact", `${QVI}.json`)).code, 2);
  assert.equal(run("verify", "https://gym.example/mad/definitions/x.json", QVI).code, 2);
  assert.equal(run("nonsense").code, 2);
  assert.equal(run().code, 2);
  const config = join(fixtures, "gym-config.json");
  for (const args of [["build", gymDir(), "--out", "--config", config], ["build", gymDir(), "--config", "--out", "o"]]) {
    const cwd = mkdtempSync(join(tmpdir(), "cwd-"));
    const r = spawnSync(process.execPath, [bin, ...args], { encoding: "utf8", cwd });
    assert.equal(r.status, 2, args.join(" "));
    assert.ok(!existsSync(join(cwd, "--config")), "no --config folder written");
    assert.deepEqual(readdirSync(cwd), [], "nothing written");
  }
});

test("asciiJson escapes everything outside printable ASCII", () => {
  const value = { a: "\u00e9\u007f\u{1F600}\u2028\u0001" };
  const s = asciiJson(value);
  assert.match(s, /^[\x20-\x7e\n]*$/);
  assert.ok(s.includes("\\u00e9"));
  assert.ok(s.includes("\\ud83d\\ude00"));
  assert.ok(s.includes("\\u2028"));
  assert.deepEqual(JSON.parse(s), value);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL (`bin/mad-discovery.ts` does not exist).

- [ ] **Step 3: Write src/cli.ts and bin/mad-discovery.ts**

`src/cli.ts`:

```ts
import { readFileSync } from "node:fs";
import { isSaid, checkSaid, saidOf, replaceAll, FILL } from "./said.ts";
import { parseConfig, ConfigError } from "./config.ts";
import { readInputs } from "./inputs.ts";
import { planBuild, writePlan, outDirProblem, BuildError } from "./build.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };

const USAGE = `usage:
  mad-discovery build <folder> --config <file> --out <folder>
  mad-discovery verify <file> <SAID>
Every command prints JSON on standard output. Exit 0: success. 1: failure. 2: usage.`;

/** JSON with every character outside printable ASCII as a \\u escape, so a stranger's string cannot reach a terminal raw. */
export function asciiJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  const value = i >= 0 ? args[i + 1] : undefined;
  return value === undefined || value.startsWith("--") ? undefined : value;
}

export function main(argv: string[], io: Io): number {
  const [command, ...rest] = argv;
  if (command === "build") return build(rest, io);
  if (command === "verify") return verify(rest, io);
  io.err(USAGE + "\n");
  return 2;
}

function build(args: string[], io: Io): number {
  const folder = args[0];
  const configPath = flag(args, "--config");
  const out = flag(args, "--out");
  if (folder === undefined || folder.startsWith("--") || configPath === undefined || out === undefined) { io.err(USAGE + "\n"); return 2; }
  const problems: string[] = [];
  let configText: string;
  try { configText = readFileSync(configPath, "utf8"); }
  catch { io.out(asciiJson({ problems: [`cannot read the configuration ${configPath}`] }) + "\n"); return 1; }
  try {
    const config = parseConfig(configText);
    const { inputs, refused } = readInputs(folder);
    for (const r of refused) problems.push(`${r.file}: ${r.reason}`);
    const outProblem = outDirProblem(out);
    if (outProblem !== null) problems.push(outProblem);
    if (problems.length > 0) { io.out(asciiJson({ problems }) + "\n"); return 1; }
    const plan = planBuild(inputs, config);
    writePlan(plan, out);
    io.out(asciiJson({
      written: plan.files.size,
      serves: plan.document.serves.map((s) => s.said),
      unserved: plan.unserved,
      robots: plan.robotsLine,
      sitemap: plan.sitemapLine,
    }) + "\n");
    return 0;
  } catch (e) {
    const more = e instanceof ConfigError || e instanceof BuildError ? e.problems : [(e as Error).message];
    io.out(asciiJson({ problems: [...problems, ...more] }) + "\n");
    return 1;
  }
}

function verify(args: string[], io: Io): number {
  const [target, said] = args;
  if (target === undefined || said === undefined || !isSaid(said)) { io.err(USAGE + "\nThe SAID is required and must match the pattern.\n"); return 2; }
  if (/^https?:\/\//.test(target)) { io.err("verify over an address arrives with the walk (step 2); give a file.\n"); return 2; }
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(readFileSync(target)); }
  catch { io.out(asciiJson({ verified: false, expected: said, reason: `cannot read ${target}` }) + "\n"); return 1; }
  if (checkSaid(bytes, said)) { io.out(asciiJson({ verified: true, said, bytes: bytes.length }) + "\n"); return 0; }
  const needle = Buffer.from(said, "ascii");
  const present = Buffer.from(bytes).includes(needle);
  const computed = present ? saidOf(replaceAll(bytes, needle, FILL)) : saidOf(bytes);
  const reason = !present ? "the SAID is not in the bytes"
    : computed !== said ? "the digest of the hashed form is not the SAID"
    : "the hashed form does not rebuild to the served bytes";
  io.out(asciiJson({ verified: false, expected: said, computed, reason }) + "\n");
  return 1;
}
```

`bin/mad-discovery.ts`:

```ts
import { main } from "../src/cli.ts";

process.exitCode = main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
```

- [ ] **Step 4: Run the tests**

Run: `npm run check && npm test`
Expected: all pass. `written` is 56: 26 definitions, 26 pages, `source.json`, `pages/index.html`, `pages/style.css`, `sitemap.xml`.

- [ ] **Step 5: Try it by hand on the gym fixtures**

Run:
```bash
cd /Users/seriouscoderone/code/bpm/mad-discovery
rm -rf /tmp/gym-site && cp -R fixtures/pretty /tmp/gym-input
node bin/mad-discovery.ts build /tmp/gym-input --config fixtures/gym-config.json --out /tmp/gym-site
open /tmp/gym-site/pages/index.html
```
Expected: exit 0, the JSON report, and a browsable index of the gym's definitions. (The stylesheet may not apply under `file://` because of `style-src 'self'`; on a static host it does.)

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts bin/mad-discovery.ts tests/cli.test.ts
git commit -m "feat: the mad-discovery command: build and verify (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: Documentation and registration

**Files:**
- Modify: `README.md` (Status; a new "Running it" section)
- Modify: `/Users/seriouscoderone/code/bpm/CLAUDE.md` (the `mad-discovery` line under Build & Test)
- Create: `AGENTS.md` and `CLAUDE.md` in `mad-discovery/` (short pointers, as `mad/` has)

**Acceptance Criteria:**
- The README says what exists (the command, its two subcommands, the fixtures) and how to run the checks and tests, and still says nothing is deployed.
- The workspace `CLAUDE.md` Build & Test block has `npm --prefix mad-discovery run check && npm --prefix mad-discovery test`.
- `mad-discovery/CLAUDE.md` points at the design, the README rulings and the plan, and repeats the two rules an agent must not break here: never parse-and-reserialize a definition, and never write a string to a page except through `escapeHtml`.

- [ ] **Step 1: Edit README.md**

Replace the Status paragraph's "There is no code yet and nothing is deployed." with: "Step 1 of the first epic is built: `build` makes a source from a folder of frozen definitions, and `verify` checks a file against a SAID. Nothing is deployed." Add after "## Documents":

```markdown
## Running it

Node 24, from a checkout: `npm ci`, then

```bash
npm run check                                   # TypeScript, as a type check only
npm test                                        # node --test over tests/*.test.ts
node bin/mad-discovery.ts build <folder> --config <file> --out <folder>
node bin/mad-discovery.ts verify <file> <SAID>
```

The input folder holds one file per definition, named `<SAID>.json`. `fixtures/gym-config.json` is an example configuration; `fixtures/README.md` says where every test vector came from.
```

- [ ] **Step 2: Write mad-discovery/CLAUDE.md and AGENTS.md**

`CLAUDE.md`:

```markdown
# mad-discovery

Read the workspace instructions in `../CLAUDE.md` first. Design authority is `docs/design.md` (approved 2026-11-09) and the rulings in `README.md`. The current plan is `docs/plans/source-build.md`.

Two rules an agent must not break here:

- Never parse a definition and write it out again. The build serves bytes as given, or with whitespace between JSON tokens removed (`src/compact.ts`), and checks every output against its SAID (`src/said.ts`).
- Never put a string on a page except through `escapeHtml` in `src/pages.ts`, and never make a string from a definition or a publication a link target.

Node 24 runs the `.ts` files directly; there is no build step. `npm run check` is the type check, `npm test` the tests. Dependencies are pinned exactly and there are three.
```

`AGENTS.md`:

```markdown
# Agents

Claude Code and Codex share the instructions in `CLAUDE.md` in this folder and in `../CLAUDE.md`. Task tracking is the workspace's beads database; run `bd` from `~/code/bpm`.
```

- [ ] **Step 3: Edit the workspace CLAUDE.md**

In `/Users/seriouscoderone/code/bpm/CLAUDE.md`, replace the Build & Test comment line for mad-discovery with:

```bash
# mad-discovery: strict TypeScript check, then the tests (Node 24 runs the .ts files directly)
npm --prefix mad-discovery run check && npm --prefix mad-discovery test
```

- [ ] **Step 4: Commit both repositories**

```bash
cd /Users/seriouscoderone/code/bpm/mad-discovery
git add README.md CLAUDE.md AGENTS.md
git commit -m "docs: how to run the source build (bpm-5g1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
cd /Users/seriouscoderone/code/bpm
git add CLAUDE.md
git commit -m "docs: mad-discovery build and test commands" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

## Requirements of the design not in this plan, and where they go

- Introductions followed, the walk (`who`), `get`, the fetch routine and its limits, outcomes, the walk report: build order step 2, its own plan.
- AI Catalog entries: step 3, its own plan.
- `verify` over an address: arrives with the fetch routine in step 2; `verify` here takes a file and refuses an address with a usage error.
- The catalog, the finders, deployment, the live check, the hosted catalog: the second epic (bpm-7h1).
- The optional `by` on a publication and `by`/`oobi` on a source are read, validated and shown here; nothing verifies them, by Ruling 7.

## Stress Test Results: the step 1 plan

Run on 2026-11-09 with the maintainer after he approved the plan. Five branches; he agreed with four and one changed the plan.

### Resolved decisions

- **Scope.** Step 1 stays `build` and `verify <file>` with no network; the walk, `get`, `verify` over an address and the AI Catalog entries follow in their own plans. Agreed.
- **Fixtures.** The makers run on this machine only, the 28 gym-bp documents become public with the repository as labelled test data, and the vLEI copy is fetched from `main` with its commit recorded. Agreed, with one sentence added to the fixture README.
- **Hostile input in the operator's own folder.** The dry run found that the outline renderer was recursive with no depth guard, so a one-megabyte definition of nested arrays would have crashed `build`. A definition deeper than the scan's limit of 64 is now shown as escaped text and is still served; refusing it would have added a format rule the design does not have. Modified.
- **Security surface.** Pages (one escaping sink, no string ever a tag, attribute or link target, CSP meta), disk (fixed paths plus pattern-checked SAIDs, writes only when every check passes, out folder absent or empty) and terminal (ASCII-only JSON). Accepted as planned. Residual risk recorded: a future template edit that bypasses `escapeHtml` is caught only if it touches a field the hostile fixture covers; the rule in `mad-discovery/CLAUDE.md` is the other half of the defence.
- **Toolchain.** Node 24 type stripping, three pinned dependencies with install scripts off, run from a checkout, `node --test` with no helpers. Accepted; each has a local fallback.

### Changes made

- Task 5 exports `depth`; Task 9 uses it to show a too-deep definition as text, with a 100,000-deep test case and an acceptance line.
- Task 2's fixture README says the makers record provenance and need not run elsewhere.

### Deferred / parking lot

- An HTML parser in the page tests, if the regex checks ever prove too coarse.
- A build step and a published package, if anyone outside asks to install the tool.

### Confidence assessment

- Overall: high. Every code block type-checks and every test passes in a scratch copy, including the changes above.
- Areas of concern: none for step 1 beyond the recorded residual risk.
