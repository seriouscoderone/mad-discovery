# The finders, `catalog find` (step 6 of the second epic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** `mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` reads one public input that nobody here operates and writes one candidate file per snapshot, through `asciiJson`, that `catalog build --candidates` consumes: the robots finder over Common Crawl's robots.txt archive (one WARC fixture in the archive's shape, and one real crawl), and the GitHub-topic finder over GitHub's repository search (Ruling 10); and the second epic's clause 1 passes: two sources that never link to each other, named in a WARC fixture, end up in one catalog row.

**Architecture:** A finder is a module under `src/finders/`; `catalog find` runs it and writes its file. Finders read their inputs through one streaming fetch of their own (`src/finders/input.ts`), separate from the one routine that fetches strangers' addresses, because the inputs are gigabyte archives on hosts the code names, not addresses a stranger chose; it verifies TLS, follows no redirect, accepts the bytes as served, refuses an encoded answer, gives up an idle connection, retries a 429 or 5xx no faster than once a second, and holds at most 16 connections. The robots finder lists a crawl's 100,000 robots.txt WARC files, streams each through gunzip and a bounded WARC record parser, and takes from each response with status 200 the first `Mad-Source:` line; the GitHub finder pages through `search/repositories?q=topic:mad-source` and takes each repository's homepage. Both finders write only values that pass the source address rule, canonical, with where each was seen; the build de-duplicates and visits them (step 5). A WARC fixture in the archive's real shape is built by a test helper, committed once, and used by the stranger test.

**Tech Stack:** Node 24 (`node:https`, `node:zlib` streaming gunzip over Common Crawl's multi-member gzip, `node:stream`), TypeScript 7.0.2 as a type check only, `node --test`. No new dependency.

**Scope:** Design build order step 6 and acceptance clause 1 (stranger by fixture). The real crawl scan (about 150 GB, one to three hours on 16 connections) is a closing step run by the controller after the maintainer's go, since it uses his bandwidth; the GitHub finder's live run is one request. Clause 2 (stranger, live) and hosting the catalog are step 7. Nothing is deployed and no AWS is touched.

**Measured before planning (2026-11-12 UTC):** `https://data.commoncrawl.org/crawl-data/CC-MAIN-2026-43/robotstxt.paths.gz` lists 100,000 files of 1.4 to 1.6 MB each (about 150 GB), each a multi-member gzip (one member per WARC record, about 1,700 per file, about 860 responses; statuses the parser sees in one file: 541 x 200, 111 x 404, 103 x 301, 29 x 403, 26 x 302, 21 x 429, the other 28 are 307, 308, 406, 444 and 5xx). A record is `WARC/1.0`, CRLF-separated headers (`WARC-Type`, `WARC-Target-URI`, `Content-Length`, ...), a blank line, `Content-Length` payload bytes, then two CRLFs; a response's payload is an HTTP/1.1 status line, headers, blank line, body. Node's `zlib.createGunzip()` and `gunzipSync` both decode every member of such a file (2,722,448 bytes from the 1,413,921-byte sample). `https://index.commoncrawl.org/collinfo.json` lists the crawls newest first (`id: "CC-MAIN-2026-43"`, `name`, `from`, `to`). GitHub's `search/repositories?q=topic:mad-source` answers unauthenticated with `x-ratelimit-limit: 10` per minute and, today, zero repositories.

**Dry run (2026-11-12).** A first draft of this plan was executed in a scratch copy and read against the design: three text fixes brought it to 199 passing tests with nothing beyond loopback; its WARC parser read the real sample file (1,719 records, 859 responses, the status distribution above, 16 ms, no error); and the review's nineteen findings (the design's `#` rule for the line; GitHub's `incomplete_results`; workers that kept downloading after a failure; no idle timeout; unbounded inflation of the path listing; unbounded work over a hostile body; the two finders reading "dropped" differently; and nits) are folded in below. The code blocks here are the corrected ones.

## Global Constraints

From `docs/design.md` ("The catalog", "The robots.txt line", "Finding sources nobody linked", "What a finder returns", "Who runs a catalog", "Tests", "Acceptance", "Build order", decision 10) and the earlier plans' constraints, which still hold (the address rule; `asciiJson`; ASCII-only sources; the `test` option and any test-only option set by test code only, never by a flag, environment variable or configuration; no new dependency).

- **A finder is a module in this package; no outside code is loaded.** `catalog find` runs it and writes its candidates, each with where it was seen, to `<out>/<finder>/<snapshot>.json`. A file already there is kept and that snapshot is not read again; the output folder is the one thing kept between runs, so `catalog find` writes into a folder that may already hold files and never overwrites one (a file is written whole, to a `.part` name first, then renamed).
- **All or nothing per snapshot.** A finder reads all of a snapshot, or writes no file for it and exits non-zero. A missing or partly read input never produces a smaller catalog: the robots finder writes nothing for a crawl if any of its files cannot be read (after retries), and stops reading the rest as soon as one fails; the GitHub finder writes nothing when GitHub says the answer is incomplete or holds more results than it returns. A 429 or 503 is retried no faster than once a second.
- **One candidate per place seen: the first `Mad-Source` line in a robots.txt.** "The field name is matched without regard to case, and text after a `#` is ignored" (design, "The robots.txt line"); a line may start with whitespace. The robots finder reads responses with status 200 only. Two captures of one host give two candidates; the build de-duplicates. A first `Mad-Source` line whose value is empty or over 512 characters means that place names nothing (the design's literal reading; decision 9).
- **A finder writes source addresses.** "Candidates that are not source addresses are dropped" (design, "What a finder returns"): both finders apply the source address rule to each value and write the canonical address, counting the rest in the file's `summary`; the build's own `droppedCandidates` (step 5) stays as the defence for hand-made files.
- **Snapshots.** The robots finder's snapshots are Common Crawl's crawls under Common Crawl's own names (`CC-MAIN-YYYY-WW`); with no `--snapshot` it takes the three most recent, read from `collinfo.json` and sorted by name. The GitHub finder has no snapshot: its file is named by the UTC date it ran, and a build copies it into its output (step 5 does). `catalog.json` records the snapshots a build used (through the candidate files' names, step 5).
- **The finders' reads are outside the limits in "Fetching safely"**, which bound fetches of addresses a stranger chose: the robots finder reads archive files larger than 1 MB, on up to 16 connections to one host. Everything else about safety holds: TLS verified, no redirect followed, no content encoding accepted, an idle connection given up, the hosts fixed in code (`data.commoncrawl.org`, `index.commoncrawl.org`, `api.github.com`), a test's local origins admitted only through a test-only option. `catalog find` fetches no address a stranger chose: a `Mad-Source` value or a homepage is written to the candidate file and never fetched by it (tests assert the strangers' origins saw no request).
- **Candidate files** are the shape step 5 reads: `{ "finder", "snapshot", "candidates": [ { "address", "place" } ], "summary" }` with `finder` and `snapshot` matching `^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$`, `place` keys matching `^[A-Za-z][A-Za-z0-9_]{0,31}$` and values strings or numbers; the robots finder's `place` is `{ "file": "<archive path>", "offset": <byte offset of the record in the decompressed file>, "robots": "<the robots.txt address Common Crawl fetched>" }`, the GitHub finder's `{ "repository": "<owner/name>" }`. Written through `asciiJson` (so the copies step 5 makes are ASCII), candidates sorted by address then by place; no time in the file but the GitHub snapshot name, which is a date by design.
- **Strangers' text, bounded work.** A robots.txt body, a WARC header, a path listing, a GitHub answer are strangers' text: no regular expression over them (line splitting and prefix checks; the two anchored fixed patterns below run over one listing line or one repository name, linear); every value bounded (a `Mad-Source` value at most 512 characters; a repository name `owner/name` in GitHub's own charset, each part at most 100; a WARC header block at most 8 KB; a record payload at most 16 MB; a file at most 256 MB decompressed; a robots.txt body scanned to 512 KiB, which is more than RFC 9309 asks a crawler to read; the path listing at most 16 MB compressed and 64 MB inflated); nothing from them reaches a file name (the file is named by the finder and the snapshot, which `catalog find` validated); the only message that names input names its line number and length.
- **Tests reach only loopback.** A finder under test reads a local origin standing for the archive, the index and GitHub, through the test-only option; the `Origin` helper serves the WARC fixture, the paths listing and a GitHub answer.
- **The stranger case, by fixture (clause 1).** Two sources that never link to each other, a WARC fixture in the real shape of Common Crawl's robots.txt archive naming both (with 200 and non-200 responses and two captures of one host), `catalog find` over it, and `catalog build --candidates` from its file: the catalog's row for the shared SAID lists both.
- Workspace rules: small commits with the bead id and the trailers `Co-Authored-By: <the model that ran> <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GCnrh59DdJ8F5moTi1LZML`; files staged by name; mutating `bd` from `/Users/seriouscoderone/code/bpm`; `git pull --ff-only` before each task (another agent shares `main`); push after review. No AWS anywhere in this plan.

## Decisions this plan makes (for the gate)

The design review marked each: the design decides 2 (partly: the count and the names), 4 (the floor), 5 (the substance), 6 and 8 (partly) the way the plan has them; 1, 3 and 7 it leaves open; 9 reads one sentence of the design literally.

1. **A second network path, for the finders' inputs only.** `src/finders/input.ts` opens streams to three hosts named in code and nowhere else; it is not `fetchJson` because the inputs are 1.5 MB gzip files by the hundred thousand and 1 MB-bounded buffering would not do. CLAUDE.md's third rule gains the sentence: "The finders (`src/finders/`) read their own public inputs, hosts fixed in code, through `src/finders/input.ts`; that is the one other place a socket is opened, and it fetches no address a stranger chose." The design's "Fetching safely" already says the finder's reads are outside the limits; this names where, and what still holds there (TLS, no redirect, no encoding, an idle timeout of 60 s).
2. **The crawl list.** `collinfo.json` on `index.commoncrawl.org` is the list; the ids matching `^CC-MAIN-\d{4}-\d{2}$`, sorted descending (the form sorts by date), give the three newest. If the index host does not answer, `catalog find --finder robots` without `--snapshot` fails and says to name the crawls.
3. **The record's offset** in `place` is the byte offset of the record's `WARC/1.0` line in the decompressed file, which anyone who gunzips the file can seek to; Common Crawl's own indexes use the compressed member offset, which allows one range request but which a streaming gunzip does not expose without parsing gzip members. Open for the maintainer: the plan takes the decompressed offset, named `offset`, with the archive path in `file` and the robots.txt address in `robots`.
4. **Retries and timeouts.** A 429, a 5xx, a 403 whose `x-ratelimit-remaining` is `0` (GitHub's primary limit), or a connection error is retried after 1, 2, 4, 8 and 16 seconds (five retries), then the snapshot fails; an idle connection (no bytes for 60 s) counts as a connection error. A redirect, an encoded answer or another 4xx fails at once. Progress (`files done / total`) goes to stderr every 1,000 files and at the end; the summary JSON to stdout.
5. **The GitHub finder** reads unauthenticated (10 requests a minute), 100 results a page, pausing 6.5 seconds between pages, at most 10 pages (GitHub's 1,000-result ceiling); when GitHub answers `incomplete_results: true`, or `total_count` is over 1,000, the snapshot fails and nothing is written (all or nothing). A candidate is each repository whose `homepage` passes the source address rule and whose `full_name` is `owner/name` in GitHub's charset and well-formed, with `place: { repository: full_name }`; its snapshot is the UTC date (`YYYY-MM-DD`), so running it twice in one day keeps the first file, and two runs within a minute may see the second fail on the rate limit. A fixture of GitHub's answer in the API's shape (two usable homepages, one that is not a source address, one missing) is served by a local origin in tests.
6. **`catalog find`'s exit status** is 0 when every requested snapshot's file exists afterwards (written now or kept), 1 when any failed (the others' files stay written), 2 on usage. Its summary names `written`, `kept` and `failed`. A file is written to `<name>.part` and renamed, so a killed run leaves no half file that the next run would keep; deleting a snapshot's file makes the next run read that crawl again.
7. **Test-only inputs.** `RunOptions.finderInputs?: InputBases & { pause?: number; today?: string }` (the three bases, a pause override for the retries, and the date the GitHub finder names its file by) is set by test code only, like `test`; `bin/mad-discovery.ts` passes none, so the production finder can only reach the three fixed hosts. Only the three bases are passed to `Input`.
8. **The committed WARC fixture** (`fixtures/robotstxt/sample.warc.gz`) is generated by the test helper from fixed text; the test pins its decompressed content and member count against the helper's output, not its compressed bytes, which depend on the zlib build. The stranger test builds its own fixture at run time because the two sources' addresses carry ephemeral ports.
9. **The finder applies the source address rule.** The design lists "Candidates that are not source addresses are dropped" among the finder's bullets, so both finders drop them, write the canonical address, and count what they dropped; the robots finder's first `Mad-Source` line decides for its place (an empty or over-long value names nothing). The build keeps its own drop for hand-made files.

## File structure

```
mad-discovery/
  src/finders/input.ts      Input: streaming GET of a fixed public input; retries; no redirect; no encoding; idle timeout; bounded
  src/finders/warc.ts       warcRecords(stream): the bounded WARC record parser; robotsLine(payload): status 200 and the first Mad-Source value
  src/finders/candidates.ts FinderCandidate, CandidateFile (shared with src/catalog.ts), FinderResult, candidateFileBytes
  src/finders/robots.ts     listCrawls(input), robotsFinder(snapshot, input, opts, progress?): the robots finder
  src/finders/github.ts     githubFinder(input, today, opts): the GitHub-topic finder
  src/cli.ts                catalog find; RunOptions.finderInputs (test only)
  tests/helpers/warc.ts     warcGz(captures): a multi-member gzip WARC file in the archive's shape; SAMPLE_CAPTURES
  fixtures/robotstxt/sample.warc.gz, fixtures/robotstxt/README.md
  fixtures/github/search-sample.json
  tests/input.test.ts, warc.test.ts, finder-robots.test.ts, finder-github.test.ts, cli.test.ts (catalog find), stranger.test.ts
  CLAUDE.md (rule 3), README.md, docs/design.md (clarifications), ../CLAUDE.md
```

Dependencies between tasks: 1 -> 3 -> 5 -> 6; 2 -> 3; 1 -> 4 -> 5; 6 -> 7.

---

### Task 1: The finders' input: a streaming fetch of fixed public hosts

**Files:**
- Create: `src/finders/input.ts`, `tests/input.test.ts`
- Modify: `CLAUDE.md` (rule 3)

**Interfaces:**
- Produces: `type InputBases = { archive: string; index: string; github: string }`; `const PUBLIC_INPUTS: InputBases = { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" }`; `type InputOptions = { test?: boolean; connections?: number; retries?: number; pause?: number; idleMs?: number; sleep?: (ms: number) => Promise<void> }`; `type InputReason = "refused-url" | "status" | "redirected" | "encoded" | "too-large" | "unreachable"`; `class InputError extends Error { url; reason: InputReason; status?: number }`; `class Input { constructor(bases: InputBases, opts?: InputOptions); readonly bases: InputBases; readonly sleep: (ms: number) => Promise<void>; open(url: string, headers?: Record<string, string>): Promise<{ status: 200; stream: Readable; headers: IncomingHttpHeaders }>; readAll(url: string, maxBytes: number, headers?: Record<string, string>): Promise<Uint8Array>; close(): void }`. `open` resolves only on a 200 without a content encoding.

**Acceptance Criteria:**
- A URL that does not extend one of the three bases is refused (`refused-url`) without a request; with `test: true` the bases may be plain-HTTP loopback origins (the test's), and the same prefix rule applies; without it a loopback base is refused.
- `open` sends `Accept-Encoding: identity` and the tool's `User-Agent`, plus the caller's headers; it does not follow a 3xx (`redirected`); an answer whose `content-encoding` is present and not `identity` fails at once (`encoded`); a 4xx other than 429 (and other than a 403 with `x-ratelimit-remaining: 0`) fails at once (`status`); a 429, that 403, a 5xx, a connection error or an idle connection (no bytes for `idleMs`, default 60 s) is retried after 1, 2, 4, 8, 16 seconds (through `sleep`, injected in tests), then fails (`status` or `unreachable`); TLS is verified (`rejectUnauthorized: true`, set explicitly).
- At most `connections` (default 16) sockets to one host at a time, through one `Agent` with keep-alive, closed by `close()`.
- `readAll` returns the body up to `maxBytes` and throws `too-large` when the body exceeds it, destroying the request.
- CLAUDE.md's third rule names this module as the one other place a socket is opened.

- [ ] **Step 1: Write the failing tests**

`tests/input.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { Input, InputError, PUBLIC_INPUTS } from "../src/finders/input.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const slept: number[] = [];
const sleep = async (ms: number) => { slept.push(ms); };
const input = (more: Record<string, unknown> = {}) => new Input(bases, { test: true, sleep, ...more });
const reason = (r: string, status?: number) => (e: unknown) => e instanceof InputError && e.reason === r && (status === undefined || e.status === status);

test("the public inputs are the three hosts the design names, and nothing else is opened", async () => {
  assert.deepEqual(PUBLIC_INPUTS, { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" });
  const i = input();
  const before = origin.requests.length;
  for (const url of ["https://data.commoncrawl.org/x", `${origin.origin}/elsewhere/x`, "http://evil.test/archive/x", `${origin.origin}/archive`, `${origin.origin}/archive/`]) {
    await assert.rejects(i.open(url), reason("refused-url"), url);
  }
  assert.equal(origin.requests.length, before, "a refused URL costs no request");
  const prod = new Input(PUBLIC_INPUTS, { sleep });
  await assert.rejects(prod.open(`${origin.origin}/archive/x`), reason("refused-url"), "a URL outside the public bases is refused");
  const notTest = new Input(bases, { sleep });
  await assert.rejects(notTest.open(`${origin.origin}/archive/x`), reason("refused-url"), "a loopback base needs the test option");
  i.close(); prod.close(); notTest.close();
});

test("open streams a 200 as served, with identity encoding and the tool's user agent; readAll bounds the body; an encoded answer is refused", async () => {
  origin.put("archive/a.bin", new Uint8Array([1, 2, 3, 4, 5]));
  let seen: Record<string, unknown> = {};
  origin.behave = (req, res) => {
    seen = { ...req.headers };
    if (req.url === "/archive/zipped") { res.setHeader("content-encoding", "gzip"); res.end("x"); return true; }
    return false;
  };
  try {
    const i = input();
    const r = await i.open(`${origin.origin}/archive/a.bin`, { accept: "application/octet-stream" });
    assert.equal(r.status, 200);
    const chunks: Buffer[] = []; for await (const c of r.stream) chunks.push(c as Buffer);
    assert.deepEqual(new Uint8Array(Buffer.concat(chunks)), new Uint8Array([1, 2, 3, 4, 5]));
    assert.equal(seen["accept-encoding"], "identity");
    assert.equal(seen["accept"], "application/octet-stream");
    assert.match(String(seen["user-agent"]), /^mad-discovery /);
    assert.deepEqual(new Uint8Array(await i.readAll(`${origin.origin}/archive/a.bin`, 5)), new Uint8Array([1, 2, 3, 4, 5]));
    await assert.rejects(i.readAll(`${origin.origin}/archive/a.bin`, 4), reason("too-large"));
    await assert.rejects(i.open(`${origin.origin}/archive/zipped`), reason("encoded"));
    i.close();
  } finally { origin.behave = null; }
});

test("a redirect is not followed; a 404 fails at once; a 503, a 429 or a rate-limited 403 is retried after 1, 2, 4, 8, 16 seconds and then fails; a connection error and an idle connection likewise", async () => {
  let calls = 0;
  origin.behave = (req, res) => {
    calls++;
    if (req.url === "/archive/moved") { res.statusCode = 302; res.setHeader("location", `${origin.origin}/archive/a.bin`); res.end(); return true; }
    if (req.url === "/archive/busy") { res.statusCode = 503; res.end(); return true; }
    if (req.url === "/archive/slow") { res.statusCode = 429; res.end(); return true; }
    if (req.url === "/archive/limited") { res.statusCode = 403; res.setHeader("x-ratelimit-remaining", "0"); res.end(); return true; }
    if (req.url === "/archive/forbidden") { res.statusCode = 403; res.end(); return true; }
    if (req.url === "/archive/flaky") { res.statusCode = calls <= 2 ? 503 : 200; res.end(calls > 2 ? "ok" : undefined); return true; }
    if (req.url === "/archive/stalled") { res.writeHead(200); res.flushHeaders(); return true; }   // headers, then nothing
    return false;
  };
  try {
    const i = input();
    const before = origin.requests.length;
    await assert.rejects(i.open(`${origin.origin}/archive/moved`), reason("redirected"));
    assert.deepEqual(origin.requests.slice(before), ["archive/moved"], "the redirect's target was not requested");
    await assert.rejects(i.open(`${origin.origin}/archive/missing`), reason("status", 404));
    await assert.rejects(i.open(`${origin.origin}/archive/forbidden`), reason("status", 403));
    assert.equal(origin.requests.filter((p) => p === "archive/forbidden").length, 1, "a plain 403 is not retried");
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/busy`), reason("status", 503));
    assert.deepEqual(slept, [1000, 2000, 4000, 8000, 16000], "five retries, doubling from one second");
    assert.equal(origin.requests.filter((p) => p === "archive/busy").length, 6);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/slow`), reason("status", 429));
    assert.equal(slept.length, 5);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/limited`), reason("status", 403));
    assert.equal(slept.length, 5, "a 403 with x-ratelimit-remaining 0 is GitHub's rate limit: retried like a 429");
    calls = 0; slept.length = 0;
    const r = await i.open(`${origin.origin}/archive/flaky`);
    assert.equal(r.status, 200); assert.deepEqual(slept, [1000, 2000], "recovered on the third try");
    r.stream.resume();
    const dead = await Origin.start(); const deadBases = { ...bases, archive: `${dead.origin}/archive/` }; await dead.close();
    slept.length = 0;
    await assert.rejects(new Input(deadBases, { test: true, sleep }).open(`${deadBases.archive}x`), reason("unreachable"));
    assert.equal(slept.length, 5);
    slept.length = 0;
    const quick = input({ idleMs: 50 });
    await assert.rejects(quick.readAll(`${origin.origin}/archive/stalled`, 100), reason("unreachable"), "no bytes for idleMs: the connection is given up");
    quick.close(); i.close();
  } finally { origin.behave = null; }
});

test("at most the configured connections to a host are open at once", async () => {
  let open = 0, peak = 0;
  origin.behave = (_req, res) => { open++; peak = Math.max(peak, open); setTimeout(() => { open--; res.end("x"); }, 30); return true; };
  try {
    const i = new Input(bases, { test: true, sleep, connections: 3 });
    await Promise.all(Array.from({ length: 9 }, (_, k) => i.readAll(`${origin.origin}/archive/c${k}`, 10)));
    assert.equal(peak, 3);
    i.close();
  } finally { origin.behave = null; }
});
```

The `stalled` route flushes its headers and then sends nothing: `open` has resolved, so the idle timeout surfaces inside `readAll`'s body loop as the stream's error, which `readAll` maps to `unreachable` without retrying (the retry loop covers the request, not a body that stalls after a 200). The test asserts the reason, not a retry count.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/input.test.ts`
Expected: FAIL, cannot find module `../src/finders/input.ts`.

- [ ] **Step 3: Write `src/finders/input.ts`**

```ts
import http from "node:http";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import type { Readable } from "node:stream";
import { USER_AGENT } from "../fetch.ts";

/** The public inputs a finder reads: hosts named here and nowhere else. A test's local origins stand in through the test option. */
export type InputBases = { archive: string; index: string; github: string };
export const PUBLIC_INPUTS: InputBases = { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" };

export type InputOptions = {
  test?: boolean;                        // admits plain-HTTP loopback bases; set by test code only
  connections?: number;                  // sockets to one host at a time; 16 by default (docs/design.md, Fetching safely)
  retries?: number;                      // after a 429, a rate-limited 403, a 5xx, a connection error or an idle connection; 5 by default
  pause?: number;                        // the first pause in ms, doubling; 1000 by default
  idleMs?: number;                       // no bytes for this long is a connection error; 60 s by default
  sleep?: (ms: number) => Promise<void>; // tests inject one
};

export type InputReason = "refused-url" | "status" | "redirected" | "encoded" | "too-large" | "unreachable";

export class InputError extends Error {
  readonly url: string;
  readonly reason: InputReason;
  readonly status: number | undefined;
  constructor(url: string, reason: InputReason, status?: number) {
    super(`${reason}${status !== undefined ? ` ${status}` : ""}: ${url}`);
    this.url = url;
    this.reason = reason;
    this.status = status;
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const LOOPBACK_BASE = /^http:\/\/(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?\//;

/**
 * One streaming GET of a fixed public input (docs/design.md "What a finder returns": a finder's reads of its own public input are
 * outside the limits that bound fetches of strangers' addresses). It verifies TLS, follows no redirect, accepts no content encoding,
 * gives up an idle connection, retries a 429, a rate-limited 403, a 5xx or a connection error no faster than once a second, and holds
 * at most `connections` sockets to a host.
 */
export class Input {
  readonly bases: InputBases;
  readonly sleep: (ms: number) => Promise<void>;
  private readonly test: boolean;
  private readonly retries: number;
  private readonly pause: number;
  private readonly idleMs: number;
  private readonly httpsAgent: https.Agent;
  private readonly httpAgent: http.Agent;

  constructor(bases: InputBases, opts: InputOptions = {}) {
    this.bases = bases;
    this.sleep = opts.sleep ?? wait;
    this.test = opts.test === true;
    this.retries = opts.retries ?? 5;
    this.pause = opts.pause ?? 1000;
    this.idleMs = opts.idleMs ?? 60_000;
    const max = opts.connections ?? 16;
    this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: max });
    this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: max });
  }

  /** The URL must extend one of the bases, and the base must be https unless the test option admits a loopback one. */
  private admitted(url: string): boolean {
    const base = [this.bases.archive, this.bases.index, this.bases.github].find((b) => url.startsWith(b) && url.length > b.length);
    if (base === undefined) return false;
    if (base.startsWith("https://")) return true;
    return this.test && LOOPBACK_BASE.test(base);
  }

  /** One request; resolves with the response once its headers arrive, or rejects with an InputError. */
  private once(url: string, headers: Record<string, string>): Promise<http.IncomingMessage> {
    return new Promise((resolve, reject) => {
      const secure = url.startsWith("https://");
      const req = (secure ? https : http).request(url, {
        method: "GET",
        agent: secure ? this.httpsAgent : this.httpAgent,
        rejectUnauthorized: true,
        headers: { "accept-encoding": "identity", "user-agent": USER_AGENT, ...headers },
      }, (res) => {
        res.setTimeout(this.idleMs, () => res.destroy(new InputError(url, "unreachable")));   // no bytes for idleMs: give the connection up
        resolve(res);
      });
      req.setTimeout(this.idleMs, () => req.destroy(new InputError(url, "unreachable")));
      req.on("error", (e) => reject(e instanceof InputError ? e : new InputError(url, "unreachable")));
      req.end();
    });
  }

  /** Whether an answer is to be tried again: a 429, GitHub's rate-limited 403, any 5xx. */
  private static retried(res: http.IncomingMessage): boolean {
    const status = res.statusCode ?? 0;
    return status === 429 || status >= 500 || (status === 403 && res.headers["x-ratelimit-remaining"] === "0");
  }

  /** A 200 answer's stream, or an InputError. Retried endings pause 1, 2, 4, 8, 16 s between tries. */
  async open(url: string, headers: Record<string, string> = {}): Promise<{ status: 200; stream: Readable; headers: IncomingHttpHeaders }> {
    if (!this.admitted(url)) throw new InputError(url, "refused-url");
    let last: InputError = new InputError(url, "unreachable");
    for (let attempt = 0; ; attempt++) {
      let res: http.IncomingMessage | null = null;
      try { res = await this.once(url, headers); } catch (e) { last = e instanceof InputError ? e : new InputError(url, "unreachable"); }
      if (res !== null) {
        const status = res.statusCode ?? 0;
        if (status === 200) {
          const encoding = res.headers["content-encoding"];
          if (encoding !== undefined && encoding.toLowerCase() !== "identity") { res.destroy(); throw new InputError(url, "encoded", 200); }
          return { status, stream: res, headers: res.headers };
        }
        res.resume();
        if (status >= 300 && status < 400) throw new InputError(url, "redirected", status);
        last = new InputError(url, "status", status);
        if (!Input.retried(res)) throw last;
      }
      if (attempt >= this.retries) throw last;
      await this.sleep(this.pause * 2 ** attempt);
    }
  }

  /** The whole body of a small input, bounded. */
  async readAll(url: string, maxBytes: number, headers: Record<string, string> = {}): Promise<Uint8Array> {
    const { stream } = await this.open(url, headers);
    const chunks: Buffer[] = [];
    let read = 0;
    try {
      for await (const chunk of stream) {
        read += (chunk as Buffer).length;
        if (read > maxBytes) { stream.destroy(); throw new InputError(url, "too-large"); }
        chunks.push(chunk as Buffer);
      }
    } catch (e) {
      if (e instanceof InputError) throw e;
      throw new InputError(url, "unreachable");   // the stream failed mid-body (an idle timeout, a reset)
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  close(): void {
    this.httpsAgent.destroy();
    this.httpAgent.destroy();
  }
}
```

`open` retries the request, not the body: a stall after the headers surfaces as the stream's error (`res.setTimeout`), which `readAll` maps to `unreachable` and which the robots finder's `warcRecords` loop sees as a failed file. A stall before the headers fires `req.setTimeout` inside `once`, which rejects, and the loop retries it.

- [ ] **Step 4: CLAUDE.md**

In `CLAUDE.md`, append to the third rule's paragraph: " The finders (`src/finders/`) read their own public inputs, hosts fixed in code, through `src/finders/input.ts`; that is the one other place a socket is opened, and it fetches no address a stranger chose."

- [ ] **Step 5: Run the checks and the whole suite, then commit**

Run: `npm run check && npm test`

```bash
git add src/finders/input.ts tests/input.test.ts CLAUDE.md
git commit -m "feat: the finders' input: a streaming fetch of three fixed public hosts, retried, no redirect, no encoding (<bead id>)"
```

---

### Task 2: The WARC record parser and the robots line

**Files:**
- Create: `src/finders/warc.ts`, `tests/helpers/warc.ts`, `tests/warc.test.ts`, `fixtures/robotstxt/sample.warc.gz`, `fixtures/robotstxt/README.md`

**Interfaces:**
- Produces: in `src/finders/warc.ts`: `type WarcRecord = { offset: number; type: string; uri: string | null; payload: Uint8Array }`; `class WarcError extends Error`; `const MAX_FILE = 256 * 1024 * 1024`; `async function* warcRecords(stream: Readable, maxFile?: number): AsyncGenerator<WarcRecord>` (the stream is the gunzipped bytes; a header block over 8 KB, a payload over 16 MB, a file over `maxFile` decompressed bytes (default `MAX_FILE`), a truncated file or a `Content-Length` that does not end in two CRLFs throws `WarcError`); `robotsLine(payload: Uint8Array): string | null` (the first `Mad-Source` line of a status-200 HTTP response: field name case-insensitive, leading whitespace allowed, text after `#` ignored; the value trimmed; `null` for any other status, no such line, or a first value that is empty or over 512 characters). In `tests/helpers/warc.ts`: `type Capture = { uri: string; status: number; body: string; date?: string }`; `warcGz(captures: Capture[]): Uint8Array`; `SAMPLE_CAPTURES: Capture[]`.

**Acceptance Criteria:**
- `warcRecords` yields every record of the fixture with its type, `WARC-Target-URI` and payload bytes exactly, and the decompressed byte offset of each record's `WARC/1.0` line; over the real Common Crawl sample's layout it yields every record (the dry run read 1,719 records, 859 responses, 0 errors).
- `warcRecords` throws `WarcError` for a header block over 8 KB, a payload over 16 MB, a decompressed file over `maxFile`, a record cut short, and a payload not followed by two CRLFs; it joins chunks once per record, not once per chunk.
- `robotsLine` returns the first `Mad-Source` value of a 200 response whatever the field's letter case, leading whitespace and surrounding spaces, with text after `#` cut off; ignores the field in a 301/404/403/429/503 response; returns `null` when the first `Mad-Source` line's value is empty or over 512 characters (that place names nothing); scans at most 512 KiB of body, one line at a time; uses no regular expression; a status line `HTTP/1.1 2000` is not 200.
- `fixtures/robotstxt/sample.warc.gz` decompresses to the same bytes as `warcGz(SAMPLE_CAPTURES)` with the same member count, gunzips with Node, and holds 200 and non-200 responses and two captures of one host.

- [ ] **Step 1: Write the test helper**

`tests/helpers/warc.ts`:

```ts
import { gzipSync } from "node:zlib";

export type Capture = { uri: string; status: number; body: string; date?: string };

const CRLF = "\r\n";
const reason = (status: number): string => ({ 200: "OK", 301: "Moved Permanently", 302: "Found", 403: "Forbidden", 404: "Not Found", 429: "Too Many Requests", 503: "Service Unavailable" } as Record<number, string>)[status] ?? "Unknown";

function record(headers: [string, string][], payload: Uint8Array): Uint8Array {
  const head = ["WARC/1.0", ...headers.map(([k, v]) => `${k}: ${v}`), `Content-Length: ${payload.length}`, "", ""].join(CRLF);
  return Buffer.concat([Buffer.from(head, "latin1"), payload, Buffer.from(CRLF + CRLF, "latin1")]);
}

/**
 * A robots.txt WARC file in the shape of Common Crawl's archive (measured 2026-11-12): a warcinfo record, then for each capture a
 * request record and a response record whose payload is the HTTP response; every record its own gzip member; CRLF line ends.
 */
export function warcGz(captures: Capture[]): Uint8Array {
  const members: Uint8Array[] = [];
  const info = Buffer.from(["isPartOf: FIXTURE", "publisher: mad-discovery tests", "format: WARC File Format 1.1", ""].join(CRLF), "latin1");
  members.push(gzipSync(record([["WARC-Type", "warcinfo"], ["WARC-Date", "2026-01-01T00:00:00Z"], ["WARC-Record-ID", "<urn:uuid:00000000-0000-0000-0000-000000000000>"], ["Content-Type", "application/warc-fields"], ["WARC-Filename", "sample.warc.gz"]], info)));
  captures.forEach((c, i) => {
    const date = c.date ?? "2026-01-01T00:00:00Z";
    const host = new URL(c.uri).host;
    const request = Buffer.from([`GET ${new URL(c.uri).pathname} HTTP/1.1`, "User-Agent: CCBot/2.0 (https://commoncrawl.org/faq/)", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", `Host: ${host}`, "Connection: Keep-Alive", "", ""].join(CRLF), "latin1");
    members.push(gzipSync(record([["WARC-Type", "request"], ["WARC-Date", date], ["WARC-Record-ID", `<urn:uuid:${String(i).padStart(8, "0")}-0000-0000-0000-000000000001>`], ["Content-Type", "application/http; msgtype=request"], ["WARC-Target-URI", c.uri]], request)));
    const body = Buffer.from(c.body, "utf8");
    const response = Buffer.concat([Buffer.from([`HTTP/1.1 ${c.status} ${reason(c.status)}`, `content-length: ${body.length}`, "content-type: text/plain", "", ""].join(CRLF), "latin1"), body]);
    members.push(gzipSync(record([["WARC-Type", "response"], ["WARC-Date", date], ["WARC-Record-ID", `<urn:uuid:${String(i).padStart(8, "0")}-0000-0000-0000-000000000002>`], ["Content-Type", "application/http; msgtype=response"], ["WARC-Target-URI", c.uri], ["WARC-Identified-Payload-Type", "text/plain"]], response)));
  });
  return new Uint8Array(Buffer.concat(members));
}

/** The committed fixture's captures: sources named in several spellings, 200 and non-200 answers, two captures of one host, and lines that name nothing. */
export const SAMPLE_CAPTURES: Capture[] = [
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n" },
  { uri: "http://beta.example/robots.txt", status: 200, body: "# a comment\nUser-agent: *\nDisallow: /private/\nmad-source:   https://beta.example/discovery/source.json   \nMad-Source: https://beta.example/second/source.json\n" },
  { uri: "http://gamma.example/robots.txt", status: 404, body: "Mad-Source: https://gamma.example/source.json\n" },
  { uri: "http://delta.example/robots.txt", status: 301, body: "" },
  { uri: "http://epsilon.example/robots.txt", status: 200, body: "User-agent: *\nDisallow:\n" },
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n", date: "2026-01-02T00:00:00Z" },
  { uri: "http://zeta.example/robots.txt", status: 200, body: "Mad-Source\nMad-Source: \nMad-Source: https://zeta.example/source.json\n" },
  { uri: "http://theta.example/robots.txt", status: 200, body: "Mad-Source: https://theta.example/source.json # the primary\n" },
  { uri: "http://iota.example/robots.txt", status: 200, body: "   mad-source: https://iota.example/source.json\r\n" },
  { uri: "http://kappa.example/robots.txt", status: 200, body: "Mad-Source: not an address\n" },
];
```

- [ ] **Step 2: Write the failing tests**

`tests/warc.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync, gzipSync } from "node:zlib";
import { warcRecords, robotsLine, WarcError } from "../src/finders/warc.ts";
import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";

const FIXTURE = fileURLToPath(new URL("../fixtures/robotstxt/sample.warc.gz", import.meta.url));
const records = async (gz: Uint8Array, maxFile?: number) => { const out = []; for await (const r of warcRecords(Readable.from([Buffer.from(gz)]).pipe(createGunzip()), maxFile)) out.push(r); return out; };
const members = (gz: Uint8Array): number => { let n = 0; for (let i = 0; i + 2 < gz.length; i++) if (gz[i] === 0x1f && gz[i + 1] === 0x8b && gz[i + 2] === 0x08) n++; return n; };

test("the committed fixture decompresses to the helper's output over its listed captures, member for member, and Node gunzips it", () => {
  const committed = new Uint8Array(readFileSync(FIXTURE));
  const fresh = warcGz(SAMPLE_CAPTURES);
  assert.deepEqual(gunzipSync(committed), gunzipSync(fresh), "regenerate with tests/helpers/warc.ts when the captures change");
  assert.equal(members(committed), members(fresh)); assert.equal(members(committed), 1 + 2 * SAMPLE_CAPTURES.length);
  const text = gunzipSync(committed).toString("latin1");
  assert.equal(text.split("WARC-Type: response").length - 1, SAMPLE_CAPTURES.length);
  assert.ok(text.includes("HTTP/1.1 404 Not Found") && text.includes("HTTP/1.1 301 Moved Permanently"));
});

test("warcRecords yields every record with its type, target and payload, at its decompressed offset", async () => {
  const gz = warcGz(SAMPLE_CAPTURES);
  const all = await records(gz);
  assert.equal(all.length, 1 + 2 * SAMPLE_CAPTURES.length);
  assert.equal(all[0]!.type, "warcinfo"); assert.equal(all[0]!.uri, null); assert.equal(all[0]!.offset, 0);
  const plain = gunzipSync(gz).toString("latin1");
  for (const r of all) assert.equal(plain.slice(r.offset, r.offset + 8), "WARC/1.0", `offset ${r.offset}`);
  const responses = all.filter((r) => r.type === "response");
  assert.deepEqual(responses.map((r) => r.uri), SAMPLE_CAPTURES.map((c) => c.uri));
  assert.ok(Buffer.from(responses[0]!.payload).toString("utf8").startsWith("HTTP/1.1 200 OK\r\n"));
  assert.ok(Buffer.from(responses[0]!.payload).toString("utf8").endsWith(SAMPLE_CAPTURES[0]!.body));
});

test("warcRecords refuses a header block over 8 KB, a payload over 16 MB, a file over its cap, a truncated record and a payload without its trailing CRLFs", async () => {
  const big = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nX: ${"a".repeat(9000)}\r\nContent-Length: 0\r\n\r\n\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(big)), (e: unknown) => e instanceof WarcError);
  const huge = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nContent-Length: ${17 * 1024 * 1024}\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(huge)), (e: unknown) => e instanceof WarcError);
  const plain = gunzipSync(warcGz(SAMPLE_CAPTURES.slice(0, 1)));
  await assert.rejects(records(gzipSync(plain.subarray(0, plain.length - 40))), (e: unknown) => e instanceof WarcError, "a record cut short");
  const lying = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nContent-Length: 2\r\n\r\nabcd\r\n\r\n`, "latin1");
  await assert.rejects(records(gzipSync(lying)), (e: unknown) => e instanceof WarcError, "the payload length lies: no CRLFs where they must be");
  await assert.rejects(records(warcGz(SAMPLE_CAPTURES), 1000), (e: unknown) => e instanceof WarcError && e.message.includes("decompressed"), "a file over its decompressed cap");
});

test("robotsLine takes the first Mad-Source value of a 200 response, in any case or spacing, text after # cut off, and nothing from any other answer", async () => {
  const all = await records(warcGz(SAMPLE_CAPTURES));
  const responses = all.filter((r) => r.type === "response");
  assert.deepEqual(responses.map((r) => robotsLine(r.payload)), [
    "https://mad.alpha.example/source.json",
    "https://beta.example/discovery/source.json",   // the first of two lines, trimmed
    null,   // 404 with the line: not read
    null,   // 301
    null,   // 200 without the line
    "https://mad.alpha.example/source.json",   // the second capture of alpha
    null,   // zeta: the first Mad-Source line's value is empty, so this place names nothing
    "https://theta.example/source.json",   // text after # ignored
    "https://iota.example/source.json",    // leading whitespace and a CRLF line end
    "not an address",   // a value, not an address: the finder drops it
  ]);
  const long = Buffer.from(`HTTP/1.1 200 OK\r\n\r\nMad-Source: ${"a".repeat(513)}\n`, "latin1");
  assert.equal(robotsLine(long), null, "a value over 512 characters");
  assert.equal(robotsLine(Buffer.from("HTTP/1.1 2000 OK\r\n\r\nMad-Source: https://x.example/source.json\n", "latin1")), null, "2000 is not 200");
  assert.equal(robotsLine(Buffer.from("HTTP/1.0 200\r\n\r\nMAD-SOURCE:https://x.example/source.json", "latin1")), "https://x.example/source.json", "HTTP/1.0 and no space after the colon");
  assert.equal(robotsLine(Buffer.from("not http", "latin1")), null);
  const far = Buffer.from(`HTTP/1.1 200 OK\r\n\r\n${"\n".repeat(600 * 1024)}Mad-Source: https://late.example/source.json\n`, "latin1");
  const t0 = performance.now();
  assert.equal(robotsLine(far), null, "a line past 512 KiB of body is not read");
  assert.ok(performance.now() - t0 < 200, `bounded work: ${performance.now() - t0} ms`);
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/warc.test.ts`
Expected: FAIL, cannot find module `../src/finders/warc.ts` (and the fixture is missing).

- [ ] **Step 4: Write `src/finders/warc.ts`**

```ts
import type { Readable } from "node:stream";

export type WarcRecord = { offset: number; type: string; uri: string | null; payload: Uint8Array };

export class WarcError extends Error {}

const MAX_HEADER = 8 * 1024;               // a record's header block
const MAX_PAYLOAD = 16 * 1024 * 1024;      // a record's payload; a robots.txt capture is kilobytes
export const MAX_FILE = 256 * 1024 * 1024; // one archive file decompressed; measured files inflate to about 2.7 MB
const CRLFCRLF = Buffer.from("\r\n\r\n", "latin1");

/**
 * The records of a WARC file (WARC/1.0 and 1.1 as Common Crawl writes them): a header block of CRLF lines ending in an empty line,
 * Content-Length bytes of payload, then two CRLFs. Yields each record with the decompressed byte offset of its first line. A stranger's
 * file: every length is bounded, chunks are joined once per record, and nothing is interpreted beyond the two headers the finder needs.
 */
export async function* warcRecords(stream: Readable, maxFile: number = MAX_FILE): AsyncGenerator<WarcRecord> {
  let buf = Buffer.alloc(0);      // bytes not yet consumed, as one buffer
  let pending: Buffer[] = [];     // chunks received since, joined only when needed
  let pendingBytes = 0;
  let consumed = 0;               // decompressed bytes before buf[0]
  let total = 0;                  // decompressed bytes read so far
  let ended = false;
  const iterator = stream[Symbol.asyncIterator]();
  const more = async (): Promise<boolean> => {
    if (ended) return false;
    const n = await iterator.next();
    if (n.done) { ended = true; return false; }
    const chunk = n.value as Buffer;
    total += chunk.length;
    if (total > maxFile) throw new WarcError(`more than ${maxFile} decompressed bytes`);
    pending.push(chunk);
    pendingBytes += chunk.length;
    return true;
  };
  const join = (): void => { if (pending.length > 0) { buf = Buffer.concat([buf, ...pending]); pending = []; pendingBytes = 0; } };
  for (;;) {
    join();
    let headEnd = buf.indexOf(CRLFCRLF);
    while (headEnd < 0 && buf.length <= MAX_HEADER + 4 && (await more())) { join(); headEnd = buf.indexOf(CRLFCRLF); }
    if (headEnd < 0) {
      if (buf.length <= MAX_HEADER + 4 && buf.toString("latin1").trim() === "") return;   // end of file, blank lines allowed
      throw new WarcError(`a header block without an end, or over ${MAX_HEADER} bytes, at ${consumed}`);
    }
    if (headEnd > MAX_HEADER) throw new WarcError(`a header block over ${MAX_HEADER} bytes at ${consumed}`);
    const headText = buf.subarray(0, headEnd).toString("latin1");
    const firstLine = headText.indexOf("WARC/");
    if (firstLine < 0) throw new WarcError(`not a WARC record at ${consumed}`);
    const offset = consumed + firstLine;
    const headers = new Map<string, string>();
    for (const line of headText.slice(firstLine).split("\r\n").slice(1)) {
      const colon = line.indexOf(":");
      if (colon > 0) headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
    }
    const length = Number(headers.get("content-length"));
    if (!Number.isInteger(length) || length < 0 || length > MAX_PAYLOAD) throw new WarcError(`a payload length out of bounds at ${offset}`);
    const need = headEnd + 4 + length + 4;
    while (buf.length + pendingBytes < need) if (!(await more())) throw new WarcError(`a record cut short at ${offset}`);
    join();
    const payload = new Uint8Array(buf.subarray(headEnd + 4, headEnd + 4 + length));
    if (!buf.subarray(headEnd + 4 + length, need).equals(CRLFCRLF)) throw new WarcError(`a record without its trailing CRLFs at ${offset}`);
    yield { offset, type: headers.get("warc-type") ?? "", uri: headers.get("warc-target-uri") ?? null, payload };
    buf = buf.subarray(need);
    consumed += need;
  }
}

const MAX_VALUE = 512;              // the address rule's bound; the finder applies the rule itself
const BODY_LIMIT = 512 * 1024;      // RFC 9309 asks a crawler to read at least 500 KiB; a line beyond that is one nobody honours
const HTTP_HEAD_LIMIT = 64 * 1024;  // where the HTTP header block must have ended

/** The HTTP status line is exactly a 200: "HTTP/1.1 200" or "HTTP/1.0 200", alone or followed by a space and a reason. */
function isOk(status: string): boolean {
  return (status.startsWith("HTTP/1.1 200") || status.startsWith("HTTP/1.0 200")) && (status.length === 12 || status[12] === " ");
}

/**
 * The first Mad-Source value of a status-200 HTTP response payload, or null (docs/design.md "The robots.txt line": the field name
 * matched without regard to case, text after a # ignored). One line at a time over at most 512 KiB of body, no pattern over the text;
 * the first Mad-Source line decides: an empty or over-long value means this place names nothing.
 */
export function robotsLine(payload: Uint8Array): string | null {
  const head = Buffer.from(payload.subarray(0, Math.min(payload.length, HTTP_HEAD_LIMIT))).toString("latin1");
  const headEnd = head.indexOf("\r\n\r\n");
  if (headEnd < 0) return null;
  const status = head.slice(0, headEnd).split("\r\n")[0] ?? "";
  if (!isOk(status)) return null;
  const bodyStart = headEnd + 4;
  const body = Buffer.from(payload.subarray(bodyStart, Math.min(payload.length, bodyStart + BODY_LIMIT))).toString("utf8");
  let from = 0;
  while (from < body.length) {
    let end = body.indexOf("\n", from);
    if (end < 0) end = body.length;
    const line = body.slice(from, end).trim();   // leading whitespace and a CR are allowed around a line
    from = end + 1;
    if (line.length < 11 || line.slice(0, 11).toLowerCase() !== "mad-source:") continue;
    let value = line.slice(11);
    const hash = value.indexOf("#");             // an address holds no #: text after it is a comment
    if (hash >= 0) value = value.slice(0, hash);
    value = value.trim();
    return value.length >= 1 && value.length <= MAX_VALUE ? value : null;
  }
  return null;
}
```

- [ ] **Step 5: The committed fixture and its README**

Generate once, from the repository root: `node -e 'import("./tests/helpers/warc.ts").then((m) => require("node:fs").writeFileSync("fixtures/robotstxt/sample.warc.gz", m.warcGz(m.SAMPLE_CAPTURES)))'`. `.gitattributes` already holds `fixtures/** -text`, which covers the file (`git check-attr -a fixtures/robotstxt/sample.warc.gz` says `text: unset`); add nothing there. Write `fixtures/robotstxt/README.md`:

```markdown
# robots.txt archive fixture

`sample.warc.gz` is a WARC file in the shape of Common Crawl's robots.txt archive (`crawl-data/<crawl>/segments/<segment>/robotstxt/*.warc.gz`,
measured 2026-11-12: one gzip member per record; a `warcinfo` record, then a `request` and a `response` record per capture; CRLF line ends;
a response's payload is the HTTP response). It is written by `tests/helpers/warc.ts` from `SAMPLE_CAPTURES`, and `tests/warc.test.ts` pins
its decompressed content and member count against that helper (not its compressed bytes, which depend on the zlib build): regenerate it
with the helper when the captures change. The hosts are `.example` names; nothing in it came from the archive.

It holds: hosts naming a source in a `Mad-Source` line (plain; in another case with surrounding spaces and a second line that is ignored;
with a `# comment` after the address; indented with a CRLF line end), a 404 and a 301 whose bodies are not read, a 200 without the line,
a second capture of the first host, a host whose first `Mad-Source` line is empty (so it names nothing), and a host whose line is not an
address (the finder drops it).
```

- [ ] **Step 6: Run the tests and the type check, then commit**

Run: `npm run check && node --test tests/warc.test.ts`

```bash
git add src/finders/warc.ts tests/helpers/warc.ts tests/warc.test.ts fixtures/robotstxt/sample.warc.gz fixtures/robotstxt/README.md
git commit -m "feat: the WARC record parser and the robots line; a fixture in the archive's shape (<bead id>)"
```

---

### Task 3: The robots finder

**Files:**
- Create: `src/finders/candidates.ts`, `src/finders/robots.ts`, `tests/finder-robots.test.ts`
- Modify: `src/catalog.ts` (import `CandidateFile` from `./finders/candidates.ts` instead of defining it)

**Interfaces:**
- Consumes: `Input` (Task 1), `warcRecords`, `robotsLine` (Task 2), `asciiJson`, `parseSourceAddress`.
- Produces: in `src/finders/candidates.ts`: `type FinderCandidate = { address: string; place: Record<string, string | number> }`; `type CandidateFile = { finder: string; snapshot: string; candidates: FinderCandidate[] }` (moved from `src/catalog.ts`, which imports and re-exports it); `type FinderResult = CandidateFile & { summary: Record<string, number> }`; `candidateFileBytes(result: FinderResult): Uint8Array` (candidates sorted by address, then by `JSON.stringify(place)`; `asciiJson` plus a final newline). In `src/finders/robots.ts`: `const CRAWL = /^CC-MAIN-\d{4}-\d{2}$/`; `listCrawls(input: Input): Promise<string[]>` (the ids of `collinfo.json` matching `CRAWL`, sorted descending); `robotsFinder(snapshot: string, input: Input, opts?: { test?: boolean }, progress?: (done: number, total: number) => void): Promise<FinderResult>`.

**Acceptance Criteria:**
- `listCrawls` reads `<index>collinfo.json` (at most 1 MB), returns the ids that match `CRAWL` sorted newest first whatever order the list gives them; a non-JSON answer or no matching id is an error.
- `robotsFinder` refuses a snapshot not matching `CRAWL`; reads `<archive>crawl-data/<snapshot>/robotstxt.paths.gz` (at most 16 MB compressed, inflated with `maxOutputLength` 64 MB), requires every line to be a relative path under `crawl-data/<snapshot>/` ending in `.warc.gz` of the charset `[A-Za-z0-9._/-]` without `..` (a bad line is an error naming its line number and length only); streams each file through gunzip and `warcRecords` with up to 16 in flight; for each `response` record whose `robotsLine` is a value that passes the source address rule, adds `{ address: <canonical>, place: { file, offset, robots: <uri> } }` (uri bounded at 512 characters, else the candidate is skipped and counted); a value that is not a source address is counted under `notAddresses`; `summary` has `files`, `records`, `responses`, `lines` (first `Mad-Source` values seen), `candidates`, `notAddresses`, `skipped`; `progress(done, total)` is called after each file.
- If any file fails (an `InputError` after retries, a `WarcError`, a bad gunzip) the finder rejects with that error, the other workers stop taking files, the open streams are destroyed, and nothing is returned.
- Two captures of one host give two candidates; `candidateFileBytes` sorts them deterministically and writes ASCII.

- [ ] **Step 1: Write the failing tests**

`tests/finder-robots.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { Input } from "../src/finders/input.ts";
import { listCrawls, robotsFinder } from "../src/finders/robots.ts";
import { candidateFileBytes } from "../src/finders/candidates.ts";
import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const input = () => new Input(bases, { test: true, sleep: async () => {} });
const SNAP = "CC-MAIN-2026-43";
const paths = (names: string[]) => gzipSync(Buffer.from(names.map((n) => `crawl-data/${SNAP}/segments/1.2/robotstxt/${n}`).join("\n") + "\n"));
const find = (i = input(), progress?: (d: number, t: number) => void) => robotsFinder(SNAP, i, { test: true }, progress);
const ascii = (s: string): boolean => { for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c !== 10 && (c < 32 || c > 126)) return false; } return true; };

test("listCrawls reads collinfo.json and gives the crawl ids newest first, whatever order the list has", async () => {
  origin.put("index/collinfo.json", JSON.stringify([{ id: "CC-MAIN-2026-39" }, { id: "CC-MAIN-2026-43", name: "October 2026 Index" }, { id: "weird" }, { id: "CC-MAIN-2026-34" }]));
  assert.deepEqual(await listCrawls(input()), ["CC-MAIN-2026-43", "CC-MAIN-2026-39", "CC-MAIN-2026-34"]);
  origin.put("index/collinfo.json", "not json");
  await assert.rejects(listCrawls(input()));
  origin.put("index/collinfo.json", JSON.stringify([{ id: "nope" }]));
  await assert.rejects(listCrawls(input()), /crawl/);
});

test("the robots finder reads every file of a crawl and takes the first Mad-Source line of each 200 response that is a source address, with its place", async () => {
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "b.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`, warcGz(SAMPLE_CAPTURES));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/b.warc.gz`, warcGz([{ uri: "http://eta.example/robots.txt", status: 200, body: "Mad-Source: https://eta.example/source.json\n" }]));
  const seen: [number, number][] = [];
  const r = await find(input(), (done, total) => seen.push([done, total]));
  assert.equal(r.finder, "robots"); assert.equal(r.snapshot, SNAP);
  assert.deepEqual(seen.map(([, t]) => t), [2, 2]); assert.deepEqual(seen.map(([d]) => d).sort(), [1, 2]);
  assert.deepEqual(r.summary, { files: 2, records: (1 + 2 * SAMPLE_CAPTURES.length) + (1 + 2), responses: SAMPLE_CAPTURES.length + 1, lines: 7, candidates: 6, notAddresses: 1, skipped: 0 });
  const addresses = r.candidates.map((c) => c.address).sort();
  assert.deepEqual(addresses, ["https://beta.example/discovery/source.json", "https://eta.example/source.json", "https://iota.example/source.json", "https://mad.alpha.example/source.json", "https://mad.alpha.example/source.json", "https://theta.example/source.json"]);
  const alpha = r.candidates.filter((c) => c.address === "https://mad.alpha.example/source.json");
  assert.equal(alpha.length, 2, "two captures of one host are two candidates; the build de-duplicates");
  for (const c of alpha) { assert.equal(c.place["file"], `crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`); assert.equal(c.place["robots"], "http://alpha.example/robots.txt"); assert.equal(typeof c.place["offset"], "number"); }
  assert.notEqual(alpha[0]!.place["offset"], alpha[1]!.place["offset"]);
  const bytes = candidateFileBytes(r);
  const text = new TextDecoder().decode(bytes);
  assert.ok(ascii(text), "ASCII");
  const parsed = JSON.parse(text) as { candidates: { address: string }[]; summary: Record<string, number> };
  assert.deepEqual(parsed.candidates.map((c) => c.address), addresses, "sorted by address");
  assert.equal(parsed.summary["candidates"], 6);
  assert.deepEqual(candidateFileBytes({ ...r, candidates: [...r.candidates].reverse() }), bytes, "the order of discovery does not change the file");
});

test("a snapshot that is not a crawl name, a bad path listing, or one unreadable file fails the whole snapshot, and the message names no input text", async () => {
  await assert.rejects(robotsFinder("../etc", input(), { test: true }), /snapshot/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from(`crawl-data/OTHER/x.warc.gz\n`)));
  await assert.rejects(find(), (e: unknown) => e instanceof Error && e.message.startsWith("line 1 ") && e.message.includes("not a path") && !e.message.includes("OTHER"));
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from(`crawl-data/${SNAP}/../x.warc.gz\n`)));
  await assert.rejects(find(), /not a path/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "missing.warc.gz"]));
  await assert.rejects(find(), (e: unknown) => (e as { reason?: string }).reason === "status");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "bad.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, new Uint8Array([1, 2, 3]));
  await assert.rejects(find(), undefined, "not gzip");
  const cut = warcGz(SAMPLE_CAPTURES); origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, cut.subarray(0, cut.length - 30));
  await assert.rejects(find(), undefined, "a truncated member");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.alloc(80 * 1024 * 1024)));
  await assert.rejects(find(), (e: unknown) => e instanceof Error && (e as { code?: string }).code === "ERR_BUFFER_TOO_LARGE", "a listing that inflates past 64 MB");
});

test("many files run with at most 16 in flight; a 503 on one of them is retried; a failure stops the others", async () => {
  const names = Array.from({ length: 40 }, (_, i) => `f${i}.warc.gz`);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(names));
  for (const n of names) origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/${n}`, warcGz([{ uri: `http://${n.slice(0, -8)}.example/robots.txt`, status: 200, body: `Mad-Source: https://${n.slice(0, -8)}.example/source.json\n` }]));
  let open = 0, peak = 0, flaky = 0;
  origin.behave = (req, res) => {
    if (req.url?.endsWith("f7.warc.gz") && flaky++ === 0) { res.statusCode = 503; res.end(); return true; }
    if (req.url?.endsWith(".warc.gz")) { open++; peak = Math.max(peak, open); res.once("finish", () => open--); }
    return false;
  };
  try {
    const r = await find();
    assert.equal(r.candidates.length, 40); assert.equal(r.summary["files"], 40);
    assert.ok(peak <= 16, `peak ${peak}`);
  } finally { origin.behave = null; }
  // One file answers 404 and the others are slow: after the rejection the request count stops growing.
  origin.behave = (req, res) => {
    if (req.url?.endsWith("f2.warc.gz")) { res.statusCode = 404; res.end(); return true; }
    if (req.url?.endsWith(".warc.gz")) { setTimeout(() => { if (!res.writableEnded) res.end(); }, 200); res.writeHead(200); res.flushHeaders(); return true; }
    return false;
  };
  try {
    const before = origin.requests.length;
    await assert.rejects(find(), (e: unknown) => (e as { reason?: string }).reason === "status");
    const afterFailure = origin.requests.length;
    await new Promise((r) => setTimeout(r, 400));
    assert.ok(afterFailure - before <= 17, `the first wave only: ${afterFailure - before}`);
    assert.equal(origin.requests.length, afterFailure, "no file was requested after the failure");
  } finally { origin.behave = null; }
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/finder-robots.test.ts`
Expected: FAIL, cannot find module `../src/finders/robots.ts`.

- [ ] **Step 3: Write `src/finders/candidates.ts` and `src/finders/robots.ts`; move `CandidateFile`**

`src/finders/candidates.ts`:

```ts
import { asciiJson } from "../json.ts";

/** One place a finder saw a source address; the build fetches and checks the address like any introduction. */
export type FinderCandidate = { address: string; place: Record<string, string | number> };

/** What a finder writes and the build reads (docs/design.md "What a finder returns"). */
export type CandidateFile = { finder: string; snapshot: string; candidates: FinderCandidate[] };

export type FinderResult = CandidateFile & { summary: Record<string, number> };

const compare = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/** The candidate file's bytes: candidates sorted by address then place, ASCII, so two runs over one snapshot write the same file. */
export function candidateFileBytes(result: FinderResult): Uint8Array {
  const candidates = [...result.candidates].sort((a, b) => compare(a.address, b.address) || compare(JSON.stringify(a.place), JSON.stringify(b.place)));
  return new TextEncoder().encode(asciiJson({ finder: result.finder, snapshot: result.snapshot, candidates, summary: result.summary }) + "\n");
}
```

In `src/catalog.ts`, delete the local `CandidateFile` type and add `import type { CandidateFile } from "./finders/candidates.ts"; export type { CandidateFile };` so its existing importers keep working: one definition.

`src/finders/robots.ts`:

```ts
import { createGunzip, gunzipSync } from "node:zlib";
import { Input } from "./input.ts";
import { warcRecords, robotsLine } from "./warc.ts";
import { parseSourceAddress } from "../address.ts";
import type { FinderCandidate, FinderResult } from "./candidates.ts";

export const CRAWL = /^CC-MAIN-\d{4}-\d{2}$/;
const MAX_PATHS = 16 * 1024 * 1024;           // the compressed path listing; 100,000 lines are about 3 MB
const MAX_PATHS_INFLATED = 64 * 1024 * 1024;  // and about 10 MB inflated
const MAX_INFO = 1024 * 1024;
const MAX_URI = 512;
const PATH_CHARS = /^[A-Za-z0-9._\/-]+$/;     // a fixed pattern, anchored, over one listing line: linear
const IN_FLIGHT = 16;

/** The crawls Common Crawl lists, by their own names, newest first (the name sorts by date). */
export async function listCrawls(input: Input): Promise<string[]> {
  const bytes = await input.readAll(`${input.bases.index}collinfo.json`, MAX_INFO, { accept: "application/json" });
  const value: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (!Array.isArray(value)) throw new Error("collinfo.json is not a list");
  const ids = value.map((v) => (typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : "")).filter((id) => CRAWL.test(id));
  if (ids.length === 0) throw new Error("collinfo.json names no crawl");
  return ids.sort().reverse();
}

/**
 * The robots finder (docs/design.md "Finding sources nobody linked"): every robots.txt WARC file of one crawl, streamed through gunzip
 * and the record parser; from each response with status 200, the first Mad-Source line that is a source address, with the file, the
 * record's offset and the robots.txt address as its place. All of the crawl or nothing: one unreadable file fails the snapshot and
 * stops the others.
 */
export async function robotsFinder(snapshot: string, input: Input, opts: { test?: boolean } = {}, progress: (done: number, total: number) => void = () => {}): Promise<FinderResult> {
  if (!CRAWL.test(snapshot)) throw new Error(`not a crawl snapshot name: ${snapshot}`);
  const compressed = await input.readAll(`${input.bases.archive}crawl-data/${snapshot}/robotstxt.paths.gz`, MAX_PATHS);
  const listing = gunzipSync(Buffer.from(compressed), { maxOutputLength: MAX_PATHS_INFLATED }).toString("latin1");
  const files = listing.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const prefix = `crawl-data/${snapshot}/`;
  files.forEach((f, n) => {
    if (!f.startsWith(prefix) || !f.endsWith(".warc.gz") || f.includes("..") || !PATH_CHARS.test(f)) throw new Error(`line ${n + 1} of the path listing is not a path of this crawl (${f.length} characters)`);
  });
  const candidates: FinderCandidate[] = [];
  const summary = { files: 0, records: 0, responses: 0, lines: 0, candidates: 0, notAddresses: 0, skipped: 0 };
  let failed: unknown = null;
  const one = async (file: string): Promise<void> => {
    const { stream } = await input.open(`${input.bases.archive}${file}`);
    const gunzip = createGunzip();
    stream.on("error", (e) => gunzip.destroy(e));
    try {
      for await (const record of warcRecords(stream.pipe(gunzip))) {
        summary.records++;
        if (record.type !== "response") continue;
        summary.responses++;
        const value = robotsLine(record.payload);
        if (value === null) continue;
        summary.lines++;
        const parsed = parseSourceAddress(value, { test: opts.test });
        if (parsed === null) { summary.notAddresses++; continue; }
        if (record.uri === null || record.uri.length > MAX_URI) { summary.skipped++; continue; }
        candidates.push({ address: parsed.address, place: { file, offset: record.offset, robots: record.uri } });
        summary.candidates++;
      }
    } finally {
      stream.destroy();   // whether the parser ran to the end or threw, the socket is released now
      gunzip.destroy();
    }
    summary.files++;
    progress(summary.files, files.length);
  };
  const queue = [...files];
  const worker = async (): Promise<void> => {
    for (let f = queue.shift(); f !== undefined && failed === null; f = queue.shift()) {
      try { await one(f); } catch (e) { if (failed === null) failed = e; }
    }
  };
  await Promise.allSettled(Array.from({ length: Math.min(IN_FLIGHT, queue.length) }, worker));
  if (failed !== null) throw failed;
  return { finder: "robots", snapshot, candidates, summary };
}
```

Each worker stops taking files once `failed` is set; files already in flight finish or fail on their own, which is why the test allows up to 17 requests in the first wave and then no growth. `parseSourceAddress` is the one in `src/address.ts` that the build already applies to a candidate (step 5); check its exact name and options there before writing, and use that function rather than a second copy of the rule.

- [ ] **Step 4: Run the tests and the type check**

Run: `npm run check && node --test tests/finder-robots.test.ts tests/catalog.test.ts`
Expected: all pass (the `CandidateFile` move is type-only).

- [ ] **Step 5: Commit**

```bash
git add src/finders/candidates.ts src/finders/robots.ts src/catalog.ts tests/finder-robots.test.ts
git commit -m "feat: the robots finder over a crawl's robots.txt archive, all of the crawl or nothing (<bead id>)"
```

---

### Task 4: The GitHub-topic finder

**Files:**
- Create: `src/finders/github.ts`, `tests/finder-github.test.ts`, `fixtures/github/search-sample.json`

**Interfaces:**
- Consumes: `Input` (`readAll`, `sleep`), `parseSourceAddress`, `FinderResult`, `FinderCandidate`.
- Produces: `githubFinder(input: Input, today: string, opts?: { test?: boolean }): Promise<FinderResult>` where `today` is the snapshot name (`YYYY-MM-DD`, UTC, supplied by the caller so the finder itself reads no clock); `const TOPIC = "mad-source"`, `PAGE = 100`, `MAX_PAGES = 10`, `PAUSE_MS = 6500`.

**Acceptance Criteria:**
- Requests `<github>search/repositories?q=topic%3Amad-source&per_page=100&page=N` with `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`, pages 1.. until a page returns fewer than 100 items, pausing `PAUSE_MS` between pages through the `Input`'s `sleep`; each page at most 4 MB.
- All or nothing: a page with `incomplete_results: true` rejects (`incomplete`); a first page whose `total_count` is over `MAX_PAGES * PAGE` (1,000) rejects at once (`more than`); a non-JSON page, a page without an `items` array, or an `InputError` rejects; nothing is returned on any of these.
- For each item with a string `homepage` that passes the source address rule (`parseSourceAddress` with the finder's `test` option) and a `full_name` matching `^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$` (GitHub's own charset) that is well-formed, a candidate `{ address: <canonical>, place: { repository: full_name } }`; other items are counted under `summary.skipped`; `summary` has `pages`, `items`, `candidates`, `skipped`, `total`.
- The fixture `fixtures/github/search-sample.json` is in the API's shape (`total_count`, `incomplete_results`, `items[]` with `full_name`, `homepage`, `topics`, `html_url`) with four items: two whose homepages are source addresses, one whose homepage is a definition address, one with `homepage: null`.

- [ ] **Step 1: The fixture**

`fixtures/github/search-sample.json` (ASCII; the shape GitHub's `search/repositories` returns, trimmed to the members the finder reads plus a few it ignores):

```json
{
  "total_count": 4,
  "incomplete_results": false,
  "items": [
    { "id": 1, "full_name": "alice/mad-definitions", "html_url": "https://github.com/alice/mad-definitions", "homepage": "https://alice.github.io/mad-definitions/source.json", "topics": ["mad-source", "keri"], "archived": false, "fork": false },
    { "id": 2, "full_name": "bob/protocols", "html_url": "https://github.com/bob/protocols", "homepage": "https://protocols.bob.example/source.json", "topics": ["mad-source"], "archived": false, "fork": false },
    { "id": 3, "full_name": "carol/one-definition", "html_url": "https://github.com/carol/one-definition", "homepage": "https://carol.example/definitions/EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY.json", "topics": ["mad-source"], "archived": false, "fork": false },
    { "id": 4, "full_name": "dave/empty", "html_url": "https://github.com/dave/empty", "homepage": null, "topics": ["mad-source"], "archived": true, "fork": false }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

`tests/finder-github.test.ts`:

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Input } from "../src/finders/input.ts";
import { githubFinder, PAUSE_MS } from "../src/finders/github.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());
const bases = { archive: `${origin.origin}/archive/`, index: `${origin.origin}/index/`, github: `${origin.origin}/github/` };
const slept: number[] = [];
const input = () => new Input(bases, { test: true, sleep: async (ms) => { slept.push(ms); } });
const sample = readFileSync(fileURLToPath(new URL("../fixtures/github/search-sample.json", import.meta.url)), "utf8");
const page = (items: unknown[], total = items.length, incomplete = false) => JSON.stringify({ total_count: total, incomplete_results: incomplete, items });
const item = (n: number) => ({ full_name: `u/r${n}`, homepage: `https://r${n}.example/source.json`, topics: ["mad-source"] });
const pageOf = (url: string): string | null => { const q = new URL(url, "http://x").searchParams.get("page"); return q; };

test("the GitHub finder takes each repository whose homepage is a source address, with the repository as its place", async () => {
  let query: string | undefined, headers: Record<string, unknown> = {};
  origin.behave = (req, res) => { if (req.url?.startsWith("/github/search/repositories")) { query = req.url; headers = { ...req.headers }; res.setHeader("content-type", "application/json"); res.end(sample); return true; } return false; };
  try {
    slept.length = 0;
    const r = await githubFinder(input(), "2026-11-12");
    assert.equal(r.finder, "github"); assert.equal(r.snapshot, "2026-11-12");
    assert.equal(query, "/github/search/repositories?q=topic%3Amad-source&per_page=100&page=1");
    assert.equal(headers["accept"], "application/vnd.github+json"); assert.equal(headers["x-github-api-version"], "2022-11-28");
    assert.deepEqual(r.candidates, [
      { address: "https://alice.github.io/mad-definitions/source.json", place: { repository: "alice/mad-definitions" } },
      { address: "https://protocols.bob.example/source.json", place: { repository: "bob/protocols" } },
    ]);
    assert.deepEqual(r.summary, { pages: 1, items: 4, candidates: 2, skipped: 2, total: 4 });
    assert.deepEqual(slept, [], "one page: no pause");
  } finally { origin.behave = null; }
});

test("pages until a short page, pausing between pages; an incomplete answer or more results than GitHub returns fails the run; a bad page fails it", async () => {
  const pages: Record<string, string> = { "1": page(Array.from({ length: 100 }, (_, i) => item(i)), 201), "2": page(Array.from({ length: 100 }, (_, i) => item(100 + i)), 201), "3": page([item(200)], 201) };
  origin.behave = (req, res) => {
    const p = req.url?.startsWith("/github/search/repositories") ? pageOf(req.url) : null;
    if (p !== null) { res.setHeader("content-type", "application/json"); res.end(pages[p] ?? page([])); return true; }
    return false;
  };
  try {
    slept.length = 0;
    const r = await githubFinder(input(), "2026-11-12");
    assert.equal(r.candidates.length, 201); assert.equal(r.summary["pages"], 3); assert.equal(r.summary["total"], 201);
    assert.deepEqual(slept, [PAUSE_MS, PAUSE_MS], "a pause before the second and third pages");
    pages["1"] = page(Array.from({ length: 100 }, (_, i) => item(i)), 1001);
    await assert.rejects(githubFinder(input(), "2026-11-12"), /more than/, "GitHub's 1,000-result ceiling: the input cannot be read whole");
    pages["1"] = page(Array.from({ length: 100 }, (_, i) => item(i)), 150); pages["2"] = page([item(100)], 150, true);
    await assert.rejects(githubFinder(input(), "2026-11-12"), /incomplete/);
    pages["1"] = "<html>";
    await assert.rejects(githubFinder(input(), "2026-11-12"), /JSON/);
    pages["1"] = JSON.stringify({ total_count: 0 });
    await assert.rejects(githubFinder(input(), "2026-11-12"), /items/);
  } finally { origin.behave = null; }
});

test("a repository name outside GitHub's charset, or not well-formed, is skipped; a search that fails after retries writes nothing; a snapshot that is not a date is refused", async () => {
  const lone = String.fromCharCode(0xd83d);
  origin.behave = (req, res) => {
    if (req.url?.startsWith("/github/search/repositories")) { res.setHeader("content-type", "application/json"); res.end(page([{ full_name: "ok/name", homepage: "https://ok.example/source.json" }, { full_name: "bad name/with space", homepage: "https://bad.example/source.json" }, { full_name: `x/${lone}`, homepage: "https://lone.example/source.json" }, { full_name: "a".repeat(101) + "/b", homepage: "https://long.example/source.json" }])); return true; }
    return false;
  };
  try {
    const r = await githubFinder(input(), "2026-11-12");
    assert.deepEqual(r.candidates.map((c) => c.place["repository"]), ["ok/name"]);
    assert.equal(r.summary["skipped"], 3);
  } finally { origin.behave = null; }
  origin.behave = (req, res) => { if (req.url?.startsWith("/github/")) { res.statusCode = 503; res.end(); return true; } return false; };
  try {
    await assert.rejects(githubFinder(input(), "2026-11-12"), (e: unknown) => (e as { reason?: string }).reason === "status");
    await assert.rejects(githubFinder(input(), "today"), /snapshot/);
  } finally { origin.behave = null; }
});
```

The lone surrogate in the third test is written through `String.fromCharCode`, never as an escape in source; `res.end` of a string holding it writes U+FFFD in UTF-8, so the test exercises `full_name`'s charset and `isWellFormed` together (the replacement character fails the charset); that is the behaviour wanted either way.

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/finder-github.test.ts`
Expected: FAIL, cannot find module `../src/finders/github.ts`.

- [ ] **Step 4: Write `src/finders/github.ts`**

```ts
import { Input } from "./input.ts";
import { parseSourceAddress } from "../address.ts";
import type { FinderCandidate, FinderResult } from "./candidates.ts";

export const TOPIC = "mad-source";
export const PAGE = 100;
export const MAX_PAGES = 10;       // GitHub returns at most 1,000 results for one query
export const PAUSE_MS = 6500;      // unauthenticated search: 10 requests a minute
const MAX_PAGE_BYTES = 4 * 1024 * 1024;
const REPOSITORY = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/;   // GitHub's own charset for owner/name; anchored, linear
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The GitHub-topic finder (Ruling 10): public repositories carrying the topic mad-source whose homepage is a source address, read through
 * GitHub's repository search. One company's index with no snapshot: the file is named by the UTC date it ran (the caller supplies it), and
 * a build copies the file into its output so another party can compare. All or nothing: an incomplete answer, or more results than GitHub
 * returns, fails the run.
 */
export async function githubFinder(input: Input, today: string, opts: { test?: boolean } = {}): Promise<FinderResult> {
  if (!DATE.test(today)) throw new Error(`not a date snapshot name: ${today}`);
  const candidates: FinderCandidate[] = [];
  const summary = { pages: 0, items: 0, candidates: 0, skipped: 0, total: 0 };
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await input.sleep(PAUSE_MS);
    const url = `${input.bases.github}search/repositories?q=${encodeURIComponent(`topic:${TOPIC}`)}&per_page=${PAGE}&page=${page}`;
    const bytes = await input.readAll(url, MAX_PAGE_BYTES, { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" });
    let value: unknown;
    try { value = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { throw new Error(`page ${page} is not JSON`); }
    const answer = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
    const items = answer["items"];
    if (!Array.isArray(items)) throw new Error(`page ${page} has no items list`);
    if (answer["incomplete_results"] === true) throw new Error(`page ${page} is incomplete: GitHub answered before the search finished`);
    if (page === 1) {
      const total = answer["total_count"];
      summary.total = typeof total === "number" && Number.isInteger(total) && total >= 0 ? total : items.length;
      if (summary.total > MAX_PAGES * PAGE) throw new Error(`the search holds ${summary.total} repositories, more than the ${MAX_PAGES * PAGE} GitHub returns`);
    }
    summary.pages++;
    for (const item of items) {
      summary.items++;
      const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const homepage = record["homepage"];
      const name = record["full_name"];
      const parsed = typeof homepage === "string" ? parseSourceAddress(homepage, { test: opts.test }) : null;
      if (parsed === null || typeof name !== "string" || !REPOSITORY.test(name) || !name.isWellFormed()) { summary.skipped++; continue; }
      candidates.push({ address: parsed.address, place: { repository: name } });
      summary.candidates++;
    }
    if (items.length < PAGE) break;
  }
  return { finder: "github", snapshot: today, candidates, summary };
}
```

- [ ] **Step 5: Run the tests and the type check, then commit**

Run: `npm run check && node --test tests/finder-github.test.ts`

```bash
git add src/finders/github.ts tests/finder-github.test.ts fixtures/github/search-sample.json
git commit -m "feat: the GitHub-topic finder over the repository search, named by the day it ran, all or nothing (<bead id>)"
```

---

### Task 5: `catalog find`

**Files:**
- Modify: `src/cli.ts`, `tests/cli.test.ts`

**Interfaces:**
- Consumes: `Input`, `PUBLIC_INPUTS`, `InputBases`, `listCrawls`, `robotsFinder`, `CRAWL`, `githubFinder`, `candidateFileBytes`, `FinderResult`, `flag`, `flags`, `usage`, `asciiJson`.
- Produces: `catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...`; `RunOptions.finderInputs?: InputBases & { pause?: number; today?: string }` (test only); the usage line `mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` in place of the step 6 refusal.

**Acceptance Criteria:**
- Usage errors (exit 2, nothing printed on stdout, nothing fetched): no `--finder` or one that is not `robots`/`github`; no `--out`; `--snapshot` with `github`; a `--snapshot` for `robots` not matching `CRAWL`.
- `--out` may exist and hold files; `<out>/<finder>/<snapshot>.json` already present is kept and that snapshot is not read (no request for it); the folder is created when missing; nothing else in it is touched; a file is written to `<snapshot>.json.part` and renamed, so a killed run leaves no half file that is kept.
- `robots` with no `--snapshot` reads `collinfo.json` and takes the three newest crawls; when the index cannot be read the command prints `{ problems: ["the crawl list could not be read; name the crawls with --snapshot"] }`, exit 1, having fetched nothing else.
- Each requested snapshot that is not kept runs the finder and writes `candidateFileBytes` to its path; a finder failure leaves no file for that snapshot and the command goes on to the next; the summary `{ finder, written: [snapshot...], kept: [snapshot...], failed: [{ snapshot, reason }], summary: { <snapshot>: counts } }` is printed through `asciiJson`; exit 0 when `failed` is empty, else 1; `failed[].reason` is the tool's own text (an `InputError`'s reason word, a `WarcError`'s or the finder's message, which name numbers and paths of the crawl, never a stranger's text).
- Progress lines (`<snapshot>: <done>/<total> files`) go to stderr every 1,000 files and at the end; never to stdout.
- In production the inputs are `PUBLIC_INPUTS` with a 16-connection `Input`; only the three bases are passed to `Input`; `bin/mad-discovery.ts` passes no options, so the `finderInputs` bases cannot be set from the command line. `catalog find` makes no request to any address a candidate names.
- The `github` finder's snapshot is today's UTC date (`new Date().toISOString().slice(0, 10)`) unless `finderInputs.today` is given (tests).

- [ ] **Step 1: Write the failing tests**

Append to `tests/cli.test.ts` (reusing its helpers `main`, `capture`, `local`, `fixtures`, `Origin`; add `import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";` and `import { gzipSync } from "node:zlib";`; `existsSync`, `readFileSync`, `mkdtempSync`, `join`, `tmpdir` are imported there already, or add them to the existing imports):

```ts
test("catalog find writes one candidate file per snapshot, keeps files already there, names what failed, and fetches no candidate's address", async () => {
  const cc = await Origin.start();
  try {
    const SNAP = "CC-MAIN-2026-43";
    const bases = { archive: `${cc.origin}/archive/`, index: `${cc.origin}/index/`, github: `${cc.origin}/github/`, pause: 0, today: "2026-11-12" };
    const opts = { ...local, finderInputs: bases };
    const paths = (snap: string, names: string[]) => gzipSync(Buffer.from(names.map((n) => `crawl-data/${snap}/segments/1.2/robotstxt/${n}`).join("\n") + "\n"));
    cc.put("index/collinfo.json", JSON.stringify([{ id: "CC-MAIN-2026-43" }, { id: "CC-MAIN-2026-39" }, { id: "CC-MAIN-2026-34" }, { id: "CC-MAIN-2026-30" }]));
    for (const snap of ["CC-MAIN-2026-43", "CC-MAIN-2026-39"]) {
      cc.put(`archive/crawl-data/${snap}/robotstxt.paths.gz`, paths(snap, ["a.warc.gz"]));
      cc.put(`archive/crawl-data/${snap}/segments/1.2/robotstxt/a.warc.gz`, warcGz(SAMPLE_CAPTURES));
    }
    // CC-MAIN-2026-34 has a listing but its file is missing: that snapshot fails, the others are written.
    cc.put("archive/crawl-data/CC-MAIN-2026-34/robotstxt.paths.gz", paths("CC-MAIN-2026-34", ["gone.warc.gz"]));
    const out = join(mkdtempSync(join(tmpdir(), "find-")), "candidates");
    let c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", out], c.io, opts), 1, "one of the three newest failed");
    let r = c.json();
    assert.deepEqual(r.written, ["CC-MAIN-2026-43", "CC-MAIN-2026-39"]); assert.deepEqual(r.kept, []);
    assert.deepEqual((r.failed as { snapshot: string; reason: string }[]).map((f) => f.snapshot), ["CC-MAIN-2026-34"]);
    assert.equal((r.failed as { reason: string }[])[0]!.reason, "status");
    assert.ok(existsSync(join(out, "robots", `${SNAP}.json`)) && !existsSync(join(out, "robots", "CC-MAIN-2026-34.json")) && !existsSync(join(out, "robots", "CC-MAIN-2026-34.json.part")));
    const text = readFileSync(join(out, "robots", `${SNAP}.json`), "utf8");
    const file = JSON.parse(text) as { finder: string; snapshot: string; candidates: { address: string }[]; summary: Record<string, number> };
    assert.equal(file.finder, "robots"); assert.equal(file.snapshot, SNAP); assert.equal(file.candidates.length, 5); assert.equal(file.summary["files"], 1); assert.equal(file.summary["notAddresses"], 1);
    for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); assert.ok(code === 10 || (code >= 32 && code <= 126), "ASCII"); }
    assert.ok(c.err().includes(`${SNAP}: 1/1 files`), "progress on stderr");
    assert.ok(cc.requests.every((p) => p.startsWith("index/") || p.startsWith("archive/")), "only the public input was asked");
    // A second run keeps the two files and reads nothing for them.
    const before = cc.requests.length;
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", out, "--snapshot", SNAP, "--snapshot", "CC-MAIN-2026-39"], c.io, opts), 0);
    r = c.json(); assert.deepEqual(r.kept, [SNAP, "CC-MAIN-2026-39"]); assert.deepEqual(r.written, []);
    assert.equal(cc.requests.length, before, "kept snapshots cost no request");
    // GitHub: named by the day; kept the second time; one request.
    cc.behave = (req, res) => { if (req.url?.startsWith("/github/search/repositories")) { res.setHeader("content-type", "application/json"); res.end(readFileSync(join(fixtures, "github", "search-sample.json"))); return true; } return false; };
    const beforeGithub = cc.requests.length;
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "github", "--out", out], c.io, opts), 0);
    assert.deepEqual(c.json().written, ["2026-11-12"]);
    assert.deepEqual(cc.requests.slice(beforeGithub), ["github/search/repositories?q=topic%3Amad-source&per_page=100&page=1"], "one request, to GitHub only");
    const gh = JSON.parse(readFileSync(join(out, "github", "2026-11-12.json"), "utf8")) as { candidates: { address: string }[] };
    assert.deepEqual(gh.candidates.map((x) => x.address), ["https://alice.github.io/mad-definitions/source.json", "https://protocols.bob.example/source.json"]);
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "github", "--out", out], c.io, opts), 0);
    assert.deepEqual(c.json().kept, ["2026-11-12"]);
    // The crawl list unreadable: a named problem, nothing else fetched.
    cc.behave = (req, res) => { if (req.url === "/index/collinfo.json") { res.statusCode = 500; res.end(); return true; } return false; };
    const out2 = join(mkdtempSync(join(tmpdir(), "find-")), "c");
    const requests = cc.requests.length;
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", out2], c.io, opts), 1);
    assert.deepEqual(c.json(), { problems: ["the crawl list could not be read; name the crawls with --snapshot"] });
    assert.equal(cc.requests.slice(requests).filter((p) => !p.startsWith("index/")).length, 0);
    // Usage.
    const usageBefore = cc.requests.length;
    for (const args of [["catalog", "find"], ["catalog", "find", "--finder", "bing", "--out", out2], ["catalog", "find", "--finder", "robots"], ["catalog", "find", "--finder", "github", "--out", out2, "--snapshot", "2026-11-12"], ["catalog", "find", "--finder", "robots", "--out", out2, "--snapshot", "../x"], ["catalog", "find", "--finder", "robots", "--out", out2, "--snapshot", "CC-MAIN-2026-43", "--snapshot", "x"]]) {
      c = capture();
      assert.equal(await main(args, c.io, opts), 2, args.join(" ")); assert.equal(c.out(), "");
    }
    assert.equal(cc.requests.length, usageBefore, "usage errors fetch nothing");
  } finally { cc.behave = null; await cc.close(); }
});
```

The strangers' addresses in `SAMPLE_CAPTURES` are `.example` hosts: nothing in this test can reach them (the finder never fetches a candidate; the assertion that only `index/` and `archive/` paths were asked pins it on the test origin). `Origin` records a request as `req.url.slice(1)`, query string included, which is why the GitHub assertion names the whole query. In the existing `catalog build` test from the step 5 plan, remove `["catalog", "find", "--finder", "robots", "--out", out]` from its usage-error loop (it is a real command now and would reach the public hosts without `finderInputs`); the bare `["catalog"]` case stays.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/cli.test.ts`
Expected: the new test fails (`catalog find` is refused).

- [ ] **Step 3: Extend `src/cli.ts`**

Imports: `import { Input, PUBLIC_INPUTS, type InputBases } from "./finders/input.ts"; import { listCrawls, robotsFinder, CRAWL } from "./finders/robots.ts"; import { githubFinder } from "./finders/github.ts"; import { candidateFileBytes, type FinderResult } from "./finders/candidates.ts"; import { join } from "node:path";` and `mkdirSync`, `existsSync`, `writeFileSync`, `renameSync` from `node:fs` (merge with the existing import; `src/cli.ts` has no `node:path` import today). `RunOptions` gains `finderInputs?: InputBases & { pause?: number; today?: string };   // test code only: local origins standing for the public inputs`. In `USAGE` add the line `  mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` before the `catalog build` line. In `catalog()`, replace `if (sub === "find") return usage(io, "catalog find arrives with the finders (step 6).");` with `if (sub === "find") return await find(rest, io, options);` and add:

```ts
const SNAPSHOT_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/;   // a snapshot name becomes a file name (the build's rule for a candidate file)

async function find(args: string[], io: Io, options: RunOptions): Promise<number> {
  const finder = flag(args, "--finder");
  const out = flag(args, "--out");
  const named = flags(args, "--snapshot");
  if ((finder !== "robots" && finder !== "github") || out === undefined) return usage(io, "catalog find needs --finder robots or github, and --out.");
  if (finder === "github" && named.length > 0) return usage(io, "the GitHub finder has no snapshots: its file is named by the day it runs.");
  for (const s of named) if (!CRAWL.test(s) || !SNAPSHOT_NAME.test(s)) return usage(io, `not a crawl name: ${s.length > 64 ? s.slice(0, 64) : s}`);
  const { archive, index, github } = options.finderInputs ?? PUBLIC_INPUTS;
  const input = new Input({ archive, index, github }, { test: options.finderInputs !== undefined, pause: options.finderInputs?.pause });
  try {
    let snapshots = named;
    if (finder === "github") snapshots = [options.finderInputs?.today ?? new Date().toISOString().slice(0, 10)];
    else if (snapshots.length === 0) {
      try { snapshots = (await listCrawls(input)).slice(0, 3); }
      catch { io.out(asciiJson({ problems: ["the crawl list could not be read; name the crawls with --snapshot"] }) + "\n"); return 1; }
    }
    const folder = join(out, finder);
    mkdirSync(folder, { recursive: true });
    const written: string[] = [], kept: string[] = [], failed: { snapshot: string; reason: string }[] = [];
    const summary: Record<string, Record<string, number>> = {};
    for (const snapshot of snapshots) {
      const path = join(folder, `${snapshot}.json`);
      if (existsSync(path)) { kept.push(snapshot); continue; }   // the output folder is the one thing kept between runs
      try {
        let last = 0;
        const progress = (done: number, total: number): void => { if (done - last >= 1000 || done === total) { last = done; io.err(`${snapshot}: ${done}/${total} files\n`); } };
        const result: FinderResult = finder === "robots" ? await robotsFinder(snapshot, input, { test: options.test }, progress) : await githubFinder(input, snapshot, { test: options.test });
        writeFileSync(`${path}.part`, candidateFileBytes(result));
        renameSync(`${path}.part`, path);   // whole or absent: a killed run leaves no half file to be kept
        written.push(snapshot);
        summary[snapshot] = result.summary;
      } catch (e) {
        const reason = typeof e === "object" && e !== null && "reason" in e && typeof (e as { reason: unknown }).reason === "string" ? (e as { reason: string }).reason : e instanceof Error ? e.message : "error";
        failed.push({ snapshot, reason });
      }
    }
    io.out(asciiJson({ finder, written, kept, failed, summary }) + "\n");
    return failed.length === 0 ? 0 : 1;
  } finally { input.close(); }
}
```

The usage note for a bad `--snapshot` echoes at most 64 characters of the argument on stderr, which is the operator's own command line, not a stranger's text; everything in `failed[].reason` is the tool's own wording. A gunzip error from a bad archive file is a Node `Error` whose message is zlib's own ("incorrect header check", "unexpected end of file"), not the file's bytes.

- [ ] **Step 4: Run the checks and the whole suite**

Run: `npm run check && npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: catalog find runs a finder over its public input and writes one candidate file per snapshot (<bead id>)"
```

---

### Task 6: The stranger, by fixture (acceptance clause 1)

**Files:**
- Create: `tests/stranger.test.ts`

**Interfaces:**
- Consumes: `main` from `src/cli.ts` with `RunOptions.finderInputs`; `Origin`; `warcGz`; `readInputs`; the leaf definition `ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1` from `fixtures/compact`.

**Acceptance Criteria:**
- Two sources on two local origins, each serving the same definition, neither introducing the other, neither named on any command line; a third origin stands for Common Crawl's archive and index, serving a crawl listing and one WARC file (built at run time, in the archive's shape) that holds a 200 capture naming each source, a 404 capture naming a third address, a 301, a 200 without the line, and a second capture of the first host; `catalog find --finder robots --snapshot <crawl> --out <c>` writes the candidate file and asks the two sources nothing; `catalog build --out <k> --candidates <c>/robots/<crawl>.json` succeeds with `seeded: false`; `said/<leaf>.json` lists both sources under `serves`; `catalog.json` names the candidate file with its finder and snapshot and `droppedCandidates` 0 (the 404's address was never a candidate); `sources.json` says each source was found `by: "finder"` with the robots place, alpha twice (two places); the index page carries no seeded note.
- No request leaves loopback, and `catalog find`'s requests are exactly the listing and the one WARC file.

- [ ] **Step 1: Write the test**

`tests/stranger.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, type Io } from "../src/cli.ts";
import { CATALOG } from "../src/limits.ts";
import { readInputs } from "../src/inputs.ts";
import { warcGz } from "./helpers/warc.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const LEAF = "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1";
const capture = () => { const o: string[] = [], e: string[] = []; const io: Io = { out: (s) => { o.push(s); }, err: (s) => { e.push(s); } }; return { io, out: () => o.join(""), err: () => e.join(""), json: () => JSON.parse(o.join("")) as Record<string, unknown> }; };

test("the stranger, by fixture: two sources that never link, named in a WARC fixture, meet in one catalog row", async () => {
  const [a, b, cc] = [await Origin.start(), await Origin.start(), await Origin.start()];
  try {
    const robotsOk: NonNullable<Origin["behave"]> = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
    a.behave = robotsOk; b.behave = robotsOk;
    const aAddr = a.source("mad/", { serve: [LEAF], publications: [{ target: LEAF, name: "from a", description: "d", tags: [], collection: "c" }] }, inputs).address;
    const bAddr = b.source("mad/", { serve: [LEAF] }, inputs).address;
    const SNAP = "CC-MAIN-2026-43";
    cc.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from(`crawl-data/${SNAP}/segments/1.2/robotstxt/one.warc.gz\n`)));
    cc.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/one.warc.gz`, warcGz([
      { uri: "http://alpha.example/robots.txt", status: 200, body: `User-agent: *\nAllow: /\nMad-Source: ${aAddr}\n` },
      { uri: "http://gone.example/robots.txt", status: 404, body: "Mad-Source: https://gone.example/source.json\n" },
      { uri: "http://moved.example/robots.txt", status: 301, body: "" },
      { uri: "http://beta.example/robots.txt", status: 200, body: `mad-source: ${bAddr}\n` },
      { uri: "http://plain.example/robots.txt", status: 200, body: "User-agent: *\nDisallow:\n" },
      { uri: "http://alpha.example/robots.txt", status: 200, body: `Mad-Source: ${aAddr}\n`, date: "2026-01-02T00:00:00Z" },
    ]));
    const finderInputs = { archive: `${cc.origin}/archive/`, index: `${cc.origin}/index/`, github: `${cc.origin}/github/`, pause: 0 };
    const candidates = join(mkdtempSync(join(tmpdir(), "stranger-")), "candidates");
    let c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", candidates, "--snapshot", SNAP], c.io, { test: true, finderInputs }), 0, c.out() + c.err());
    assert.deepEqual(a.requests, [], "catalog find fetched no address the robots lines named");
    assert.deepEqual(b.requests, []);
    assert.deepEqual(cc.requests, [`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, `archive/crawl-data/${SNAP}/segments/1.2/robotstxt/one.warc.gz`], "the listing and the one file, nothing else");
    const file = join(candidates, "robots", `${SNAP}.json`);
    const found = JSON.parse(readFileSync(file, "utf8")) as { candidates: { address: string }[]; summary: Record<string, number> };
    assert.deepEqual(found.candidates.map((x) => x.address).sort(), [aAddr, aAddr, bAddr].sort(), "two captures of alpha, one of beta; the 404's line is not read");
    assert.equal(found.summary["notAddresses"], 0);
    const out = join(mkdtempSync(join(tmpdir(), "stranger-")), "catalog");
    c = capture();
    assert.equal(await main(["catalog", "build", "--out", out, "--candidates", file], c.io, { test: true, limits: { ...CATALOG, requestMs: 2000 } }), 0, c.out());
    const summary = c.json();
    assert.equal(summary.seeded, false); assert.equal(summary.from, 0); assert.equal(summary.candidates, 1);
    const row = JSON.parse(readFileSync(join(out, "said", `${LEAF}.json`), "utf8")) as { serves: { source: string }[]; publications: { source: string }[] };
    assert.deepEqual(row.serves.map((s) => s.source), [aAddr, bAddr].sort(), "both strangers, in one row");
    assert.deepEqual(row.publications.map((p) => p.source), [aAddr]);
    const meta = JSON.parse(readFileSync(join(out, "catalog.json"), "utf8")) as { candidates: { finder: string; snapshot: string; count: number; path: string }[]; droppedCandidates: number; from: string[]; seeded: boolean };
    assert.deepEqual(meta.candidates, [{ finder: "robots", snapshot: SNAP, count: 3, path: `candidates/robots/${SNAP}.json` }]);
    assert.equal(meta.droppedCandidates, 0); assert.deepEqual(meta.from, []); assert.equal(meta.seeded, false);
    assert.ok(existsSync(join(out, "candidates", "robots", `${SNAP}.json`)), "the candidate file is copied into the catalog");
    const sources = JSON.parse(readFileSync(join(out, "sources.json"), "utf8")) as { sources: { address: string; found: { by: string; finder?: string; place?: Record<string, unknown> }[] }[] };
    for (const addr of [aAddr, bAddr]) {
      const s = sources.sources.find((x) => x.address === addr)!;
      assert.ok(s.found.every((f) => f.by === "finder" && f.finder === "robots" && typeof f.place?.["file"] === "string" && typeof f.place?.["offset"] === "number" && typeof f.place?.["robots"] === "string"), `${addr} found by the finder alone`);
    }
    assert.equal(sources.sources.find((x) => x.address === aAddr)!.found.length, 2, "alpha was seen twice at two offsets: two places, two ways");
    assert.ok(!readFileSync(join(out, "pages", "index.html"), "utf8").includes("hand-kept"), "not a seeded catalog");
  } finally { a.behave = null; b.behave = null; await a.close(); await b.close(); await cc.close(); }
});
```

The exact shapes of `catalog.json`'s `candidates` entries, `sources.json`'s `found` entries and the build's summary are step 5's (`src/catalog.ts`); read them before writing the assertions and match the names there rather than these if they differ.

- [ ] **Step 2: Run the test**

Run: `node --test tests/stranger.test.ts`
Expected: PASS at once if Tasks 1 to 5 are right; it is the acceptance test, written after the code (the dry run saw it pass first time). If it fails, the failure names which earlier task is wrong; fix there, not here.

- [ ] **Step 3: Run the whole suite and commit**

Run: `npm run check && npm test`

```bash
git add tests/stranger.test.ts
git commit -m "test: the stranger by fixture: two sources that never link meet in one catalog row through the robots finder (<bead id>)"
```

---

### Task 7: Documentation

**Files:**
- Modify: `README.md`, `docs/design.md`, `/Users/seriouscoderone/code/bpm/CLAUDE.md`, `CLAUDE.md` (plans list)

**Acceptance Criteria:**
- README Status says step 6 is built: `catalog find` with the robots finder over Common Crawl's robots.txt archive and the GitHub-topic finder, the stranger-by-fixture clause met by test; Running it lists `catalog find`; the paragraph after the code block says what each finder reads, that a finder fetches no address a stranger chose, and that deleting a snapshot's file makes the next run read that crawl again.
- `docs/design.md` records the plan's decisions as built: the crawl list from `collinfo.json`; `place` shapes (`file`, `offset` as the decompressed record offset, `robots`; `repository`); the finder applying the source address rule and the first-line rule; the candidate file's `summary`; `catalog find`'s exit status, `.part` writes and progress; the GitHub finder's paging, pause and all-or-nothing on `incomplete_results` and `total_count`; the input path's idle timeout and encoding refusal; the measured size (about 150 GB) in place of "about 165 GB" in both places. Acceptance clause 1 marked done with the date.
- Workspace `CLAUDE.md`'s mad-discovery entry says step 6 is built and step 7 (the live check, hosting) remains; nested `CLAUDE.md` lists `docs/plans/catalog-find.md` as current.
- `npm --prefix mad-discovery run check && npm --prefix mad-discovery test` passes from the workspace root.

- [ ] **Step 1: README**

In `## Status`, replace "The finders (`catalog find`) are step 6." with: "Step 6 is built: `catalog find --finder robots` reads a Common Crawl crawl's robots.txt archive (100,000 WARC files, about 150 GB) and writes the `Mad-Source` lines it finds, those that are source addresses, as candidates, all of the crawl or nothing; `catalog find --finder github` reads GitHub's repository search for the topic `mad-source` and writes the homepages that are source addresses, named by the day it ran (Ruling 10); the second epic's first clause, the stranger by fixture, is met by test. What remains is step 7: the live stranger check, which waits on Common Crawl capturing a host that carries a line or on a repository carrying the topic, and the maintainer's hosted catalog." In `## Running it`, add after the `catalog build` line:

```bash
node bin/mad-discovery.ts catalog find --finder robots --out <folder> [--snapshot CC-MAIN-YYYY-WW]...
node bin/mad-discovery.ts catalog find --finder github --out <folder>
```

and to the paragraph after the block: "`catalog find` reads only its finder's public input (`data.commoncrawl.org` and `index.commoncrawl.org`, or `api.github.com`), hosts fixed in code, and fetches no address a stranger chose; a candidate file is read by `catalog build --candidates`, which fetches and checks each address like any introduction. The robots finder reads about 150 GB per crawl on 16 connections; a snapshot's file, once written, is kept and not read again, so deleting it makes the next run read that crawl again."

- [ ] **Step 2: The design**

Under "What a finder returns", after the paragraph beginning "The robots finder reads responses with status 200 only.", add: "As built (step 6, 2026-11): the crawl list is `collinfo.json` on `index.commoncrawl.org`, its ids sorted newest first; both finders apply the source address rule and write the canonical address, counting the rest, and the robots finder's first `Mad-Source` line decides for its place (an empty or over-long value names nothing); a robots candidate's place is `{ file, offset, robots }`, the archive path, the byte offset of the record in the decompressed file and the robots.txt address Common Crawl fetched; a GitHub candidate's place is `{ repository }`; a candidate file also carries a `summary` of counts; `catalog find` exits 0 when every requested snapshot's file exists afterwards, written whole (to a `.part` name, then renamed) or kept, 1 when any failed, and prints progress on stderr; the GitHub finder reads 100 results a page, 6.5 seconds apart, unauthenticated, and fails the snapshot when GitHub answers `incomplete_results: true` or holds more than the 1,000 results it returns. The finders read their inputs through `src/finders/input.ts`, the one other place a socket is opened: TLS verified, no redirect followed, no content encoding accepted, an idle connection given up after 60 seconds, and five retries doubling from one second on a 429, a rate-limited 403, a 5xx or a connection error." In "Who runs a catalog" and in "Build order" step 6, replace "about 165 GB" with "about 150 GB (measured 2026-11-12: 100,000 files of 1.4 to 1.6 MB)". In "Acceptance", clause 1: append " Done 2026-11-DD (`tests/stranger.test.ts`)." with the date of Task 6's commit.

- [ ] **Step 3: CLAUDE.md files and the suite**

Nested `CLAUDE.md`: the plans sentence names `docs/plans/catalog-find.md` (step 6 of the second epic, current) and `docs/plans/catalog-build.md` (step 5). Workspace `CLAUDE.md`: in the mad-discovery entry replace "the finders are step 6." with "step 6 built (`catalog find`: the robots finder over Common Crawl's robots.txt archive and the GitHub-topic finder; plan `mad-discovery/docs/plans/catalog-find.md`); step 7, the live stranger check and the hosted catalog, remains."

```bash
cd /Users/seriouscoderone/code/bpm && npm --prefix mad-discovery run check && npm --prefix mad-discovery test
cd /Users/seriouscoderone/code/bpm/mad-discovery && git pull --ff-only && git add README.md docs/design.md CLAUDE.md && git commit -m "docs: step 6 is built, the finders (<bead id>)" && git push
cd /Users/seriouscoderone/code/bpm && git add CLAUDE.md && git commit -m "docs: mad-discovery step 6 is built (<bead id>)" && git push
```

---

### Closing steps (the controller's, after Task 7)

1. **The GitHub finder, live.** `node bin/mad-discovery.ts catalog find --finder github --out <scratch>`: one request to `api.github.com`; today it should write a file with zero candidates and `summary.items` 0. Record the result in the Executed header.
2. **One real crawl scan**, with the maintainer's go, since it reads about 150 GB over his connection for one to three hours: `node bin/mad-discovery.ts catalog find --finder robots --out <scratch> --snapshot CC-MAIN-2026-43`. This is step 6's own closing measurement (design, build order: "one full scan of a real crawl, which shows whether it fits the job it will run in"). Record: wall-clock time, the summary's counts (files, records, responses, lines, candidates, notAddresses), and then `catalog build --candidates <file> --out <scratch2>` over the candidates, which fetches the strangers' addresses the lines name as any build does, and whether `mad.seriouscoder.one` or `mad.josephleehunsaker.com` appear (they will not until a crawl captures those hosts; the design and Ruling 10 say so).

---

## Self-review

**Spec coverage.** "The catalog": `catalog find --finder <name> --out <folder> [--snapshot <name>]...` (Task 5). "The robots.txt line": the field matched without regard to case, text after `#` ignored (Task 2, with captures for each). "Finding sources nobody linked": the robots finder (Tasks 2, 3) and the GitHub-topic finder (Task 4, Ruling 10), each stating its reach in the README (Task 7). "What a finder returns": a module in this package, no outside code (Tasks 3, 4); writes `<finder>/<snapshot>.json`; a file already there kept and not read again (Task 5 test); all of a snapshot or nothing and exit non-zero (Tasks 3, 4, 5; GitHub's `incomplete_results` and 1,000-result ceiling included); one candidate per place, the first `Mad-Source` line (Task 2; decision 9); candidates that are not source addresses dropped (both finders, decision 9; the build's own drop kept, Task 6 asserts `droppedCandidates`); the GitHub file named by the date (Tasks 4, 5); status 200 only (Task 2); Common Crawl's names, the three most recent by default (Tasks 3, 5); 503 retried no faster than once a second (Task 1); nothing written for a crawl if any file cannot be read (Task 3); the finder's reads outside the limits, 16 connections, files over 1 MB (Task 1, decision 1). "Who runs a catalog", stage 1 (Find fetches no address a stranger chose): asserted in Tasks 5 and 6 on the strangers' origins' request logs. "Tests", the stranger case by fixture (Task 6, with the fixture in the archive's shape from Task 2). "Acceptance" clause 1 (Task 6). "Build order" step 6: the fixture, the GitHub finder with a fixture of its answer (Task 4), and one full scan of a real crawl (closing step 2, gated on the maintainer's bandwidth, not deferred). Decision 10's text (Task 7 marks the clause).

**Decisions for the gate.** Nine, listed above; the ones with a real trade-off: the second network path (decision 1), the decompressed offset in `place` (decision 3), the GitHub finder's unauthenticated 1,000-result ceiling as a hard failure (decision 5), the finder applying the address rule (decision 9).

**Placeholders.** `<bead id>` in commit messages is the orchestrator's. Task 7's date in the design is Task 6's commit date. No other.

**Type consistency.** `FinderCandidate`/`CandidateFile`/`FinderResult` live in `src/finders/candidates.ts`; `src/catalog.ts` imports and re-exports `CandidateFile`; `src/crawl.ts`'s `Candidate` is a different type with a different name; `robotsFinder(snapshot, input, opts, progress)` and `githubFinder(input, today, opts)` return `FinderResult`; `candidateFileBytes(FinderResult)`; `Input.open` returns `{ status: 200; stream; headers }`, `Input.readAll` a `Uint8Array`, `Input.sleep` is public and used by the GitHub finder's pauses; `InputError.reason` is `InputReason` (six values); `RunOptions.finderInputs` is `InputBases & { pause?; today? }` and `find()` passes only the three bases to `Input`; `warcRecords(stream, maxFile?)` yields `WarcRecord` with `offset`, `type`, `uri`, `payload`; `robotsLine` takes a `Uint8Array`.
