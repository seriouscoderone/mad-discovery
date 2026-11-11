# The catalog build (step 5 of the second epic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** `mad-discovery catalog build --out <folder> [--candidates <file>]... [--from <address>]...` visits every named source and the sources they introduce, breadth-first within the catalog's limits and the robots.txt rule, fetches and checks every definition they serve, and writes a catalog as static files (`catalog.json`, `index.json`, `said/<SAID>.json`, `sources.json`, pages) that two builders over the same inputs produce byte for byte; and `who --catalog <address>` seeds a walk from a catalog's row.

**Architecture:** The walk's breadth-first driver moves out of `walk.ts` into `src/crawl.ts`, where both the walk and the catalog build use it with their own visit: the walk's visit asks about one SAID, the catalog's (`visitAll`) fetches every served definition and scans it, recording per definition what it contains with the JSON Pointer paths, so no definition bytes are kept. `src/robots.ts` reads a host's robots.txt once per build through the same fetch routine (a text mode is added) and answers whether a path may be fetched. `src/catalog.ts` turns the visits into rows, the index, `sources.json` and `catalog.json`, applying the row rules (one publication per source, 50 referrers per source, 1 MB per row, no row without verified bytes, no file name from a stranger's text). `src/catalogpages.ts` renders the rows with the page writer's existing guards. The command checks everything in memory and writes nothing unless a source was read. No new dependency.

**Tech Stack:** Node 24, TypeScript 7.0.2 as a type check only, `node --test`, `@noble/hashes` (Blake3, already present; its hex form for `sources.json`).

**Scope:** Design build order step 5: "The catalog build from named sources, and its pages", plus `who --catalog`, which reads the row file this step creates. Candidate files from finders are read here; writing them is step 6 (`catalog find`, the robots finder and the GitHub-topic finder, Ruling 10), which gets its own plan; the command `catalog find` is refused with a usage note until then. The second epic's clause 1 (the stranger by fixture, which needs the finder) and clause 2 (live) are step 6 and 7; clause 3 (catalog pages: from the index a person reaches each source's page for a SAID by links alone) is met here by tests. Nothing is deployed and no AWS is touched; hosting the maintainer's catalog is step 7.

## Global Constraints

From `docs/design.md`; every task's requirements include these, and the step 1 and 2 plans' constraints still hold (one fetch routine, the address rule, the `test` option for test code only, ASCII-only sources, no new dependency, strangers' strings only as JSON values or through `escapeHtml`).

- **Limits, catalog build column:** one request 10 s; one file 1 MB; 500 definitions from one source in SAID order; 10 introductions from one source (the first ten listed, in address order); introduction depth 3; 1,000 sources per run; 120 s and 100 MB per host; 8 hosts in flight; no clock for the whole run. A count limit cuts in a fixed order and the source is `truncated` with the limit's name; a source whose host uses up its time or bytes is dropped whole (`timed-out`) and the host's sources not yet started are `skipped`. Row limits: from one source a row takes one publication of the SAID (the first in its document; the rest are counted) and at most 50 definitions that contain the SAID, lowest SAID first, with the full count stated; a row is at most 1 MB, keeping sources in the build's order up to that size and stating how many it left out. All in `src/limits.ts`.
- **Order and repeatability:** sources are taken breadth-first in the order the walk uses (introducing sources in address order, each source's introductions in address order, one from each in turn; a catalog build asks about no SAID, so nothing is `named`). Candidates named with `--from` and read from candidate files are de-duplicated and visited in sorted order at depth 0; if more remain than the limit on sources per run the build stops, writes nothing and reports the count. What a build includes is decided by counts and fixed order, never by which answer arrived first. Two builds of the same inputs over sources that answer alike produce byte-identical files. No file holds the catalog's own address; no file holds a time.
- **Rows:** a SAID has a row only when a visited source served bytes for it that passed the check; a SAID that definitions contain but no source serves has no row and appears nowhere. Every statement is attributed to the source address it was fetched from; nothing in one source's files can create or change a row attributed to another. Publications are recorded as claimed and only in rows that exist. A count of sources is a count of addresses and is reported as such. No row is carried over; a source that cannot be reached adds nothing and is listed with its outcome. An empty build (no source `ok` or `truncated`) writes nothing and exits non-zero. Posting is open: no build leaves a source out.
- **Files** (beside `catalog.json` under fixed names): `catalog.json` (how it was built: the tool's commit read from the checkout, the starting sources, the finder and snapshot of each candidate file, the limits; a seeded crawl says so), `index.json` (every SAID with a row, sorted; for each the number of source addresses that serve it and the names its publications give it, each beside the source that gave it), `said/<SAID>.json` (one row: `said`, `serves`, `publications`, `referrers`, each entry as in the walk's report without `via`; no `from`, `unresolved`, `catalogs` or `reached`), `sources.json` (every address tried: how it was found, its outcome with the limit's name when truncated, the counts of dropped entries, a hex Blake3 digest of the source document bytes read, and each definition or `refers` entry that did not end `verified`, with its outcome), `pages/index.html`, `pages/<SAID>/index.html`, `pages/style.css`. Outcomes are names only: no error text, no redirect target, no timings enter a catalog's files.
- **robots.txt:** a catalog build obeys the robots.txt group for `mad-discovery`, or else the group for `*`, fetched once per host per build. A 4xx answer means no restrictions. A 5xx answer, no answer or a redirect means the host is skipped with the outcome `disallowed`. The walk does not consult robots.txt. The robots.txt fetch goes through the one fetch routine, which gains a text mode (`text/plain`); everything else about it (address rule, resolve-once, size, deadline) is unchanged.
- **Pages:** a catalog's pages show its rows the same way as a source's: an index, and a page per SAID. On that page a source that serves the SAID is linked to its own page for it, and a definition that contains the SAID is linked to its serving source's page for that definition, in both cases only when that source's document says `pages: true`; a source that only carries a publication is shown by address. The pages carry no order but SAID order, no ranking and no form. The page writer's guards hold: every string through `escapeHtml`; links only by SAID within the output, to addresses that passed the rule, or to the fixed paths `pages/<SAID>/index.html` under such an address; no script; the CSP meta.
- **`who --catalog <address>`:** reads `said/<SAID>.json` beside that `catalog.json` and treats each source address in the row as an introduction that names the SAID in `for`, at depth 1, with the catalog's address as its `via`; the limit on introductions from one source does not apply to a row, the limit on sources per run does; when the row lists more than the room left the walk takes a random sample and the report's `catalog` member says how many were listed and how many taken. Catalogs named in a source document are listed in the report and never fetched on a source's word.
- Workspace rules: small commits with the bead id and the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; files staged by name; mutating `bd` from `/Users/seriouscoderone/code/bpm`; push after each unit of work. No AWS anywhere in this plan.

## Decisions this plan makes (for the gate)

The design fixes the files' members in prose; this plan fixes their JSON. Each is cheap to change before execution.

1. **Candidate file** (written by step 6, read here): `{ "finder": "<name>", "snapshot": "<crawl name or date>", "candidates": [ { "address": "<source address>", "place": { ... } } ] }`; `place` is free-form per finder (the robots finder: `{ "file": "<archive file>", "offset": <n> }`; the GitHub finder: `{ "repository": "<owner/name>" }`).
2. **`catalog.json`:** `{ "tool": { "commit": "<40 hex>" | null }, "from": [addresses], "candidates": [ { "finder", "snapshot", "count" } ], "droppedCandidates": <n not source addresses>, "limits": { ...the catalog Limits, "row": { "referrersPerSource", "rowBytes" } }, "seeded": <true when no candidate file was given>, "note": "<the design's sentence, when seeded>" }`.
3. **`index.json`:** `{ "saids": [ { "said", "sources": <n addresses that serve it>, "names": [ { "name", "source" } ] } ] }` sorted by SAID, names in source-address order.
4. **`said/<SAID>.json`:** `{ "said", "serves": [ { "source" } ], "publications": [ { "source", "publication" } ], "referrers": [ { "source", "said", "paths", "appearances" } ], "counts": [ { "source", "publications": <total>, "referrers": <total> } ], "omittedSources"?: <n> }`; sources in the build's order; within a source referrers by SAID.
5. **`sources.json`:** `{ "sources": [ { "address", "found": [ { "by": "from" } | { "by": "introduction", "from": "<address>" } | { "by": "finder", "finder", "snapshot", "place" } ], "outcome", "limit"?, "dropped": { "entries", "publications" }, "digest": "<hex>" | null, "definitions": [ { "said", "outcome" } ], "refers": [ { "in": "<definition>", "said", "outcome": "not-contained" } ] } ] }` sorted by address; `definitions` lists only the ones that did not end `verified`.
6. **The robots.txt check** applies to the source document's path and to each definition's path, by RFC 9309 matching (longest match wins, `Allow` wins a tie, `*` and `$` understood, the group chosen by the longest product-token match on `mad-discovery`, else `*`); a `text/plain` answer is required, and any other readable answer counts as unreadable (`disallowed`), since the design lists only 4xx as "no restrictions".
7. **The tool's commit** is read from `.git/HEAD` (and the ref it names, or `packed-refs`) of the checkout `bin/` runs from; `null` when there is none. No child process.
8. **`who --catalog`'s sample** uses `crypto.randomInt`; the row's addresses join the depth-1 round-robin as one more introducing list keyed by the catalog's address.

## File structure

```
mad-discovery/
  src/limits.ts         + CATALOG: Limits (the build's column), ROW: { referrersPerSource: 50, rowBytes: 1_000_000 }
  src/fetch.ts          FetchOptions.type?: "json" | "text"; text accepts text/plain
  src/session.ts        fetch(address, type = "json")
  src/robots.ts         parse a robots.txt; allows(userAgent, path); Robots class: one fetch per host per build through the session
  src/crawl.ts          levels(): the breadth-first driver over candidates (from walk.ts); nextLevel takes a predicate; visitAll() for the catalog
  src/walk.ts           uses crawl.ts; walk(said, from, session, catalog?) with the --catalog seeding
  src/catalog.ts        candidate files, buildCatalog(), the five JSON files, toolCommit()
  src/catalogpages.ts   the catalog's index and per-SAID pages, from pages.ts's exported guards
  src/pages.ts          exports shell, addressLink, STYLE_CSS, offered (no behaviour change)
  src/cli.ts            catalog build; catalog find refused until step 6; who --catalog
  tests/robots.test.ts, crawl.test.ts, catalog.test.ts, catalogpages.test.ts; walk.test.ts and cli.test.ts extended; fetch.test.ts and session.test.ts extended for the text mode
```

Dependencies between tasks: 1 -> 2 -> 4; 1 -> 3; 3 -> 5 -> 6 -> 7; 5 -> 8; 6, 7, 8 -> 9 -> 10.

---

### Task 1: The catalog's limits, and a text mode for the fetch routine

**Files:**
- Modify: `src/limits.ts`, `src/fetch.ts`, `src/session.ts`, `tests/fetch.test.ts`, `tests/session.test.ts`

**Interfaces:**
- Produces: `CATALOG: Limits` and `ROW = { referrersPerSource: 50, rowBytes: 1_000_000 }` in `src/limits.ts`; `type FetchType = "json" | "text"`; `FetchOptions.type?: FetchType` (default `"json"`); `Session.fetch(address: string, type: FetchType = "json")`.

**Acceptance Criteria:**
- `CATALOG` has the design's catalog column: `requestMs 10_000, fileBytes FILE_BYTES, definitionsPerSource 500, introductionsPerSource 10, introductionDepth 3, sourcesPerRun 1_000, hostMs 120_000, hostBytes 100_000_000, hostsInFlight 8, runMs null`.
- With `type: "text"` the routine accepts `text/plain` (parameters ignored, case ignored) and refuses `application/json` and `text/html` as `invalid`; with `type: "json"` (or none) behaviour is unchanged. The `Accept` header sent is `text/plain` for text and `application/json` for json.
- `Session.fetch(address, "text")` passes the type through; `exhausted`, budgets and `each` are unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `tests/fetch.test.ts`:

```ts
test("the text mode accepts text/plain and nothing else; the json mode is unchanged", async () => {
  for (const [type, mode, expected] of [["text/plain", "text", "ok"], ["Text/Plain; charset=utf-8", "text", "ok"], ["application/json", "text", "invalid"], ["text/html", "text", "invalid"], ["text/plain", "json", "invalid"], ["application/json", "json", "ok"]] as const) {
    let accept: string | string[] | undefined;
    origin.behave = (req, res) => { accept = req.headers.accept; res.setHeader("content-type", type); res.end(mode === "text" ? "User-agent: *\n" : "{}"); return true; };
    const r = await fetchLocal("x.json", { type: mode });
    assert.equal(r.outcome, expected, `${type} as ${mode}`);
    assert.equal(accept, mode === "text" ? "text/plain" : "application/json");
  }
  origin.behave = null;
});
```

Append to `tests/session.test.ts`:

```ts
test("fetch passes the text mode through and charges it like any request", async () => {
  origin.put("robots.txt", "User-agent: *\nDisallow:\n");
  origin.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
  try {
    const s = new Session(limits({}), { test: true });
    const r = await s.fetch(url("robots.txt"), "text");
    assert.equal(r.outcome, "ok");
    if (r.outcome === "ok") assert.equal(new TextDecoder().decode(r.bytes), "User-agent: *\nDisallow:\n");
    assert.equal((await s.fetch(url("robots.txt"))).outcome, "invalid", "as json, text/plain is refused");
  } finally { origin.behave = null; }
});
```

Add to `tests/session.test.ts` a check of the constant:

```ts
test("the catalog's limits are the design's column", () => {
  assert.deepEqual(CATALOG, { requestMs: 10_000, fileBytes: 1_000_000, definitionsPerSource: 500, introductionsPerSource: 10, introductionDepth: 3, sourcesPerRun: 1_000, hostMs: 120_000, hostBytes: 100_000_000, hostsInFlight: 8, runMs: null });
  assert.deepEqual(ROW, { referrersPerSource: 50, rowBytes: 1_000_000 });
});
```

with `import { WALK, CATALOG, ROW, type Limits } from "../src/limits.ts";` replacing that file's limits import.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/fetch.test.ts tests/session.test.ts`
Expected: FAIL: `type` is not a known option (the text/plain case is `invalid`); `CATALOG` and `ROW` are not exported.

- [ ] **Step 3: The limits**

In `src/limits.ts`, after `WALK`:

```ts
/** The catalog build's column of the table. No clock for the whole run: its length is bounded by the other rows. */
export const CATALOG: Limits = {
  requestMs: 10_000,
  fileBytes: FILE_BYTES,
  definitionsPerSource: 500,
  introductionsPerSource: 10,
  introductionDepth: 3,
  sourcesPerRun: 1_000,
  hostMs: 120_000,
  hostBytes: 100_000_000,
  hostsInFlight: 8,
  runMs: null,
};

/** What one source may add to a catalog row, and how large a row may be: a reader fetches a row as one file. */
export const ROW = { referrersPerSource: 50, rowBytes: FILE_BYTES } as const;
export type RowLimits = { referrersPerSource: number; rowBytes: number };
```

- [ ] **Step 4: The text mode**

In `src/fetch.ts`: add `export type FetchType = "json" | "text";` and `type?: FetchType;   // what the answer must be: application/json or +json (the default), or text/plain for a robots.txt` to `FetchOptions`. Replace `isJsonType` with:

```ts
function acceptable(header: string | undefined, type: FetchType): boolean {
  if (header === undefined) return false;
  const media = header.split(";")[0]!.trim().toLowerCase();
  return type === "text" ? media === "text/plain" : media === "application/json" || media.endsWith("+json");
}
```

In `fetchJson`: `const type = opts.type ?? "json";`; the `accept` header becomes `type === "text" ? "text/plain" : "application/json"`; the content-type check becomes `if (!acceptable(res.headers["content-type"], type)) { finish({ outcome: "invalid" }); return; }`. Update the doc comment's first line to "The one fetch routine ... for a JSON file or, for a robots.txt, a text/plain one."

In `src/session.ts`: `async fetch(address: string, type: FetchType = "json"): Promise<Fetched>` passing `type` to `fetchJson`; import `type FetchType` from `./fetch.ts`.

- [ ] **Step 5: Run the checks and the whole suite, then commit**

Run: `npm run check && npm test`

```bash
git add src/limits.ts src/fetch.ts src/session.ts tests/fetch.test.ts tests/session.test.ts
git commit -m "feat: the catalog's limits, and a text mode for the fetch routine (<bead id>)"
```

---

### Task 2: robots.txt

**Files:**
- Create: `src/robots.ts`, `tests/robots.test.ts`

**Interfaces:**
- Consumes: `Session.fetch(address, "text")`, `Session.hostOf`.
- Produces: `parseRobots(text: string): RobotsRules`; `allows(rules: RobotsRules, product: string, path: string): boolean`; `class Robots { constructor(session: Session); allows(address: string): Promise<boolean | "disallowed">; }` where `"disallowed"` means the host's robots.txt could not be read (5xx, no answer, redirect, not text/plain) and the host is skipped; `true`/`false` is the rule's answer for that address's path (a 4xx answer gives `true` for everything on the host).

**Acceptance Criteria:**
- Group selection: the group whose `User-agent` is `mad-discovery` (case-insensitive, product-token match) is used when present, else the `*` group, else everything is allowed; several `User-agent` lines may share one group.
- Matching: the longest matching `Allow`/`Disallow` wins; a tie goes to `Allow`; `*` matches any run; `$` anchors the end; an empty `Disallow` allows all; paths are compared percent-decoded as given.
- Per host once per build: the second address on a host makes no second request; a 404 or 410 answer allows everything on that host; 500, a redirect, no answer and a non-`text/plain` answer give `"disallowed"`.

- [ ] **Step 1: Write the failing tests**

`tests/robots.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { parseRobots, allows, Robots } from "../src/robots.ts";
import { Session } from "../src/session.ts";
import { WALK } from "../src/limits.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());

test("the group for mad-discovery wins over *, and * over nothing", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /\n\nUser-agent: mad-discovery\nAllow: /mad/\nDisallow: /\n\nUser-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /private/\n");
  assert.equal(allows(rules, "mad-discovery", "/mad/source.json"), true);
  assert.equal(allows(rules, "mad-discovery", "/other/source.json"), false);
  assert.equal(allows(rules, "Mad-Discovery/1.0", "/mad/source.json"), true, "case and version are ignored");
  assert.equal(allows(rules, "somebody", "/mad/source.json"), false, "falls to *");
  assert.equal(allows(rules, "bingbot", "/private/x"), false, "a shared group");
  assert.equal(allows(parseRobots("User-agent: Googlebot\nDisallow: /\n"), "mad-discovery", "/anything"), true, "no group for us and no *: allowed");
  assert.equal(allows(parseRobots(""), "mad-discovery", "/anything"), true);
  assert.equal(allows(parseRobots("User-agent: *\nDisallow:\n"), "mad-discovery", "/anything"), true, "empty Disallow allows all");
});

test("longest match wins, Allow wins a tie, * and $ are understood, text after # is ignored", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /mad/\nAllow: /mad/source.json # the one file\nDisallow: /*.json$\nAllow: /mad/definitions/\nDisallow: /tmp*\n");
  assert.equal(allows(rules, "mad-discovery", "/mad/source.json"), true);
  assert.equal(allows(rules, "mad-discovery", "/mad/pages/index.html"), false);
  assert.equal(allows(rules, "mad-discovery", "/mad/definitions/E.json"), true, "/mad/definitions/ (17) beats /*.json$ (8)");
  assert.equal(allows(rules, "mad-discovery", "/x/y.json"), false, "$ anchors the end");
  assert.equal(allows(rules, "mad-discovery", "/x/y.json.bak"), true);
  assert.equal(allows(rules, "mad-discovery", "/tmpfiles/a"), false);
  assert.equal(allows(parseRobots("User-agent: *\nAllow: /a\nDisallow: /a\n"), "mad-discovery", "/a/b"), true, "a tie goes to Allow");
});

test("one fetch per host; 4xx allows everything; 5xx, a redirect, no answer and a wrong type disallow the host", async () => {
  const s = new Session({ ...WALK, requestMs: 1000 }, { test: true });
  origin.put("robots.txt", "User-agent: mad-discovery\nDisallow: /secret/\n");
  origin.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: mad-discovery\nDisallow: /secret/\n"); return true; } return false; };
  try {
    const robots = new Robots(s);
    const before = origin.requests.filter((p) => p === "robots.txt").length;
    assert.equal(await robots.allows(`${origin.origin}/mad/source.json`), true);
    assert.equal(await robots.allows(`${origin.origin}/secret/source.json`), false);
    assert.equal(origin.requests.filter((p) => p === "robots.txt").length, before + 1, "one request for the host");

    for (const [answer, expected] of [[404, true], [410, true], [403, true], [500, "disallowed"], [302, "disallowed"]] as const) {
      const o = await Origin.start();
      try {
        o.behave = (_req, res) => { res.statusCode = answer; if (answer === 302) res.setHeader("location", `${o.origin}/elsewhere`); res.end(); return true; };
        assert.equal(await new Robots(s).allows(`${o.origin}/mad/source.json`), expected, String(answer));
      } finally { await o.close(); }
    }
    const html = await Origin.start();
    try {
      html.behave = (_req, res) => { res.setHeader("content-type", "text/html"); res.end("<p>no</p>"); return true; };
      assert.equal(await new Robots(s).allows(`${html.origin}/mad/source.json`), "disallowed", "not text/plain");
    } finally { await html.close(); }
    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    assert.equal(await new Robots(s).allows(deadAddr), "disallowed", "no answer");
  } finally { origin.behave = null; }
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/robots.test.ts`
Expected: FAIL, cannot find module `../src/robots.ts`.

- [ ] **Step 3: Write `src/robots.ts`**

```ts
import { Session } from "./session.ts";

/** One group's rules, in file order. */
export type RobotsRules = { groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] };

/**
 * A robots.txt, read as RFC 9309 says: groups of User-agent lines followed by rules; text after # dropped; unknown lines ignored.
 * Nothing here is interpreted beyond that: a robots.txt is a stranger's file.
 */
export function parseRobots(text: string): RobotsRules {
  const groups: RobotsRules["groups"] = [];
  let current: RobotsRules["groups"][number] | null = null;
  let collectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!collectingAgents || current === null) { current = { agents: [], rules: [] }; groups.push(current); collectingAgents = true; }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current !== null) {
      collectingAgents = false;
      if (field === "disallow" && value === "") continue;      // an empty Disallow allows everything
      current.rules.push({ allow: field === "allow", path: value });
    } else collectingAgents = false;
  }
  return { groups };
}

/** The product token of a user agent, lowercased: "Mad-Discovery/1.0 (+https://...)" is "mad-discovery". */
function productToken(agent: string): string {
  return agent.split(/[\s/]/)[0]!.toLowerCase();
}

/** RFC 9309 path matching: * is any run, $ anchors the end, the pattern is a prefix otherwise. */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${parts.join(".*")}${anchored ? "$" : ""}`).test(path);
}

/** Whether the rules allow this path for this product: the product's group, else the * group, else yes; longest match wins, Allow a tie. */
export function allows(rules: RobotsRules, product: string, path: string): boolean {
  const token = productToken(product);
  const group = rules.groups.find((g) => g.agents.some((a) => productToken(a) === token)) ?? rules.groups.find((g) => g.agents.includes("*"));
  if (group === undefined) return true;
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of group.rules) {
    if (!matches(rule.path, path)) continue;
    const length = rule.path.length;
    if (best === null || length > best.length || (length === best.length && rule.allow && !best.allow)) best = { allow: rule.allow, length };
  }
  return best === null ? true : best.allow;
}

/** The robots.txt of each host, fetched once per build through the session. "disallowed" is a host whose file could not be read. */
export class Robots {
  private readonly session: Session;
  private readonly hosts = new Map<string, Promise<RobotsRules | "allow-all" | "disallowed">>();

  constructor(session: Session) {
    this.session = session;
  }

  private rulesFor(origin: string): Promise<RobotsRules | "allow-all" | "disallowed"> {
    let p = this.hosts.get(origin);
    if (p === undefined) {
      p = this.session.fetch(`${origin}/robots.txt`, "text").then((f) => {
        if (f.outcome === "ok") return parseRobots(Buffer.from(f.bytes).toString("utf8"));
        if (f.outcome === "not-found") return "allow-all";
        if (f.outcome === "invalid" && f.read === 0) return "allow-all";   // another 4xx: the routine reports a non-200 before any body as invalid
        return "disallowed";
      });
      this.hosts.set(origin, p);
    }
    return p;
  }

  /** true or false by the host's rules for this address's path; "disallowed" when the host's robots.txt could not be read. */
  async allows(address: string): Promise<boolean | "disallowed"> {
    const url = new URL(address);
    const rules = await this.rulesFor(url.origin);
    if (rules === "disallowed") return "disallowed";
    if (rules === "allow-all") return true;
    return allows(rules, "mad-discovery", url.pathname);
  }
}
```

The `invalid && read === 0` line needs one more distinction: the routine returns `invalid` both for another 4xx and for a 200 with a wrong content type or encoding, both before any body byte. Make the routine's `Fetched` carry the status: add `status?: number` to the non-ok endings in `src/fetch.ts` (`finish({ outcome: "invalid", status })` for the status branch; the content-type and encoding branches pass `status: 200`), and in `Robots.rulesFor` use `if (f.outcome === "invalid" && f.status !== undefined && f.status >= 400 && f.status < 500) return "allow-all";`. Add `status` to the `Fetched` type for `"not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid"` as optional, and a fetch test asserting `status` is 403 for a 403 and 200 for a wrong content type.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/robots.test.ts tests/fetch.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/robots.ts tests/robots.test.ts src/fetch.ts tests/fetch.test.ts
git commit -m "feat: robots.txt rules, read once per host through the fetch routine (<bead id>)"
```

---

### Task 3: The breadth-first driver, shared by the walk and the catalog

**Files:**
- Create: `src/crawl.ts`, `tests/crawl.test.ts`
- Modify: `src/walk.ts` (uses the driver; `nextLevel` moves out), `tests/walk.test.ts` (import `nextLevel` from `crawl.ts`)

**Interfaces:**
- Consumes: `Session.each`, `Session.hostOf`, `Candidate`, `Visited`, `Unresolved`, `Introduction`, `byKey`.
- Produces: in `src/crawl.ts`: `type Candidate = { address: string; via: string[]; named: boolean }` (moved from walk.ts); `type Node = { address: string; via: string[]; fetched: boolean; read: boolean; introductions: Introduction[] }`; `nextLevel(named: (i: Introduction) => boolean, here: Node[], visited: Set<string>, extra?: { key: string; candidates: Candidate[] }[]): Candidate[]`; `levels<V extends Node>(starts: Candidate[], session: Session, visit: (c: Candidate, depth: number) => Promise<V>, named: (i: Introduction) => boolean, extra?: (depth: number, here: V[]) => { key: string; candidates: Candidate[] }[]): Promise<{ visits: V[]; skipped: Unresolved[] }>`. `walk.ts` keeps `Report`, `Visited`, `WalkOutcome`, `walk` and its private `visitSource`/`assemble`; `walk` calls `levels` with `(i) => i.for.includes(said)`.

**Acceptance Criteria:**
- Every walk test passes unchanged except the `nextLevel` import and its first argument (a predicate instead of the SAID).
- `levels` with two starts at depth 0 visits both under `each`, merges each depth in address order, applies the depth limit (`skipped`/`depth`), the room (`skipped`/`sources`, counting the starts), and remembers skipped addresses; `extra` lists join the named round-robin keyed by their `key`.
- `nextLevel` with `() => false` (the catalog's case) yields plain round-robin order with nothing first.

- [ ] **Step 1: Write the failing tests**

`tests/crawl.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { levels, nextLevel, type Candidate, type Node } from "../src/crawl.ts";
import { readSource } from "../src/read.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...WALK, requestMs: 2000, runMs: 10_000, ...more }, { test: true });

/** The smallest visit: read the document, keep its introductions. */
async function visitDocument(c: Candidate, s: Session): Promise<Node & { depth: number }> {
  const r = await readSource(c.address, c.via, s);
  return { address: c.address, via: c.via, fetched: r.ok, read: r.ok, introductions: r.ok ? r.document.introductions.slice(0, s.limits.introductionsPerSource) : [], depth: -1 };
}

test("nextLevel with nothing named is plain round-robin in address order, first occurrence wins", () => {
  const node = (address: string, intros: string[]): Node => ({ address, via: [], fetched: true, read: true, introductions: intros.map((source) => ({ source, for: [] })) });
  const here = [node("https://a.example/source.json", ["https://a1.example/source.json", "https://x.example/source.json"]), node("https://b.example/source.json", ["https://b1.example/source.json", "https://x.example/source.json", "https://b3.example/source.json"])];
  const next = nextLevel(() => false, here, new Set());
  assert.deepEqual(next.map((c) => c.address.slice(8, 10)), ["a1", "b1", "x.", "b3"]);
  assert.ok(next.every((c) => !c.named));
});

test("an extra list joins the named round-robin under its key", () => {
  const node = (address: string, intros: string[]): Node => ({ address, via: [], fetched: true, read: true, introductions: intros.map((source) => ({ source, for: [] })) });
  const here = [node("https://b.example/source.json", ["https://b1.example/source.json"])];
  const extra = [{ key: "https://a.example/catalog.json", candidates: ["https://c1.example/source.json", "https://c2.example/source.json"].map((address) => ({ address, via: ["https://a.example/catalog.json"], named: true })) }];
  const next = nextLevel(() => false, here, new Set(), extra);
  assert.deepEqual(next.map((c) => c.address.slice(8, 10)), ["c1", "c2", "b1"], "the named extra list first, then the unnamed introductions");
});

test("levels visits two starts at depth 0, follows their introductions, and applies the room counting the starts", async () => {
  const [a, b, c, d] = [await start(), await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr, dAddr] = [a, b, c, d].map((o) => `${o.origin}/mad/source.json`);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr }] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: dAddr }, { source: cAddr }] }, inputs);
  c.source("mad/", { serve: [SELECTION] }, inputs);
  d.source("mad/", { serve: [SELECTION] }, inputs);
  const s = session({ sourcesPerRun: 3 });
  const starts: Candidate[] = [aAddr, bAddr].sort().map((address) => ({ address, via: [], named: false }));
  const { visits, skipped } = await levels(starts, s, (cand, depth) => visitDocument(cand, s).then((v) => ({ ...v, depth })), () => false);
  assert.deepEqual(visits.filter((v) => v.depth === 0).map((v) => v.address).sort(), [aAddr, bAddr].sort());
  assert.equal(visits.filter((v) => v.depth === 1).length, 1, "room for one more");
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0]!.reason, "skipped");
  assert.equal(skipped[0]!.limit, "sources");
  assert.deepEqual(new Set([visits[2]!.address, skipped[0]!.address]), new Set([cAddr, dAddr]));
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/crawl.test.ts`
Expected: FAIL, cannot find module `../src/crawl.ts`.

- [ ] **Step 3: Write `src/crawl.ts` and move the driver out of `walk.ts`**

`src/crawl.ts`:

```ts
import { Session } from "./session.ts";
import { byKey, type Introduction } from "./source.ts";
import type { Unresolved } from "./read.ts";

/** A source a run will visit: how it got there, and whether an introduction named the looked-up SAID in `for`. */
export type Candidate = { address: string; via: string[]; named: boolean };

/** What the driver needs to know of a visit. */
export type Node = {
  address: string;
  via: string[];
  fetched: boolean;              // the source document was fetched and read
  read: boolean;                 // the source is kept: ok or truncated
  introductions: Introduction[]; // the ones to follow, already cut to the limit and in address order
};

/**
 * The next depth's candidates in the design's order: introductions the predicate names first; among equals one from each introducing
 * source in turn, introducing sources in address order (here is sorted) and each source's introductions in address order. `extra`
 * lists (a catalog row's addresses, keyed by the catalog's address) take part in the named round-robin, ordered among the sources by
 * key. An address already visited, or taken earlier in this level, is not taken again.
 */
export function nextLevel(named: (i: Introduction) => boolean, here: Node[], visited: Set<string>, extra: { key: string; candidates: Candidate[] }[] = []): Candidate[] {
  const namedLists: { key: string; list: Candidate[] }[] = extra.map((e) => ({ key: e.key, list: e.candidates }));
  const otherLists: Candidate[][] = [];
  for (const v of here) {
    if (!v.read) continue;
    const via = [...v.via, v.address];
    const n: Candidate[] = [];
    const o: Candidate[] = [];
    for (const i of v.introductions) (named(i) ? n : o).push({ address: i.source, via, named: named(i) });
    namedLists.push({ key: v.address, list: n });
    otherLists.push(o);
  }
  namedLists.sort(byKey("key"));
  const out: Candidate[] = [];
  const seen = new Set(visited);
  for (const lists of [namedLists.map((l) => l.list), otherLists]) {
    for (let k = 0; ; k++) {
      let any = false;
      for (const l of lists) {
        if (k >= l.length) continue;
        any = true;
        const c = l[k]!;
        if (!seen.has(c.address)) { seen.add(c.address); out.push(c); }
      }
      if (!any) break;
    }
  }
  return out;
}

/**
 * Breadth-first over sources: every source at one depth before any at the next; within a depth the sources run under the session's
 * host scheduling and are merged in address order; the depth limit and the room (sources per run, the starts included) cut in that
 * order and record what they cut as skipped, once per address.
 */
export async function levels<V extends Node>(
  starts: Candidate[],
  session: Session,
  visit: (c: Candidate, depth: number) => Promise<V>,
  named: (i: Introduction) => boolean,
  extra: (depth: number, here: V[]) => { key: string; candidates: Candidate[] }[] = () => [],
): Promise<{ visits: V[]; skipped: Unresolved[] }> {
  const visited = new Set<string>(starts.map((c) => c.address));
  let taken = starts.length;
  const visits: V[] = [];
  const skipped: Unresolved[] = [];
  let level: Candidate[] = starts;
  for (let depth = 0; level.length > 0; depth++) {
    const here: V[] = [];
    await session.each(level, (c) => Session.hostOf(c.address), async (c) => { here.push(await visit(c, depth)); });
    here.sort(byKey("address"));
    visits.push(...here);
    const next = nextLevel(named, here, visited, extra(depth, here));
    if (next.length === 0) break;
    if (depth + 1 > session.limits.introductionDepth) {
      for (const c of next) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "depth" });
      break;
    }
    const room = Math.max(0, session.limits.sourcesPerRun - taken);
    for (const c of next.slice(room)) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "sources" });
    level = next.slice(0, room);
    taken += level.length;
    for (const c of next) visited.add(c.address);
  }
  return { visits, skipped };
}
```

In `src/walk.ts`: delete `Candidate`, `nextLevel`, `byAddress` and the loop body of `walk`; import `{ levels, type Candidate, type Node } from "./crawl.ts"`; `Visited` becomes `Node & { by?: string; oobi?: string; serves: boolean; publications: Publication[]; referrers: ...; unresolved: Unresolved[]; dropped: Dropped | null; catalogs: string[] }`; `walk` becomes:

```ts
export async function walk(said: string, from: string, session: Session): Promise<WalkOutcome> {
  const { visits, skipped } = await levels([{ address: from, via: [], named: false }], session, (c) => visitSource(said, c, session), (i) => i.for.includes(said));
  const start = visits[0]!;
  if (!start.fetched) {
    const u = start.unresolved[0]!;
    return { ok: false, reason: u.reason, ...(u.target !== undefined ? { target: u.target } : {}) };
  }
  return { ok: true, report: assemble(said, from, visits, skipped) };
}
```

(`visits[0]` is the start: depth 0 has one source and the merge is in address order.) In `tests/walk.test.ts`, import `nextLevel` from `../src/crawl.ts` and call it as `nextLevel((i) => i.for.includes(X), here, new Set([...]))` in the one test that uses it; its hand-built nodes need no `fetched`/`read` change (they have them).

- [ ] **Step 4: Run the checks and the whole suite**

Run: `npm run check && npm test`
Expected: all pass; the walk file's tests are unchanged in outcome.

- [ ] **Step 5: Commit**

```bash
git add src/crawl.ts src/walk.ts tests/crawl.test.ts tests/walk.test.ts
git commit -m "refactor: the breadth-first driver in one place, for the walk and the catalog (<bead id>)"
```

---

### Task 4: The catalog's visit of one source

**Files:**
- Create: `src/visit.ts`, `tests/visit.test.ts`

**Interfaces:**
- Consumes: `readSource`, `redirectTarget`, `Reason`, `Unresolved`; `Session`; `Robots`; `checkSaid`; `appearances`, `paths`; `definitionAddress`; `Node`, `Candidate`; `blake3` from `@noble/hashes/blake3.js`; `bytesToHex` from `@noble/hashes/utils.js`.
- Produces: `type Contains = { said: string; paths: string[]; appearances: number }`; `type Definition = { said: string; contains: Contains[] }`; `type SourceVisit = Node & { outcome: Reason | "ok"; limit?: string; digest: string | null; dropped: Dropped; document: SourceDocument | null; base: string | null; verified: Definition[]; failed: { said: string; outcome: Reason }[]; notContained: { in: string; said: string }[] }`; `visitAll(c: Candidate, session: Session, robots: Robots): Promise<SourceVisit>`.

**Acceptance Criteria:**
- A source whose host's robots.txt disallows its document path, or whose robots.txt could not be read, ends `disallowed` with nothing fetched from it but the robots.txt; a definition path that is disallowed while the document is allowed ends that definition `disallowed` and the rest proceed.
- The document is read (`fetched` true) and every served definition is fetched in SAID order up to `definitionsPerSource`, the rest recorded as `truncated` with `limit: "definitions"`; each fetched definition ends `verified` (its `contains` holds every SAID that appears in its bytes other than its own, each with `paths` and `appearances` from the scan) or `failed-check`, or the fetch outcome.
- A `refers` entry the scan does not find in verified bytes is recorded under `notContained` as `{ in, said }`; a `refers` entry whose definition did not verify is not (its definition's failure covers it).
- `digest` is the lowercase hex Blake3-256 of the document bytes as read; `null` when the document was not read.
- A host whose time or bytes run out during the source gives `outcome: "timed-out"`, `read: false`, `fetched: true` and nothing of its definitions; a source skipped before it starts gives `skipped` with the limit's name.
- The visit holds no definition bytes after it returns.

- [ ] **Step 1: Write the failing tests**

`tests/visit.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { readInputs } from "../src/inputs.ts";
import { appearances, paths } from "../src/scan.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { Robots } from "../src/robots.ts";
import { CATALOG, type Limits } from "../src/limits.ts";
import { visitAll } from "../src/visit.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...CATALOG, requestMs: 2000, ...more }, { test: true });
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};
const robotsOk = (o: Origin) => { o.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; }; };

test("a source is read whole: every served definition fetched in SAID order, verified, and scanned for what it contains", async () => {
  const a = await start(); robotsOk(a);
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const s = session();
  const v = await visitAll({ address, via: [], named: false }, s, new Robots(s));
  assert.equal(v.outcome, "ok");
  assert.equal(v.fetched, true); assert.equal(v.read, true);
  assert.equal(v.digest, bytesToHex(blake3(plan.files.get("source.json")!)));
  const asked = a.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.deepEqual(asked, plan.document.serves.map((x) => x.said), "SAID order");
  assert.deepEqual(v.verified.map((d) => d.said), plan.document.serves.map((x) => x.said));
  for (const d of v.verified) {
    const bytes = inputs.get(d.said)!;
    assert.deepEqual(d.contains.map((c) => c.said), appearances(bytes, d.said));
    for (const c of d.contains) { const p = paths(bytes, c.said); assert.deepEqual(c.paths, p.paths); assert.equal(c.appearances, p.count); }
  }
  assert.deepEqual(v.failed, []); assert.deepEqual(v.notContained, []);
  assert.equal(v.document?.pages, true); assert.equal(v.base, `${a.origin}/mad/`);
  assert.equal(a.requests.filter((p) => p === "robots.txt").length, 1);
});

test("failures are named per definition and per refers entry; the definitions limit cuts in SAID order", async () => {
  const a = await start(); robotsOk(a);
  const x = definition([]);
  const y = definition([x.said]);
  const z = definition([], ',"n":"z"');                  // claims to contain x, does not
  const w = definition([x.said], ',"n":"w"');            // wrong bytes served
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said, refers: [x.said] }, { said: w.said, refers: [x.said] }] }));
  a.put(`s/definitions/${x.said}.json`, x.bytes); a.put(`s/definitions/${y.said}.json`, y.bytes); a.put(`s/definitions/${z.said}.json`, z.bytes);
  a.put(`s/definitions/${w.said}.json`, '{"d":"' + w.said + '","r":["tampered"]}');
  const s = session();
  const v = await visitAll({ address, via: [], named: false }, s, new Robots(s));
  assert.equal(v.outcome, "ok");
  assert.deepEqual(v.verified.map((d) => d.said).sort(), [x.said, y.said, z.said].sort());
  assert.deepEqual(v.failed, [{ said: w.said, outcome: "failed-check" }]);
  assert.deepEqual(v.notContained, [{ in: z.said, said: x.said }], "w's refers is not listed: its definition failed");

  const cut = session({ definitionsPerSource: 2 });
  const v2 = await visitAll({ address, via: [], named: false }, cut, new Robots(cut));
  assert.equal(v2.outcome, "truncated"); assert.equal(v2.limit, "definitions");
  assert.deepEqual([...v2.verified.map((d) => d.said), ...v2.failed.map((f) => f.said)].sort(), [x.said, y.said, z.said, w.said].sort().slice(0, 2));
});

test("robots.txt: a disallowed document ends the source disallowed; a disallowed definition ends only that definition", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const first = plan.document.serves[0]!.said;
  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end(`User-agent: mad-discovery\nDisallow: /mad/definitions/${first}.json\n`); return true; } return false; };
  const s = session();
  const v = await visitAll({ address, via: [], named: false }, s, new Robots(s));
  assert.equal(v.outcome, "ok");
  assert.deepEqual(v.failed, [{ said: first, outcome: "disallowed" }]);
  assert.ok(!a.requests.includes(`mad/definitions/${first}.json`), "never requested");

  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow: /mad/\n"); return true; } return false; };
  const before = a.requests.length;
  const s2 = session();
  const v2 = await visitAll({ address, via: [], named: false }, s2, new Robots(s2));
  assert.equal(v2.outcome, "disallowed"); assert.equal(v2.fetched, false);
  assert.deepEqual(a.requests.slice(before), ["robots.txt"], "nothing but the robots.txt");

  a.behave = (req, res) => { if (req.url === "/robots.txt") { res.statusCode = 500; res.end(); return true; } return false; };
  const s3 = session();
  assert.equal((await visitAll({ address, via: [], named: false }, s3, new Robots(s3))).outcome, "disallowed", "unreadable robots.txt");
  a.behave = null;
});

test("a host used up during the source is dropped whole; one skipped before it starts says why", async () => {
  const a = await start(); robotsOk(a);
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const robotsBytes = "User-agent: *\nDisallow:\n".length;
  const s = session({ hostBytes: robotsBytes + plan.files.get("source.json")!.length + 10 });
  const v = await visitAll({ address, via: [], named: false }, s, new Robots(s));
  assert.equal(v.outcome, "timed-out"); assert.equal(v.fetched, true); assert.equal(v.read, false);
  assert.deepEqual(v.verified, []); assert.equal(v.digest, null);
  const v2 = await visitAll({ address: `${a.origin}/other/source.json`, via: [], named: false }, s, new Robots(s));
  assert.equal(v2.outcome, "skipped"); assert.equal(v2.limit, "host-bytes");
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/visit.test.ts`
Expected: FAIL, cannot find module `../src/visit.ts`.

- [ ] **Step 3: Write `src/visit.ts`**

```ts
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { checkSaid } from "./said.ts";
import { appearances, paths } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, type Reason } from "./read.ts";
import { Session } from "./session.ts";
import type { Robots } from "./robots.ts";
import type { Candidate, Node } from "./crawl.ts";
import type { Dropped } from "./document.ts";
import type { SourceDocument } from "./source.ts";

export type Contains = { said: string; paths: string[]; appearances: number };
/** A verified definition, by what its bytes contain; the bytes themselves are not kept. */
export type Definition = { said: string; contains: Contains[] };

export type SourceVisit = Node & {
  outcome: Reason | "ok";
  limit?: string;
  digest: string | null;                       // hex Blake3-256 of the document bytes as read
  dropped: Dropped;
  document: SourceDocument | null;
  base: string | null;
  verified: Definition[];
  failed: { said: string; outcome: Reason }[];
  notContained: { in: string; said: string }[];
};

const empty = (c: Candidate): SourceVisit => ({ address: c.address, via: c.via, fetched: false, read: false, introductions: [], outcome: "ok", digest: null, dropped: { entries: 0, publications: 0 }, document: null, base: null, verified: [], failed: [], notContained: [] });

/**
 * The catalog build's visit of one source (docs/design.md "The catalog", step 3): the robots.txt rule, then the document, then every
 * served definition in SAID order up to the limit, each checked and scanned. What a definition contains is recorded with the scan's
 * paths so that no bytes outlive the visit. A refers entry the scan does not find in verified bytes ends not-contained.
 */
export async function visitAll(c: Candidate, session: Session, robots: Robots): Promise<SourceVisit> {
  const v = empty(c);
  const host = Session.hostOf(c.address);
  const stop = session.exhausted(host);
  if (stop !== null) return { ...v, outcome: "skipped", limit: stop };
  const may = await robots.allows(c.address);
  if (may !== true) return { ...v, outcome: "disallowed" };
  const r = await readSource(c.address, c.via, session);
  if (!r.ok) return { ...v, outcome: r.unresolved.reason };
  v.fetched = true;
  const { document, base, dropped } = r;
  const documentBytes = await session.fetch(c.address);   // see note below
  v.digest = documentBytes.outcome === "ok" ? bytesToHex(blake3(documentBytes.bytes)) : null;
  const taken = document.serves.slice(0, session.limits.definitionsPerSource);
  for (const entry of taken) {
    if (session.exhausted(host) !== null) break;
    const address = definitionAddress(base, entry.said);
    const allowed = await robots.allows(address);
    if (allowed !== true) { v.failed.push({ said: entry.said, outcome: "disallowed" }); continue; }
    const g = await session.fetch(address);
    if (g.outcome !== "ok") { v.failed.push({ said: entry.said, outcome: g.outcome }); continue; }
    if (!checkSaid(g.bytes, entry.said)) { v.failed.push({ said: entry.said, outcome: "failed-check" }); continue; }
    const found = appearances(g.bytes, entry.said);
    v.verified.push({ said: entry.said, contains: found.map((said) => { const p = paths(g.bytes, said); return { said, paths: p.paths, appearances: p.count }; }) });
    for (const claimed of entry.refers) if (!found.includes(claimed)) v.notContained.push({ in: entry.said, said: claimed });
  }
  if (session.exhausted(host) !== null) return { ...empty(c), fetched: true, outcome: "timed-out" };
  v.read = true;
  v.outcome = document.serves.length > taken.length ? "truncated" : "ok";
  if (v.outcome === "truncated") v.limit = "definitions";
  v.dropped = dropped;
  v.document = document;
  v.base = base;
  v.introductions = document.introductions.slice(0, session.limits.introductionsPerSource);
  return v;
}
```

The digest needs the document's bytes, which `readSource` does not return. Do not fetch the document twice: extend `ReadSource`'s ok branch in `src/read.ts` with `bytes: Uint8Array` (the bytes `readSourceDocument` read), return them from `readSource`, and compute the digest from `r.bytes`; delete the `documentBytes` fetch above. `get.ts` and `walk.ts` ignore the new member. Add to the visit test's first case an assertion that `source.json` was requested exactly once.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/visit.test.ts tests/walk.test.ts tests/get.test.ts`
Expected: all pass (the `ReadSource` change is additive).

- [ ] **Step 5: Commit**

```bash
git add src/visit.ts src/read.ts tests/visit.test.ts
git commit -m "feat: the catalog's visit of a source: robots rule, every definition checked and scanned, digest of the document (<bead id>)"
```

---

### Task 5: Rows, index, sources and the build record

**Files:**
- Create: `src/catalog.ts`, `tests/catalog.test.ts`

**Interfaces:**
- Consumes: `levels`, `Candidate`, `visitAll`, `SourceVisit`, `Robots`, `Session`, `Unresolved`, `parseSourceAddress`, `RowLimits`, `ROW`, `CATALOG`, `byKey`, `isRecord`, `isSaid`.
- Produces: `type CandidateFile = { finder: string; snapshot: string; candidates: { address: string; place: Record<string, string | number> }[] }`; `readCandidateFile(text: string): CandidateFile | null`; `type Found = { by: "from" } | { by: "introduction"; from: string } | { by: "finder"; finder: string; snapshot: string; place: Record<string, string | number> }`; `type Row = { said: string; serves: { source: string }[]; publications: { source: string; publication: Publication }[]; referrers: { source: string; said: string; paths: string[]; appearances: number }[]; counts: { source: string; publications: number; referrers: number }[]; omittedSources?: number }`; `type BuildInput = { from: string[]; candidates: CandidateFile[]; session: Session; robots: Robots; row: RowLimits; toolCommit: string | null }`; `type BuildOutcome = { ok: true; files: Map<string, Uint8Array>; summary: { rows: number; sources: { ok: number; truncated: number; other: number }; seeded: boolean } } | { ok: false; problem: string }`; `buildCatalog(input: BuildInput): Promise<BuildOutcome>` (writes no pages; Task 7 adds them); `toolCommit(gitDir: URL): string | null`.

**Acceptance Criteria:**
- Candidates: `--from` addresses and candidate files' addresses are de-duplicated (canonical form) and visited in sorted order at depth 0; an address failing the rule is dropped and counted (`droppedCandidates`); more candidates than `sourcesPerRun` gives `{ ok: false, problem }` before any fetch.
- Rows exist exactly for SAIDs some read source served verified; a SAID only contained has no row; a definition containing a letter-case variant of a SAID creates nothing (the pattern refuses it).
- Attribution: every entry names the source it was fetched from; a source's publications of a SAID it does not serve enter only a row another source created, attributed to the publishing source.
- One publication per source per row (the first), with the full count in `counts`; at most `referrersPerSource` referrers per source, lowest SAID first, with the full count; a row that would exceed `rowBytes` keeps sources in the build's order up to that size and sets `omittedSources`.
- `sources.json` lists every address tried, sorted, with `found`, `outcome`, `limit`, `dropped`, `digest`, the non-verified `definitions` and the `refers` entries that were not contained; `index.json` lists every row's SAID with the count of serving addresses and the names from publications beside their source; `catalog.json` has the tool's commit, `from`, the candidate files' finder/snapshot/count, `droppedCandidates`, the limits (including `row`) and `seeded` with the design's note when no candidate file was given.
- No file holds a time or the catalog's address; two builds over the same servers are byte-identical; a build in which no source ended `ok` or `truncated` returns `{ ok: false }`.
- `toolCommit` reads a 40-hex commit from `.git/HEAD` directly or through the ref it names (loose or packed); returns `null` when the folder is not a checkout.

- [ ] **Step 1: Write the failing tests**

`tests/catalog.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { Robots } from "../src/robots.ts";
import { CATALOG, ROW, type Limits, type RowLimits } from "../src/limits.ts";
import { buildCatalog, readCandidateFile, toolCommit, type CandidateFile, type Row } from "../src/catalog.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); o.behave = robotsOk; origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const robotsOk: NonNullable<Origin["behave"]> = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
const session = (more: Partial<Limits> = {}) => new Session({ ...CATALOG, requestMs: 2000, ...more }, { test: true });
const build = (from: string[], more: Partial<Limits> = {}, row: RowLimits = ROW, candidates: CandidateFile[] = []) => { const s = session(more); return buildCatalog({ from, candidates, session: s, robots: new Robots(s), row, toolCommit: "0123456789abcdef0123456789abcdef01234567" }); };
const json = (files: Map<string, Uint8Array>, path: string) => JSON.parse(new TextDecoder().decode(files.get(path)!)) as Record<string, unknown>;
const row = (files: Map<string, Uint8Array>, said: string) => json(files, `said/${said}.json`) as unknown as Row;
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};

test("two sources that never link, named with --from, meet in one row; two builds are byte-identical", async () => {
  const [a, b] = [await start(), await start()];
  const aAddr = a.source("mad/", { serve: [SELECTION], publications: [{ target: SELECTION, name: "from a", description: "d", tags: ["t"], collection: "c" }] }, inputs).address;
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const r = await build([bAddr, aAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  const sel = row(r.files, SELECTION);
  assert.deepEqual(sel.serves.map((s) => s.source), [aAddr, bAddr].sort(), "the build's order is sorted at depth 0");
  assert.deepEqual(sel.publications, [{ source: aAddr, publication: { target: SELECTION, name: "from a", description: "d", tags: ["t"], collection: "c" } }]);
  assert.deepEqual(sel.counts, [{ source: aAddr, publications: 1, referrers: 0 }, { source: bAddr, publications: 0, referrers: 0 }].sort((p, q) => (p.source < q.source ? -1 : 1)));
  const index = json(r.files, "index.json") as { saids: { said: string; sources: number; names: { name: string; source: string }[] }[] };
  assert.equal(index.saids.length, 12, "the selection's closure");
  assert.deepEqual(index.saids.find((x) => x.said === SELECTION), { said: SELECTION, sources: 2, names: [{ name: "from a", source: aAddr }] });
  assert.deepEqual(index.saids.map((x) => x.said), [...index.saids.map((x) => x.said)].sort());
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[]; outcome: string; digest: string | null; definitions: unknown[]; refers: unknown[] }[] };
  assert.deepEqual(sources.sources.map((s) => s.address), [aAddr, bAddr].sort());
  for (const s of sources.sources) { assert.deepEqual(s.found, [{ by: "from" }]); assert.equal(s.outcome, "ok"); assert.match(s.digest!, /^[0-9a-f]{64}$/); assert.deepEqual(s.definitions, []); assert.deepEqual(s.refers, []); }
  const meta = json(r.files, "catalog.json") as Record<string, unknown>;
  assert.deepEqual(meta["from"], [aAddr, bAddr].sort());
  assert.equal(meta["seeded"], true);
  assert.equal(typeof meta["note"], "string");
  assert.deepEqual(meta["tool"], { commit: "0123456789abcdef0123456789abcdef01234567" });
  assert.deepEqual((meta["limits"] as Record<string, unknown>)["row"], ROW);
  const text = new TextDecoder().decode(r.files.get("catalog.json")!) + new TextDecoder().decode(r.files.get("sources.json")!);
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(text), "no time anywhere");
  assert.ok(!text.includes("catalog.json\""), "no catalog address");
  const again = await build([bAddr, aAddr]);
  assert.ok(again.ok); if (!again.ok) return;
  for (const [path, bytes] of r.files) assert.deepEqual(again.files.get(path), bytes, path);
  assert.equal(again.files.size, r.files.size);
});

test("a row exists only for verified served bytes; attribution follows the fetched address; a case variant creates nothing", async () => {
  const [honest, hostile] = [await start(), await start()];
  const x = definition([]);
  const y = definition([x.said]);
  const z = definition([x.said.replace(/^E/, "e")], ',"n":"z"');   // contains a letter-case variant of x's SAID
  const hAddr = `${honest.origin}/s/source.json`;
  honest.put("s/source.json", JSON.stringify({ source: hAddr, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said }] }));
  for (const d of [x, y, z]) honest.put(`s/definitions/${d.said}.json`, d.bytes);
  const kAddr = `${hostile.origin}/s/source.json`;
  // The hostile source claims x and y, serves wrong bytes for x and nothing for y, and publishes y and a SAID nobody serves.
  const ghost = "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  hostile.put("s/source.json", JSON.stringify({ source: kAddr, serves: [{ said: x.said }, { said: y.said }], publications: [{ target: y.said, name: "mine", description: "d", tags: [], collection: "c" }, { target: ghost, name: "ghost", description: "d", tags: [], collection: "c" }] }));
  hostile.put(`s/definitions/${x.said}.json`, '{"d":"' + x.said + '","r":[1]}');
  const r = await build([hAddr, kAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  assert.deepEqual([...r.files.keys()].filter((p) => p.startsWith("said/")).sort(), [x.said, y.said, z.said].map((s) => `said/${s}.json`).sort(), "no row for the ghost, none for the variant");
  const rx = row(r.files, x.said);
  assert.deepEqual(rx.serves, [{ source: hAddr }], "the hostile source's wrong bytes do not make it a server");
  assert.deepEqual(rx.referrers.map((e) => [e.source, e.said]), [[hAddr, y.said]], "z's variant is not an appearance");
  const ry = row(r.files, y.said);
  assert.deepEqual(ry.serves, [{ source: hAddr }]);
  assert.deepEqual(ry.publications.map((p) => p.source), [kAddr], "a publication from a source that does not serve, in a row that exists");
  const sources = json(r.files, "sources.json") as { sources: { address: string; definitions: { said: string; outcome: string }[]; refers: unknown[] }[] };
  const k = sources.sources.find((s) => s.address === kAddr)!;
  assert.deepEqual(k.definitions.sort((p, q) => (p.said < q.said ? -1 : 1)), [{ said: x.said, outcome: "failed-check" }, { said: y.said, outcome: "not-found" }].sort((p, q) => (p.said < q.said ? -1 : 1)));
});

test("one publication and at most referrersPerSource referrers from one source, counted; a row never exceeds rowBytes", async () => {
  const a = await start();
  const x = definition([]);
  const refs = Array.from({ length: 5 }, (_, i) => definition([x.said], `,"n":${i}`));
  const pub = (n: number) => ({ target: x.said, name: `name ${n}`, description: "d", tags: [], collection: "c" });
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, ...refs.map((d) => ({ said: d.said, refers: [x.said] }))], publications: Array.from({ length: 300 }, (_, n) => pub(n)) }));
  for (const d of [x, ...refs]) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await build([address], {}, { referrersPerSource: 3, rowBytes: ROW.rowBytes });
  assert.ok(r.ok); if (!r.ok) return;
  const rx = row(r.files, x.said);
  assert.deepEqual(rx.publications.map((p) => p.publication.name), ["name 0"]);
  assert.deepEqual(rx.referrers.map((e) => e.said), refs.map((d) => d.said).sort().slice(0, 3), "lowest SAID first");
  assert.deepEqual(rx.counts, [{ source: address, publications: 300, referrers: 5 }]);
  assert.equal(rx.omittedSources, undefined);

  const b = await start();
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const c = await start();
  const cAddr = c.source("mad/", { serve: [SELECTION] }, inputs).address;
  const small = await build([bAddr, cAddr], {}, { referrersPerSource: 50, rowBytes: 400 });
  assert.ok(small.ok); if (!small.ok) return;
  const sel = row(small.files, SELECTION);
  assert.ok(small.files.get(`said/${SELECTION}.json`)!.length <= 400, "within the row limit");
  assert.equal(sel.omittedSources, 1);
  assert.deepEqual(sel.serves, [{ source: [bAddr, cAddr].sort()[0] }], "sources kept in the build's order");
});

test("candidate files: read, de-duplicated with --from, sorted; bad addresses dropped and counted; too many stops the build", async () => {
  const [a, b] = [await start(), await start()];
  const aAddr = a.source("mad/", { serve: [SELECTION] }, inputs).address;
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const file: CandidateFile = { finder: "robots", snapshot: "CC-MAIN-2026-43", candidates: [{ address: bAddr, place: { file: "x.warc.gz", offset: 12 } }, { address: aAddr, place: { file: "y.warc.gz", offset: 7 } }, { address: "https://1.2.3.4/source.json", place: {} }, { address: "not an address", place: {} }] };
  assert.deepEqual(readCandidateFile(JSON.stringify(file)), file);
  assert.equal(readCandidateFile("{}"), null);
  assert.equal(readCandidateFile(JSON.stringify({ finder: "robots", snapshot: "x", candidates: [{ address: 5 }] })), null);
  const r = await build([aAddr], {}, ROW, [file]);
  assert.ok(r.ok); if (!r.ok) return;
  const meta = json(r.files, "catalog.json") as Record<string, unknown>;
  assert.equal(meta["seeded"], false); assert.equal(meta["note"], undefined);
  assert.deepEqual(meta["candidates"], [{ finder: "robots", snapshot: "CC-MAIN-2026-43", count: 4 }]);
  assert.equal(meta["droppedCandidates"], 2);
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[] }[] };
  assert.deepEqual(sources.sources.map((s) => s.address), [aAddr, bAddr].sort());
  assert.deepEqual(sources.sources.find((s) => s.address === aAddr)!.found, [{ by: "from" }, { by: "finder", finder: "robots", snapshot: "CC-MAIN-2026-43", place: { file: "y.warc.gz", offset: 7 } }]);
  const tooMany = await build([aAddr, bAddr], { sourcesPerRun: 1 });
  assert.deepEqual(tooMany, { ok: false, problem: "2 candidates, more than the limit of 1 sources per run" });
  assert.equal(a.requests.filter((p) => p === "mad/source.json").length, 2, "the refused build fetched nothing");
});

test("introductions are followed and recorded as how a source was found; a build where nothing was read writes nothing", async () => {
  const [a, b] = [await start(), await start()];
  const bAddr = b.source("mad/", { serve: [SELECTION] }, inputs).address;
  const aAddr = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs).address;
  const r = await build([aAddr]);
  assert.ok(r.ok); if (!r.ok) return;
  const sources = json(r.files, "sources.json") as { sources: { address: string; found: unknown[] }[] };
  assert.deepEqual(sources.sources.find((s) => s.address === bAddr)!.found, [{ by: "introduction", from: aAddr }]);
  assert.deepEqual(row(r.files, SELECTION).serves.map((s) => s.source), [aAddr, bAddr]);
  const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
  assert.deepEqual(await build([deadAddr]), { ok: false, problem: "no source could be read" });
});

test("the tool's commit comes from the checkout, or is null", () => {
  const dir = mkdtempSync(join(tmpdir(), "git-"));
  mkdirSync(join(dir, ".git", "refs", "heads"), { recursive: true });
  writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(dir, ".git", "refs", "heads", "main"), "abcdefabcdefabcdefabcdefabcdefabcdefabcd\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "abcdefabcdefabcdefabcdefabcdefabcdefabcd");
  writeFileSync(join(dir, ".git", "HEAD"), "0123456789012345678901234567890123456789\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "0123456789012345678901234567890123456789");
  writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/other\n");
  writeFileSync(join(dir, ".git", "packed-refs"), "# pack-refs\nfedcbafedcbafedcbafedcbafedcbafedcbafedc refs/heads/other\n");
  assert.equal(toolCommit(pathToFileURL(dir + "/")), "fedcbafedcbafedcbafedcbafedcbafedcbafedc");
  assert.equal(toolCommit(pathToFileURL(mkdtempSync(join(tmpdir(), "nogit-")) + "/")), null);
  assert.match(toolCommit(new URL("../", import.meta.url))!, /^[0-9a-f]{40}$/, "this checkout");
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/catalog.test.ts`
Expected: FAIL, cannot find module `../src/catalog.ts`.

- [ ] **Step 3: Write `src/catalog.ts`**

```ts
import { readFileSync } from "node:fs";
import { isSaid } from "./said.ts";
import { parseSourceAddress } from "./address.ts";
import { levels, type Candidate } from "./crawl.ts";
import { visitAll, type SourceVisit } from "./visit.ts";
import { byKey, isRecord, type Publication } from "./source.ts";
import type { Session } from "./session.ts";
import type { Robots } from "./robots.ts";
import type { RowLimits } from "./limits.ts";

/** What a finder writes (docs/design.md "What a finder returns"); place is the finder's own record of where it saw the line. */
export type CandidateFile = { finder: string; snapshot: string; candidates: { address: string; place: Record<string, string | number> }[] };

export type Found =
  | { by: "from" }
  | { by: "introduction"; from: string }
  | { by: "finder"; finder: string; snapshot: string; place: Record<string, string | number> };

export type Row = {
  said: string;
  serves: { source: string }[];
  publications: { source: string; publication: Publication }[];
  referrers: { source: string; said: string; paths: string[]; appearances: number }[];
  counts: { source: string; publications: number; referrers: number }[];
  omittedSources?: number;
};

export type BuildInput = { from: string[]; candidates: CandidateFile[]; session: Session; robots: Robots; row: RowLimits; toolCommit: string | null };
export type BuildOutcome =
  | { ok: true; files: Map<string, Uint8Array>; summary: { rows: number; sources: { ok: number; truncated: number; other: number }; seeded: boolean } }
  | { ok: false; problem: string };

const SEEDED_NOTE = "A seeded crawl: the sources are a hand-kept list given on the command line, which Ruling 3 does not count as meeting the objective for strangers. A catalog that does is built from a finder's candidate files.";

const encoder = new TextEncoder();
const jsonBytes = (value: unknown): Uint8Array => encoder.encode(JSON.stringify(value, null, 2) + "\n");

/** A candidate file as written by catalog find; null when it is not one. Addresses are checked later, against the rule, and counted. */
export function readCandidateFile(text: string): CandidateFile | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isRecord(raw) || typeof raw["finder"] !== "string" || typeof raw["snapshot"] !== "string" || !Array.isArray(raw["candidates"])) return null;
  const candidates: CandidateFile["candidates"] = [];
  for (const c of raw["candidates"]) {
    if (!isRecord(c) || typeof c["address"] !== "string" || !isRecord(c["place"] ?? {})) return null;
    const place: Record<string, string | number> = {};
    for (const [k, v] of Object.entries((c["place"] ?? {}) as Record<string, unknown>)) if (typeof v === "string" || typeof v === "number") place[k] = v;
    candidates.push({ address: c["address"], place });
  }
  return { finder: raw["finder"], snapshot: raw["snapshot"], candidates };
}

/** The commit the tool runs from: .git/HEAD, through the ref it names (loose or packed). null when this is not a checkout. */
export function toolCommit(checkout: URL): string | null {
  const read = (path: string): string | null => { try { return readFileSync(new URL(path, checkout), "utf8"); } catch { return null; } };
  const head = read(".git/HEAD")?.trim();
  if (head === undefined) return null;
  if (/^[0-9a-f]{40}$/.test(head)) return head;
  const ref = head.startsWith("ref: ") ? head.slice(5).trim() : null;
  if (ref === null) return null;
  const loose = read(`.git/${ref}`)?.trim();
  if (loose !== undefined && /^[0-9a-f]{40}$/.test(loose)) return loose;
  const packed = read(".git/packed-refs");
  if (packed === null) return null;
  for (const line of packed.split("\n")) { const [sha, name] = line.split(" "); if (name === ref && sha !== undefined && /^[0-9a-f]{40}$/.test(sha)) return sha; }
  return null;
}

/**
 * docs/design.md "The catalog": gather the candidates, visit breadth-first within the limits, then write the static files from what
 * verified. Rows exist only for served bytes that passed the check; every statement names the source it was fetched from; counts are
 * counts of addresses. Pages are added by the caller.
 */
export async function buildCatalog(input: BuildInput): Promise<BuildOutcome> {
  const { session, robots, row } = input;
  const test = session.test;
  // 1. Candidates: canonical, de-duplicated, sorted; the rule drops and counts; too many is a refusal before any fetch.
  const found = new Map<string, Found[]>();
  let droppedCandidates = 0;
  const add = (address: string, how: Found): void => {
    const parsed = parseSourceAddress(address, { test });
    if (parsed === null) { droppedCandidates++; return; }
    const list = found.get(parsed.address) ?? [];
    list.push(how);
    found.set(parsed.address, list);
  };
  for (const a of input.from) add(a, { by: "from" });
  for (const file of input.candidates) for (const c of file.candidates) add(c.address, { by: "finder", finder: file.finder, snapshot: file.snapshot, place: c.place });
  const starts: Candidate[] = [...found.keys()].sort().map((address) => ({ address, via: [], named: false }));
  if (starts.length > session.limits.sourcesPerRun) return { ok: false, problem: `${starts.length} candidates, more than the limit of ${session.limits.sourcesPerRun} sources per run` };

  // 2. Visit.
  const { visits, skipped } = await levels(starts, session, (c) => visitAll(c, session, robots), () => false);
  for (const v of visits) if (v.via.length > 0) found.set(v.address, [...(found.get(v.address) ?? []), { by: "introduction", from: v.via[v.via.length - 1]! }]);
  for (const s of skipped) found.set(s.address, [...(found.get(s.address) ?? []), { by: "introduction", from: s.via[s.via.length - 1]! }]);
  const read = visits.filter((v) => v.read);
  if (read.length === 0) return { ok: false, problem: "no source could be read" };

  // 3. Rows, in the build's order of sources (depth, then address: the order of visits).
  const rows = new Map<string, Row>();
  const rowFor = (said: string): Row => { let r = rows.get(said); if (r === undefined) { r = { said, serves: [], publications: [], referrers: [], counts: [] }; rows.set(said, r); } return r; };
  for (const v of read) for (const d of v.verified) rowFor(d.said).serves.push({ source: v.address });
  for (const v of read) {
    const perSaid = new Map<string, { publications: Publication[]; referrers: { said: string; paths: string[]; appearances: number }[] }>();
    const bucket = (said: string) => { let b = perSaid.get(said); if (b === undefined) { b = { publications: [], referrers: [] }; perSaid.set(said, b); } return b; };
    for (const p of v.document!.publications) if (rows.has(p.target)) bucket(p.target).publications.push(p);
    for (const d of v.verified) for (const c of d.contains) if (rows.has(c.said)) bucket(c.said).referrers.push({ said: d.said, paths: c.paths, appearances: c.appearances });
    for (const [said, b] of perSaid) {
      const r = rowFor(said);
      if (b.publications.length > 0) r.publications.push({ source: v.address, publication: b.publications[0]! });
      b.referrers.sort(byKey("said"));
      for (const ref of b.referrers.slice(0, row.referrersPerSource)) r.referrers.push({ source: v.address, ...ref });
      r.counts.push({ source: v.address, publications: b.publications.length, referrers: b.referrers.length });
    }
  }
  // 4. The row size limit: keep sources in the build's order up to the limit, state how many were left out.
  const files = new Map<string, Uint8Array>();
  for (const said of [...rows.keys()].sort()) {
    let r = rows.get(said)!;
    const order = read.map((v) => v.address);
    let bytes = jsonBytes(r);
    if (bytes.length > row.rowBytes) {
      const kept = new Set<string>(order);
      for (let i = order.length - 1; i >= 0 && bytes.length > row.rowBytes; i--) {
        kept.delete(order[i]!);
        const cut: Row = { ...r, serves: r.serves.filter((s) => kept.has(s.source)), publications: r.publications.filter((p) => kept.has(p.source)), referrers: r.referrers.filter((x) => kept.has(x.source)), counts: r.counts.filter((c) => kept.has(c.source)), omittedSources: order.length - i };
        r = cut; bytes = jsonBytes(r);
      }
    }
    files.set(`said/${said}.json`, bytes);
    rows.set(said, r);
  }
  // 5. index.json, sources.json, catalog.json.
  const index = { saids: [...rows.keys()].sort().map((said) => { const r = rows.get(said)!; return { said, sources: r.serves.length, names: r.publications.map((p) => ({ name: p.publication.name, source: p.source })) }; }) };
  files.set("index.json", jsonBytes(index));
  const tried = [...visits.map((v) => ({ v, skipped: null as null | typeof skipped[number] })), ...skipped.map((s) => ({ v: null as null | SourceVisit, skipped: s }))];
  const sources = tried.map(({ v, skipped: s }) => {
    const address = v?.address ?? s!.address;
    return {
      address,
      found: found.get(address) ?? [],
      outcome: v?.outcome ?? "skipped",
      ...(v?.limit !== undefined ? { limit: v.limit } : s !== null ? { limit: s.limit } : {}),
      dropped: v?.dropped ?? { entries: 0, publications: 0 },
      digest: v?.digest ?? null,
      definitions: v?.failed ?? [],
      refers: (v?.notContained ?? []).map((n) => ({ in: n.in, said: n.said, outcome: "not-contained" })),
    };
  }).sort(byKey("address"));
  files.set("sources.json", jsonBytes({ sources }));
  const seeded = input.candidates.length === 0;
  files.set("catalog.json", jsonBytes({
    tool: { commit: input.toolCommit },
    from: [...input.from].map((a) => parseSourceAddress(a, { test })?.address).filter((a): a is string => a !== undefined).sort(),
    candidates: input.candidates.map((f) => ({ finder: f.finder, snapshot: f.snapshot, count: f.candidates.length })),
    droppedCandidates,
    limits: { ...session.limits, row },
    seeded,
    ...(seeded ? { note: SEEDED_NOTE } : {}),
  }));
  return { ok: true, files, summary: { rows: rows.size, sources: { ok: visits.filter((v) => v.outcome === "ok").length, truncated: visits.filter((v) => v.outcome === "truncated").length, other: visits.length + skipped.length - read.length }, seeded } };
}
```

`isSaid` is imported for the row-key invariant: add `if (!isSaid(said)) throw new Error("a row key is always a verified SAID");` as the first line inside the `for (const said of [...rows.keys()].sort())` loop; it cannot fire (keys come from `verified`), and it says so.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/catalog.test.ts`
Expected: all pass. The row-size test's limit of 400 bytes is chosen so that one source's entries fit and two do not; if the row with one source is larger than 400 bytes on this fixture, raise the limit in the test to the smallest value above one source's row size and below two (print the sizes once to pick it, then fix the number in the test with a comment).

- [ ] **Step 5: Commit**

```bash
git add src/catalog.ts tests/catalog.test.ts
git commit -m "feat: the catalog build: candidates, rows, index, sources and the build record (<bead id>)"
```

---

### Task 6: The catalog's pages

**Files:**
- Create: `src/catalogpages.ts`, `tests/catalogpages.test.ts`
- Modify: `src/pages.ts` (export `shell`, `addressLink`, `STYLE_CSS`, `offered`), `src/catalog.ts` (write the pages)

**Interfaces:**
- Consumes: `escapeHtml`, `shell`, `addressLink`, `STYLE_CSS`, `offered` from `src/pages.ts`; `parseSourceAddress`; `Row`; the sources' `pages` flags and bases (from `SourceVisit.document.pages` and `base`).
- Produces: `catalogPages(rows: Row[], sources: Map<string, { pages: boolean; base: string }>, opts: AddressOptions): Map<string, string>` with keys `pages/index.html`, `pages/style.css`, `pages/<SAID>/index.html`; `buildCatalog` adds them to its files.

**Acceptance Criteria:**
- The index lists every row's SAID in SAID order with the names its publications give it (each beside its source address as text); each SAID links to its page.
- A SAID's page lists: the sources that serve it, each linked to `<base>pages/<SAID>/index.html` when that source's document says `pages: true` and shown as text otherwise; the publications (name, description, tags, collection, offered-by) each with its source address as text; the definitions that contain it, each linked to the serving source's page for that definition when that source has pages, with the paths and counts; the counts and `omittedSources` when present. No ranking, no form, no script; the CSP meta; every string through `escapeHtml`.
- A hostile publication (`</script><script>`, `javascript:alert(1)`, bidi controls) renders as text: the page parses to no element, attribute or link the writer did not emit, and every link target is a page in the output or a fixed path under an address that passed the rule.

- [ ] **Step 1: Write the failing tests**

`tests/catalogpages.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogPages } from "../src/catalogpages.ts";
import type { Row } from "../src/catalog.ts";

const X = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const Y = "EFQ6ngR2kib-dwmW8mizJ4k5IdO0YysG0xSty9ESHDE4";
const A = "https://a.example/mad/source.json";
const B = "https://b.example/source.json";
const hostile = { target: X, name: "</script><script>alert(1)</script>", description: "javascript:alert(1) ‮ reversed", tags: ["<b>"], collection: "\"><img src=x onerror=alert(1)>" };
const rows: Row[] = [
  { said: X, serves: [{ source: A }, { source: B }], publications: [{ source: B, publication: hostile }], referrers: [{ source: A, said: Y, paths: ["/rrs/0"], appearances: 1 }], counts: [{ source: A, publications: 0, referrers: 1 }, { source: B, publications: 3, referrers: 0 }], omittedSources: 1 },
  { said: Y, serves: [{ source: A }], publications: [], referrers: [], counts: [{ source: A, publications: 0, referrers: 0 }] },
];
const sources = new Map([[A, { pages: true, base: "https://a.example/mad/" }], [B, { pages: false, base: "https://b.example/" }]]);
const links = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
const tags = (html: string) => [...html.matchAll(/<([a-zA-Z0-9]+)[\s>]/g)].map((m) => m[1]!.toLowerCase());

test("the index lists rows in SAID order with names beside their source, linking each SAID to its page", () => {
  const files = catalogPages(rows, sources, {});
  const index = files.get("pages/index.html")!;
  assert.ok(index.indexOf(X) < index.indexOf(Y));
  assert.deepEqual(links(index).filter((l) => l !== "style.css"), [`${X}/index.html`, `${Y}/index.html`]);
  assert.ok(index.includes("&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;"), "the hostile name is text");
  assert.ok(!index.includes("<script"), "no script element");
  assert.ok(files.has("pages/style.css"));
});

test("a SAID's page links a serving source only when it has pages, shows publications and counts, and renders hostile text inert", () => {
  const page = catalogPages(rows, sources, {}).get(`pages/${X}/index.html`)!;
  const hrefs = links(page);
  assert.ok(hrefs.includes(`https://a.example/mad/pages/${X}/index.html`), "A has pages: linked");
  assert.ok(!hrefs.some((h) => h.startsWith("https://b.example")), "B has no pages: shown as text only");
  assert.ok(page.includes("https://b.example/source.json"));
  assert.ok(hrefs.includes(`https://a.example/mad/pages/${Y}/index.html`), "the referrer links to A's page for Y");
  assert.ok(page.includes("/rrs/0"));
  assert.ok(page.includes("1 source left out") || page.includes("omitted"), "omittedSources shown");
  assert.ok(page.includes("3 publications"), "the count from B");
  assert.ok(!page.includes("<script") && !page.includes("javascript:") && !page.includes("onerror="), "hostile strings are escaped text");
  assert.ok(page.includes("&#x202e;"), "the bidi control is a numeric reference");
  for (const h of hrefs) assert.ok(/^(\.\.\/(style\.css|index\.html)|\.\.\/E[A-P][A-Za-z0-9_-]{42}\/index\.html|https:\/\/a\.example\/mad\/pages\/E[A-P][A-Za-z0-9_-]{42}\/index\.html)$/.test(h), h);
  const allowed = new Set(["html", "head", "meta", "title", "link", "body", "header", "main", "footer", "h1", "h2", "p", "ul", "li", "a", "code", "section", "span"]);
  for (const t of tags(page)) assert.ok(allowed.has(t), `element ${t}`);
  assert.ok(page.includes(`content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'"`));
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/catalogpages.test.ts`
Expected: FAIL, cannot find module `../src/catalogpages.ts`.

- [ ] **Step 3: Export the guards from `src/pages.ts` and write `src/catalogpages.ts`**

In `src/pages.ts`, add `export` to `shell`, `addressLink`, `offered` and `STYLE_CSS` (no other change).

`src/catalogpages.ts`:

```ts
import { isSaid } from "./said.ts";
import { parseSourceAddress, type AddressOptions } from "./address.ts";
import { escapeHtml, shell, addressLink, offered, STYLE_CSS } from "./pages.ts";
import type { Row } from "./catalog.ts";

export type SourcePages = Map<string, { pages: boolean; base: string }>;

/** A link to a source's own page for a SAID, only when that source says it has pages; otherwise the address as text. */
function sourceFor(address: string, said: string, sources: SourcePages, opts: AddressOptions): string {
  if (!isSaid(said)) throw new Error("only a SAID names a page");
  const s = sources.get(address);
  const parsed = parseSourceAddress(address, opts);
  if (s === undefined || !s.pages || parsed === null) return `<code>${escapeHtml(address)}</code>`;
  return addressLink(`${parsed.base}pages/${said}/index.html`, address);
}

function rowPage(row: Row, sources: SourcePages, opts: AddressOptions): string {
  const serves = row.serves.map((s) => `<li>${sourceFor(s.source, row.said, sources, opts)}</li>`);
  const publications = row.publications.map((p) => `${offered(p.publication, undefined)}<p>From <code>${escapeHtml(p.source)}</code></p>`);
  const referrers = row.referrers.map((r) => `<li>${sourceFor(r.source, r.said, sources, opts)}: <code>${r.said}</code>${r.paths.length > 0 ? ` at ${r.paths.map((p) => `<code>${escapeHtml(p)}</code>`).join(", ")}` : ""}${r.appearances > r.paths.length ? ` (${r.appearances} appearances)` : ""}</li>`);
  const counts = row.counts.map((c) => `<li><code>${escapeHtml(c.source)}</code>: ${c.publications} publications, ${c.referrers} definitions that contain it</li>`);
  const omitted = row.omittedSources !== undefined ? `<p>${row.omittedSources} source${row.omittedSources === 1 ? "" : "s"} left out: the row reached its size limit.</p>` : "";
  const body = `<header><p><a href="../index.html">This catalog</a></p><h1><code>${row.said}</code></h1></header>
<main>
<section><h2>Served by</h2>${serves.length > 0 ? `<ul>${serves.join("")}</ul>` : "<p>No source.</p>"}${omitted}</section>
<section><h2>Offered as</h2>${publications.length > 0 ? publications.join("\n") : "<p>No publication.</p>"}</section>
<section><h2>Contained by</h2>${referrers.length > 0 ? `<ul>${referrers.join("")}</ul>` : "<p>No definition in this catalog contains it.</p>"}</section>
<section><h2>Counts</h2><ul>${counts.join("")}</ul><p>A count of sources is a count of addresses.</p></section>
</main>
<footer><p>A catalog repeats what sources say and settles nothing; the check runs on the bytes at a definition's address.</p></footer>`;
  return shell(row.said, "../style.css", body);
}

function indexPage(rows: Row[]): string {
  const items = rows.map((r) => `<li><a href="${r.said}/index.html"><code>${r.said}</code></a>${r.publications.map((p) => ` ${escapeHtml(p.publication.name)} <code>${escapeHtml(p.source)}</code>`).join("")}</li>`);
  return shell("Definitions in this catalog", "style.css", `<header><h1>Definitions in this catalog</h1></header>\n<main><ul>${items.join("")}</ul></main>`);
}

/** The catalog's pages: an index and a page per row, in SAID order, with the page writer's guards. */
export function catalogPages(rows: Row[], sources: SourcePages, opts: AddressOptions): Map<string, string> {
  const sorted = [...rows].sort((a, b) => (a.said < b.said ? -1 : a.said > b.said ? 1 : 0));
  const files = new Map<string, string>();
  files.set("pages/index.html", indexPage(sorted));
  files.set("pages/style.css", STYLE_CSS);
  for (const r of sorted) files.set(`pages/${r.said}/index.html`, rowPage(r, sources, opts));
  return files;
}
```

In `src/catalog.ts`, before the `return { ok: true, ... }`: build `const sourcePages: SourcePages = new Map(read.map((v) => [v.address, { pages: v.document!.pages === true, base: v.base! }]));` and `for (const [path, text] of catalogPages([...rows.values()], sourcePages, { test })) files.set(path, encoder.encode(text));` (import `catalogPages`, `type SourcePages` from `./catalogpages.ts`). The index test's "3 publications" needs the count text exactly `3 publications`; the page shows `${c.publications} publications`.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && npm test`
Expected: all pass, including the catalog test's byte-identity (pages are deterministic).

- [ ] **Step 5: Commit**

```bash
git add src/catalogpages.ts src/pages.ts src/catalog.ts tests/catalogpages.test.ts
git commit -m "feat: the catalog's pages, linking a source's own page only when it says it has pages (<bead id>)"
```

---

### Task 7: `who --catalog`

**Files:**
- Modify: `src/walk.ts`, `tests/walk.test.ts`

**Interfaces:**
- Consumes: `levels` with `extra`; `Session.fetch`; `parseCatalogAddress`, `parseSourceAddress`; `isRecord`; `crypto.randomInt`.
- Produces: `walk(said: string, from: string, session: Session, catalog?: string): Promise<WalkOutcome>`; `Report.catalog?: { address: string; listed: number; taken: number }`; a module-private `readRow(catalogAddress, said, session): Promise<{ addresses: string[] } | { unresolved: Unresolved }>`.

**Acceptance Criteria:**
- With `catalog`, after the starting source is read the walk fetches `<catalog base>said/<SAID>.json`, takes each `serves[].source` that passes the source address rule as a named introduction at depth 1 with `via: [catalog]`, and reports `catalog: { address, listed, taken }`; a row that cannot be read or is not a row gives an `unresolved` entry `{ address: catalog, via: [], reason }` and the walk goes on without it.
- When the row lists more than the room left (`sourcesPerRun` minus the start), a random sample of that size is taken; `listed` is the row's count and `taken` the number that got a slot.
- The row's sources join the depth-1 round-robin as one list keyed by the catalog's address; the limit on introductions per source does not apply to the row.
- Catalogs named in visited documents stay in `report.catalogs` and are never fetched.

- [ ] **Step 1: Append the failing tests to `tests/walk.test.ts`**

```ts
test("--catalog seeds depth 1 from the row, as named introductions with the catalog as via", async () => {
  const [a, b, c, cat] = [await start(), await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr] = [a, b, c].map((o) => `${o.origin}/mad/source.json`);
  for (const o of [b, c]) o.source("mad/", { serve: [SELECTION] }, inputs);
  a.source("mad/", { serve: [SELECTION], catalogs: [`${cat.origin}/cat/catalog.json`] }, inputs);
  const catalogAddr = `${cat.origin}/cat/catalog.json`;
  cat.put("cat/catalog.json", JSON.stringify({ tool: { commit: null } }));
  cat.put(`cat/said/${SELECTION}.json`, JSON.stringify({ said: SELECTION, serves: [{ source: cAddr }, { source: bAddr }, { source: "https://1.2.3.4/source.json" }], publications: [], referrers: [], counts: [] }));
  const r = await walk(SELECTION, aAddr, session(), catalogAddr);
  assert.ok(r.ok); if (!r.ok) return;
  assert.deepEqual(r.report.serves.map((s) => s.source).sort(), [aAddr, bAddr, cAddr].sort());
  for (const s of r.report.serves.filter((s) => s.source !== aAddr)) assert.deepEqual(s.via, [catalogAddr]);
  assert.deepEqual(r.report.catalog, { address: catalogAddr, listed: 3, taken: 2 }, "the IP-literal address fails the rule and is not taken");
  assert.deepEqual(r.report.catalogs, [catalogAddr], "named by a's document; the row was fetched because --catalog said so, not on a's word");
  assert.equal(cat.requests.filter((p) => p === "cat/catalog.json").length, 0, "catalog.json itself is never fetched");
});

test("--catalog: a row that cannot be read is one unresolved entry; a large row is sampled to the room", async () => {
  const a = await start();
  const cat = await start();
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const catalogAddr = `${cat.origin}/cat/catalog.json`;
  const r = await walk(SELECTION, aAddr, session(), catalogAddr);
  assert.ok(r.ok); if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, [{ address: catalogAddr, via: [], reason: "not-found" }]);
  assert.deepEqual(r.report.catalog, { address: catalogAddr, listed: 0, taken: 0 });

  const dead = await Origin.start(); const deadBase = dead.origin; await dead.close();
  const many = Array.from({ length: 20 }, (_, i) => `${deadBase}/s${i}/source.json`);
  cat.put(`cat/said/${SELECTION}.json`, JSON.stringify({ said: SELECTION, serves: many.map((source) => ({ source })) }));
  const r2 = await walk(SELECTION, aAddr, session({ sourcesPerRun: 6 }), catalogAddr);
  assert.ok(r2.ok); if (!r2.ok) return;
  assert.deepEqual(r2.report.catalog, { address: catalogAddr, listed: 20, taken: 5 });
  const tried = r2.report.unresolved.filter((u) => u.reason === "unreachable").map((u) => u.address);
  assert.equal(tried.length, 5);
  assert.ok(tried.every((t) => many.includes(t)));
  assert.equal(r2.report.unresolved.filter((u) => u.reason === "skipped").length, 0, "sampling, not skipping: nothing beyond the sample is listed");
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/walk.test.ts`
Expected: the two new tests fail (`walk` takes three arguments; `catalog` is undefined on the report).

- [ ] **Step 3: Add the catalog seeding to `src/walk.ts`**

Add to `Report`: `catalog?: { address: string; listed: number; taken: number };`. Add the row reader and change `walk`:

```ts
import { randomInt } from "node:crypto";
import { parseCatalogAddress, parseSourceAddress } from "./address.ts";
import { isRecord } from "./source.ts";

/** The row's source addresses, each one that passes the rule; or why the row could not be read. */
async function readRow(catalog: string, said: string, session: Session): Promise<{ addresses: string[]; listed: number } | { unresolved: Unresolved }> {
  const parsed = parseCatalogAddress(catalog, { test: session.test });
  if (parsed === null) return { unresolved: { address: catalog, via: [], reason: "refused-address" } };
  const f = await session.fetch(`${parsed.base}said/${said}.json`);
  if (f.outcome !== "ok") return { unresolved: { address: catalog, via: [], reason: f.outcome, ...redirectTarget(f) } };
  const row = parseBounded(f.bytes);
  if (!row.ok || !isRecord(row.value) || !Array.isArray(row.value["serves"])) return { unresolved: { address: catalog, via: [], reason: "invalid" } };
  const addresses: string[] = [];
  for (const s of row.value["serves"]) {
    const a = isRecord(s) && typeof s["source"] === "string" ? parseSourceAddress(s["source"], { test: session.test }) : null;
    if (a !== null && !addresses.includes(a.address)) addresses.push(a.address);
  }
  return { addresses: addresses.sort(), listed: row.value["serves"].length };
}

/** A random sample of n, in address order; the row is open to flooding and any fixed order can be occupied. */
function sample(addresses: string[], n: number): string[] {
  const pool = [...addresses];
  const picked: string[] = [];
  while (picked.length < n && pool.length > 0) picked.push(pool.splice(randomInt(pool.length), 1)[0]!);
  return picked.sort();
}

export async function walk(said: string, from: string, session: Session, catalog?: string): Promise<WalkOutcome> {
  let seeded: { address: string; listed: number; taken: number } | undefined;
  let rowEntry: Unresolved | null = null;
  let extra: Candidate[] = [];
  if (catalog !== undefined) {
    const row = await readRow(catalog, said, session);
    if ("unresolved" in row) { rowEntry = row.unresolved; seeded = { address: catalog, listed: 0, taken: 0 }; }
    else {
      const room = Math.max(0, session.limits.sourcesPerRun - 1);
      const chosen = row.addresses.length > room ? sample(row.addresses, room) : row.addresses;
      extra = chosen.map((address) => ({ address, via: [catalog], named: true }));
      seeded = { address: catalog, listed: row.listed, taken: 0 };
    }
  }
  const { visits, skipped } = await levels([{ address: from, via: [], named: false }], session, (c) => visitSource(said, c, session), (i) => i.for.includes(said), (depth) => (depth === 0 && extra.length > 0 ? [{ key: catalog!, candidates: extra }] : []));
  const start = visits[0]!;
  if (!start.fetched) {
    const u = start.unresolved[0]!;
    return { ok: false, reason: u.reason, ...(u.target !== undefined ? { target: u.target } : {}) };
  }
  const report = assemble(said, from, visits, skipped);
  if (seeded !== undefined) {
    seeded.taken = visits.filter((v) => v.via.length === 1 && v.via[0] === catalog).length;
    report.catalog = seeded;
  }
  if (rowEntry !== null) report.unresolved.unshift(rowEntry);
  return { ok: true, report };
}
```

Import `parseBounded` from `./scan.ts`. Note `seeded.taken` counts the row's addresses that got a slot (visited, whatever their outcome), which with the sample equal to the room is the sample's size unless the start's own named introductions took slots first in the round-robin; the design says the row's limit is the sources-per-run limit, which this is.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && npm test`
Expected: all pass. The 20-address sample test uses one dead host: twenty addresses on one host run one at a time and each is refused at once.

- [ ] **Step 5: Commit**

```bash
git add src/walk.ts tests/walk.test.ts
git commit -m "feat: who --catalog seeds the walk from a catalog's row, sampled when the row is larger than the room (<bead id>)"
```

---

### Task 8: The `catalog build` command

**Files:**
- Modify: `src/cli.ts`, `tests/cli.test.ts`

**Interfaces:**
- Consumes: `buildCatalog`, `readCandidateFile`, `toolCommit`; `Robots`; `CATALOG`, `ROW`; `outDirProblem`, `writeFiles`; `parseCatalogAddress`.
- Produces: `catalog build --out <folder> [--candidates <file>]... [--from <address>]...` ; `catalog find` refused with a usage note until step 6; `who --catalog <address>` wired to `walk`'s fourth argument; `RunOptions.row?: RowLimits` for tests; a `flags(args, name): string[]` helper.

**Acceptance Criteria:**
- `catalog build` requires `--out` (absent or empty, checked before any request) and at least one `--from` or `--candidates`; an unreadable or malformed candidate file is `{ problems }` exit 1 before any request; a `--from` failing the rule is a usage error (exit 2).
- On success it writes every file and prints `{ written, rows, sources: { ok, truncated, other }, seeded, from: n, candidates: n }`, exit 0; `{ ok: false }` from the build prints `{ problems: [problem] }`, writes nothing, exit 1.
- The session uses `CATALOG` (or `options.limits`) and the row limits `ROW` (or `options.row`); `toolCommit` is read from the checkout `bin/` runs from.
- `who <SAID> --from <address> --catalog <address>` passes the catalog's address through after the catalog address rule (exit 2 when it fails).
- `catalog find` and a bare `catalog` print the usage and exit 2.

- [ ] **Step 1: Append the failing tests to `tests/cli.test.ts`**

```ts
test("catalog build writes a catalog from --from sources and reports; usage and failures are named", async () => {
  const [a, b] = [await Origin.start(), await Origin.start()];
  const robotsOk: NonNullable<Origin["behave"]> = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
  a.behave = robotsOk; b.behave = robotsOk;
  try {
    const aAddr = a.source("mad/", { serve: [SELECTION] }, compactInputs).address;
    const bAddr = b.source("mad/", { serve: [SELECTION] }, compactInputs).address;
    const out = join(mkdtempSync(join(tmpdir(), "cat-")), "catalog");
    let c = capture();
    const catalogLocal = { ...local, limits: { ...CATALOG, requestMs: 2000 } };
    assert.equal(await main(["catalog", "build", "--out", out, "--from", aAddr, "--from", bAddr], c.io, catalogLocal), 0, c.out());
    const r = c.json();
    assert.equal(r.rows, 12); assert.deepEqual(r.sources, { ok: 2, truncated: 0, other: 0 }); assert.equal(r.seeded, true); assert.equal(r.from, 2); assert.equal(r.candidates, 0);
    assert.equal(r.written, 4 + 12 + 2 + 12, "catalog, index, sources, 12 rows, index page, style, 12 pages");
    for (const f of ["catalog.json", "index.json", "sources.json", `said/${SELECTION}.json`, "pages/index.html", `pages/${SELECTION}/index.html`, "pages/style.css"]) assert.ok(existsSync(join(out, f)), f);
    const meta = JSON.parse(readFileSync(join(out, "catalog.json"), "utf8")) as { tool: { commit: string | null } };
    assert.match(meta.tool.commit!, /^[0-9a-f]{40}$/);
    assert.ok(/^[\x20-\x7e\n]*$/.test(c.out()), "ASCII-only");

    c = capture();
    assert.equal(await main(["catalog", "build", "--out", out, "--from", aAddr], c.io, catalogLocal), 1, "the out folder is not empty now");
    assert.deepEqual(c.json(), { problems: [`${out} is not empty`] });
    const requests = a.requests.length;
    for (const args of [["catalog"], ["catalog", "find", "--finder", "robots", "--out", out], ["catalog", "build", "--out", join(out, "x")], ["catalog", "build", "--out", join(out, "x"), "--from", "https://1.2.3.4/source.json"]]) {
      c = capture();
      assert.equal(await main(args, c.io, catalogLocal), 2, args.join(" "));
      assert.equal(c.out(), "");
    }
    assert.equal(a.requests.length, requests, "usage errors fetch nothing");

    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    c = capture();
    const out2 = join(mkdtempSync(join(tmpdir(), "cat-")), "catalog");
    assert.equal(await main(["catalog", "build", "--out", out2, "--from", deadAddr], c.io, catalogLocal), 1);
    assert.deepEqual(c.json(), { problems: ["no source could be read"] });
    assert.ok(!existsSync(out2), "nothing written");

    const bad = join(mkdtempSync(join(tmpdir(), "cand-")), "bad.json");
    writeFileSync(bad, "{}");
    c = capture();
    assert.equal(await main(["catalog", "build", "--out", out2, "--candidates", bad], c.io, catalogLocal), 1);
    assert.deepEqual(c.json(), { problems: [`${bad} is not a candidate file`] });
  } finally { await a.close(); await b.close(); }
});

test("who --catalog passes the catalog through; a bad catalog address is a usage error", async () => {
  const [a, cat] = [await Origin.start(), await Origin.start()];
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const catalogAddr = `${cat.origin}/c/catalog.json`;
    cat.put(`c/said/${SELECTION}.json`, JSON.stringify({ said: SELECTION, serves: [{ source: address }] }));
    let c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address, "--catalog", catalogAddr], c.io, local), 0);
    assert.deepEqual(c.json().catalog, { address: catalogAddr, listed: 1, taken: 0 }, "the one listed source is the start, already visited");
    c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address, "--catalog", "https://c.example/not-a-catalog.json"], c.io, local), 2);
  } finally { await a.close(); await cat.close(); }
});
```

Add `import { WALK, CATALOG } from "../src/limits.ts";` (extending the existing import).

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/cli.test.ts`
Expected: the new tests fail (`catalog` is not a command; `--catalog` is refused).

- [ ] **Step 3: Extend `src/cli.ts`**

Add imports: `import { buildCatalog, readCandidateFile, toolCommit } from "./catalog.ts"; import { Robots } from "./robots.ts"; import { CATALOG, ROW, type RowLimits } from "./limits.ts"; import { parseCatalogAddress } from "./address.ts";` (merge with the existing `limits` and `address` imports). `RunOptions` gains `row?: RowLimits`. Add:

```ts
function flags(args: string[], name: string): string[] {
  const out: string[] = [];
  args.forEach((a, i) => { const v = args[i + 1]; if (a === name && v !== undefined && !v.startsWith("--")) out.push(v); });
  return out;
}
```

The usage gains two lines after `get`:

```
  mad-discovery who <SAID> --from <source address> [--catalog <catalog address>]
  mad-discovery catalog build --out <folder> [--candidates <file>]... [--from <source address>]...
```

(replace the existing `who` line). In `main`: `if (command === "catalog") return await catalog(rest, io, options);`. In `who`: replace the `--catalog` refusal with

```ts
  const catalogFlag = flag(args, "--catalog");
  let catalogAddress: string | undefined;
  if (args.includes("--catalog")) {
    const parsed = catalogFlag === undefined ? null : parseCatalogAddress(catalogFlag, { test: options.test });
    if (parsed === null) return usage(io, "--catalog must be a catalog address: https, a DNS name, a path ending in /catalog.json.");
    catalogAddress = parsed.address;
  }
```

and call `walk(said, start.address, session(options), catalogAddress)`. Add:

```ts
async function catalog(args: string[], io: Io, options: RunOptions): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "find") return usage(io, "catalog find arrives with the finders (step 6).");
  if (sub !== "build") return usage(io);
  const out = flag(rest, "--out");
  const from = flags(rest, "--from");
  const candidatePaths = flags(rest, "--candidates");
  if (out === undefined || (from.length === 0 && candidatePaths.length === 0)) return usage(io, "catalog build needs --out and at least one --from or --candidates.");
  for (const f of from) if (parseSourceAddress(f, { test: options.test }) === null) return usage(io, FROM_NOTE);
  const outProblem = outDirProblem(out);
  if (outProblem !== null) { io.out(asciiJson({ problems: [outProblem] }) + "\n"); return 1; }
  const candidates = [];
  for (const path of candidatePaths) {
    let text: string;
    try { text = readFileSync(path, "utf8"); } catch { io.out(asciiJson({ problems: [`cannot read ${path}`] }) + "\n"); return 1; }
    const file = readCandidateFile(text);
    if (file === null) { io.out(asciiJson({ problems: [`${path} is not a candidate file`] }) + "\n"); return 1; }
    candidates.push(file);
  }
  const s = new Session(options.limits ?? CATALOG, { test: options.test, resolve: options.resolve });
  const r = await buildCatalog({ from, candidates, session: s, robots: new Robots(s), row: options.row ?? ROW, toolCommit: toolCommit(new URL("../", import.meta.url)) });
  if (!r.ok) { io.out(asciiJson({ problems: [r.problem] }) + "\n"); return 1; }
  writeFiles(r.files, out);
  io.out(asciiJson({ written: r.files.size, ...r.summary, from: from.length, candidates: candidates.length }) + "\n");
  return 0;
}
```

- [ ] **Step 4: Run the checks and the whole suite**

Run: `npm run check && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: catalog build on the command line; who --catalog (<bead id>)"
```

---

### Task 9: Documentation

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `/Users/seriouscoderone/code/bpm/CLAUDE.md`; the plan's header is the controller's.

**Acceptance Criteria:**
- README Status says step 5 is built (the catalog build from named sources and candidate files, its files and pages, `who --catalog`) and that `catalog find` (the finders) is step 6; Running it lists `catalog build` and `who --catalog`.
- CLAUDE.md lists this plan as current; the workspace CLAUDE.md's mad-discovery entry says the second epic is in progress with step 5 built.
- `npm --prefix mad-discovery run check && npm --prefix mad-discovery test` passes from the workspace root.

- [ ] **Step 1: README**

In `## Status`, after the sentence ending "the GitHub-topic finder Ruling 10 added.", add: "Step 5 of the second epic is built: `catalog build` visits named sources and candidate files, follows introductions within the catalog's limits and the robots.txt rule, and writes `catalog.json`, `index.json`, `said/<SAID>.json`, `sources.json` and pages that two builders produce byte for byte; `who --catalog` seeds a walk from a catalog's row. The finders (`catalog find`) are step 6." In `## Running it`, add after the `get` line:

```bash
node bin/mad-discovery.ts who <SAID> --from <source address> --catalog <catalog address>
node bin/mad-discovery.ts catalog build --out <folder> [--candidates <file>]... [--from <source address>]...
```

- [ ] **Step 2: CLAUDE.md and the workspace entry**

`CLAUDE.md`: the plans sentence becomes "The plans are `docs/plans/source-build.md` (step 1), `docs/plans/walk-and-get.md` (step 2), `docs/plans/ai-catalog.md` (step 3) and `docs/plans/catalog-build.md` (step 5 of the second epic, current)." Workspace `CLAUDE.md`: after "Step 3 (AI Catalog entries) is built; plan `mad-discovery/docs/plans/ai-catalog.md`." add " The second epic bpm-7h1 is in progress: step 4 done (two sources and the robots lines, Ruling 10), step 5 built (`catalog build`, `who --catalog`; plan `mad-discovery/docs/plans/catalog-build.md`); the finders are step 6."

- [ ] **Step 3: Check and commit both repositories**

```bash
cd /Users/seriouscoderone/code/bpm && npm --prefix mad-discovery run check && npm --prefix mad-discovery test
cd /Users/seriouscoderone/code/bpm/mad-discovery && git add README.md CLAUDE.md && git commit -m "docs: step 5 is built, the catalog build (<bead id>)" && git push
cd /Users/seriouscoderone/code/bpm && git add CLAUDE.md && git commit -m "docs: mad-discovery step 5 is built (<bead id>)" && git push
```

---

## Self-review

**Spec coverage.** Design "The catalog": the two commands split (`catalog find` refused until step 6, `catalog build` here); the batch's four steps (Task 5: gather, Task 3+4: visit breadth-first, Task 4: fetch/check/scan, Task 5+6: write); the files and their contents (Task 5: `catalog.json` with tool commit, starting sources, finder and snapshot per candidate file, limits; `index.json`; `said/<SAID>.json`; `sources.json` with how found, outcome and limit, dropped counts, digest, non-verified definitions and refers; Task 6: pages); no file holds the catalog's address or a time (Task 5 test). "What a catalog row may say": every bullet is a Task 5 test or rule (row only for verified served bytes; attribution; publications claimed and only in existing rows; counts are counts of addresses; one publication and 50 referrers per source with counts; 1 MB row with omitted count; no carry-over (a build is from scratch); empty build writes nothing; posting open). "Repeatable": fixed order and counts (Tasks 3, 5), byte-identical builds (Task 5 test). "Fetching safely", catalog column (Task 1) and the robots.txt rule (Task 2, applied in Task 4); `disallowed` outcome (Tasks 2, 4). "The walk", `--catalog` (Task 7): row read beside `catalog.json`, named introductions at depth 1 with the catalog as `via`, no per-source introductions limit for the row, sources-per-run applies, random sample with listed/taken, catalogs named by sources never fetched. "Readable pages" for a catalog (Task 6): index and per-SAID pages, links only when the source says it has pages, a publication-only source by address, SAID order, no ranking or form, the guards. "Tests", Catalog: identical builds; a source cannot create a row attributed to another; a SAID only contained has no file; a letter-case variant leaves the file unchanged; over the definitions limit cut and reported (Task 4); thousands of publications of one SAID add one to its row (Task 5, 300); a row never exceeds the size a walk will read (Task 5, small limit); every source fails writes nothing (Task 5); a robots rule that disallows the tool is obeyed (Task 4). "Acceptance" clause 3 (from the index a person reaches each source's page for a SAID by links alone): Task 6's tests on the index and the row page. Not here, by the design's own split: `catalog find` and both finders, the WARC fixture and the stranger-by-fixture test (step 6); hosting (step 7).

**Decisions for the gate.** The eight listed above; the two with real trade-offs are the row's `counts` member always present per source (simpler and deterministic, slightly larger rows) and the robots.txt media type requirement (`text/plain` only, which refuses a robots.txt served as `text/html`; the design's list of readable answers is 200 and 4xx, so a wrong type is treated as unreadable, which is the safe side).

**Placeholders.** `<bead id>` in commit messages is filled by the orchestrator. The row-size test's 400-byte limit is to be confirmed against the fixture at execution (Step 4 of Task 5 says how). No other.

**Type consistency.** `Candidate` and `Node` move to `crawl.ts` and `walk.ts` imports them; `Visited` extends `Node`; `levels`'s `extra` returns `{ key, candidates }[]` and `nextLevel` takes the same; `SourceVisit` extends `Node` and carries `outcome: Reason | "ok"` so `sources.json` writes outcomes by name only; `Row`, `Found`, `CandidateFile` are defined in `catalog.ts` and imported by `catalogpages.ts` and the tests; `Session.fetch`'s second argument is `FetchType`; `RunOptions.row` is `RowLimits`.
