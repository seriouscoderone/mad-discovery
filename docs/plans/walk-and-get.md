# The walk and `get` (step 2 of the first epic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent bpm-5g1`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** The network half of the first epic: one fetch routine that connects only to addresses it has checked, a reader for fetched source documents, the walk (`who <SAID> --from <address>`), `get <SAID> --from <address> --out <folder>`, and `verify <address> <SAID>`, all tested across local origins and against hostile servers, with no network beyond the test servers.

**Architecture:** Five new modules with one job each (`limits`, `ip`, `fetch`, `document`, `session`), a shared `read` step, then `walk` and `get` on top, and the commands in `cli`. Every byte from the network enters through `fetch.ts`, which resolves a name once with a cancellable resolver, refuses any answer that is not public, hands the socket the one address it checked, follows no redirect, asks for no content encoding and stops at the size limit. `session.ts` holds one run's budgets (the run clock, each host's time and bytes, hosts in flight, one request at a time per host). The walk is breadth-first by depth; within a depth sources run concurrently and the report is assembled in a fixed order, so two runs over the same servers give the same report.

**Tech Stack:** Node 24 (`node:https`, `node:http`, `node:dns/promises`), TypeScript 7.0.2 as a type check only, `node --test`, `@noble/hashes`. No new dependency.

**Scope:** Build order step 2 of `docs/design.md` (approved 2026-11-09): introductions, the walk and `get`, tested across local origins; plus `verify` over an address, which the design lists under the tool and step 1 left for this step. Not in this step: `who --catalog`, which reads a catalog's per-SAID file and belongs to the second epic (bpm-7h1) with the catalog itself; the command refuses the flag until then. AI Catalog entries are step 3. Deployment is out of scope: nothing here touches AWS or any host. When this step lands, the first epic's acceptance clauses 1 (walk) and 3 (get) are met by tests, clause 2 by step 1 and clause 4 by the approval; closing the epic, and so making the repository public (Ruling 4), is the maintainer's call, before or after step 3.

**Facts checked on this machine (Node 24.19.0) before planning:** a `lookup` function in the request options reaches the socket through our own `Agent`, and Node calls it with `all: true`, expecting an array of `{ address, family }`; a request so made reached a local server under a name that resolves nowhere (`nothing.test`), with the `Host` header carrying the name. An `Agent` of our own ignores `NODE_USE_ENV_PROXY=1` with `HTTP_PROXY` set, while `http.globalAgent` sends the request to the proxy. `new Resolver({ timeout, tries })` from `node:dns/promises` accepts those options and `cancel()` rejects the outstanding queries with `ECANCELLED`.

## Global Constraints

From `docs/design.md`; every task's requirements include these, and the step 1 plan's constraints (`docs/plans/source-build.md`) still hold.

- Node 24, `.ts` run directly, relative imports name `.ts`, `erasableSyntaxOnly`, `tsc --noEmit` as the check, `node --test tests/*.test.ts` as the tests. Exactly three dependencies, pinned exactly; this step adds none.
- **One fetch routine** for everything on the network. HTTPS only, port 443 only, DNS names only, outside tests. Certificate validation set on explicitly (`rejectUnauthorized: true`). Redirects are not followed: a 3xx is the outcome `redirected`, reported with the address it named, as text. The name is resolved once, with a resolver whose queries can be timed out and abandoned (not `dns.lookup`); the routine refuses unless every address returned is public; it connects only to an address it checked, through its own agent and its own `lookup`, never the global agent and never the built-in `fetch`. Requests ask for no content encoding (`Accept-Encoding: identity`) and an answer that carries one is refused; `Content-Encoding: identity` names no encoding and passes. Size limits are enforced while reading, not from the stated length. A JSON file must arrive as `application/json` or a type ending in `+json`. Nothing fetched is executed. Requests carry no cookies, no credentials and no Referer. The tool names itself `mad-discovery (+https://github.com/seriouscoderone/mad-discovery)`. Proxy settings in the environment are ignored.
- **Refused addresses.** IPv4: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24 and 224.0.0.0/3. IPv6: everything outside 2000::/3, and inside it 2001::/23, 2001:db8::/32 and 2002::/16. An IPv4 address carried in ::ffff:0:0/96 or 64:ff9b::/96 is checked by the IPv4 list.
- **Tests opt in** to plain HTTP, other ports and loopback through one parameter that only test code sets (`test: true`, already in `AddressOptions`). It relaxes the address rule and the connection check together. No environment variable, configuration field or command-line flag does it; the `bin` never sets it.
- **Limits** (walk and `get`): one request 10 s from before name resolution to the last byte; one file 1 MB; nesting depth 64; 16 paths of at most 256 characters per definition; 50 definitions fetched from one source in SAID order; 10 introductions followed from one source in address order; introduction depth 3; 50 sources per run; 60 s and 20 MB per host; 8 hosts in flight, one request at a time per host; 120 s for the run. Constants in one module. A count limit cuts in a fixed order and the source is recorded `truncated` with the limit's name. A source whose host uses up its time or bytes is dropped whole and sources on that host not yet started are `skipped`; nothing partial is kept because a clock ran out.
- **Outcomes**, exactly one per address tried: `ok`, `truncated`, `not-found` (404 or 410), `unreachable` (no answer, TLS failure, 5xx), `timed-out`, `redirected`, `refused-address`, `disallowed` (catalog build only; not produced here), `invalid` (wrong content type, a content encoding, not JSON, too large, too deep, a known member of the wrong type, another 4xx, a `source` that does not match), `skipped`. Per definition: `verified`, `failed-check`, `not-contained`, or the fetch outcome. Per `for` introduction with nothing at the end: `not-there`.
- **Reading a source document:** `source` must equal the address it was fetched from, else the document is `invalid` and nothing is read from it; a known member of the wrong type discards the document; an unknown member is ignored, inside a publication too; an entry whose SAID or address fails its rule is dropped and counted; a publication that breaks a limit is dropped and counted. Lists come out sorted and without duplicates; a duplicate is dropped and counted.
- **The walk** is breadth-first: every source at one depth before any at the next. Within a depth, introductions that name the SAID in `for` come first; among equals, one introduction from each introducing source in turn, introducing sources in address order and each source's introductions in address order. Visited addresses are remembered. The walk never sends a SAID to a source that does not list it (the source document is fetched whole and matched locally). It keeps nothing between runs. The report is one ASCII-only JSON document; it carries a `sources` list, one entry per source read in visit order, with the chain that led there and the operator's stated `by` and `oobi` when the document states them, and `reached` is that list's length (stress test, 2026-11-10). Two readings settled at the stress test: `not-there` is judged on what the source document lists and carries (a listed definition that fails is `failed-check` or `not-contained`, not `not-there`); and the ten introductions followed from one source are the first ten listed in address order, visited or not, so a source cannot be cut short by its own duplicates but is not given extra room for them either.
- **`get`** reads the starting source and the sources its introductions name, one step and no further; each SAID is fetched from the first source that lists it in `serves` (the starting source first, then the introduced sources in address order); it works outward from the SAID asked for, taking appearances in sorted order, checks each definition and writes `<SAID>.json`, nothing else, so the folder is `build`'s input shape. A SAID that no read source lists is `missing` and is requested from nobody. Settled at the stress test (2026-11-10) and written into the design: the SAID asked for may itself come from an introduced source when the start does not list it; a failed check at the first lister is not retried at the next; a lister that has reached `definitionsPerSource` no longer counts as listing, the next lister is tried, and the lister is `truncated`; an introduced source on a host already used up is `skipped` with the limit's name; and a source whose host is used up after it supplied files keeps those files, because a verified file is its own account, and gets one `timed-out` entry.
- **Commands** print JSON on standard output, ASCII-only, exit 0 success, 1 failure, 2 usage. `who` exits 1 only when the starting source cannot be read; `get` writes nothing and exits 1 when the starting source cannot be read or the definition asked for was not fetched and verified; `verify` exits 1 when the bytes fail or the fetch is refused. `--out` must be absent or empty and is checked before any request.
- Strangers' text: every string from a source appears in the report only as a JSON string, escaped to ASCII by `asciiJson`; the tool's own messages never embed one. Nothing from the network is ever a file name except a SAID that passed the pattern.
- Tests: no outside network. Three local origins stand for three hosts. Every hostile case in the design's "Hostile sources" list that concerns fetching, reading or the walk is a test here and ends in a named outcome, never a crash or a hang. Tests that wait on a timeout set small limits through the limits parameter, never the real ones.
- Workspace rules: small commits with the bead id and the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; stage files by name, never `-A`; mutating `bd` from `/Users/seriouscoderone/code/bpm`; push after each unit of work. No AWS anywhere in this plan.

## File structure

```
mad-discovery/
  src/limits.ts            every limit, in one place: the run limits (Limits, WALK), FILE_BYTES, PATH_LIMITS, PUBLICATION
  src/ip.ts                IPv4/IPv6 parsing; isPublic, isLoopback: the connection check's address rule
  src/fetch.ts             the fetch routine: resolve once, check, connect to the checked address, outcomes
  src/document.ts          a fetched source document, read leniently: drops counted, bad types discard
  src/session.ts           one run: the run clock, per-host time and bytes, hosts in flight, one request per host
  src/read.ts              fetch + read one source document; the Unresolved entry type the reports share
  src/walk.ts              the walk: visit one source, follow introductions by depth, the report
  src/get.ts               bringing a definition home: the closure across the start and its introductions
  src/cli.ts               + who, get, verify over an address; main becomes async
  bin/mad-discovery.ts     awaits main
  src/scan.ts, src/source.ts, src/inputs.ts, src/build.ts    import their limits from limits.ts; writeFiles replaces writePlan
  tests/helpers/servers.ts        Origin: a local http server on 127.0.0.1 serving a file map, with a behaviour hook; builds a source for its own port
  tests/helpers/fetch-child.ts    a child process for the proxy test: our routine vs the global agent under NODE_USE_ENV_PROXY
  tests/ip.test.ts, fetch.test.ts, document.test.ts, session.test.ts, walk.test.ts, get.test.ts; cli.test.ts extended
```

Dependencies between tasks: 1 -> 2 -> 4; 1 -> 3; 3 and 4 -> 5 -> 6; 5 -> 7; 6 and 7 -> 8 -> 9.

---

### Task 1: One module for the limits, and the public-address check

**Files:**
- Create: `src/limits.ts`, `src/ip.ts`, `tests/ip.test.ts`
- Modify: `src/scan.ts` (import `PATH_LIMITS`), `src/source.ts` (import `PUBLICATION`, drop `LIMITS`), `src/inputs.ts` and `src/build.ts` (import `FILE_BYTES`), `tests/scan.test.ts` (import `PATH_LIMITS` from limits)

**Interfaces:**
- Produces: in `src/limits.ts`: `type Limits = { requestMs; fileBytes; definitionsPerSource; introductionsPerSource; introductionDepth; sourcesPerRun; hostMs; hostBytes; hostsInFlight; runMs: number | null }` (all others `number`), `WALK: Limits`, `FILE_BYTES = 1_000_000`, `PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 }`, `PUBLICATION = { name: 200, description: 2000, tags: 32, tag: 64, collection: 200 }`. In `src/ip.ts`: `parseIPv4(s): number | null`, `parseIPv6(s): bigint | null`, `isPublic(address: string): boolean`, `isLoopback(address: string): boolean`.

**Acceptance Criteria:**
- Every row of the design's limits table, the file size, the path limits and the publication field limits are defined in `src/limits.ts` and nowhere else; `scan.ts`, `source.ts`, `inputs.ts` and `build.ts` import theirs from it and behave as before (`npm test` still passes 48 tests plus the new ones). The address length (512, `src/address.ts`) and the AID length (64, in `AID_PATTERN`) are format rules and stay where they are.
- `isPublic` refuses every range in the design's list, by at least one address inside each range and accepts an address just outside the ones with a neighbour (172.32.0.0, 2001:200::1), accepts public IPv4 carried in `::ffff:` and `64:ff9b::` forms, refuses loopback and private IPv4 carried in them, and returns false for anything that does not parse (a zone id, five octets, a leading zero).

- [ ] **Step 1: Write the failing tests**

`tests/ip.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIPv4, parseIPv6, isPublic, isLoopback } from "../src/ip.ts";

test("IPv4 parses dotted quads and nothing else", () => {
  assert.equal(parseIPv4("93.184.216.34"), 0x5db8d822);
  assert.equal(parseIPv4("0.0.0.0"), 0);
  assert.equal(parseIPv4("255.255.255.255"), 0xffffffff);
  for (const bad of ["1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "1.2.3.4 ", "", "::1"]) assert.equal(parseIPv4(bad), null, bad);
});

test("IPv6 parses compressed forms and dotted tails", () => {
  assert.equal(parseIPv6("::1"), 1n);
  assert.equal(parseIPv6("::"), 0n);
  assert.equal(parseIPv6("2001:db8::1"), 0x20010db8000000000000000000000001n);
  assert.equal(parseIPv6("::ffff:8.8.8.8"), 0xffff08080808n);
  assert.equal(parseIPv6("64:ff9b::93.184.216.34"), (0x64ff9bn << 96n) | 0x5db8d822n);
  assert.equal(parseIPv6("1:2:3:4:5:6:7:8"), 0x00010002000300040005000600070008n);
  for (const bad of ["fe80::1%en0", "1::2::3", "1:2:3:4:5:6:7:8:9", "1:2:3:4:5:6:7", "::ffff:1.2.3.4.5", "g::1", "12345::1"]) assert.equal(parseIPv6(bad), null, bad);
});

test("the public check refuses every listed range and accepts their neighbours", () => {
  const refused = [
    "0.1.2.3", "10.1.2.3", "100.64.0.1", "100.127.255.255", "127.0.0.1", "127.255.255.254", "169.254.169.254", "172.16.0.1", "172.31.255.255",
    "192.0.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1", "198.19.255.255", "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "2001::1", "2001:1ff::1", "2001:db8::1", "2002:c000:204::1", "1::1", "1fff:ffff::1", "4000::1",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:192.168.0.1", "64:ff9b::7f00:1", "64:ff9b::10.0.0.1",
  ];
  for (const a of refused) assert.equal(isPublic(a), false, a);
  const accepted = [
    "93.184.216.34", "8.8.8.8", "1.1.1.1", "100.128.0.1", "172.32.0.0", "172.15.255.255", "192.0.1.1", "192.0.3.1", "198.17.255.255", "198.20.0.1", "223.255.255.255",
    "2606:4700::1111", "2001:4860:4860::8888", "2001:200::1", "2001:db9::1", "2003::1", "2000::1", "3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "::ffff:8.8.8.8", "::ffff:93.184.216.34", "64:ff9b::5db8:d822", "64:ff9b::8.8.8.8",
  ];
  for (const a of accepted) assert.equal(isPublic(a), true, a);
  for (const bad of ["fe80::1%en0", "1.2.3.4.5", "01.2.3.4", "", "example.com"]) assert.equal(isPublic(bad), false, bad);
});

test("loopback is 127/8 and ::1", () => {
  assert.equal(isLoopback("127.0.0.1"), true);
  assert.equal(isLoopback("127.1.2.3"), true);
  assert.equal(isLoopback("::1"), true);
  for (const a of ["128.0.0.1", "::2", "::ffff:127.0.0.1", "10.0.0.1", "nope"]) assert.equal(isLoopback(a), false, a);
});
```

(2000::/3 runs from 2000:: to 3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff, so `1fff:ffff::1` and `4000::1` are the two neighbours outside it.)

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/ip.test.ts`
Expected: FAIL, cannot find module `../src/ip.ts`.

- [ ] **Step 3: Write `src/limits.ts`**

```ts
/** Every limit of docs/design.md, in one place. The numbers are the design's proposals; the rows are what must exist. */

/** One run's limits: the walk's and get's column of the table in "Fetching safely". The catalog build's column arrives with the second epic. */
export type Limits = {
  requestMs: number;              // one request, from before name resolution to the last byte
  fileBytes: number;              // one fetched file
  definitionsPerSource: number;   // taken in SAID order
  introductionsPerSource: number; // taken in address order
  introductionDepth: number;      // depth of introductions from the starting source
  sourcesPerRun: number;
  hostMs: number;                 // one host, all its sources and requests
  hostBytes: number;              // bytes read from one host
  hostsInFlight: number;          // one request at a time per host
  runMs: number | null;           // the whole run; null means no clock
};

export const WALK: Limits = {
  requestMs: 10_000,
  fileBytes: 1_000_000,
  definitionsPerSource: 50,
  introductionsPerSource: 10,
  introductionDepth: 3,
  sourcesPerRun: 50,
  hostMs: 60_000,
  hostBytes: 20_000_000,
  hostsInFlight: 8,
  runMs: 120_000,
};

/** A source document or a definition, as a file: the build refuses to write a larger one and a reader refuses to read one. */
export const FILE_BYTES = 1_000_000;

/** JSON Pointer paths reported for one definition, and the nesting depth beyond which nothing is parsed. */
export const PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 } as const;

/** A publication's fields. */
export const PUBLICATION = { name: 200, description: 2000, tags: 32, tag: 64, collection: 200 } as const;
```

- [ ] **Step 4: Point the step 1 modules at it**

In `src/scan.ts`: delete the line `export const PATH_LIMITS = ...` and add `import { PATH_LIMITS } from "./limits.ts";`. In `src/source.ts`: delete the `LIMITS` constant and add `import { PUBLICATION } from "./limits.ts";`, replacing `LIMITS.name`, `LIMITS.description`, `LIMITS.collection`, `LIMITS.tags`, `LIMITS.tag` with `PUBLICATION.*`. In `src/inputs.ts`: replace `import { LIMITS } from "./source.ts"` with `import { FILE_BYTES } from "./limits.ts";`. In `src/build.ts`: change the `source.ts` import to `import type { ServesEntry, SourceDocument } from "./source.ts";` and add `import { FILE_BYTES } from "./limits.ts";`. In both, `LIMITS.file` becomes `FILE_BYTES`. In `tests/scan.test.ts`: import `PATH_LIMITS` from `../src/limits.ts` instead of `../src/scan.ts`.

- [ ] **Step 5: Write `src/ip.ts`**

```ts
/** The address check of docs/design.md "Fetching safely": which resolved addresses the routine may connect to. */

/** Dotted IPv4 to its 32-bit value, or null: exactly four decimal octets, no leading zero beyond "0" itself. */
export function parseIPv4(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (m === null) return null;
  let v = 0;
  for (let i = 1; i <= 4; i++) {
    const text = m[i]!;
    const o = Number(text);
    if (o > 255 || (text.length > 1 && text.startsWith("0"))) return null;
    v = v * 256 + o;
  }
  return v;
}

/** IPv6 text (with :: compression and an optional dotted IPv4 tail) to its 128-bit value, or null. No zone id. */
export function parseIPv6(s: string): bigint | null {
  if (s.includes("%")) return null;
  let text = s;
  const lastColon = text.lastIndexOf(":");
  if (lastColon >= 0 && text.includes(".", lastColon)) {
    const tail = parseIPv4(text.slice(lastColon + 1));
    if (tail === null) return null;
    text = `${text.slice(0, lastColon + 1)}${(tail >>> 16).toString(16)}:${(tail & 0xffff).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    for (const g of part.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = groups(halves[0]!);
  const rest = halves.length === 2 ? groups(halves[1]!) : [];
  if (head === null || rest === null) return null;
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  let v = 0n;
  for (const g of [...head, ...new Array<number>(missing).fill(0), ...rest]) v = (v << 16n) | BigInt(g);
  return v;
}

// this-network, private, carrier-grade NAT, loopback, link-local, protocol assignment, documentation, benchmarking, multicast, reserved and broadcast
const V4_REFUSED: [number, number][] = ([
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as [string, number][]).map(([base, bits]) => [parseIPv4(base)!, bits]);

const inV4 = (v: number, base: number, bits: number): boolean => (v >>> (32 - bits)) === (base >>> (32 - bits));
const inV6 = (v: bigint, prefix: string, bits: number): boolean => (v >> BigInt(128 - bits)) === (parseIPv6(prefix)! >> BigInt(128 - bits));

function isPublicIPv4(v: number): boolean {
  return !V4_REFUSED.some(([base, bits]) => inV4(v, base, bits));
}

/** True when the routine may connect to this address outside tests. Anything that does not parse is not public. */
export function isPublic(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4 !== null) return isPublicIPv4(v4);
  const v6 = parseIPv6(address);
  if (v6 === null) return false;
  // An IPv4 address carried inside IPv6 is judged by the IPv4 list, so IPv6-only readers still reach IPv4-only sources.
  if (inV6(v6, "::ffff:0:0", 96) || inV6(v6, "64:ff9b::", 96)) return isPublicIPv4(Number(v6 & 0xffffffffn));
  return inV6(v6, "2000::", 3) && !inV6(v6, "2001::", 23) && !inV6(v6, "2001:db8::", 32) && !inV6(v6, "2002::", 16);
}

/** 127/8 and ::1: what test code alone may connect to. */
export function isLoopback(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4 !== null) return inV4(v4, parseIPv4("127.0.0.0")!, 8);
  return parseIPv6(address) === 1n;
}
```

- [ ] **Step 6: Run the checks and the tests**

Run: `npm run check && npm test`
Expected: the type check passes; every test passes (48 from step 1 plus 4 here).

- [ ] **Step 7: Commit**

```bash
git add src/limits.ts src/ip.ts tests/ip.test.ts src/scan.ts src/source.ts src/inputs.ts src/build.ts tests/scan.test.ts
git commit -m "feat: the limits in one module, and the public-address check (<bead id>)"
```

---

### Task 2: The fetch routine

**Files:**
- Create: `src/fetch.ts`, `tests/fetch.test.ts`, `tests/helpers/servers.ts`, `tests/helpers/fetch-child.ts`, `fixtures/tls/cert.pem`, `fixtures/tls/key.pem`
- Modify: `fixtures/README.md` (the TLS fixture's provenance)

**Interfaces:**
- Consumes: `parseHttpsAddress(s, opts)` and `AddressOptions` from `src/address.ts`; `isPublic`, `isLoopback`, `parseIPv4` from `src/ip.ts`.
- Produces: in `src/fetch.ts`: `USER_AGENT: string`; `type Outcome = "ok" | "truncated" | "not-found" | "unreachable" | "timed-out" | "redirected" | "refused-address" | "disallowed" | "invalid" | "skipped"`; `type Fetched = { outcome: "ok"; bytes: Uint8Array; read: number; ms: number } | { outcome: "redirected"; target: string | null; read: number; ms: number } | { outcome: "not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid"; read: number; ms: number }`; `type Resolve = (hostname: string, timeoutMs: number) => Promise<string[]>`; `type FetchOptions = AddressOptions & { timeoutMs: number; maxBytes: number; resolve?: Resolve; now?: () => number }`; `resolveNames: Resolve` (the c-ares default); `fetchJson(address: string, opts: FetchOptions): Promise<Fetched>`. In `tests/helpers/servers.ts`: `class Origin` with `static start(): Promise<Origin>`, `origin: string` (`http://127.0.0.1:<port>`), `files: Map<string, Uint8Array>` (path without leading slash), `requests: string[]`, `behave: ((req, res) => boolean) | null`, `put(path, bytes | string)`, `close(): Promise<void>`. (Task 5 adds `source()`.)

**Acceptance Criteria:**
- Against a local origin in test mode: a 200 `application/json` body comes back `ok` with the exact bytes and `read` equal to their length; `application/schema+json` is accepted; `text/plain` and `text/json` are `invalid`; 404 and 410 are `not-found`; 500 and 503 are `unreachable`; 301 and 307 are `redirected` with the `Location` as `target`; 403 is `invalid`; `Content-Encoding: gzip` is `invalid`; a body over `maxBytes` is `invalid` while a body of exactly `maxBytes` is `ok`; a body that arrives one byte at a time is `timed-out` at the request limit; a server that accepts and never answers is `timed-out`; a closed port is `unreachable`.
- The address rule is applied: `https://1.2.3.4/x.json` and `https://localhost/x.json` are `refused-address` with no resolver call; `http://` outside test mode is `refused-address`.
- Resolution: the name is resolved exactly once per request through the `resolve` given; when any answer is not public (outside test) the outcome is `refused-address` and the server sees no request; when the resolver never answers the outcome is `timed-out` at the limit; when the resolver rejects, `unreachable`; the socket connects to the first checked answer: under test, `a.test` resolved to `127.0.0.1` reaches the local server, and a second answer of `203.0.113.1` is never consulted.
- A child process with `NODE_USE_ENV_PROXY=1` and `HTTP_PROXY`/`HTTPS_PROXY` set to a closed port reaches the local server through `fetchJson` and fails through `http.globalAgent`.
- Every request carries `accept-encoding: identity`, `user-agent: mad-discovery (+https://github.com/seriouscoderone/mad-discovery)`, no `cookie` and no `referer`.
- A certificate no authority signed is `unreachable`, and stays `unreachable` in a child process started with `NODE_TLS_REJECT_UNAUTHORIZED=0`, while the control, a plain `https.request` with the option left to its default, succeeds in that child: the explicit `rejectUnauthorized: true` wins over the environment (checked on this machine: Node takes the variable only as the default). No test trusts a certificate authority of ours; there is no positive TLS case by design.

- [ ] **Step 0: Make the TLS fixture, once**

```bash
mkdir -p fixtures/tls
openssl req -x509 -newkey rsa:2048 -nodes -keyout fixtures/tls/key.pem -out fixtures/tls/cert.pem -days 36500 -subj "/CN=mad-discovery test" -addext "subjectAltName=IP:127.0.0.1"
```

Add to `fixtures/README.md`, as a new list item: "`tls/cert.pem`, `tls/key.pem`: a self-signed certificate for 127.0.0.1, made once with `openssl req -x509 -newkey rsa:2048 -nodes -days 36500 -subj "/CN=mad-discovery test" -addext "subjectAltName=IP:127.0.0.1"`. Nothing trusts it: the tests use it to show that the fetch routine refuses a certificate no authority signed, with or without `NODE_TLS_REJECT_UNAUTHORIZED=0` in the environment. The private key is public by design and protects nothing." `.gitattributes` already covers `fixtures/**`.

- [ ] **Step 1: Write the test server helper**

`tests/helpers/servers.ts`:

```ts
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createServer as createSecureServer, type Server as SecureServer } from "node:https";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";

const TLS = (file: string) => new URL(`../../fixtures/tls/${file}`, import.meta.url);

const TYPES: Record<string, string> = { ".json": "application/json", ".html": "text/html; charset=utf-8", ".css": "text/css", ".xml": "application/xml" };

/** A local origin: one http server on 127.0.0.1 serving a map of files, with a hook for hostile answers. Test code only. */
export class Origin {
  readonly files = new Map<string, Uint8Array>();
  readonly requests: string[] = [];
  /** Answers the request itself and returns true, or returns false to let the file map answer. */
  behave: ((req: IncomingMessage, res: ServerResponse) => boolean) | null = null;
  readonly server: Server | SecureServer;
  readonly origin: string;
  // Not parameter properties: erasableSyntaxOnly and Node's strip-only mode both refuse those.
  private constructor(server: Server | SecureServer, origin: string) {
    this.server = server;
    this.origin = origin;
  }

  /** Plain http by default; secure serves the self-signed fixture, which nothing trusts, for the tests that expect a refusal. */
  static async start(secure = false): Promise<Origin> {
    const server = secure ? createSecureServer({ cert: readFileSync(TLS("cert.pem")), key: readFileSync(TLS("key.pem")) }) : createServer();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    const o = new Origin(server, `${secure ? "https" : "http"}://127.0.0.1:${port}`);
    server.on("request", (req, res) => o.answer(req, res));
    return o;
  }

  private answer(req: IncomingMessage, res: ServerResponse): void {
    const path = (req.url ?? "/").slice(1);
    this.requests.push(path);
    if (this.behave !== null && this.behave(req, res)) return;
    const bytes = this.files.get(path);
    if (bytes === undefined) { res.statusCode = 404; res.end(); return; }
    res.setHeader("content-type", TYPES[path.slice(path.lastIndexOf("."))] ?? "application/octet-stream");
    res.end(Buffer.from(bytes));
  }

  put(path: string, bytes: Uint8Array | string): void {
    this.files.set(path, typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes);
  }

  async close(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((r) => this.server.close(() => r()));
  }
}
```

- [ ] **Step 2: Write the failing tests**

`tests/fetch.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { fetchJson, USER_AGENT, type Resolve } from "../src/fetch.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const body = new TextEncoder().encode('{"a":1}');
origin.put("x.json", body);
const url = (path: string) => `${origin.origin}/${path}`;
const quick = { test: true, timeoutMs: 2000, maxBytes: 1_000_000 };
const fetchLocal = (path: string, more: Partial<Parameters<typeof fetchJson>[1]> = {}) => fetchJson(url(path), { ...quick, ...more });

test("a JSON answer comes back as its bytes, with what was read", async () => {
  const r = await fetchLocal("x.json");
  assert.equal(r.outcome, "ok");
  if (r.outcome === "ok") { assert.deepEqual(r.bytes, body); assert.equal(r.read, body.length); assert.ok(r.ms >= 0); }
});

test("content types: application/json and +json pass, others are invalid", async () => {
  for (const [type, expected] of [["application/schema+json", "ok"], ["Application/JSON; charset=utf-8", "ok"], ["text/plain", "invalid"], ["text/json", "invalid"], ["application/octet-stream", "invalid"]] as const) {
    origin.behave = (_req, res) => { res.setHeader("content-type", type); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, expected, type);
  }
  origin.behave = null;
});

test("status codes map to outcomes", async () => {
  for (const [status, expected] of [[404, "not-found"], [410, "not-found"], [500, "unreachable"], [503, "unreachable"], [403, "invalid"], [401, "invalid"], [204, "invalid"]] as const) {
    origin.behave = (_req, res) => { res.statusCode = status; res.setHeader("content-type", "application/json"); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, expected, String(status));
  }
  origin.behave = null;
});

test("a redirect is not followed and names its target", async () => {
  for (const status of [301, 302, 307, 308]) {
    origin.behave = (_req, res) => { res.statusCode = status; res.setHeader("location", "http://elsewhere.test/y.json"); res.end(); return true; };
    const r = await fetchLocal("x.json");
    assert.equal(r.outcome, "redirected");
    if (r.outcome === "redirected") assert.equal(r.target, "http://elsewhere.test/y.json");
  }
  origin.behave = (_req, res) => { res.statusCode = 302; res.end(); return true; };
  const r = await fetchLocal("x.json");
  assert.equal(r.outcome, "redirected");
  if (r.outcome === "redirected") assert.equal(r.target, null);
  origin.behave = null;
  assert.ok(!origin.requests.includes("y.json"));
});

test("a content encoding is refused; identity names none and passes", async () => {
  for (const encoding of ["gzip", "br", "deflate", "identity, gzip"]) {
    origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.setHeader("content-encoding", encoding); res.end("{}"); return true; };
    assert.equal((await fetchLocal("x.json")).outcome, "invalid", encoding);
  }
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.setHeader("content-encoding", "identity"); res.end("{}"); return true; };
  assert.equal((await fetchLocal("x.json")).outcome, "ok");
  origin.behave = null;
});

test("the size limit is enforced while reading", async () => {
  const big = new Uint8Array(1000).fill(0x20);
  origin.put("big.json", big);
  assert.equal((await fetchLocal("big.json", { maxBytes: 1000 })).outcome, "ok");
  const r = await fetchLocal("big.json", { maxBytes: 999 });
  assert.equal(r.outcome, "invalid");
  assert.ok(r.read >= 1000, "what was read is counted even when refused");
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.write("x".repeat(300)); res.write("x".repeat(300)); res.end(); return true; };
  assert.equal((await fetchLocal("x.json", { maxBytes: 100 })).outcome, "invalid", "chunked, no stated length: cut while reading");
  origin.behave = null;
});

test("a slow body and a silent server time out at the request limit", async () => {
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); res.write("["); const t = setInterval(() => res.write("1,"), 100); res.on("close", () => clearInterval(t)); return true; };
  const t0 = performance.now();
  const r = await fetchLocal("x.json", { timeoutMs: 300 });
  assert.equal(r.outcome, "timed-out");
  assert.ok(performance.now() - t0 < 2000);
  origin.behave = (_req, _res) => true;   // accepts and never answers
  assert.equal((await fetchLocal("x.json", { timeoutMs: 300 })).outcome, "timed-out");
  origin.behave = null;
});

test("a closed port is unreachable", async () => {
  const dead = await Origin.start();
  const address = `${dead.origin}/x.json`;
  await dead.close();
  assert.equal((await fetchJson(address, quick)).outcome, "unreachable");
});

test("the address rule is applied before anything is resolved", async () => {
  const calls: string[] = [];
  const resolve: Resolve = async (h) => { calls.push(h); return ["93.184.216.34"]; };
  for (const bad of ["https://1.2.3.4/x.json", "https://localhost/x.json", "https://a.test:8443/x.json", "https://a.test/x.json?q", "ftp://a.test/x.json"]) {
    assert.equal((await fetchJson(bad, { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", bad);
  }
  assert.equal((await fetchJson(url("x.json"), { timeoutMs: 1000, maxBytes: 1000, resolve })).outcome, "refused-address", "plain http outside tests");
  assert.deepEqual(calls, []);
});

test("the name is resolved once and the socket gets the checked answer", async () => {
  const port = new URL(origin.origin).port;
  const answers = [["127.0.0.1"], ["203.0.113.1"]];
  const calls: string[] = [];
  const resolve: Resolve = async (h) => { calls.push(h); return answers.shift()!; };
  const before = origin.requests.length;
  const r = await fetchJson(`http://a.test:${port}/x.json`, { ...quick, resolve });
  assert.equal(r.outcome, "ok", "a.test resolves nowhere; only the injected answer could have reached the server");
  assert.deepEqual(calls, ["a.test"]);
  assert.equal(answers.length, 1, "the second answer was never asked for");
  assert.equal(origin.requests.length, before + 1);
});

test("an answer that is not public is refused without a connection", async () => {
  const before = origin.requests.length;
  for (const answers of [["127.0.0.1"], ["93.184.216.34", "10.0.0.1"], ["::1"], []]) {
    const r = await fetchJson("https://a.test/x.json", { timeoutMs: 1000, maxBytes: 1000, resolve: async () => answers });
    assert.equal(r.outcome, "refused-address", JSON.stringify(answers));
  }
  assert.equal(origin.requests.length, before);
});

test("a resolver that never answers times out; one that rejects is unreachable", async () => {
  const never: Resolve = () => new Promise(() => {});
  const t0 = performance.now();
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: never })).outcome, "timed-out");
  assert.ok(performance.now() - t0 < 2000);
  const rejects: Resolve = async () => { throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }); };
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: rejects })).outcome, "unreachable");
  const cancelled: Resolve = async () => { throw Object.assign(new Error("ECANCELLED"), { code: "ECANCELLED" }); };
  assert.equal((await fetchJson("https://a.test/x.json", { timeoutMs: 300, maxBytes: 1000, resolve: cancelled })).outcome, "timed-out");
});

test("requests carry the tool's name, ask for no encoding, and send no cookie or referer", async () => {
  let seen: Record<string, string | string[] | undefined> = {};
  origin.behave = (req, res) => { seen = req.headers; res.setHeader("content-type", "application/json"); res.end("{}"); return true; };
  await fetchLocal("x.json");
  origin.behave = null;
  assert.equal(seen["user-agent"], USER_AGENT);
  assert.equal(USER_AGENT, "mad-discovery (+https://github.com/seriouscoderone/mad-discovery)");
  assert.equal(seen["accept-encoding"], "identity");
  assert.equal(seen["cookie"], undefined);
  assert.equal(seen["referer"], undefined);
});

test("proxy settings in the environment are ignored by the routine and obeyed by the global agent", async () => {
  const child = fileURLToPath(new URL("./helpers/fetch-child.ts", import.meta.url));
  const env = { ...process.env, NODE_USE_ENV_PROXY: "1", HTTP_PROXY: "http://127.0.0.1:9", HTTPS_PROXY: "http://127.0.0.1:9", http_proxy: "http://127.0.0.1:9", https_proxy: "http://127.0.0.1:9" };
  const port = new URL(origin.origin).port;
  const run = async (mode: string) => JSON.parse((await promisify(execFile)(process.execPath, [child, mode, `http://a.test:${port}/x.json`], { env })).stdout) as { outcome: string };
  assert.equal((await run("routine")).outcome, "ok");
  assert.equal((await run("global")).outcome, "error", "the control: the global agent went to the proxy and failed");
});

test("a certificate no authority signed is unreachable, and the environment cannot turn the check off", async () => {
  const secure = await Origin.start(true);
  try {
    secure.put("x.json", "{}");
    const address = `${secure.origin}/x.json`;
    assert.equal((await fetchJson(address, quick)).outcome, "unreachable", "self-signed: refused");
    const child = fileURLToPath(new URL("./helpers/fetch-child.ts", import.meta.url));
    const env = { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" };
    const run = async (mode: string) => JSON.parse((await promisify(execFile)(process.execPath, [child, mode, address], { env })).stdout) as { outcome: string };
    assert.equal((await run("lax")).outcome, "ok", "the control: with the option left to its default, the variable turns the check off");
    assert.equal((await run("routine")).outcome, "unreachable", "the routine's explicit rejectUnauthorized: true wins over the variable");
  } finally { await secure.close(); }
});
```

`tests/helpers/fetch-child.ts`:

```ts
// Runs in a child process so that NODE_USE_ENV_PROXY and NODE_TLS_REJECT_UNAUTHORIZED, read at startup, are in force.
// "routine" uses fetchJson; "global" (the proxy control) and "lax" (the TLS control) show the environment did take effect.
import http from "node:http";
import https from "node:https";
import { fetchJson } from "../../src/fetch.ts";

const [mode, address] = process.argv.slice(2) as [string, string];
if (mode === "routine") {
  const r = await fetchJson(address, { test: true, timeoutMs: 3000, maxBytes: 1_000_000, resolve: async () => ["127.0.0.1"] });
  process.stdout.write(JSON.stringify({ outcome: r.outcome }));
} else if (mode === "lax") {
  // The TLS control: a plain https request with rejectUnauthorized left to its default, which NODE_TLS_REJECT_UNAUTHORIZED=0 turns off.
  const url = new URL(address);
  const outcome = await new Promise<string>((resolve) => {
    const req = https.request({ hostname: url.hostname, port: url.port, path: url.pathname, agent: new https.Agent({ keepAlive: false }) }, (res) => { res.resume(); res.on("end", () => resolve("ok")); });
    req.on("error", () => resolve("error"));
    req.end();
  });
  process.stdout.write(JSON.stringify({ outcome }));
} else {
  const url = new URL(address);
  const outcome = await new Promise<string>((resolve) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, agent: http.globalAgent, lookup: (_h, _o, cb) => cb(null, [{ address: "127.0.0.1", family: 4 }]) }, (res) => { res.resume(); res.on("end", () => resolve("ok")); });
    req.on("error", () => resolve("error"));
    req.setTimeout(3000, () => { req.destroy(); resolve("error"); });
    req.end();
  });
  process.stdout.write(JSON.stringify({ outcome }));
}
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/fetch.test.ts`
Expected: FAIL, cannot find module `../src/fetch.ts`.

- [ ] **Step 4: Write `src/fetch.ts`**

```ts
import http from "node:http";
import https from "node:https";
import { Resolver } from "node:dns/promises";
import { parseHttpsAddress, type AddressOptions } from "./address.ts";
import { isLoopback, isPublic, parseIPv4 } from "./ip.ts";

export const USER_AGENT = "mad-discovery (+https://github.com/seriouscoderone/mad-discovery)";

/** The fixed list of docs/design.md "Outcomes". disallowed is the catalog build's and skipped is the scheduler's; neither is produced here. */
export type Outcome = "ok" | "truncated" | "not-found" | "unreachable" | "timed-out" | "redirected" | "refused-address" | "disallowed" | "invalid" | "skipped";

/** What one request ended in. read and ms are charged to the host whatever the outcome. */
export type Fetched =
  | { outcome: "ok"; bytes: Uint8Array; read: number; ms: number }
  | { outcome: "redirected"; target: string | null; read: number; ms: number }
  | { outcome: "not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid"; read: number; ms: number };

/** Every address a name resolves to, IPv4 and IPv6 together; rejects when there is none or no answer in time. */
export type Resolve = (hostname: string, timeoutMs: number) => Promise<string[]>;

export type FetchOptions = AddressOptions & {
  timeoutMs: number;   // from before name resolution to the last byte
  maxBytes: number;    // a longer body is refused while it is read
  resolve?: Resolve;   // tests inject one; the default is resolveNames
  now?: () => number;  // tests inject a clock
};

/** c-ares through node:dns/promises, cancelled at the deadline: unlike dns.lookup its queries can be timed out and abandoned. */
export const resolveNames: Resolve = async (hostname, timeoutMs) => {
  const resolver = new Resolver({ timeout: Math.max(1, Math.ceil(timeoutMs)), tries: 1 });
  const timer = setTimeout(() => resolver.cancel(), timeoutMs);
  try {
    const [v4, v6] = await Promise.allSettled([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
    const addresses = [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
    if (addresses.length === 0) throw v4.status === "rejected" ? v4.reason : (v6 as PromiseRejectedResult).reason;
    return addresses;
  } finally {
    clearTimeout(timer);
  }
};

const httpsAgent = new https.Agent({ keepAlive: false });
const httpAgent = new http.Agent({ keepAlive: false });

function isJsonType(header: string | undefined): boolean {
  if (header === undefined) return false;
  const type = header.split(";")[0]!.trim().toLowerCase();
  return type === "application/json" || type.endsWith("+json");
}

function isTimeout(e: unknown): boolean {
  const code = (e as { code?: unknown }).code;
  return code === "ECANCELLED" || code === "ETIMEOUT";
}

type Ending =
  | { outcome: "ok"; bytes: Uint8Array }
  | { outcome: "redirected"; target: string | null }
  | { outcome: "not-found" | "unreachable" | "timed-out" | "refused-address" | "invalid" };

/**
 * The one fetch routine of docs/design.md "Fetching safely". The address rule first; then the name is resolved once and every
 * answer checked; then the socket is told the one address it may connect to; no redirect is followed, no encoding accepted,
 * and the body is cut at maxBytes while it arrives. One deadline covers all of it.
 */
export function fetchJson(address: string, opts: FetchOptions): Promise<Fetched> {
  const now = opts.now ?? (() => performance.now());
  const start = now();
  let read = 0;
  return new Promise<Fetched>((done) => {
    let settled = false;
    let req: http.ClientRequest | null = null;
    const finish = (ending: Ending): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req?.destroy();
      done({ ...ending, read, ms: now() - start } as Fetched);
    };
    const timer = setTimeout(() => finish({ outcome: "timed-out" }), opts.timeoutMs);

    const href = parseHttpsAddress(address, opts);
    if (href === null) { finish({ outcome: "refused-address" }); return; }
    const url = new URL(href);
    const test = opts.test === true;
    const secure = url.protocol === "https:";

    void (async () => {
      // The address rule admits an IP literal only under test, and only loopback; a name is resolved once, here.
      const literal = parseIPv4(url.hostname) !== null || url.hostname.startsWith("[");
      let target: string;
      if (literal) {
        target = url.hostname.replace(/^\[|\]$/g, "");
      } else {
        let answers: string[];
        try {
          answers = await (opts.resolve ?? resolveNames)(url.hostname, Math.max(1, opts.timeoutMs - (now() - start)));
        } catch (e) {
          finish({ outcome: isTimeout(e) ? "timed-out" : "unreachable" });
          return;
        }
        if (settled) return;
        if (answers.length === 0 || !answers.every((a) => isPublic(a) || (test && isLoopback(a)))) { finish({ outcome: "refused-address" }); return; }
        target = answers[0]!;
      }
      const family = parseIPv4(target) !== null ? 4 : 6;
      // What the socket is told instead of a lookup: the one address that was checked. Node asks with all: true.
      const lookup: NonNullable<http.RequestOptions["lookup"]> = (_hostname, options, callback) => {
        if (options.all) callback(null, [{ address: target, family }]); else callback(null, target, family);
      };
      const options: https.RequestOptions = {
        hostname: literal ? target : url.hostname,
        port: url.port === "" ? (secure ? 443 : 80) : Number(url.port),
        path: url.pathname,
        method: "GET",
        agent: secure ? httpsAgent : httpAgent,
        lookup,
        rejectUnauthorized: true,
        headers: { accept: "application/json", "accept-encoding": "identity", "user-agent": USER_AGENT },
      };
      const onResponse = (res: http.IncomingMessage): void => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          const location = res.headers.location;
          finish({ outcome: "redirected", target: typeof location === "string" ? location.slice(0, 512) : null });
          return;
        }
        if (status === 404 || status === 410) { finish({ outcome: "not-found" }); return; }
        if (status >= 500) { finish({ outcome: "unreachable" }); return; }
        if (status !== 200) { finish({ outcome: "invalid" }); return; }
        const encoding = res.headers["content-encoding"];
        if (encoding !== undefined && encoding.toLowerCase() !== "identity") { finish({ outcome: "invalid" }); return; }
        if (!isJsonType(res.headers["content-type"])) { finish({ outcome: "invalid" }); return; }
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          read += chunk.length;
          if (read > opts.maxBytes) { finish({ outcome: "invalid" }); return; }
          chunks.push(chunk);
        });
        res.on("end", () => finish({ outcome: "ok", bytes: new Uint8Array(Buffer.concat(chunks)) }));
        res.on("error", () => finish({ outcome: "unreachable" }));
      };
      req = secure ? https.request(options, onResponse) : http.request(options, onResponse);
      req.on("error", () => finish({ outcome: "unreachable" }));
      req.end();
    })().catch(() => finish({ outcome: "unreachable" }));
  });
}
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npm run check && node --test tests/fetch.test.ts`
Expected: the type check passes; all fetch tests pass, each in well under its limit. If `lookup`'s type does not accept the two callback shapes, read `@types/node`'s `LookupFunction` in `node_modules/@types/node/net.d.ts` and adapt the two `callback` calls to it rather than casting away the check.

- [ ] **Step 6: Run the whole suite, then commit**

Run: `npm test`
Expected: all pass.

```bash
git add src/fetch.ts tests/fetch.test.ts tests/helpers/servers.ts tests/helpers/fetch-child.ts fixtures/tls/cert.pem fixtures/tls/key.pem fixtures/README.md
git commit -m "feat: the fetch routine: resolve once, check, connect to the checked address, named outcomes (<bead id>)"
```

---

### Task 3: Reading a fetched source document

**Files:**
- Create: `src/document.ts`, `tests/document.test.ts`

**Interfaces:**
- Consumes: `parseBounded` from `src/scan.ts`; `isSaid` from `src/said.ts`; `parseSourceAddress`, `parseCatalogAddress`, `parseHttpsAddress`, `AddressOptions` from `src/address.ts`; `AID_PATTERN`, `isRecord`, `validatePublication`, types `Introduction`, `Publication`, `ServesEntry`, `SourceDocument` from `src/source.ts`.
- Produces: `type Dropped = { entries: number; publications: number }`; `type ReadDocument = { ok: true; document: SourceDocument; dropped: Dropped } | { ok: false }`; `readSourceDocument(bytes: Uint8Array, address: string, opts?: AddressOptions): ReadDocument`.

**Acceptance Criteria:**
- A document `build` wrote reads back equal to the plan's document (members, order within `serves` and `introductions` sorted), with zero drops.
- `source` not equal to the fetched address, not JSON, a top-level array, nesting of 100,000 brackets, and a known member of the wrong type (`serves` as an object, `pages` as a string, `by` as a number) each give `{ ok: false }`, the deep one without a stack overflow.
- Unknown members, including `__proto__` and `constructor` written into the JSON text, are ignored and leave `Object.prototype` untouched; an unknown member inside a publication is ignored too (the configuration's refusal of unknown members is the operator's rule, not a stranger's).
- Entries that fail are dropped and counted: a `said` of `../../x`, a `refers` item that is not a SAID, a duplicate `serves` entry, an introduction whose `source` is an IP literal or has a query, a `for` item that is not a SAID, a catalog address ending in `source.json`, a `by` that is 65 characters, an `oobi` that is `http:`; the rest of the document is read.
- A publication with a 100,000-character description, and one with `\u001b[31m` in its name, are dropped and counted as publications; the others stand.
- Defaults: a document with only `source` reads as `pages: false` and four empty lists.

- [ ] **Step 1: Write the failing tests**

`tests/document.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/document.test.ts`
Expected: FAIL, cannot find module `../src/document.ts`.

- [ ] **Step 3: Write `src/document.ts`**

```ts
import { isSaid } from "./said.ts";
import { parseBounded } from "./scan.ts";
import { parseSourceAddress, parseCatalogAddress, parseHttpsAddress, type AddressOptions } from "./address.ts";
import { AID_PATTERN, isRecord, validatePublication, type Introduction, type Publication, type ServesEntry, type SourceDocument } from "./source.ts";

export type Dropped = { entries: number; publications: number };
export type ReadDocument = { ok: true; document: SourceDocument; dropped: Dropped } | { ok: false };

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const PUBLICATION_MEMBERS = new Set(["target", "by", "name", "description", "tags", "collection"]);

/**
 * A fetched source document, read as docs/design.md "A source" says: `source` must equal the address it was fetched from, a known
 * member of the wrong type discards the document, an unknown member is ignored, an entry whose SAID or address fails its rule is
 * dropped and counted, and a publication that breaks a limit is dropped and counted. Lists come out sorted and without duplicates.
 */
export function readSourceDocument(bytes: Uint8Array, address: string, opts: AddressOptions = {}): ReadDocument {
  const parsed = parseBounded(bytes);
  if (!parsed.ok || !isRecord(parsed.value)) return { ok: false };
  const r = parsed.value;
  if (r["source"] !== address) return { ok: false };
  const typed = (k: string, ok: (v: unknown) => boolean): boolean => r[k] === undefined || ok(r[k]);
  const isString = (v: unknown): boolean => typeof v === "string";
  if (!typed("by", isString) || !typed("oobi", isString) || !typed("pages", (v) => typeof v === "boolean")
    || !typed("serves", Array.isArray) || !typed("publications", Array.isArray) || !typed("introductions", Array.isArray) || !typed("catalogs", Array.isArray)) return { ok: false };

  const dropped: Dropped = { entries: 0, publications: 0 };
  const list = (k: string): unknown[] => (r[k] as unknown[] | undefined) ?? [];

  const serves = new Map<string, ServesEntry>();
  for (const item of list("serves")) {
    if (!isRecord(item)) { dropped.entries++; continue; }
    const said = item["said"];
    if (typeof said !== "string" || !isSaid(said) || serves.has(said)) { dropped.entries++; continue; }
    const refersRaw = item["refers"] ?? [];
    if (!Array.isArray(refersRaw)) { dropped.entries++; continue; }
    const refers = new Set<string>();
    for (const s of refersRaw) { if (typeof s === "string" && isSaid(s) && s !== said) refers.add(s); else dropped.entries++; }
    serves.set(said, { said, refers: [...refers].sort(byString) });
  }

  // A reader ignores a member it does not know, inside a publication too; the configuration's strictness is the operator's, not a stranger's.
  const publications: Publication[] = [];
  for (const item of list("publications")) {
    const known = isRecord(item) ? Object.fromEntries(Object.entries(item).filter(([k]) => PUBLICATION_MEMBERS.has(k))) : item;
    const v = validatePublication(known);
    if (v.ok) publications.push(v.publication); else dropped.publications++;
  }

  const introductions = new Map<string, Introduction>();
  for (const item of list("introductions")) {
    if (!isRecord(item)) { dropped.entries++; continue; }
    const addr = typeof item["source"] === "string" ? parseSourceAddress(item["source"], opts) : null;
    if (addr === null || introductions.has(addr.address)) { dropped.entries++; continue; }
    const forRaw = item["for"] ?? [];
    if (!Array.isArray(forRaw)) { dropped.entries++; continue; }
    const fors = new Set<string>();
    for (const s of forRaw) { if (typeof s === "string" && isSaid(s)) fors.add(s); else dropped.entries++; }
    introductions.set(addr.address, { source: addr.address, for: [...fors].sort(byString) });
  }

  const catalogs = new Set<string>();
  for (const item of list("catalogs")) {
    const c = typeof item === "string" ? parseCatalogAddress(item, opts) : null;
    if (c === null || catalogs.has(c.address)) dropped.entries++; else catalogs.add(c.address);
  }

  const document: SourceDocument = {
    source: address,
    pages: r["pages"] === true,
    serves: [...serves.values()].sort((a, b) => byString(a.said, b.said)),
    publications,
    introductions: [...introductions.values()].sort((a, b) => byString(a.source, b.source)),
    catalogs: [...catalogs].sort(byString),
  };
  if (typeof r["by"] === "string") { if (AID_PATTERN.test(r["by"])) document.by = r["by"]; else dropped.entries++; }
  if (typeof r["oobi"] === "string") { const o = parseHttpsAddress(r["oobi"], opts); if (o !== null) document.oobi = o; else dropped.entries++; }
  return { ok: true, document, dropped };
}
```

The first test compares against `plan.document`, whose member order is `source, by?, oobi?, pages, serves, publications, introductions, catalogs`; `assert.deepEqual` ignores key order, but `by` and `oobi` must be absent, not `undefined`, which the two trailing `if`s ensure.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/document.test.ts`
Expected: all pass. If the drop count in the fourth test disagrees, recount against the comment there before touching the code: every item in the comment is one drop.

- [ ] **Step 5: Commit**

```bash
git add src/document.ts tests/document.test.ts
git commit -m "feat: read a fetched source document, dropping and counting what fails (<bead id>)"
```

---

### Task 4: The session: one run's budgets and scheduling

**Files:**
- Create: `src/session.ts`, `tests/session.test.ts`

**Interfaces:**
- Consumes: `fetchJson`, `Fetched`, `Resolve` from `src/fetch.ts`; `Limits` from `src/limits.ts`; `AddressOptions`.
- Produces: `type SessionOptions = AddressOptions & { resolve?: Resolve; now?: () => number }`; `type Exhausted = "host-time" | "host-bytes" | "run"`; `class Session` with `constructor(limits: Limits, options?: SessionOptions)`, `readonly limits: Limits`, `readonly test: boolean`, `static hostOf(address: string): string`, `remainingRun(): number`, `exhausted(host: string): Exhausted | null`, `fetch(address: string): Promise<Fetched>`, `each<T>(items: T[], hostOf: (item: T) => string, work: (item: T) => Promise<void>): Promise<void>`.

**Acceptance Criteria:**
- `fetch` charges each request's `ms` and `read` to its host whatever the outcome; when the host's time or bytes are used up, or the run clock has run out, it returns `timed-out` at once without a request; a body cut because the host's remaining bytes were smaller than the file limit is `timed-out`, not `invalid`; a request's deadline is the smallest of the request limit, the host's remaining time and the run's remaining time.
- `each` runs at most `hostsInFlight` items at a time, never two items of one host at once, items of one host in their given order, and returns when every item has run; an item whose work rejects does not stop the others.
- `exhausted` names the first exhausted budget: `run`, then `host-time`, then `host-bytes`.

- [ ] **Step 1: Write the failing tests**

`tests/session.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
origin.put("x.json", "{}");
const url = (p: string) => `${origin.origin}/${p}`;
const limits = (more: Partial<Limits>): Limits => ({ ...WALK, requestMs: 2000, ...more });

test("hostOf is the URL's host, port included", () => {
  assert.equal(Session.hostOf("https://a.example/mad/source.json"), "a.example");
  assert.equal(Session.hostOf("http://127.0.0.1:8080/mad/source.json"), "127.0.0.1:8080");
});

test("every request is charged to its host, and an exhausted host answers timed-out without a request", async () => {
  let clock = 0;
  const s = new Session(limits({ hostBytes: 5, hostMs: 10_000 }), { test: true, now: () => clock });
  const host = Session.hostOf(url("x.json"));
  assert.equal(s.exhausted(host), null);
  const r1 = await s.fetch(url("x.json"));
  assert.equal(r1.outcome, "ok");
  assert.equal(r1.read, 2);
  const r2 = await s.fetch(url("x.json"));
  assert.equal(r2.outcome, "ok");
  const before = origin.requests.length;
  const r3 = await s.fetch(url("x.json"));
  assert.equal(r3.outcome, "timed-out", "5 bytes allowed, 4 read, 2 more would not fit: the host is used up");
  assert.equal(origin.requests.length, before + 1, "the third request was made (budget left) and refused by its size");
  assert.equal(s.exhausted(host), "host-bytes");
  const r4 = await s.fetch(url("x.json"));
  assert.equal(r4.outcome, "timed-out");
  assert.equal(origin.requests.length, before + 1, "nothing more is asked of an exhausted host");
});

test("the host's time and the run clock bound a request's deadline", async () => {
  let clock = 0;
  origin.behave = (_req, res) => { res.setHeader("content-type", "application/json"); clock += 400; res.end("{}"); return true; };
  const s = new Session(limits({ hostMs: 1000, runMs: 10_000 }), { test: true, now: () => clock });
  const host = Session.hostOf(url("x.json"));
  await s.fetch(url("x.json")); await s.fetch(url("x.json"));
  assert.equal(s.exhausted(host), null, "800 ms spent of 1000");
  await s.fetch(url("x.json"));
  assert.equal(s.exhausted(host), "host-time", "1200 ms spent of 1000");
  assert.equal((await s.fetch(url("x.json"))).outcome, "timed-out");
  origin.behave = null;
  const r = new Session(limits({ runMs: 100 }), { test: true, now: () => clock });
  clock += 200;
  assert.equal(r.exhausted(host), "run");
  assert.equal((await r.fetch(url("x.json"))).outcome, "timed-out");
  const none = new Session(limits({ runMs: null }), { test: true, now: () => clock });
  assert.equal(none.remainingRun(), Infinity);
  assert.equal((await none.fetch(url("x.json"))).outcome, "ok");
});

test("each runs hostsInFlight hosts at a time and one item per host at a time, in order", async () => {
  const s = new Session(limits({ hostsInFlight: 2 }), { test: true });
  const items = ["a:1", "a:2", "b:1", "c:1", "a:3", "c:2"];
  const running = new Set<string>();
  const overlaps: string[] = [];
  let peak = 0;
  const order: string[] = [];
  const gate = new Map<string, () => void>();
  const started: string[] = [];
  const run = s.each(items, (i) => i.split(":")[0]!, (i) => new Promise<void>((done) => {
    const host = i.split(":")[0]!;
    if (running.has(host)) overlaps.push(i);
    running.add(host); peak = Math.max(peak, running.size); started.push(i);
    gate.set(i, () => { running.delete(host); order.push(i); done(); });
  }));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(started, ["a:1", "b:1"], "two hosts in flight, a's second item waits for a's first");
  gate.get("a:1")!();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(started, ["a:1", "b:1", "a:2"]);
  gate.get("b:1")!(); gate.get("a:2")!();
  await new Promise((r) => setTimeout(r, 20));
  for (const i of [...started]) { const g = gate.get(i); if (g && !order.includes(i)) g(); }
  await new Promise((r) => setTimeout(r, 20));
  for (const i of [...started]) { const g = gate.get(i); if (g && !order.includes(i)) g(); }
  await run;
  assert.deepEqual(overlaps, [], "never two items of one host at once");
  assert.equal(peak, 2);
  assert.equal(order.length, 6);
  assert.ok(order.indexOf("a:1") < order.indexOf("a:2") && order.indexOf("a:2") < order.indexOf("a:3"));
  assert.ok(order.indexOf("c:1") < order.indexOf("c:2"));
});

test("each finishes when an item's work rejects, and with no items", async () => {
  const s = new Session(limits({}), { test: true });
  const done: string[] = [];
  await s.each(["x", "y"], (i) => i, async (i) => { if (i === "x") throw new Error("boom"); done.push(i); });
  assert.deepEqual(done, ["y"]);
  await s.each([], () => "", async () => {});
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/session.test.ts`
Expected: FAIL, cannot find module `../src/session.ts`.

- [ ] **Step 3: Write `src/session.ts`**

```ts
import { fetchJson, type Fetched, type Resolve } from "./fetch.ts";
import type { AddressOptions } from "./address.ts";
import type { Limits } from "./limits.ts";

export type SessionOptions = AddressOptions & { resolve?: Resolve; now?: () => number };
export type Exhausted = "host-time" | "host-bytes" | "run";

type HostState = { ms: number; bytes: number };

/** One run of the walk or get: the run clock, each host's time and bytes, and how hosts are scheduled. Nothing outlives the run. */
export class Session {
  readonly limits: Limits;
  readonly test: boolean;
  private readonly resolve: Resolve | undefined;
  private readonly now: () => number;
  private readonly started: number;
  private readonly hosts = new Map<string, HostState>();

  constructor(limits: Limits, options: SessionOptions = {}) {
    this.limits = limits;
    this.test = options.test === true;
    this.resolve = options.resolve;
    this.now = options.now ?? (() => performance.now());
    this.started = this.now();
  }

  /** The host a request to this address is charged to: host name and port as the URL serializes them. */
  static hostOf(address: string): string {
    return new URL(address).host;
  }

  private host(name: string): HostState {
    let h = this.hosts.get(name);
    if (h === undefined) { h = { ms: 0, bytes: 0 }; this.hosts.set(name, h); }
    return h;
  }

  /** Milliseconds left on the run clock; Infinity when there is none. */
  remainingRun(): number {
    return this.limits.runMs === null ? Infinity : this.limits.runMs - (this.now() - this.started);
  }

  /** Why nothing more may be asked of this host, or null. */
  exhausted(name: string): Exhausted | null {
    if (this.remainingRun() <= 0) return "run";
    const h = this.host(name);
    if (h.ms >= this.limits.hostMs) return "host-time";
    if (h.bytes >= this.limits.hostBytes) return "host-bytes";
    return null;
  }

  /** One request within the request, host and run limits, charged to its host whatever the outcome. */
  async fetch(address: string): Promise<Fetched> {
    const name = Session.hostOf(address);
    const h = this.host(name);
    const timeoutMs = Math.min(this.limits.requestMs, this.limits.hostMs - h.ms, this.remainingRun());
    const maxBytes = Math.min(this.limits.fileBytes, this.limits.hostBytes - h.bytes);
    if (timeoutMs <= 0 || maxBytes <= 0) return { outcome: "timed-out", read: 0, ms: 0 };
    const r = await fetchJson(address, { test: this.test, resolve: this.resolve, now: this.now, timeoutMs, maxBytes });
    h.ms += r.ms;
    h.bytes += r.read;
    // A body cut by the host's remaining bytes rather than the file limit means the host is used up, not that the file is bad.
    if (r.outcome === "invalid" && h.bytes >= this.limits.hostBytes) return { outcome: "timed-out", read: r.read, ms: r.ms };
    return r;
  }

  /** Runs work over the items in order: at most hostsInFlight hosts at a time, one item at a time per host. A rejection ends only its item. */
  async each<T>(items: T[], hostOf: (item: T) => string, work: (item: T) => Promise<void>): Promise<void> {
    const pending = [...items];
    const busy = new Set<string>();
    await new Promise<void>((done) => {
      const pump = (): void => {
        while (busy.size < this.limits.hostsInFlight) {
          const i = pending.findIndex((item) => !busy.has(hostOf(item)));
          if (i < 0) break;
          const item = pending.splice(i, 1)[0]!;
          const name = hostOf(item);
          busy.add(name);
          const release = (): void => { busy.delete(name); pump(); };
          work(item).then(release, release);
        }
        if (pending.length === 0 && busy.size === 0) done();
      };
      pump();
    });
  }
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/session.test.ts`
Expected: all pass. The second test depends on `fetchJson` counting `read` for a refused body (Task 2 does); the third on `ms` being measured with the injected clock, which `fetchJson` does through `now`.

- [ ] **Step 5: Commit**

```bash
git add src/session.ts tests/session.test.ts
git commit -m "feat: one run's budgets: the run clock, each host's time and bytes, hosts in flight (<bead id>)"
```

---

### Task 5: Reading a source over the network, and the walk over one source

**Files:**
- Create: `src/read.ts`, `src/walk.ts`, `tests/walk.test.ts`
- Modify: `tests/helpers/servers.ts` (add `source()`); `src/pages.ts` and `src/build.ts` (thread the address options through, so a source built for a local origin can introduce another local origin)

**Interfaces:**
- Consumes: `Session`; `readSourceDocument`; `checkSaid`; `paths` from `src/scan.ts`; `definitionAddress`, `parseSourceAddress`; `Outcome`; `Publication`, `Introduction`, `SourceDocument`.
- Produces: in `src/read.ts`: `type Reason = Outcome | "failed-check" | "not-contained" | "not-there"`; `type Unresolved = { address: string; via: string[]; reason: Reason; said?: string; limit?: string; target?: string }`; `type ReadSource = { ok: true; document: SourceDocument; base: string; dropped: Dropped } | { ok: false; unresolved: Unresolved }`; `readSource(address: string, via: string[], session: Session): Promise<ReadSource>`; `redirectTarget(f: Fetched): { target: string } | {}`. In `src/walk.ts`: `type Report = { said; from; sources: { address; via; by?; oobi? }[]; serves: { source; via }[]; publications: { source; via; publication: Publication }[]; referrers: { source; via; said; paths: string[]; appearances: number }[]; unresolved: Unresolved[]; dropped: { source; entries; publications }[]; catalogs: string[]; reached: number }`; `type Candidate = { address: string; via: string[]; named: boolean }`; `type Visited = { address; via; fetched: boolean; read: boolean; serves: boolean; publications: Publication[]; referrers: { said; paths; appearances }[]; unresolved: Unresolved[]; dropped: Dropped | null; catalogs: string[]; introductions: Introduction[] }` (`fetched`: the document was fetched and read; `read`: the source is kept, ok or truncated); `visitSource(said: string, c: Candidate, session: Session): Promise<Visited>`; `type WalkOutcome = { ok: true; report: Report } | { ok: false; reason: Reason; target?: string }`; `walk(said: string, from: string, session: Session): Promise<WalkOutcome>` (this task: the starting source only, no introductions followed; Task 6 adds the levels). In `tests/helpers/servers.ts`: `Origin.source(prefix: string, config: Record<string, unknown>, inputs: Inputs): { address: string; plan: BuildPlan }`.

**Acceptance Criteria:**
- Over one local origin serving a gym build: `who X` where X is a leaf definition lists the source under `serves` with `via: []`, its publications of X, and every served definition whose bytes contain X as a referrer with the paths and count the scan gives; `sources` lists the one source with its chain and the `by` and `oobi` its document states; `reached` is 1; `unresolved` and `dropped` are empty; `catalogs` repeats the document's.
- A source that lists X and serves other bytes for it: `failed-check` with `said` X and not in `serves`. A `refers` naming X that the bytes do not contain: `not-contained`. A definition answered with 404: `not-found` with `said`; with `text/plain`: `invalid` with `said`. A redirect on a definition: `redirected` with `said` and `target`. A source document that is a copy from another origin: `invalid` and nothing read. A source reached through an introduction `for` X with nothing about X: `not-there` (the code is here; the test is Task 6's, which follows introductions).
- A definition nested 100,000 deep is verified and reported with its count and no paths; one holding X 10,000 times is reported with 16 paths; one near 1 MB holding X 10,000 times under a 500,000-character key is reported with the count and no paths.
- The definitions limit cuts in SAID order and records `truncated` with `limit: "definitions"`; what was fetched stays.
- A host whose budget runs out during a source gives one `timed-out` entry for the source and nothing else from it.
- A SAID is never sent to a source that does not list it: the origin's request log holds only `source.json` and the definitions the document listed for X.

- [ ] **Step 1: Thread the address options into the pages, and add `source()` to the test helper**

`renderPages` re-parses every introduction, catalog and `oobi` address before it becomes a link (the step 1 rule: a link target is only ever an address that passed the rule), with no options, so a source built for a local origin that introduces another local origin makes `addressLink` throw `not an address`. The re-parse stays; it learns the options. In `src/pages.ts`: import `type AddressOptions` from `./address.ts`; add `options?: AddressOptions;` to `PagesInput`; in `definitionPage` and `indexPage` take `const options = input.options ?? {};` and pass it to every parse there: `parseSourceAddress(i.source, options)`, `parseCatalogAddress(c, options)`, `parseHttpsAddress(document.oobi, options)`. In `src/build.ts`: import `type AddressOptions` from `./address.ts`; change the signature to `export function planBuild(inputs: Inputs, config: Config, opts: AddressOptions = {}): BuildPlan` and pass `options: opts` in the `renderPages({ ... })` call. The step 1 test "a link target that is not an address is refused" in `tests/pages.test.ts` still holds: it calls `renderPages` without options and expects the throw.

In `tests/helpers/servers.ts` add the imports and method:

```ts
import { planBuild, type BuildPlan } from "../../src/build.ts";
import { parseConfig } from "../../src/config.ts";
import type { Inputs } from "../../src/inputs.ts";
```

```ts
  /** Builds a source for this origin under prefix (such as "mad/") from a configuration without `source`, and serves its files. */
  source(prefix: string, config: Record<string, unknown>, inputs: Inputs): { address: string; plan: BuildPlan } {
    const address = `${this.origin}/${prefix}source.json`;
    const plan = planBuild(inputs, parseConfig(JSON.stringify({ source: address, ...config }), { test: true }), { test: true });
    for (const [path, bytes] of plan.files) this.files.set(prefix + path, bytes);
    return { address, plan };
  }
```

- [ ] **Step 2: Write the failing tests**

`tests/walk.test.ts` (Task 6 appends to this file):

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { paths } from "../src/scan.ts";
import { saidOf, FILL } from "../src/said.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { walk } from "../src/walk.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";   // class-brick
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const quick = (more: Partial<Limits> = {}): Limits => ({ ...WALK, requestMs: 2000, runMs: 10_000, ...more });
const session = (more: Partial<Limits> = {}) => new Session(quick(more), { test: true });
const publication = (target: string, name: string) => ({ target, name, description: `about ${name}`, tags: ["t"], collection: "c" });
/** A definition that verifies, holding the SAIDs given; made here because the digest module is proven against outside vectors already. */
const definition = (inner: string[], filler = ""): { said: string; bytes: Uint8Array } => {
  const shape = (said: string) => `{"d":"${said}","r":${JSON.stringify(inner)}${filler}}`;
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"))));
  return { said, bytes: new TextEncoder().encode(shape(said)) };
};

test("one source: serves, publications and referrers of a leaf definition, nothing else asked for", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION], by: "EKxyAID", oobi: "https://gym.example/oobi/EKxyAID", publications: [publication(SELECTION, "class-brick")], catalogs: ["https://c.example/catalog.json"] }, inputs);
  const leaf = plan.document.serves.find((s) => s.refers.length === 0)!.said;
  const containing = plan.document.serves.filter((s) => s.refers.includes(leaf)).map((s) => s.said);
  assert.ok(containing.length > 0, "the fixture has a definition that contains the leaf");
  // The build's document, with a publication of the leaf added by hand, so publications of the looked-up SAID are exercised.
  const doc = JSON.parse(new TextDecoder().decode(a.files.get("mad/source.json")!)) as { publications: unknown[] };
  doc.publications.push(publication(leaf, "the leaf"));
  a.put("mad/source.json", JSON.stringify(doc));

  const r = await walk(leaf, address, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.sources, [{ address, via: [], by: "EKxyAID", oobi: "https://gym.example/oobi/EKxyAID" }], "the source read, with what its operator states");
  assert.deepEqual(r.report.serves, [{ source: address, via: [] }]);
  assert.deepEqual(r.report.publications.map((p) => p.publication.name), ["the leaf"]);
  assert.deepEqual(r.report.referrers.map((x) => x.said), containing);
  for (const x of r.report.referrers) {
    const expected = paths(inputs.get(x.said)!, leaf);
    assert.deepEqual(x.paths, expected.paths);
    assert.equal(x.appearances, expected.count);
    assert.deepEqual(x.via, []);
  }
  assert.deepEqual(r.report.unresolved, []);
  assert.deepEqual(r.report.dropped, []);
  assert.deepEqual(r.report.catalogs, ["https://c.example/catalog.json"]);
  assert.equal(r.report.reached, 1);
  assert.equal(r.report.said, leaf);
  assert.equal(r.report.from, address);
  const asked = a.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.deepEqual(asked.sort(), [leaf, ...containing].sort(), "only the leaf and what the document says contains it were requested");
});

test("one source: each failure is a named entry and nothing else", async () => {
  const a = await start();
  // The helper derives a SAID from its inputs, so each document here carries a filler that keeps its SAID apart from the others'.
  const x = definition([]);
  const y = definition([x.said]);
  const z = definition([], ',"n":"z"');           // claims to contain x in refers, does not
  const w = definition([x.said], ',"n":"w"');     // served with wrong bytes
  const t = definition([x.said], ',"n":"t"');     // served as text/plain
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: y.said, refers: [x.said] }, { said: z.said, refers: [x.said] }, { said: w.said, refers: [x.said] }, { said: t.said, refers: [x.said] }], catalogs: [] }));
  a.put(`s/definitions/${x.said}.json`, x.bytes);
  a.put(`s/definitions/${y.said}.json`, y.bytes);
  a.put(`s/definitions/${z.said}.json`, z.bytes);
  a.put(`s/definitions/${w.said}.json`, '{"d":"' + w.said + '","r":["tampered"]}');
  a.put(`s/definitions/${t.said}.json`, t.bytes);
  a.behave = (req, res) => { if (req.url === `/s/definitions/${t.said}.json`) { res.setHeader("content-type", "text/plain"); res.end(Buffer.from(t.bytes)); return true; } return false; };
  const r = await walk(x.said, address, session());
  a.behave = null;
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: address, via: [] }]);
  assert.deepEqual(r.report.referrers.map((e) => e.said), [y.said]);
  assert.ok(r.report.unresolved.some((u) => u.reason === "not-contained" && u.said === z.said));
  assert.ok(r.report.unresolved.some((u) => u.reason === "failed-check" && u.said === w.said));
  assert.ok(r.report.unresolved.some((u) => u.reason === "invalid" && u.said === t.said), "a wrong content type on a definition");
  assert.equal(r.report.unresolved.length, 3);

  // the served definition itself fails the check: no serves entry, one failed-check
  a.put(`s/definitions/${x.said}.json`, '{"d":"' + x.said + '","r":[1]}');
  const r2 = await walk(x.said, address, session());
  assert.ok(r2.ok && r2.report.serves.length === 0 && r2.report.unresolved.some((u) => u.reason === "failed-check" && u.said === x.said));

  // 404 and a redirect on definitions
  a.files.delete(`s/definitions/${x.said}.json`);
  a.behave = (req, res) => { if (req.url === `/s/definitions/${y.said}.json`) { res.statusCode = 302; res.setHeader("location", "https://elsewhere.test/y.json"); res.end(); return true; } return false; };
  const r3 = await walk(x.said, address, session());
  a.behave = null;
  assert.ok(r3.ok);
  if (r3.ok) {
    assert.ok(r3.report.unresolved.some((u) => u.reason === "not-found" && u.said === x.said));
    assert.ok(r3.report.unresolved.some((u) => u.reason === "redirected" && u.said === y.said && u.target === "https://elsewhere.test/y.json"));
  }
});

test("a copy of another source's files is invalid", async () => {
  const a = await start();
  const b = await start();
  a.source("mad/", { serve: [SELECTION] }, inputs);
  for (const [p, bytes] of a.files) b.files.set(p, bytes);        // b serves a byte-for-byte copy of a
  const copied = `${b.origin}/mad/source.json`;
  const r = await walk(SELECTION, copied, session());
  assert.deepEqual(r, { ok: false, reason: "invalid" });
  assert.ok(!b.requests.some((p) => p.startsWith("mad/definitions/")), "nothing was read from the copy");
});

test("hostile definitions: deep, many appearances, and a long key; each verified and bounded in the report", async () => {
  const a = await start();
  const x = definition([]);
  const deep = definition([x.said], `,"x":${"[".repeat(100_000)}${"]".repeat(100_000)}`);
  const many = definition(new Array<string>(10_000).fill(x.said));
  const wide = definition([], `,"${"k".repeat(500_000)}":${JSON.stringify(new Array<string>(10_000).fill(x.said))}`);   // the design's vector: near 1 MB, every pointer over 256 characters
  assert.ok(many.bytes.length > 400_000 && many.bytes.length < 1_000_000);
  assert.ok(wide.bytes.length > 900_000 && wide.bytes.length < 1_000_000);
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, { said: deep.said, refers: [x.said] }, { said: many.said, refers: [x.said] }, { said: wide.said, refers: [x.said] }] }));
  for (const d of [x, deep, many, wide]) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await walk(x.said, address, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, []);
  const byId = new Map(r.report.referrers.map((e) => [e.said, e]));
  assert.deepEqual(byId.get(deep.said), { source: address, via: [], said: deep.said, paths: [], appearances: 1 }, "too deep to parse: verified, counted, no paths");
  const m = byId.get(many.said)!;
  assert.equal(m.appearances, 10_000);
  assert.deepEqual(m.paths, Array.from({ length: 16 }, (_, i) => `/r/${i}`), "cut at sixteen paths");
  assert.deepEqual(byId.get(wide.said), { source: address, via: [], said: wide.said, paths: [], appearances: 10_000 }, "every pointer longer than 256 characters: none reported");
});

test("the definitions limit cuts in SAID order and is recorded", async () => {
  const a = await start();
  const x = definition([]);
  const refs = Array.from({ length: 5 }, (_, i) => definition([x.said], `,"n":${i}`));
  const address = `${a.origin}/s/source.json`;
  a.put("s/source.json", JSON.stringify({ source: address, serves: [{ said: x.said }, ...refs.map((d) => ({ said: d.said, refers: [x.said] }))] }));
  a.put(`s/definitions/${x.said}.json`, x.bytes);
  for (const d of refs) a.put(`s/definitions/${d.said}.json`, d.bytes);
  const r = await walk(x.said, address, session({ definitionsPerSource: 3 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  const all = [x.said, ...refs.map((d) => d.said)].sort();
  const asked = a.requests.filter((p) => p.startsWith("s/definitions/")).map((p) => p.slice("s/definitions/".length, -5)).sort();
  assert.deepEqual(asked, all.slice(0, 3));
  assert.deepEqual(r.report.unresolved, [{ address, via: [], reason: "truncated", limit: "definitions" }]);
  assert.equal(r.report.reached, 1);
  assert.equal(r.report.serves.length + r.report.referrers.length, 3);
});

test("a host that uses up its bytes during a source gives one timed-out entry and nothing of the source", async () => {
  const a = await start();
  const { address, plan } = a.source("mad/", { serve: [SELECTION] }, inputs);
  const sourceBytes = a.files.get("mad/source.json")!.length;
  const leaf = plan.document.serves.find((s) => s.refers.length === 0)!.said;
  const r = await walk(leaf, address, session({ hostBytes: sourceBytes + 10 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, []);
  assert.deepEqual(r.report.referrers, []);
  assert.deepEqual(r.report.unresolved, [{ address, via: [], reason: "timed-out" }]);
  assert.equal(r.report.reached, 0);
});

test("the starting source that cannot be read is the walk's one failure", async () => {
  const dead = await Origin.start();
  const address = `${dead.origin}/mad/source.json`;
  await dead.close();
  assert.deepEqual(await walk(SELECTION, address, session()), { ok: false, reason: "unreachable" });
  const a = await start();
  a.behave = (_req, res) => { res.statusCode = 301; res.setHeader("location", "https://moved.test/source.json"); res.end(); return true; };
  assert.deepEqual(await walk(SELECTION, `${a.origin}/mad/source.json`, session()), { ok: false, reason: "redirected", target: "https://moved.test/source.json" });
  a.behave = null;
});
```

The `definition()` helper computes a SAID with the code under test. That is the one exception to the fixtures rule in this plan, and it is deliberate: `src/said.ts` is proven against outside vectors in `tests/said.test.ts`, and what these tests exercise is the walk's transport and reporting, for which a document of a chosen shape is needed. No other test here derives an expected value from the code under test.

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/walk.test.ts`
Expected: FAIL, cannot find module `../src/walk.ts`.

- [ ] **Step 4: Write `src/read.ts`**

```ts
import { readSourceDocument, type Dropped } from "./document.ts";
import { parseSourceAddress } from "./address.ts";
import type { Fetched, Outcome } from "./fetch.ts";
import type { SourceDocument } from "./source.ts";
import type { Session } from "./session.ts";

/** An outcome of the fixed list, or one of the three per-entry endings docs/design.md adds under "Outcomes". */
export type Reason = Outcome | "failed-check" | "not-contained" | "not-there";

/** One thing a run was pointed at and could not fetch or check in full. address is always a source address. */
export type Unresolved = { address: string; via: string[]; reason: Reason; said?: string; limit?: string; target?: string };

export type ReadSource =
  | { ok: true; document: SourceDocument; base: string; dropped: Dropped }
  | { ok: false; unresolved: Unresolved };

/** The redirect's target as a member to spread into an entry, when the answer named one. */
export function redirectTarget(f: Fetched): { target: string } | Record<never, never> {
  return f.outcome === "redirected" && f.target !== null ? { target: f.target } : {};
}

/** Fetch a source document and read it; on any failure, the unresolved entry that says why. */
export async function readSource(address: string, via: string[], session: Session): Promise<ReadSource> {
  const f = await session.fetch(address);
  if (f.outcome !== "ok") return { ok: false, unresolved: { address, via, reason: f.outcome, ...redirectTarget(f) } };
  const d = readSourceDocument(f.bytes, address, { test: session.test });
  if (!d.ok) return { ok: false, unresolved: { address, via, reason: "invalid" } };
  return { ok: true, document: d.document, base: parseSourceAddress(address, { test: session.test })!.base, dropped: d.dropped };
}
```

- [ ] **Step 5: Write `src/walk.ts` (one source; Task 6 adds the levels)**

```ts
import { checkSaid } from "./said.ts";
import { paths } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, redirectTarget, type Reason, type Unresolved } from "./read.ts";
import { Session } from "./session.ts";
import type { Dropped } from "./document.ts";
import type { Introduction, Publication } from "./source.ts";

export type Report = {
  said: string;
  from: string;
  sources: { address: string; via: string[]; by?: string; oobi?: string }[];   // every source read, in visit order; by and oobi as stated, never verified
  serves: { source: string; via: string[] }[];
  publications: { source: string; via: string[]; publication: Publication }[];
  referrers: { source: string; via: string[]; said: string; paths: string[]; appearances: number }[];
  unresolved: Unresolved[];
  dropped: { source: string; entries: number; publications: number }[];
  catalogs: string[];
  reached: number;
};

/** A source the walk will visit: how it got there, and whether an introduction named the SAID in `for`. */
export type Candidate = { address: string; via: string[]; named: boolean };

/** Everything one visit found; merged into the report once the depth is complete. */
export type Visited = {
  address: string;
  via: string[];
  fetched: boolean;   // the source document was fetched and read; false when the document itself could not be
  read: boolean;      // the source was read in full and is kept: ok or truncated
  by?: string;        // the operator's stated AID, when the document states one
  oobi?: string;      // where that AID resolves, when stated; shown, never fetched
  serves: boolean;
  publications: Publication[];
  referrers: { said: string; paths: string[]; appearances: number }[];
  unresolved: Unresolved[];
  dropped: Dropped | null;
  catalogs: string[];
  introductions: Introduction[];
};

export type WalkOutcome = { ok: true; report: Report } | { ok: false; reason: Reason; target?: string };

const fresh = (c: Candidate): Visited => ({ address: c.address, via: c.via, fetched: false, read: false, serves: false, publications: [], referrers: [], unresolved: [], dropped: null, catalogs: [], introductions: [] });

/**
 * Steps 1 to 4 of docs/design.md "The walk" for one source: fetch its document, fetch and check the definition when it lists the
 * SAID, collect its publications of the SAID, fetch and check each definition whose refers lists the SAID and confirm the
 * appearance by the scan. The document is fetched whole and matched here, so the SAID goes only to a source that lists it.
 */
export async function visitSource(said: string, c: Candidate, session: Session): Promise<Visited> {
  const v = fresh(c);
  const host = Session.hostOf(c.address);
  const unresolved = (reason: Reason, more: Partial<Unresolved> = {}): void => { v.unresolved.push({ address: c.address, via: c.via, reason, ...more }); };
  const stop = session.exhausted(host);
  if (stop !== null) { unresolved("skipped", { limit: stop }); return v; }
  const r = await readSource(c.address, c.via, session);
  if (!r.ok) { v.unresolved.push(r.unresolved); return v; }
  v.fetched = true;
  const { document, base, dropped } = r;

  // Definitions to fetch, in SAID order: the SAID itself when served, and every served definition said to contain it.
  const wanted = document.serves.filter((s) => s.said === said || s.refers.includes(said)).map((s) => s.said);
  const taken = wanted.slice(0, session.limits.definitionsPerSource);
  for (const target of taken) {
    if (session.exhausted(host) !== null) break;
    const g = await session.fetch(definitionAddress(base, target));
    if (g.outcome !== "ok") { unresolved(g.outcome, { said: target, ...redirectTarget(g) }); continue; }
    if (!checkSaid(g.bytes, target)) { unresolved("failed-check", { said: target }); continue; }
    if (target === said) { v.serves = true; continue; }
    const p = paths(g.bytes, said);
    if (p.count === 0) unresolved("not-contained", { said: target });
    else v.referrers.push({ said: target, paths: p.paths, appearances: p.count });
  }
  // The host's time or bytes went during this source: nothing of it is kept. The document was read, so this is a later failure, not a start that could not be read.
  if (session.exhausted(host) !== null) return { ...fresh(c), fetched: true, unresolved: [{ address: c.address, via: c.via, reason: "timed-out" }] };

  v.read = true;
  if (document.by !== undefined) v.by = document.by;
  if (document.oobi !== undefined) v.oobi = document.oobi;
  if (wanted.length > taken.length) unresolved("truncated", { limit: "definitions" });
  v.publications = document.publications.filter((p) => p.target === said);
  if (dropped.entries > 0 || dropped.publications > 0) v.dropped = dropped;
  v.catalogs = document.catalogs;
  v.introductions = document.introductions.slice(0, session.limits.introductionsPerSource);
  if (document.introductions.length > v.introductions.length) unresolved("truncated", { limit: "introductions" });
  const mentions = document.serves.some((s) => s.said === said || s.refers.includes(said)) || v.publications.length > 0;
  if (c.named && !mentions) unresolved("not-there");
  return v;
}

/** The report from every visit, in the order visited: depth, then address. */
export function assemble(said: string, from: string, visits: Visited[], skipped: Unresolved[]): Report {
  const read = visits.filter((v) => v.read);
  return {
    said,
    from,
    sources: read.map((v) => ({ address: v.address, via: v.via, ...(v.by !== undefined ? { by: v.by } : {}), ...(v.oobi !== undefined ? { oobi: v.oobi } : {}) })),
    serves: visits.filter((v) => v.serves).map((v) => ({ source: v.address, via: v.via })),
    publications: visits.flatMap((v) => v.publications.map((publication) => ({ source: v.address, via: v.via, publication }))),
    referrers: visits.flatMap((v) => v.referrers.map((r) => ({ source: v.address, via: v.via, ...r }))),
    unresolved: [...visits.flatMap((v) => v.unresolved), ...skipped],
    dropped: visits.filter((v) => v.dropped !== null).map((v) => ({ source: v.address, ...v.dropped! })),
    catalogs: [...new Set(visits.flatMap((v) => v.catalogs))].sort(),
    reached: read.length,
  };
}

/** The walk from one source. In this task it visits the starting source only; following introductions arrives with Task 6. */
export async function walk(said: string, from: string, session: Session): Promise<WalkOutcome> {
  const start = await visitSource(said, { address: from, via: [], named: false }, session);
  if (!start.fetched) {
    const u = start.unresolved[0]!;
    return { ok: false, reason: u.reason, ...(u.target !== undefined ? { target: u.target } : {}) };
  }
  return { ok: true, report: assemble(said, from, [start], []) };
}
```

- [ ] **Step 6: Run the tests and the type check**

Run: `npm run check && node --test tests/walk.test.ts`
Expected: all pass. The host-bytes test relies on `Session.fetch` turning a body cut by the host's remaining bytes into `timed-out` and on `visitSource` discarding the source when `exhausted` is non-null afterwards.

- [ ] **Step 7: Commit**

```bash
git add src/read.ts src/walk.ts tests/walk.test.ts tests/helpers/servers.ts
git commit -m "feat: the walk over one source: serves, publications, referrers, every failure named (<bead id>)"
```

---

### Task 6: Following introductions: depth, order, limits, cycles

**Files:**
- Modify: `src/walk.ts` (replace `walk`, add `nextLevel`), `tests/walk.test.ts` (append)

**Interfaces:**
- Consumes: Task 5's `visitSource`, `assemble`, `Candidate`, `Visited`; `Session.each`.
- Produces: `nextLevel(said: string, here: Visited[], visited: Set<string>): Candidate[]` (exported for its own test); `walk` now follows introductions to the depth and source limits.

**Acceptance Criteria:**
- Three local origins, the first introducing the second and the second the third: `who X --from A` lists all three under `serves` and under `sources`, with `via` `[]`, `[A]`, `[A, B]`, `reached` 3, every source visited once (each origin's log holds one `source.json` request).
- A cycle (C introduces A) ends with each source visited once and no entry for it.
- Order within a depth: introductions `for` X come before the others; among equals one from each introducing source in turn, introducing sources in address order, each source's introductions in address order; a source that introduces ten dead addresses sorting ahead of the honest ones does not keep the honest one introduced beside it from being visited when the source limit bites.
- The depth limit: introductions from a source at the depth limit are `skipped` with `limit: "depth"`; the source limit: candidates beyond the room are `skipped` with `limit: "sources"`; more than `introductionsPerSource` introductions from one source: the first N in address order are followed and the source gets one `truncated` entry with `limit: "introductions"`.
- A dead introduced source is `unreachable`; a copy on a second origin is `invalid`; an oversized source document at depth 1 is `invalid` with nothing read from it; a `for` introduction to a source with nothing about the SAID is `not-there`, with the source still counted as reached; sources on a host whose budget is gone before they start are `skipped` with `limit: "host-bytes"` or `"host-time"`, or dropped whole as `timed-out` when it goes during them; a run whose clock runs out keeps nothing of the source being read and leaves the rest `skipped` with `limit: "run"`.
- Two walks over the same servers give byte-identical reports.

- [ ] **Step 1: Append the failing tests to `tests/walk.test.ts`**

```ts
test("three origins: the first introduces the second, the second the third; one lookup finds all three, each visited once", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const cAddr = `${c.origin}/mad/source.json`;
  const bAddr = `${b.origin}/mad/source.json`;
  c.source("mad/", { serve: [SELECTION] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr, for: [SELECTION] }] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: aAddr, via: [] }, { source: bAddr, via: [aAddr] }, { source: cAddr, via: [aAddr, bAddr] }]);
  assert.deepEqual(r.report.sources, [{ address: aAddr, via: [] }, { address: bAddr, via: [aAddr] }, { address: cAddr, via: [aAddr, bAddr] }], "no by or oobi: none stated");
  assert.equal(r.report.reached, 3);
  assert.deepEqual(r.report.unresolved, []);
  for (const o of [a, b, c]) assert.equal(o.requests.filter((p) => p === "mad/source.json").length, 1);
  const again = await walk(SELECTION, aAddr, session());
  assert.deepEqual(again, r, "two runs, one report");
});

test("a 'for' introduction that leads to a source with nothing about the SAID is not-there", async () => {
  const c = await start();
  const d = await start();
  const cAddr = `${c.origin}/mad/source.json`;
  c.put("mad/source.json", JSON.stringify({ source: cAddr, serves: [] }));
  const { address: dAddr } = d.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr, for: [SELECTION] }] }, inputs);
  const r = await walk(SELECTION, dAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, [{ address: cAddr, via: [dAddr], reason: "not-there" }]);
  assert.equal(r.report.reached, 2, "c was read; it simply has nothing");
});

test("an oversized source document at depth 1 is invalid and nothing is read from it", async () => {
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const big = JSON.parse(new TextDecoder().decode(b.files.get("mad/source.json")!)) as Record<string, unknown>;
  big["note"] = "x".repeat(20_000);   // an unknown member: the document would read fine were it not over the limit
  b.put("mad/source.json", JSON.stringify(big));
  const { address: aAddr, plan } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  const limit = plan.files.get("source.json")!.length + 1000;   // a's document and its 241-byte definition fit; b's padded document does not
  const r = await walk(SELECTION, aAddr, session({ fileBytes: limit }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.unresolved, [{ address: bAddr, via: [aAddr], reason: "invalid" }]);
  assert.ok(!b.requests.some((p) => p.startsWith("mad/definitions/")), "nothing was read from the oversized source");
  assert.equal(r.report.reached, 1);
});

test("a cycle of introductions ends, with each source visited once", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr] = [a, b, c].map((o) => `${o.origin}/mad/source.json`);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: cAddr }] }, inputs);
  c.source("mad/", { serve: [SELECTION], introductions: [{ source: aAddr }, { source: bAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session());
  assert.ok(r.ok && r.report.reached === 3 && r.report.unresolved.length === 0);
  for (const o of [a, b, c]) assert.equal(o.requests.filter((p) => p === "mad/source.json").length, 1);
});

test("within a depth: 'for' first, then one from each introducing source in turn, in address order", async () => {
  const { nextLevel } = await import("../src/walk.ts");
  const visited = (address: string, intros: { source: string; for: string[] }[]) => ({ address, via: [], fetched: true, read: true, serves: false, publications: [], referrers: [], unresolved: [], dropped: null, catalogs: [], introductions: intros });
  const X = SELECTION;
  const here = [
    visited("https://a.example/source.json", [{ source: "https://a1.example/source.json", for: [] }, { source: "https://a2.example/source.json", for: [X] }, { source: "https://a3.example/source.json", for: [] }]),
    visited("https://b.example/source.json", [{ source: "https://b1.example/source.json", for: [X] }, { source: "https://b2.example/source.json", for: [] }, { source: "https://a1.example/source.json", for: [] }, { source: "https://seen.example/source.json", for: [] }]),
  ];
  const next = nextLevel(X, here, new Set(["https://seen.example/source.json"]));
  assert.deepEqual(next.map((c) => [c.address.slice(8, 10), c.named]), [["a2", true], ["b1", true], ["a1", false], ["b2", false], ["a3", false]]);
  assert.deepEqual(next[0]!.via, ["https://a.example/source.json"]);
  assert.deepEqual(next[1]!.via, ["https://b.example/source.json"]);
});

test("a flood of introductions sorting ahead of the honest ones does not keep the honest one out", async () => {
  const dead = await Origin.start();
  const deadBase = dead.origin;
  await dead.close();
  const [a, b, c, d] = [await start(), await start(), await start(), await start()];
  const [aAddr, bAddr, cAddr, dAddr] = [a, b, c, d].map((o) => `${o.origin}/mad/source.json`);
  d.source("mad/", { serve: [SELECTION] }, inputs);
  c.source("mad/", { serve: [SELECTION], introductions: Array.from({ length: 10 }, (_, i) => ({ source: `${deadBase}/a${i}/source.json` })) }, inputs);   // ports differ, so c's flood sorts by its own port, which may be ahead of or behind d
  b.source("mad/", { serve: [SELECTION], introductions: [{ source: dAddr }] }, inputs);
  a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }, { source: cAddr }] }, inputs);
  const r = await walk(SELECTION, aAddr, session({ sourcesPerRun: 5 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.report.serves.some((s) => s.source === dAddr), "d, introduced by b beside c's ten, is visited: one from each introducing source in turn");
  assert.equal(r.report.reached, 4, "a, b, c, d; the fifth slot went to one dead address");
  assert.equal(r.report.unresolved.filter((u) => u.reason === "unreachable").length, 1);
  assert.equal(r.report.unresolved.filter((u) => u.reason === "skipped" && u.limit === "sources").length, 9);
});

test("the depth limit, the introductions limit, and the source limit each leave a named entry", async () => {
  const chain = [await start(), await start(), await start(), await start(), await start()];
  const addrs = chain.map((o) => `${o.origin}/mad/source.json`);
  for (let i = 0; i < chain.length; i++) chain[i]!.source("mad/", { serve: [SELECTION], introductions: i + 1 < chain.length ? [{ source: addrs[i + 1]! }] : [] }, inputs);
  const r = await walk(SELECTION, addrs[0]!, session({ introductionDepth: 2 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.report.reached, 3, "depths 0, 1 and 2");
  assert.deepEqual(r.report.unresolved, [{ address: addrs[3]!, via: [addrs[0]!, addrs[1]!, addrs[2]!], reason: "skipped", limit: "depth" }]);

  const r2 = await walk(SELECTION, addrs[0]!, session({ sourcesPerRun: 2 }));
  assert.ok(r2.ok);
  if (r2.ok) {
    assert.equal(r2.report.reached, 2);
    assert.deepEqual(r2.report.unresolved, [{ address: addrs[2]!, via: [addrs[0]!, addrs[1]!], reason: "skipped", limit: "sources" }]);
  }

  const many = await start();
  const manyAddr = `${many.origin}/mad/source.json`;
  many.source("mad/", { serve: [SELECTION], introductions: addrs.slice(1).map((source) => ({ source })) }, inputs);
  const r3 = await walk(SELECTION, manyAddr, session({ introductionsPerSource: 2 }));
  assert.ok(r3.ok);
  if (r3.ok) {
    const followed = [...addrs.slice(1)].sort().slice(0, 2);
    assert.deepEqual(r3.report.serves.filter((s) => s.via.length === 1).map((s) => s.source).sort(), followed, "the first two in address order were followed at depth 1");
    assert.deepEqual(r3.report.unresolved, [{ address: manyAddr, via: [], reason: "truncated", limit: "introductions" }]);
  }
});

test("a dead introduced source, a copy, and an exhausted host are named and the walk goes on", async () => {
  const dead = await Origin.start();
  const deadAddr = `${dead.origin}/mad/source.json`;
  await dead.close();
  const [a, b, copy] = [await start(), await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  for (const [p, bytes] of b.files) copy.files.set(p, bytes);
  const copyAddr = `${copy.origin}/mad/source.json`;
  const { address: aAddr, plan } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: deadAddr }, { source: bAddr }, { source: copyAddr }, { source: `${b.origin}/second/source.json` }] }, inputs);
  const sourceBytes = plan.files.get("source.json")!.length;
  b.source("second/", { serve: [SELECTION] }, inputs);
  // Room for a's document and its definition, and for b's first source, but not for b's second document (measured: a's document is about 2.5 KB, b's about 2.2 KB, the definition 241 bytes).
  const r = await walk(SELECTION, aAddr, session({ hostBytes: sourceBytes + 1000 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(r.report.unresolved.some((u) => u.address === deadAddr && u.reason === "unreachable" && u.via[0] === aAddr));
  assert.ok(r.report.unresolved.some((u) => u.address === copyAddr && u.reason === "invalid"));
  const onB = r.report.unresolved.filter((u) => Session.hostOf(u.address) === Session.hostOf(bAddr));
  assert.ok(onB.some((u) => u.reason === "timed-out") || onB.some((u) => u.reason === "skipped" && u.limit === "host-bytes"), "b's second source finds the host used up: dropped whole or not started");
});

test("a run whose clock runs out keeps nothing of the source it was reading and skips the rest", async () => {
  const [a, b, c] = [await start(), await start(), await start()];
  const [bAddr, cAddr] = [b, c].map((o) => `${o.origin}/mad/source.json`);
  b.source("mad/", { serve: [SELECTION] }, inputs);
  c.source("mad/", { serve: [SELECTION] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }, { source: cAddr }] }, inputs);
  let clock = 0;
  const [first, second] = bAddr < cAddr ? [b, c] : [c, b];
  // The clock jumps past the run limit while the first depth-1 source's document is being served: that source is dropped whole,
  // and the other depth-1 source, whichever host reaches it first, either is skipped before it starts or is dropped whole too.
  first.behave = (_req, _res) => { clock = 1000; return false; };
  const s = new Session(quick({ runMs: 500 }), { test: true, now: () => clock });
  const r = await walk(SELECTION, aAddr, s);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.report.serves, [{ source: aAddr, via: [] }], "the start was read before the clock ran out; nothing from depth 1 is kept");
  assert.equal(r.report.reached, 1);
  const firstAddr = `${first.origin}/mad/source.json`;
  const secondAddr = `${second.origin}/mad/source.json`;
  assert.ok(r.report.unresolved.some((u) => u.address === firstAddr && u.reason === "timed-out"));
  assert.ok(r.report.unresolved.some((u) => u.address === secondAddr && (u.reason === "timed-out" || (u.reason === "skipped" && u.limit === "run"))));
  assert.equal(r.report.unresolved.length, 2);
});
```

- [ ] **Step 2: Run the new tests to see them fail**

Run: `node --test tests/walk.test.ts`
Expected: the Task 5 tests pass; the new ones fail (`nextLevel` is not exported; `serves` has one entry).

- [ ] **Step 3: Replace `walk` in `src/walk.ts` and add `nextLevel`**

```ts
/**
 * The next depth's candidates in the design's order: introductions that name the SAID in `for` first; among equals one from each
 * introducing source in turn, introducing sources in address order (here is sorted) and each source's introductions in address
 * order (the document reader sorted them). An address already visited, or taken earlier in this level, is not taken again.
 */
export function nextLevel(said: string, here: Visited[], visited: Set<string>): Candidate[] {
  const named: Candidate[][] = [];
  const others: Candidate[][] = [];
  for (const v of here) {
    if (!v.read) continue;
    const via = [...v.via, v.address];
    const n: Candidate[] = [];
    const o: Candidate[] = [];
    for (const i of v.introductions) {
      const isNamed = i.for.includes(said);
      (isNamed ? n : o).push({ address: i.source, via, named: isNamed });
    }
    named.push(n);
    others.push(o);
  }
  const out: Candidate[] = [];
  const seen = new Set(visited);
  for (const lists of [named, others]) {
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

const byAddress = (a: { address: string }, b: { address: string }): number => (a.address < b.address ? -1 : a.address > b.address ? 1 : 0);

/**
 * docs/design.md "The walk": breadth-first, every source at one depth before any at the next; within a depth the sources run under
 * the session's host scheduling and are merged in address order, so the report does not depend on who answered first.
 */
export async function walk(said: string, from: string, session: Session): Promise<WalkOutcome> {
  const visited = new Set<string>([from]);
  const visits: Visited[] = [];
  const skipped: Unresolved[] = [];
  let level: Candidate[] = [{ address: from, via: [], named: false }];
  for (let depth = 0; level.length > 0; depth++) {
    const here: Visited[] = [];
    await session.each(level, (c) => Session.hostOf(c.address), async (c) => { here.push(await visitSource(said, c, session)); });
    here.sort(byAddress);
    if (depth === 0 && !here[0]!.fetched) {
      const u = here[0]!.unresolved[0]!;
      return { ok: false, reason: u.reason, ...(u.target !== undefined ? { target: u.target } : {}) };
    }
    visits.push(...here);
    const next = nextLevel(said, here, visited);
    if (next.length === 0) break;
    if (depth + 1 > session.limits.introductionDepth) {
      for (const c of next) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "depth" });
      break;
    }
    const room = Math.max(0, session.limits.sourcesPerRun - visited.size);
    for (const c of next.slice(room)) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "sources" });
    level = next.slice(0, room);
    for (const c of level) visited.add(c.address);
  }
  return { ok: true, report: assemble(said, from, visits, skipped) };
}
```

Keep Task 5's `visitSource`, `assemble` and types as they are. A source `skipped` for an exhausted host or the run clock comes out of `visitSource` with `read: false` and its entry, so the loop needs no special case for it.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/walk.test.ts`
Expected: all pass. In the flood test, the fifth visited source is one dead address whichever way the ports sort, because `d` is taken in the first round of the round-robin and the room is 2 at depth 2.

- [ ] **Step 5: Run the whole suite, then commit**

Run: `npm test`

```bash
git add src/walk.ts tests/walk.test.ts
git commit -m "feat: the walk follows introductions by depth, in the design's order, within its limits (<bead id>)"
```

---

### Task 7: Bringing a definition home

**Files:**
- Create: `src/get.ts`, `tests/get.test.ts`

**Interfaces:**
- Consumes: `readSource`, `redirectTarget`, `Unresolved` from `src/read.ts`; `Session`; `checkSaid`; `appearances` from `src/scan.ts`; `definitionAddress`.
- Produces: `type GetResult = { said: string; from: string; written: string[]; missing: { said: string; looked: string[] }[]; unresolved: Unresolved[] }`; `type GetOutcome = { ok: true; files: Map<string, Uint8Array>; result: GetResult } | { ok: false; problem: string; unresolved: Unresolved[] }`; `get(said: string, from: string, session: Session): Promise<GetOutcome>`. `files` maps `<SAID>.json` to verified bytes; nothing is written here.

**Acceptance Criteria:**
- A selection whose closure is split between the starting source and a source it introduces `for` the missing SAIDs: every file is returned and verifies, `written` is the sorted closure, `missing` is empty, and `build` accepts a folder of those files as its input and serves the same SAIDs.
- A SAID-shaped string in a definition that no read source lists is `missing` with `looked` naming the start and the introduced sources that were read, and no definition request for it reaches any origin.
- A source that serves other bytes for a SAID in the closure adds no file and leaves a `failed-check` entry with that SAID; a SAID is fetched from the first source that lists it (the start first, then introduced sources in address order), and from nowhere else.
- The starting source unreadable, or the SAID asked for not fetched and verified, gives `{ ok: false }` with the reason among `unresolved`. The SAID asked for may come from an introduced source when the start does not list it.
- Only the first `introductionsPerSource` introductions (address order) are read; more gives one `truncated` entry for the start. A source at its definitions limit no longer counts as listing; the next listing source is tried, else `missing`, and the source gets one `truncated` entry. An introduced source on a host already used up is `skipped` with the limit's name; a source whose host is used up after it supplied files keeps those files, supplies nothing more, and gets one `timed-out` entry.

- [ ] **Step 1: Write the failing tests**

`tests/get.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { checkSaid, saidOf, FILL } from "../src/said.ts";
import { appearances } from "../src/scan.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { get } from "../src/get.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...WALK, requestMs: 2000, runMs: 10_000, ...more }, { test: true });
/** The closure of a SAID over the fixture folder. */
const closure = (said: string): string[] => { const seen = new Set<string>(); const q = [said]; while (q.length) { const s = q.shift()!; if (seen.has(s) || !inputs.has(s)) continue; seen.add(s); q.push(...appearances(inputs.get(s)!, s)); } return [...seen].sort(); };
/** A sub-map of the fixtures. */
const only = (saids: string[]) => new Map(saids.map((s) => [s, inputs.get(s)!]));

test("a closure split across the start and an introduced source comes home whole, in build's input shape", async () => {
  const all = closure(SELECTION);
  const half = Math.floor(all.length / 2);
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  // b serves the second half of the closure as a source of its own; its closure may reach into the first half, and a is asked first.
  // a holds only the first half, so it serves what it can reach from the selection within that half; whatever it cannot, b does.
  b.source("mad/", { serve: all.slice(half) }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr, for: all.slice(half) }] }, only(all.slice(0, half).concat(SELECTION)));
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.deepEqual(r.result.written, all);
  assert.deepEqual(r.result.missing, []);
  assert.deepEqual(r.result.unresolved, []);
  for (const [file, bytes] of r.files) assert.ok(checkSaid(bytes, file.slice(0, -5)), file);
  const dir = mkdtempSync(join(tmpdir(), "home-"));
  for (const [file, bytes] of r.files) writeFileSync(join(dir, file), bytes);
  const { inputs: homed, refused } = readInputs(dir);
  assert.deepEqual(refused, []);
  const plan = planBuild(homed, parseConfig(JSON.stringify({ source: "https://home.example/source.json", serve: [SELECTION] })));
  assert.deepEqual(plan.document.serves.map((s) => s.said), all);
  // a was asked first for what it lists; b only for what a does not list
  const askedOfB = b.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.ok(askedOfB.every((s) => !a.files.has(`mad/definitions/${s}.json`)), "nothing b was asked for was listed by a");
});

test("a SAID-shaped string nobody lists is missing, with where it was looked for, and is requested from nobody", async () => {
  const shape = (said: string, inner: string) => `{"d":"${said}","rely":"${inner}"}`;
  const ghost = "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";   // SAID-shaped, nowhere
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"), ghost)));
  const bytes = new TextEncoder().encode(shape(said, ghost));
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const aAddr = `${a.origin}/mad/source.json`;
  a.put("mad/source.json", JSON.stringify({ source: aAddr, serves: [{ said, refers: [ghost] }], introductions: [{ source: bAddr }] }));
  a.put(`mad/definitions/${said}.json`, bytes);
  const r = await get(said, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.result.written, [said]);
  assert.deepEqual(r.result.missing, [{ said: ghost, looked: [aAddr, bAddr] }]);
  for (const o of [a, b]) assert.ok(!o.requests.some((p) => p.includes(ghost)), "never requested");
});

test("wrong bytes add no file; the first listing source is the one asked", async () => {
  const all = closure(SELECTION);
  const victim = all.find((s) => s !== SELECTION)!;
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  a.put(`mad/definitions/${victim}.json`, '{"d":"' + victim + '"}');
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(!r.files.has(`${victim}.json`));
  assert.deepEqual(r.result.unresolved, [{ address: aAddr, via: [], reason: "failed-check", said: victim }]);
  assert.ok(!b.requests.some((p) => p.includes(victim)), "a listed it, so b was not asked");
  assert.deepEqual(r.result.written, all.filter((s) => s !== victim));
});

test("the start unreadable, or the asked SAID unverified, is a failure with nothing to write", async () => {
  const dead = await Origin.start();
  const deadAddr = `${dead.origin}/mad/source.json`;
  await dead.close();
  const r1 = await get(SELECTION, deadAddr, session());
  assert.deepEqual(r1, { ok: false, problem: "the starting source could not be read: unreachable", unresolved: [{ address: deadAddr, via: [], reason: "unreachable" }] });
  const a = await start();
  const { address } = a.source("mad/", { serve: [SELECTION] }, inputs);
  a.put(`mad/definitions/${SELECTION}.json`, "{}");
  const r2 = await get(SELECTION, address, session());
  assert.ok(!r2.ok && r2.problem === "the definition asked for was not fetched and verified" && r2.unresolved[0]!.reason === "failed-check");
  const b = await start();
  const { address: bAddr } = b.source("mad/", { serve: [closure(SELECTION).find((s) => s !== SELECTION)!] }, inputs);
  const r3 = await get(SELECTION, bAddr, session());
  assert.ok(!r3.ok && r3.problem === "the definition asked for was not fetched and verified", "the start does not list it and introduces nobody");
});

test("the SAID asked for may come from an introduced source when the start does not list it", async () => {
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const other = closure(SELECTION).find((s) => s !== SELECTION)!;
  const { address: aAddr } = a.source("mad/", { serve: [other], introductions: [{ source: bAddr, for: [SELECTION] }] }, inputs);
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok, "the design's get prose: the first source that lists it, among the start and its introductions");
  if (!r.ok) return;
  assert.deepEqual(r.result.written, closure(SELECTION));
  assert.ok(b.requests.includes(`mad/definitions/${SELECTION}.json`));
});

test("introductions and definitions limits are applied and recorded", async () => {
  const all = closure(SELECTION);
  const others = [await start(), await start(), await start()];
  const otherAddrs = others.map((o) => `${o.origin}/mad/source.json`);
  for (const o of others) o.source("mad/", { serve: [SELECTION] }, inputs);
  const a = await start();
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: otherAddrs.map((source) => ({ source })) }, inputs);
  const r = await get(SELECTION, aAddr, session({ introductionsPerSource: 2 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.result.unresolved, [{ address: aAddr, via: [], reason: "truncated", limit: "introductions" }]);
  const read = others.filter((o) => o.requests.includes("mad/source.json")).length;
  assert.equal(read, 2);

  const r2 = await get(SELECTION, aAddr, session({ introductionsPerSource: 3, definitionsPerSource: 4 }));
  assert.ok(r2.ok);
  if (!r2.ok) return;
  assert.ok(all.length > 4 && all.length <= 16, "the class-brick closure is 12 today: more than one source's four, within four sources' sixteen");
  assert.deepEqual(r2.result.written, all, "the start gives four, then each introduced source gives four: every SAID is still written");
  assert.ok(r2.result.unresolved.some((u) => u.address === aAddr && u.reason === "truncated" && u.limit === "definitions"), "the start reached its limit");
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/get.test.ts`
Expected: FAIL, cannot find module `../src/get.ts`.

- [ ] **Step 3: Write `src/get.ts`**

```ts
import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, redirectTarget, type Unresolved } from "./read.ts";
import { Session } from "./session.ts";

export type GetResult = {
  said: string;
  from: string;
  written: string[];
  missing: { said: string; looked: string[] }[];
  unresolved: Unresolved[];
};

export type GetOutcome =
  | { ok: true; files: Map<string, Uint8Array>; result: GetResult }
  | { ok: false; problem: string; unresolved: Unresolved[] };

type Known = {
  address: string;
  via: string[];
  base: string;
  serves: Set<string>;
  fetched: number;      // definitions asked of this source, against definitionsPerSource
  cut: boolean;         // it listed a SAID it was not asked for because it had reached that limit
  exhausted: boolean;   // its host's time or bytes ran out; it supplies nothing more
};

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * docs/design.md "Bringing a definition home": read the starting source and the sources its introductions name, one step and no
 * further; work outward from the SAID asked for, taking appearances in sorted order; fetch each SAID from the first source that lists
 * it (the start, then the introduced sources in address order); check every definition; a SAID no read source lists is missing and
 * is requested from nobody. Nothing is written here: the caller writes the files once the SAID asked for is among them.
 */
export async function get(said: string, from: string, session: Session): Promise<GetOutcome> {
  const unresolved: Unresolved[] = [];
  const known = async (address: string, via: string[]): Promise<Known | null> => {
    const stop = session.exhausted(Session.hostOf(address));
    if (stop !== null) { unresolved.push({ address, via, reason: "skipped", limit: stop }); return null; }
    const r = await readSource(address, via, session);
    if (!r.ok) { unresolved.push(r.unresolved); return null; }
    return { address, via, base: r.base, serves: new Set(r.document.serves.map((s) => s.said)), fetched: 0, cut: false, exhausted: false };
  };
  const startRead = await readSource(from, [], session);
  if (!startRead.ok) return { ok: false, problem: `the starting source could not be read: ${startRead.unresolved.reason}`, unresolved: [startRead.unresolved] };
  const start: Known = { address: from, via: [], base: startRead.base, serves: new Set(startRead.document.serves.map((s) => s.said)), fetched: 0, cut: false, exhausted: false };

  const introductions = startRead.document.introductions.slice(0, session.limits.introductionsPerSource);
  if (startRead.document.introductions.length > introductions.length) unresolved.push({ address: from, via: [], reason: "truncated", limit: "introductions" });
  const others: (Known | null)[] = introductions.map(() => null);
  await session.each(introductions.map((i, k) => ({ i, k })), ({ i }) => Session.hostOf(i.source), async ({ i, k }) => { others[k] = await known(i.source, [from]); });
  const sources: Known[] = [start, ...others.filter((k): k is Known => k !== null)];

  const files = new Map<string, Uint8Array>();
  const missing: { said: string; looked: string[] }[] = [];
  const seen = new Set<string>([said]);
  const queue = [said];
  while (queue.length > 0) {
    const target = queue.shift()!;
    let holder: Known | undefined;
    for (const s of sources) {
      if (!s.serves.has(target) || s.exhausted) continue;
      if (s.fetched < session.limits.definitionsPerSource) { holder = s; break; }
      s.cut = true;
    }
    if (holder === undefined) { missing.push({ said: target, looked: sources.map((s) => s.address) }); continue; }
    holder.fetched++;
    const g = await session.fetch(definitionAddress(holder.base, target));
    if (session.exhausted(Session.hostOf(holder.address)) !== null) {
      // The host's time or bytes ran out: one entry for the source, nothing more asked of it; the SAID goes back to the queue for the next lister.
      holder.exhausted = true;
      unresolved.push({ address: holder.address, via: holder.via, reason: "timed-out" });
      if (g.outcome !== "ok" || !checkSaid(g.bytes, target)) { queue.unshift(target); continue; }
    }
    if (g.outcome !== "ok") { unresolved.push({ address: holder.address, via: holder.via, reason: g.outcome, said: target, ...redirectTarget(g) }); continue; }
    if (!checkSaid(g.bytes, target)) { unresolved.push({ address: holder.address, via: holder.via, reason: "failed-check", said: target }); continue; }
    files.set(`${target}.json`, g.bytes);
    for (const inner of appearances(g.bytes, target)) if (!seen.has(inner)) { seen.add(inner); queue.push(inner); }
  }
  for (const s of sources) if (s.cut) unresolved.push({ address: s.address, via: s.via, reason: "truncated", limit: "definitions" });

  if (!files.has(`${said}.json`)) return { ok: false, problem: "the definition asked for was not fetched and verified", unresolved };
  missing.sort((a, b) => byString(a.said, b.said));
  return { ok: true, files, result: { said, from, written: [...files.keys()].map((f) => f.slice(0, -5)).sort(byString), missing, unresolved } };
}
```

What the design fixes and the code follows: a SAID is fetched from the first listing source, the start first and then the introduced sources in address order, and a failed check there is not retried at the next (the entry says where it failed). What this plan added and the maintainer confirmed at the stress test (2026-11-10), now in the design too: a lister at its definitions limit no longer counts as listing; the SAID asked for may come from an introduced source; an introduced source on a used-up host is `skipped`; a source whose host is used up after it supplied files keeps those files and gets one `timed-out` entry, because a verified file is its own account, where a walk's row about a source is not.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/get.test.ts`
Expected: all pass. If the first test's `only(aServes.concat(SELECTION))` fails in `planBuild` because the start's closure reaches a SAID not in the sub-map, that is the intended split: `planBuild` serves what the folder holds and reports the rest as `unserved`, and the introduction `for` the second half covers them; the test asserts the result, not the plan.

- [ ] **Step 5: Commit**

```bash
git add src/get.ts tests/get.test.ts
git commit -m "feat: get brings a definition and everything that appears in it home, from the start and its introductions (<bead id>)"
```

---

### Task 8: The commands: `who`, `get`, `verify` over an address

**Files:**
- Modify: `src/cli.ts`, `bin/mad-discovery.ts`, `src/build.ts` (`writeFiles` replaces `writePlan`), `tests/build.test.ts` (import `writeFiles`), `tests/cli.test.ts` (append)

**Interfaces:**
- Consumes: `walk`, `get`, `Session`, `WALK`, `Limits`, `Resolve`, `parseSourceAddress`, `parseHttpsAddress`.
- Produces: `type RunOptions = { test?: boolean; resolve?: Resolve; limits?: Limits }`; `main(argv: string[], io: Io, options?: RunOptions): Promise<number>`; `writeFiles(files: Map<string, Uint8Array>, outDir: string): void` in `src/build.ts`. The `bin` passes no options.

**Acceptance Criteria:**
- `who <SAID> --from <address>` prints the report and exits 0, also when entries are unresolved; exits 1 with `{ said, from, problem, target? }` when the start cannot be read; exits 2 on a missing or malformed SAID, a `--from` that fails the source address rule, or `--catalog`, with the usage on stderr and nothing on stdout.
- `get <SAID> --from <address> --out <folder>` checks `--out` before any request (a non-empty folder exits 1 with `{ problems }` and no origin sees a request), writes only verified files, prints the result and exits 0; on failure prints `{ said, from, problem, unresolved }`, writes nothing and exits 1.
- `verify <https address> <SAID>` fetches through the routine and prints `{ verified: true, said, address, bytes }` or `{ verified: false, expected, address, reason }` with exit 1; an address that fails the rule is `reason: "refused-address"` exit 1; a file still works as before.
- Every output is ASCII-only: a publication name holding non-ASCII text appears escaped; a publication whose name holds `\u001b` is dropped and counted under `dropped`, never printed; a definition whose key holding the SAID is an escape sequence reaches the report as a path written `\u001b[31m`, with no raw control character in the output.
- `node bin/mad-discovery.ts` with no command prints the usage with all four commands and exits 2.

- [ ] **Step 1: Append the failing tests to `tests/cli.test.ts`**

```ts
// imports: see the note after this block

const capture = () => { const o: string[] = [], e: string[] = []; const io: Io = { out: (s) => { o.push(s); }, err: (s) => { e.push(s); } }; return { io, out: () => o.join(""), err: () => e.join(""), json: () => JSON.parse(o.join("")) as Record<string, unknown> }; };
const local = { test: true, limits: { ...WALK, requestMs: 2000, runMs: 10_000 } };
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const compactInputs = readInputs(join(fixtures, "compact")).inputs;

test("who prints the report and exits 0; a start that cannot be read exits 1; usage errors exit 2", async () => {
  const [a, b] = [await Origin.start(), await Origin.start()];
  try {
    const bAddr = `${b.origin}/mad/source.json`;
    b.source("mad/", { serve: [SELECTION], publications: [{ target: SELECTION, name: "caf\u00e9", description: "d", tags: [], collection: "c" }] }, compactInputs);
    // A control character in a publication's name cannot pass the configuration; a hostile source puts one on the wire by hand and the
    // reader drops and counts it. A definition whose key holding the SAID is an escape sequence reaches the report as a path. The key is
    // written with the JSON escape, six characters on the wire: a raw control character inside a JSON string is not JSON.
    const bDoc = JSON.parse(new TextDecoder().decode(b.files.get("mad/source.json")!)) as { serves: unknown[]; publications: unknown[] };
    bDoc.publications.push({ target: SELECTION, name: "\u001b[31m", description: "d", tags: [], collection: "c" });
    const shape = (said: string) => `{"d":"${said}","\\u001b[31m":"${SELECTION}"}`;
    const evil = saidOf(new TextEncoder().encode(shape("#".repeat(44))));
    bDoc.serves.push({ said: evil, refers: [SELECTION] });
    b.put("mad/source.json", JSON.stringify(bDoc));
    b.put(`mad/definitions/${evil}.json`, shape(evil));
    const { address } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, compactInputs);
    let c = capture();
    assert.equal(await main(["who", SELECTION, "--from", address], c.io, local), 0);
    assert.equal((c.json().serves as unknown[]).length, 2);
    assert.ok(/^[\x20-\x7e\n]*$/.test(c.out()), "ASCII-only");
    assert.ok(c.out().includes("caf\\u00e9"), "non-ASCII escaped");
    assert.ok(c.out().includes("\\u001b[31m") && !c.out().includes("\u001b"), "the escape sequence in the path is written as text, never raw");
    assert.deepEqual(c.json().dropped, [{ source: bAddr, entries: 0, publications: 1 }], "the hostile publication was dropped and counted");
    assert.deepEqual((c.json().referrers as { said: string; paths: string[] }[]).map((e) => [e.said, e.paths]), [[evil, ["/\u001b[31m"]]]);
    assert.equal(c.err(), "");

    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    c = capture();
    assert.equal(await main(["who", SELECTION, "--from", deadAddr], c.io, local), 1);
    assert.deepEqual(c.json(), { said: SELECTION, from: deadAddr, problem: "the starting source could not be read: unreachable" });

    for (const args of [["who"], ["who", "nope", "--from", address], ["who", SELECTION], ["who", SELECTION, "--from", "https://1.2.3.4/source.json"], ["who", SELECTION, "--from", address, "--catalog", "https://c.example/catalog.json"]]) {
      c = capture();
      assert.equal(await main(args, c.io, local), 2, args.join(" "));
      assert.equal(c.out(), "");
      assert.ok(c.err().startsWith("usage:"));
    }
  } finally { await a.close(); await b.close(); }
});

test("get checks --out first, writes verified files only, and reports", async () => {
  const a = await Origin.start();
  try {
    const { address } = a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const full = mkdtempSync(join(tmpdir(), "full-")); writeFileSync(join(full, "x"), "x");
    let c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", full], c.io, local), 1);
    assert.deepEqual(c.json(), { problems: [`${full} is not empty`] });
    assert.equal(a.requests.length, 0, "no request before the out-folder check");

    const out = join(mkdtempSync(join(tmpdir(), "get-")), "home");
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", out], c.io, local), 0);
    const written = c.json().written as string[];
    assert.deepEqual(readdirSync(out).sort(), written.map((s) => `${s}.json`).sort());
    assert.equal(c.json().said, SELECTION);

    a.put(`mad/definitions/${SELECTION}.json`, "{}");
    const out2 = join(mkdtempSync(join(tmpdir(), "get-")), "home");
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address, "--out", out2], c.io, local), 1);
    assert.equal(c.json().problem, "the definition asked for was not fetched and verified");
    assert.ok(!existsSync(out2));
    c = capture();
    assert.equal(await main(["get", SELECTION, "--from", address], c.io, local), 2, "--out is required");
  } finally { await a.close(); }
});

test("verify over an address fetches through the routine", async () => {
  const a = await Origin.start();
  try {
    a.source("mad/", { serve: [SELECTION] }, compactInputs);
    const address = `${a.origin}/mad/definitions/${SELECTION}.json`;
    let c = capture();
    assert.equal(await main(["verify", address, SELECTION], c.io, local), 0);
    assert.deepEqual(c.json(), { verified: true, said: SELECTION, address, bytes: compactInputs.get(SELECTION)!.length });
    c = capture();
    assert.equal(await main(["verify", address, QVI], c.io, local), 1);
    assert.equal(c.json().reason, "the SAID is not in the bytes");
    assert.equal(c.json().address, address);
    c = capture();
    assert.equal(await main(["verify", `${a.origin}/mad/definitions/missing.json`, SELECTION], c.io, local), 1);
    assert.deepEqual(c.json(), { verified: false, expected: SELECTION, address: `${a.origin}/mad/definitions/missing.json`, reason: "not-found" });
    c = capture();
    assert.equal(await main(["verify", "https://1.2.3.4/x.json", SELECTION], c.io, local), 1);
    assert.deepEqual(c.json(), { verified: false, expected: SELECTION, address: "https://1.2.3.4/x.json", reason: "refused-address" });
    c = capture();
    assert.equal(await main(["verify", address, SELECTION], c.io), 1, "outside tests the local address fails the rule");
    assert.equal(c.json().reason, "refused-address");
  } finally { await a.close(); }
});

test("the usage names four commands", () => {
  const r = run();
  assert.equal(r.code, 2);
  for (const cmd of ["build <folder>", "verify <file or address> <SAID>", "who <SAID> --from <source address>", "get <SAID> --from <source address> --out <folder>"]) assert.ok(r.err.includes(cmd), cmd);
});
```

`QVI`, `fixtures`, `run`, `mkdtempSync`, `tmpdir`, `join`, `readdirSync`, `writeFileSync`, `existsSync` are already imported or defined at the top of `tests/cli.test.ts`. Put the new imports at the top of the file with the existing ones: merge the `cli.ts` import into `import { asciiJson, main, type Io } from "../src/cli.ts";` and add `import { readInputs } from "../src/inputs.ts";`, `import { saidOf } from "../src/said.ts";`, `import { WALK } from "../src/limits.ts";` and `import { Origin } from "./helpers/servers.ts";`; the `capture`, `local`, `SELECTION` and `compactInputs` definitions go after the existing top-level definitions. In the existing test "usage errors exit 2", delete the line `assert.equal(run("verify", "https://gym.example/mad/definitions/x.json", QVI).code, 2);`: with `verify` over an address built, that call would pass the address rule and resolve `gym.example` with the real resolver, a live DNS query from the test suite. Its replacement is the `main(["verify", address, SELECTION], c.io)` call below, refused before any resolution.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/cli.test.ts`
Expected: FAIL: `main` returns a number, not a promise; `who` and `get` are unknown; `Origin.source` exists but `main` has no third parameter.

- [ ] **Step 3: `writeFiles` in `src/build.ts`**

Replace `writePlan` with:

```ts
/** Writes every file, creating folders as needed, after checking the out-folder rule. */
export function writeFiles(files: Map<string, Uint8Array>, outDir: string): void {
  const problem = outDirProblem(outDir);
  if (problem !== null) throw new Error(problem);
  mkdirSync(outDir, { recursive: true });
  for (const [path, bytes] of files) {
    const full = join(outDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
  }
}
```

Update `tests/build.test.ts` to import `writeFiles`, call `writeFiles(plan.files, out)` where it called `writePlan(plan, out)`, and rename its test "writePlan needs an absent or empty folder and writes every file" to "writeFiles needs an absent or empty folder and writes every file".

- [ ] **Step 4: Rewrite `src/cli.ts`**

```ts
import { readFileSync } from "node:fs";
import { isSaid, checkSaid, saidOf, replaceAll, FILL } from "./said.ts";
import { parseConfig, ConfigError } from "./config.ts";
import { readInputs } from "./inputs.ts";
import { planBuild, writeFiles, outDirProblem, BuildError } from "./build.ts";
import { parseHttpsAddress, parseSourceAddress } from "./address.ts";
import { Session } from "./session.ts";
import { WALK, type Limits } from "./limits.ts";
import { walk } from "./walk.ts";
import { get } from "./get.ts";
import { redirectTarget } from "./read.ts";
import type { Resolve } from "./fetch.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };
/** test, resolve and limits exist for the tests; the bin passes none, so a local origin is never a source outside a test. */
export type RunOptions = { test?: boolean; resolve?: Resolve; limits?: Limits };

const USAGE = `usage:
  mad-discovery build <folder> --config <file> --out <folder>
  mad-discovery verify <file or address> <SAID>
  mad-discovery who <SAID> --from <source address>
  mad-discovery get <SAID> --from <source address> --out <folder>
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

function usage(io: Io, note = ""): number {
  io.err(USAGE + "\n" + (note === "" ? "" : note + "\n"));
  return 2;
}

export async function main(argv: string[], io: Io, options: RunOptions = {}): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "build") return build(rest, io);
  if (command === "verify") return verify(rest, io, options);
  if (command === "who") return who(rest, io, options);
  if (command === "get") return bringHome(rest, io, options);
  return usage(io);
}

const session = (options: RunOptions): Session => new Session(options.limits ?? WALK, { test: options.test, resolve: options.resolve });

function build(args: string[], io: Io): number {
  const folder = args[0];
  const configPath = flag(args, "--config");
  const out = flag(args, "--out");
  if (folder === undefined || folder.startsWith("--") || configPath === undefined || out === undefined) return usage(io);
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
    writeFiles(plan.files, out);
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

async function verify(args: string[], io: Io, options: RunOptions): Promise<number> {
  const [target, said] = args;
  if (target === undefined || said === undefined || !isSaid(said)) return usage(io, "The SAID is required and must match the pattern.");
  let bytes: Uint8Array;
  let where: { address?: string } = {};
  if (/^https?:\/\//i.test(target)) {
    const address = parseHttpsAddress(target, { test: options.test });
    if (address === null) { io.out(asciiJson({ verified: false, expected: said, address: target, reason: "refused-address" }) + "\n"); return 1; }
    const f = await session(options).fetch(address);
    if (f.outcome !== "ok") { io.out(asciiJson({ verified: false, expected: said, address, reason: f.outcome, ...redirectTarget(f) }) + "\n"); return 1; }
    bytes = f.bytes;
    where = { address };
  } else {
    try { bytes = new Uint8Array(readFileSync(target)); }
    catch { io.out(asciiJson({ verified: false, expected: said, reason: `cannot read ${target}` }) + "\n"); return 1; }
  }
  if (checkSaid(bytes, said)) { io.out(asciiJson({ verified: true, said, ...where, bytes: bytes.length }) + "\n"); return 0; }
  const needle = Buffer.from(said, "ascii");
  const present = Buffer.from(bytes).includes(needle);
  const computed = present ? saidOf(replaceAll(bytes, needle, FILL)) : saidOf(bytes);
  const reason = !present ? "the SAID is not in the bytes"
    : computed !== said ? "the digest of the hashed form is not the SAID"
    : "the hashed form does not rebuild to the served bytes";
  io.out(asciiJson({ verified: false, expected: said, ...where, computed, reason }) + "\n");
  return 1;
}

async function who(args: string[], io: Io, options: RunOptions): Promise<number> {
  if (args.includes("--catalog")) return usage(io, "--catalog arrives with the catalog, the second epic.");
  const said = args[0];
  const from = flag(args, "--from");
  if (said === undefined || !isSaid(said) || from === undefined) return usage(io, "The SAID must match the pattern and --from is required.");
  const start = parseSourceAddress(from, { test: options.test });
  if (start === null) return usage(io, "--from must be a source address: https, a DNS name, a path ending in /source.json.");
  const r = await walk(said, start.address, session(options));
  if (!r.ok) {
    io.out(asciiJson({ said, from: start.address, problem: `the starting source could not be read: ${r.reason}`, ...(r.target !== undefined ? { target: r.target } : {}) }) + "\n");
    return 1;
  }
  io.out(asciiJson(r.report) + "\n");
  return 0;
}

async function bringHome(args: string[], io: Io, options: RunOptions): Promise<number> {
  const said = args[0];
  const from = flag(args, "--from");
  const out = flag(args, "--out");
  if (said === undefined || !isSaid(said) || from === undefined || out === undefined) return usage(io, "The SAID must match the pattern; --from and --out are required.");
  const start = parseSourceAddress(from, { test: options.test });
  if (start === null) return usage(io, "--from must be a source address: https, a DNS name, a path ending in /source.json.");
  const outProblem = outDirProblem(out);
  if (outProblem !== null) { io.out(asciiJson({ problems: [outProblem] }) + "\n"); return 1; }
  const r = await get(said, start.address, session(options));
  if (!r.ok) { io.out(asciiJson({ said, from: start.address, problem: r.problem, unresolved: r.unresolved }) + "\n"); return 1; }
  writeFiles(r.files, out);
  io.out(asciiJson(r.result) + "\n");
  return 0;
}
```

`bin/mad-discovery.ts`:

```ts
import { main } from "../src/cli.ts";

process.exitCode = await main(process.argv.slice(2), {
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
});
```

- [ ] **Step 5: Run the checks and the whole suite**

Run: `npm run check && npm test`
Expected: all pass, including the step 1 CLI tests that spawn the bin (the build command is unchanged in behaviour).

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts bin/mad-discovery.ts src/build.ts tests/build.test.ts tests/cli.test.ts
git commit -m "feat: who, get, and verify over an address; main awaits the network (<bead id>)"
```

---

### Task 9: Documentation and registration

**Files:**
- Modify: `README.md` (Status, Running it), `CLAUDE.md` (current plan, a third rule), `docs/plans/walk-and-get.md` (header: executed), `/Users/seriouscoderone/code/bpm/CLAUDE.md` (architecture entry: steps 1 and 2 built)
- Workspace: `bd remember --key mad-discovery-map` updated; the bead notes carry what changed.

**Acceptance Criteria:**
- README Status says steps 1 and 2 of the first epic are built, names the four commands, says `who --catalog` waits on the second epic, and that nothing is deployed. Running it lists `who`, `get` and `verify <address>` with their arguments.
- `CLAUDE.md` names `docs/plans/walk-and-get.md` as the current plan and adds the rule: every byte from the network enters through `src/fetch.ts`; nothing else opens a socket; no redirect is followed; the built-in `fetch` and the global agent are never used; `test: true` is set by test code only.
- The workspace `CLAUDE.md` architecture entry for mad-discovery says steps 1 and 2 are built and names both plans.
- `npm --prefix mad-discovery run check && npm --prefix mad-discovery test` passes from the workspace root.

- [ ] **Step 1: README**

In `## Status`, replace the two sentences from "Step 1 of the first epic is built" through "Nothing is deployed." with:

"Steps 1 and 2 of the first epic are built: `build` makes a source from a folder of frozen definitions; `verify` checks a file or an address against a SAID; `who` walks from one source through its introductions and reports who serves, offers or contains a SAID; `get` brings a definition and everything that appears in it home. `who --catalog` waits on the catalog, the second epic. Nothing is deployed."

In `## Running it`, after the `verify` line, add:

```bash
node bin/mad-discovery.ts verify <https address> <SAID>
node bin/mad-discovery.ts who <SAID> --from <source address>
node bin/mad-discovery.ts get <SAID> --from <source address> --out <folder>
```

and after the code block: "`who` and `get` reach only `https` sources on the default port at DNS names; the tests stand up local origins through a test-only option that no flag exposes."

- [ ] **Step 2: CLAUDE.md**

Change "The current plan is `docs/plans/source-build.md`." to "The plans are `docs/plans/source-build.md` (step 1) and `docs/plans/walk-and-get.md` (step 2, current)." Change "Two rules an agent must not break here:" to "Three rules an agent must not break here:" and add the third bullet:

"- Every byte from the network enters through `fetchJson` in `src/fetch.ts`, which resolves a name once, refuses any answer that is not public, connects only to the address it checked, follows no redirect and accepts no content encoding. Nothing else opens a socket; the built-in `fetch` and the global agent are never used. The `test` option that admits plain HTTP, other ports and loopback is set by test code only, never by a flag, a configuration field or an environment variable."

- [ ] **Step 3: Workspace CLAUDE.md**

In `/Users/seriouscoderone/code/bpm/CLAUDE.md`, in the `mad-discovery/` architecture entry, replace "Code: step 1 of bpm-5g1 is built (`build` makes a source from a folder of frozen definitions; `verify` checks a file against a SAID); its plan is `mad-discovery/docs/plans/source-build.md`." with "Code: steps 1 and 2 of bpm-5g1 are built (`build`, `verify` over a file or an address, the walk `who`, and `get`); plans: `mad-discovery/docs/plans/source-build.md` and `mad-discovery/docs/plans/walk-and-get.md`. Step 3 (AI Catalog entries) is outside the epic's acceptance."

- [ ] **Step 4: This plan's header**

Add under the title's note, as `source-build.md` has: "**Executed <date>.** ..." with the final commit and what the reviews changed, once the final review is done (the orchestrator writes this line).

- [ ] **Step 5: Check from the workspace root, then commit both repositories**

Run: `cd /Users/seriouscoderone/code/bpm && npm --prefix mad-discovery run check && npm --prefix mad-discovery test`

```bash
cd /Users/seriouscoderone/code/bpm/mad-discovery && git add README.md CLAUDE.md docs/plans/walk-and-get.md && git commit -m "docs: steps 1 and 2 are built; the fetch rule for agents (<bead id>)" && git push
cd /Users/seriouscoderone/code/bpm && git add CLAUDE.md && git commit -m "docs: mad-discovery steps 1 and 2 are built (<bead id>)" && git push
```

---

## Self-review

**Spec coverage.** Design, "Fetching safely": HTTPS/443/DNS only (fetch, address rule); redirects not followed (fetch); check on the connection with own agent and own lookup, not the global agent, not `fetch` (fetch); refused ranges incl. mapped and NAT64 (ip); cancellable resolver (fetch, `resolveNames`); bytes on the wire, no encoding, size while reading (fetch); JSON content types (fetch); the tool's name (fetch); test opt-in through one parameter (address rule from step 1, fetch, session, cli `RunOptions`); proxies ignored (fetch, tested in a child). Limits table, walk column: every row in `WALK` (limits) and applied in session (request, file, host time, host bytes, hosts in flight, run) and walk/get (definitions, introductions, depth, sources); depth 64 and paths 16/256 stay in `PATH_LIMITS`, used by `parseBounded` (document) and `paths` (walk). Outcomes: every name produced except `disallowed`, which is the catalog build's. Per-definition `verified`/`failed-check`/`not-contained` and `not-there` (walk). "A source": every reading rule (document). "The walk": steps 1 to 5, breadth-first, order within a depth, cycles, the report's members except `catalog` (with `--catalog`, second epic), `via`, `reached`, keeps nothing, ASCII-only, never sends a SAID to a source that does not list it (walk, cli). "Bringing a definition home": all of it (get, cli). "The tool": the four commands, exit codes, `--out` rule, `verify` requires the SAID. "Tests", Walk: three origins, cycle, and every listed unresolved case (walk tests). Get: the four cases (get tests). Hostile sources: public-then-loopback (fetch: resolved once, second answer unused), never answers (fetch), IP literal (fetch), NAT64 accepted (ip), gzip (fetch), one byte per second (fetch), `../../x` (document), 100,000 deep source document (document), `__proto__`/`constructor` (document), flood sorting ahead (walk), 100,000-deep definition verified and reported without paths (walk), a definition holding a SAID 10,000 times with the paths cut at 16 (walk; the design's long key is replaced by an array, which exercises the same cut and keeps the pointers checkable), proxy variables (fetch child), 100,000-character description (document), escape sequences in a name (document; cli asserts ASCII output). Nothing in the design's lists for this step is left out.

**A gap inside the design, closed at the stress test.** "Introductions" says the reader records, for each introduction, the address of the source document it was found in "and that source's `by` when it states one"; "A source" says the tool stores and shows `oobi`; "Publications" says a publication without `by` takes the source document's. The report JSON in "The walk" had no slot for a visited source's `by` or `oobi`. The maintainer agreed (2026-11-10) to the `sources` list: one entry per source read, with `address`, `via`, and `by` and `oobi` when stated, never verified; `reached` is its length; a publication without its own `by` is attributed, by its `source` address, to that list's entry. The design's report carries it now.

**Dry run.** The whole plan was executed twice in scratch copies of the repository before it was presented (2026-11-09): every task's code and tests applied, `npm run check` and `npm test` run after each. The first run's ten findings, and the seventeen of a parallel reading of the plan against the design, were folded into the text; the four that would have blocked execution were parameter properties in a class (refused by `erasableSyntaxOnly` and by Node), the pages re-parsing introduction addresses without the test option, a control character in a configuration that `parseConfig` refuses, and a test that needed a later task's code. The second run, over the corrected text, applied Tasks 1 to 7 exactly as written, found one defect in Task 8's test (a raw control character inside a JSON string is not JSON; the wire carries the six-character escape, fixed above) and ended at 105 tests passing in about 1.3 s, with a preloaded hook across all 31 processes (test files, the proxy children and the `bin` spawns) confirming that every connection went to 127.0.0.1, no call reached the real resolver and nothing called the built-in `fetch`. Two additions came after that run, from the stress test: the report's `sources` list (Tasks 5 and 6) and the TLS fixture with its two tests (Task 2); the TLS claim they rest on was checked by hand against a self-signed local server, and they are otherwise exercised at execution.

**Placeholders.** `<bead id>` in commit messages is filled by the orchestrator from the bead it creates for the task; `<date>` in Task 9 step 4 is the execution date. No other.

**Type consistency.** `Fetched`, `Resolve`, `Outcome` (fetch) are used by session, read, walk, get, cli as declared. `Unresolved`/`Reason` live in `read.ts` and are imported by walk, get, cli. `Session.hostOf`, `exhausted`, `fetch`, `each`, `test`, `limits` as declared in Task 4 and used in 5-8. `Origin.source` is added in Task 5 and used in 5-8; Task 2's tests use only `put`, `behave`, `files`, `requests`. `writeFiles` replaces `writePlan` in Task 8 and the build test is updated there. `readSourceDocument` returns `document` with `pages` always present; `plan.document` from `build` also always sets `pages: true`, so the Task 3 round-trip holds.

**Scope check.** One subsystem: the network side of one package. No catalog, no finder, no hosting, no AWS.

## Stress Test Results: the step 2 plan

Run on 2026-11-10 with the maintainer, after he approved the plan. Nine branches, one at a time, each with a recommendation; he agreed with seven as recommended and two changed the plan.

### Resolved decisions

- **`get` after a host's budget runs out.** Keeps every definition already verified from that host, supplies nothing more from it, and records one `timed-out` entry for the source. The design's "never keeps part of a source" sentence is about a walk's or a catalog's account of a source; a verified file is its own account. Written into the design. Agreed; the maintainer added that the content-addressed space invites a class of efficiency algorithms, deduplication first.
- **Which source supplies a SAID in `get`.** The SAID asked for may come from an introduced source when the start does not list it; a lister at its definitions limit no longer counts as listing and the next lister is tried, the cut lister recorded `truncated`. The design's Tests sentence for `get` now reads "neither the starting source nor a source it introduces". Agreed.
- **`not-there`.** Judged on what the introduced source's document lists and carries; a listed definition that fails is `failed-check` or `not-contained` and not also `not-there`. The design's Outcomes sentence now says so. Agreed.
- **Counting the ten introductions.** The first ten listed in address order, visited or not. The design's limits row now says "visited or not". Agreed.
- **An unknown member inside a stranger's publication.** The reader ignores it; the operator's configuration keeps refusing one. The design's reading rule now says "inside a publication too". Agreed.
- **A source's stated `by` and `oobi` in the report.** The report gains `sources`: one entry per source read, in visit order, with `address`, `via`, and `by` and `oobi` when the document states them, never verified; `reached` is its length; a publication without its own `by` is attributed by its `source` address to that entry. Added to Tasks 5 and 6 and to the design's report. Modified.
- **`Content-Encoding: identity`.** Accepted, as the name of no encoding; every other value refused. The design's sentence now carries the exception. Agreed.
- **`who --catalog`.** Refused with a usage message until the second epic writes the catalog's per-SAID files. Agreed.
- **Security and risk.** The controls hold as planned (resolve once, check every answer, connect only to the checked address through our own agent and `lookup`; no redirect followed; encodings refused; size cut while reading; proxy settings ignored, proven against the global agent as a control; file names only from SAIDs that matched the pattern; every string through `asciiJson`; `--out` checked before the first request; `oobi` and `catalogs` never fetched; the `test` option a parameter only). One gap closed: Task 2 gains a self-signed certificate fixture and two tests, a fetch from it ending `unreachable`, and a child started with `NODE_TLS_REJECT_UNAUTHORIZED=0` still ending `unreachable` while a plain request in that child succeeds, which proves the explicit option wins over the environment (checked on this machine before it was written in). Modified.

### Changes made

- Task 2: `fixtures/tls/cert.pem` and `key.pem` made once with `openssl`, recorded in `fixtures/README.md`; `Origin.start(secure)`; the `lax` control mode in `fetch-child.ts`; the TLS test; the acceptance criterion that said no TLS server runs replaced.
- Tasks 5 and 6: `Report.sources`, `Visited.by` and `Visited.oobi`, `assemble` building `sources` and taking `reached` from it; assertions in the one-source and three-origins tests; acceptance criteria.
- Global Constraints and the Task 7 note: the `get` and walk readings stated as settled rather than pending.
- `docs/design.md`: the seven clauses above written in, and a dated note under its stress-test section.

### Deferred / parking lot

- Across runs, "I already hold this SAID, do not fetch it": the store's half (bpm-core's pull bpm-n13.3, MAD's import bpm-upm.21), where the folder of `<SAID>.json` files is the index; the maintainer's note on content-addressed efficiencies lands there first.
- A reader behind a proxy cannot walk; and `get`'s worst-case memory is the limits' product (up to 11 sources times 50 definitions times 1 MB held before writing). Both are the design's choices, named here, to revisit if real sources approach them.

### Confidence assessment

- Overall: high. The plan was dry-run twice to a passing suite before the stress test; the two additions are small and the one factual claim behind them was checked by hand.
- Areas of concern: the `sources` list is the first change to the report's shape since the design; it is the right place for stated AIDs but is untested against a stranger's reading, like every format here. The TLS tests spawn children with an environment variable that turns validation off; they exist to prove the routine ignores it, and the fixture key trusts nothing.
