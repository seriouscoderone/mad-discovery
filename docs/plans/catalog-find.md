# The finders, `catalog find` (step 6 of the second epic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** `mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` reads one public input that nobody here operates and writes one candidate file per snapshot, through `asciiJson`, that `catalog build --candidates` consumes: the robots finder over Common Crawl's robots.txt archive (one WARC fixture in the archive's shape, and one real crawl), and the GitHub-topic finder over GitHub's repository search (Ruling 10); and the second epic's clause 1 passes: two sources that never link to each other, named in a WARC fixture, end up in one catalog row.

**Architecture:** A finder is a module under `src/finders/`; `catalog find` runs it and writes its file. Finders read their inputs through one streaming fetch of their own (`src/finders/input.ts`), separate from the one routine that fetches strangers' addresses, because the inputs are gigabyte archives on hosts the code names, not addresses a stranger chose; it verifies TLS, follows no redirect, accepts the bytes as served, retries a 429 or 5xx no faster than once a second, and holds at most 16 connections. The robots finder lists a crawl's 100,000 robots.txt WARC files, streams each through gunzip and a WARC record parser, and takes from each response with status 200 the first `Mad-Source:` line; the GitHub finder pages through `search/repositories?q=topic:mad-source` and takes each repository's homepage when it is a source address. Candidate files are `{ finder, snapshot, candidates: [{ address, place }], summary }`, sorted, ASCII; the build de-duplicates and visits them (step 5). A WARC fixture in the archive's real shape is built by a test helper, committed once, and used by the stranger test.

**Tech Stack:** Node 24 (`node:https`, `node:zlib` streaming gunzip over Common Crawl's multi-member gzip, `node:stream`), TypeScript 7.0.2 as a type check only, `node --test`. No new dependency.

**Scope:** Design build order step 6 and acceptance clause 1 (stranger by fixture). The real crawl scan (about 150 GB, one to three hours on 16 connections) is a closing step run by the controller after the maintainer's go, since it uses his bandwidth; the GitHub finder's live run is one request. Clause 2 (stranger, live) and hosting the catalog are step 7. Nothing is deployed and no AWS is touched.

**Measured before planning (2026-11-12 UTC):** `https://data.commoncrawl.org/crawl-data/CC-MAIN-2026-43/robotstxt.paths.gz` lists 100,000 files of 1.4 to 1.6 MB each (about 150 GB), each a multi-member gzip (one member per WARC record, about 1,700 per file, about 860 responses; statuses in one file: 541 x 200, 111 x 404, 104 x 301, 29 x 403, 26 x 302, 21 x 429). A record is `WARC/1.0`, CRLF-separated headers (`WARC-Type`, `WARC-Target-URI`, `Content-Length`, ...), a blank line, `Content-Length` payload bytes, then two CRLFs; a response's payload is an HTTP/1.1 status line, headers, blank line, body. Node's `zlib.createGunzip()` and `gunzipSync` both decode every member of such a file (2,722,448 bytes from the 1,413,921-byte sample). `https://index.commoncrawl.org/collinfo.json` lists the crawls newest first (`id: "CC-MAIN-2026-43"`, `name`, `from`, `to`). GitHub's `search/repositories?q=topic:mad-source` answers unauthenticated with `x-ratelimit-limit: 10` per minute and, today, zero repositories.

## Global Constraints

From `docs/design.md` ("The catalog", "Finding sources nobody linked", "What a finder returns", "Who runs a catalog", "Tests", "Acceptance", "Build order", decision 10) and the earlier plans' constraints, which still hold (the address rule; `asciiJson`; ASCII-only sources; the `test` option and any test-only option set by test code only, never by a flag, environment variable or configuration; no new dependency).

- **A finder is a module in this package; no outside code is loaded.** `catalog find` runs it and writes its candidates, each with where it was seen, to `<out>/<finder>/<snapshot>.json`. A file already there is kept and that snapshot is not read again; the output folder is the one thing kept between runs, so `catalog find` writes into a folder that may already hold files and never overwrites one.
- **All or nothing per snapshot.** A finder reads all of a snapshot, or writes no file for it and exits non-zero. A missing or partly read input never produces a smaller catalog. The robots finder writes nothing for a crawl if any of its files cannot be read (after retries); it retries no faster than once a second when the archive answers 503.
- **One candidate per place seen:** the first `Mad-Source` line in a robots.txt. The robots finder reads responses with status 200 only. Two captures of one host give two candidates; the build de-duplicates. The finder writes the line's value as given (trimmed, bounded); candidates that are not source addresses are dropped and counted by the build (step 5), not by the finder.
- **Snapshots.** The robots finder's snapshots are Common Crawl's crawls under Common Crawl's own names (`CC-MAIN-YYYY-WW`); with no `--snapshot` it takes the three most recent, read from `collinfo.json`. The GitHub finder has no snapshot: its file is named by the UTC date it ran, and a build copies it into its output (step 5 does). `catalog.json` records the snapshots a build used (step 5 does, through the candidate files' names).
- **The finders' reads are outside the limits in "Fetching safely"**, which bound fetches of addresses a stranger chose: the robots finder reads archive files larger than 1 MB, on up to 16 connections to one host. Everything else about safety holds: TLS verified, no redirect followed, the hosts fixed in code (`data.commoncrawl.org`, `index.commoncrawl.org`, `api.github.com`), a test's local origins admitted only through a test-only option. The finder fetches no address a stranger chose: a `Mad-Source` value is written to the candidate file and never fetched by `catalog find`.
- **Candidate files** are the shape step 5 reads: `{ "finder", "snapshot", "candidates": [ { "address", "place" } ] }` with `finder` and `snapshot` matching `^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$`, `place` keys matching `^[A-Za-z][A-Za-z0-9_]{0,31}$` and values strings or numbers; the robots finder's `place` is `{ "file": "<archive path>", "offset": <byte offset of the record in the decompressed file>, "robots": "<the robots.txt address Common Crawl fetched>" }`, the GitHub finder's `{ "repository": "<owner/name>" }`. Written through `asciiJson` (so the copies step 5 makes are ASCII), candidates sorted by address then by place, plus a `summary` member of counts; no time in the file but the GitHub snapshot name, which is a date by design.
- **Strangers' text.** A robots.txt body, a WARC header, a GitHub answer are strangers' text: no regular expression with backtracking over them (line splitting and prefix checks), every value bounded (a `Mad-Source` value at most 512 characters; a repository name at most 140; a WARC header line at most 8 KB; a record payload at most 16 MB), and nothing from them reaches a file name (the file is named by the finder and the snapshot, which `catalog find` validated).
- **Tests reach only loopback.** A finder under test reads a local origin standing for the archive, the index and GitHub, through the test-only option; the `Origin` helper serves the WARC fixture, the paths listing and a GitHub answer.
- **The stranger case, by fixture (clause 1).** Two sources that never link to each other, a WARC fixture in the real shape of Common Crawl's robots.txt archive naming both (with 200 and non-200 responses and two captures of one host), `catalog find` over it, and `catalog build --candidates` from its file: the catalog's row for the shared SAID lists both.
- Workspace rules: small commits with the bead id and the trailers `Co-Authored-By: <the model that ran> <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01GCnrh59DdJ8F5moTi1LZML`; files staged by name; mutating `bd` from `/Users/seriouscoderone/code/bpm`; `git pull --ff-only` before each task (another agent shares `main`); push after review. No AWS anywhere in this plan.

## Decisions this plan makes (for the gate)

1. **A second network path, for the finders' inputs only.** `src/finders/input.ts` opens streams to three hosts named in code and nowhere else; it is not `fetchJson` because the inputs are 1.5 MB gzip files by the hundred thousand and 1 MB-bounded buffering would not do. CLAUDE.md's third rule gains the sentence: "The finders (`src/finders/`) read their own public inputs, hosts fixed in code, through `src/finders/input.ts`; that is the one other place a socket is opened, and it fetches no address a stranger chose." The design's "Fetching safely" already says the finder's reads are outside the limits; this names where.
2. **The crawl list.** `collinfo.json` on `index.commoncrawl.org` is the list; the three newest ids whose name matches `^CC-MAIN-\d{4}-\d{2}$` are the default snapshots. If the index host does not answer, `catalog find --finder robots` without `--snapshot` fails and says to name the crawls.
3. **The record's offset** in `place` is the byte offset of the record's `WARC/1.0` line in the decompressed file, which anyone who gunzips the file can seek to; Common Crawl's own indexes use the compressed member offset, which a streaming gunzip does not expose without parsing gzip members. Decision for the gate: the decompressed offset, named `offset`, with the archive path in `file` and the robots.txt address in `robots`.
4. **Retries.** A 429 or 5xx answer or a connection error is retried after 1, 2, 4, 8 and 16 seconds (five retries), then the snapshot fails. Progress (`files done / total`) goes to stderr every 1,000 files; the summary JSON to stdout.
5. **The GitHub finder** reads unauthenticated (10 requests a minute), 100 results a page, at most 10 pages (GitHub's 1,000-result ceiling), pausing 6.5 seconds between pages; it writes a candidate for each repository whose `homepage` passes the source address rule, with `place: { repository: full_name }`; its snapshot is the UTC date (`YYYY-MM-DD`), so running it twice in one day keeps the first file. A fixture of GitHub's answer in the API's shape (two usable homepages, one that is not a source address, one missing) is served by a local origin in tests.
6. **`catalog find`'s exit status** is 0 when every requested snapshot's file exists afterwards (written now or kept), 1 when any failed (the others' files stay written), 2 on usage. Its summary names `written` and `kept`.
7. **Test-only inputs.** `RunOptions.finderInputs?: { archive, index, github, pause? }` (bases and a pause override) is set by test code only, like `test`; `bin/mad-discovery.ts` passes none, so the production finder can only reach the three fixed hosts.
8. **The committed WARC fixture** (`fixtures/robotstxt/sample.warc.gz`) is generated by the test helper from fixed text and pinned by a test that regenerates it and compares bytes, so the helper and the fixture cannot drift; the stranger test builds its own fixture at run time because the two sources' addresses carry ephemeral ports.

## File structure

```
mad-discovery/
  src/finders/input.ts      Input: streaming GET of a fixed public input with retries, no redirects, bounded; PUBLIC_INPUTS
  src/finders/warc.ts       warcRecords(stream): the WARC record parser; robotsLine(payload): status 200 and the first Mad-Source value
  src/finders/robots.ts     listCrawls(input), robotsFinder(snapshot, input, progress?): the robots finder
  src/finders/github.ts     githubFinder(input, today): the GitHub-topic finder
  src/finders/candidates.ts CandidateFile type (shared with src/catalog.ts), candidateFileBytes(result): sorted, asciiJson
  src/cli.ts                catalog find; RunOptions.finderInputs (test only)
  tests/helpers/warc.ts     warcGz(records): a multi-member gzip WARC file in the archive's shape
  fixtures/robotstxt/sample.warc.gz, fixtures/robotstxt/README.md
  fixtures/github/search-sample.json
  tests/input.test.ts, warc.test.ts, robots.test.ts (extended: the finder's tests go in tests/finder-robots.test.ts to leave the matcher's file alone), finder-github.test.ts, cli.test.ts (catalog find), stranger.test.ts
  CLAUDE.md (rule 3), README.md, docs/design.md (clarifications), ../CLAUDE.md
```

Dependencies between tasks: 1 -> 3 -> 5 -> 6; 2 -> 3; 1 -> 4 -> 5; 6 -> 7.

---

### Task 1: The finders' input: a streaming fetch of fixed public hosts

**Files:**
- Create: `src/finders/input.ts`, `tests/input.test.ts`
- Modify: `CLAUDE.md` (rule 3)

**Interfaces:**
- Produces: `type InputBases = { archive: string; index: string; github: string }`; `const PUBLIC_INPUTS: InputBases = { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" }`; `type InputOptions = { test?: boolean; connections?: number; retries?: number; pause?: number; sleep?: (ms: number) => Promise<void> }`; `class Input { constructor(bases: InputBases, opts?: InputOptions); readonly bases: InputBases; open(url: string, headers?: Record<string, string>): Promise<{ status: 200; stream: Readable; headers: IncomingHttpHeaders }>; readAll(url: string, maxBytes: number, headers?: Record<string, string>): Promise<Uint8Array>; close(): void }`. `open` resolves only on a 200; it throws `InputError` (`{ url, reason: "refused-url" | "status" | "redirected" | "too-large" | "unreachable"; status?: number }`) otherwise. `readAll` buffers up to `maxBytes` and throws `too-large` beyond.

**Acceptance Criteria:**
- A URL that does not start with one of the three bases is refused (`refused-url`) without a request; with `test: true` the bases may be plain-HTTP loopback origins (the test's), and the same prefix rule applies.
- `open` sends `Accept-Encoding: identity` and the tool's `User-Agent`, plus the caller's headers; it does not follow a 3xx (`redirected`); a 4xx other than 429 fails at once (`status`); a 429 or a 5xx or a connection error is retried after 1, 2, 4, 8, 16 seconds (through `sleep`, injected in tests), then fails; TLS is verified (`rejectUnauthorized: true`, set explicitly).
- At most `connections` (default 16) sockets to one host at a time, through one `Agent` with keep-alive, closed by `close()`.
- `readAll` returns the body up to `maxBytes` and throws `too-large` when the body exceeds it, aborting the request.
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
const input = () => new Input(bases, { test: true, sleep });

test("the public inputs are the three hosts the design names, and nothing else is opened", async () => {
  assert.deepEqual(PUBLIC_INPUTS, { archive: "https://data.commoncrawl.org/", index: "https://index.commoncrawl.org/", github: "https://api.github.com/" });
  const i = input();
  const before = origin.requests.length;
  for (const url of ["https://data.commoncrawl.org/x", `${origin.origin}/elsewhere/x`, "http://evil.test/archive/x", `${origin.origin}/archive`]) {
    await assert.rejects(i.open(url), (e: unknown) => e instanceof InputError && e.reason === "refused-url", url);
  }
  assert.equal(origin.requests.length, before, "a refused URL costs no request");
  const prod = new Input(PUBLIC_INPUTS, { sleep });
  await assert.rejects(prod.open(`${origin.origin}/archive/x`), (e: unknown) => e instanceof InputError && e.reason === "refused-url", "without the test option a loopback base is not admitted");
  i.close(); prod.close();
});

test("open streams a 200 as served, with identity encoding and the tool's user agent; readAll bounds the body", async () => {
  origin.put("archive/a.bin", new Uint8Array([1, 2, 3, 4, 5]));
  let seen: Record<string, unknown> = {};
  origin.behave = (req) => { seen = { ...req.headers }; return false; };
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
    await assert.rejects(i.readAll(`${origin.origin}/archive/a.bin`, 4), (e: unknown) => e instanceof InputError && e.reason === "too-large");
    i.close();
  } finally { origin.behave = null; }
});

test("a redirect is not followed; a 404 fails at once; a 503 or a 429 is retried after 1, 2, 4, 8, 16 seconds and then fails; a connection error likewise", async () => {
  let calls = 0;
  origin.behave = (req, res) => {
    calls++;
    if (req.url === "/archive/moved") { res.statusCode = 302; res.setHeader("location", `${origin.origin}/archive/a.bin`); res.end(); return true; }
    if (req.url === "/archive/busy") { res.statusCode = 503; res.end(); return true; }
    if (req.url === "/archive/slow") { res.statusCode = 429; res.end(); return true; }
    if (req.url === "/archive/flaky") { res.statusCode = calls <= 2 ? 503 : 200; if (calls > 2) res.setHeader("content-type", "application/octet-stream"); res.end(calls > 2 ? "ok" : undefined); return true; }
    return false;
  };
  try {
    const i = input();
    await assert.rejects(i.open(`${origin.origin}/archive/moved`), (e: unknown) => e instanceof InputError && e.reason === "redirected");
    assert.ok(!origin.requests.includes("archive/a.bin") || origin.requests.filter((p) => p === "archive/a.bin").length === 2, "the redirect's target was not requested by this test");
    await assert.rejects(i.open(`${origin.origin}/archive/missing`), (e: unknown) => e instanceof InputError && e.reason === "status" && e.status === 404);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/busy`), (e: unknown) => e instanceof InputError && e.reason === "status" && e.status === 503);
    assert.deepEqual(slept, [1000, 2000, 4000, 8000, 16000], "five retries, doubling from one second");
    assert.equal(origin.requests.filter((p) => p === "archive/busy").length, 6);
    slept.length = 0;
    await assert.rejects(i.open(`${origin.origin}/archive/slow`), (e: unknown) => e instanceof InputError && e.reason === "status" && e.status === 429);
    assert.equal(slept.length, 5);
    calls = 0; slept.length = 0;
    const r = await i.open(`${origin.origin}/archive/flaky`);
    assert.equal(r.status, 200); assert.deepEqual(slept, [1000, 2000], "recovered on the third try");
    r.stream.resume();
    const dead = await Origin.start(); const deadBases = { ...bases, archive: `${dead.origin}/archive/` }; await dead.close();
    slept.length = 0;
    await assert.rejects(new Input(deadBases, { test: true, sleep }).open(`${deadBases.archive}x`), (e: unknown) => e instanceof InputError && e.reason === "unreachable");
    assert.equal(slept.length, 5);
    i.close();
  } finally { origin.behave = null; }
});

test("at most the configured connections to a host are open at once", async () => {
  let open = 0, peak = 0;
  origin.behave = (_req, res) => { open++; peak = Math.max(peak, open); setTimeout(() => { open--; res.setHeader("content-type", "application/octet-stream"); res.end("x"); }, 30); return true; };
  try {
    const i = new Input(bases, { test: true, sleep, connections: 3 });
    await Promise.all(Array.from({ length: 9 }, (_, k) => i.readAll(`${origin.origin}/archive/c${k}`, 10)));
    assert.equal(peak, 3);
    i.close();
  } finally { origin.behave = null; }
});
```

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
  retries?: number;                      // after a 429, a 5xx or a connection error; 5 by default
  pause?: number;                        // the first pause in ms, doubling; 1000 by default
  sleep?: (ms: number) => Promise<void>; // tests inject one
};

export type InputReason = "refused-url" | "status" | "redirected" | "too-large" | "unreachable";

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

/**
 * One streaming GET of a fixed public input (docs/design.md "What a finder returns": a finder's reads of its own public input are
 * outside the limits that bound fetches of strangers' addresses). It verifies TLS, follows no redirect, accepts the bytes as served,
 * retries a 429, a 5xx or a connection error no faster than once a second, and holds at most `connections` sockets to a host.
 */
export class Input {
  readonly bases: InputBases;
  private readonly test: boolean;
  private readonly retries: number;
  private readonly pause: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly httpsAgent: https.Agent;
  private readonly httpAgent: http.Agent;

  constructor(bases: InputBases, opts: InputOptions = {}) {
    this.bases = bases;
    this.test = opts.test === true;
    this.retries = opts.retries ?? 5;
    this.pause = opts.pause ?? 1000;
    this.sleep = opts.sleep ?? wait;
    const max = opts.connections ?? 16;
    this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: max });
    this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: max });
  }

  /** The URL must extend one of the bases and must be https unless the test option admits a loopback base. */
  private admitted(url: string): boolean {
    const base = Object.values(this.bases).find((b) => url.startsWith(b) && url.length > b.length);
    if (base === undefined) return false;
    if (base.startsWith("https://")) return true;
    return this.test && /^http:\/\/(127\.0\.0\.1|\[::1\]|localhost)(:\d+)?\//.test(base);
  }

  private once(url: string, headers: Record<string, string>): Promise<{ status: number; res: http.IncomingMessage }> {
    return new Promise((resolve, reject) => {
      const secure = url.startsWith("https://");
      const req = (secure ? https : http).request(url, {
        method: "GET",
        agent: secure ? this.httpsAgent : this.httpAgent,
        rejectUnauthorized: true,
        headers: { "accept-encoding": "identity", "user-agent": USER_AGENT, ...headers },
      }, (res) => resolve({ status: res.statusCode ?? 0, res }));
      req.on("error", reject);
      req.end();
    });
  }

  /** A 200 answer's stream, or an InputError. 429, 5xx and connection errors are retried with doubling pauses. */
  async open(url: string, headers: Record<string, string> = {}): Promise<{ status: 200; stream: Readable; headers: IncomingHttpHeaders }> {
    if (!this.admitted(url)) throw new InputError(url, "refused-url");
    let last: InputError = new InputError(url, "unreachable");
    for (let attempt = 0; ; attempt++) {
      try {
        const { status, res } = await this.once(url, headers);
        if (status === 200) return { status, stream: res, headers: res.headers };
        res.resume();
        if (status >= 300 && status < 400) throw new InputError(url, "redirected", status);
        last = new InputError(url, "status", status);
        if (status !== 429 && status < 500) throw last;
      } catch (e) {
        if (e instanceof InputError && (e.reason === "redirected" || (e.reason === "status" && e.status !== 429 && (e.status ?? 500) < 500))) throw e;
        if (!(e instanceof InputError)) last = new InputError(url, "unreachable");
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
    for await (const chunk of stream) {
      read += (chunk as Buffer).length;
      if (read > maxBytes) { stream.destroy(); throw new InputError(url, "too-large"); }
      chunks.push(chunk as Buffer);
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  close(): void {
    this.httpsAgent.destroy();
    this.httpAgent.destroy();
  }
}
```

The retry loop's `catch` keeps the two non-retried errors (redirect, a 4xx other than 429) and turns anything else into another attempt; read it twice against the test's expectations (`busy` costs six requests and five sleeps; `missing` costs one).

- [ ] **Step 4: CLAUDE.md**

In `CLAUDE.md`, append to the third rule's paragraph: " The finders (`src/finders/`) read their own public inputs, hosts fixed in code, through `src/finders/input.ts`; that is the one other place a socket is opened, and it fetches no address a stranger chose."

- [ ] **Step 5: Run the checks and the whole suite, then commit**

Run: `npm run check && npm test`

```bash
git add src/finders/input.ts tests/input.test.ts CLAUDE.md
git commit -m "feat: the finders' input: a streaming fetch of three fixed public hosts, retried, no redirects (<bead id>)"
```

---

### Task 2: The WARC record parser and the robots line

**Files:**
- Create: `src/finders/warc.ts`, `tests/helpers/warc.ts`, `tests/warc.test.ts`, `fixtures/robotstxt/sample.warc.gz`, `fixtures/robotstxt/README.md`

**Interfaces:**
- Produces: in `src/finders/warc.ts`: `type WarcRecord = { offset: number; type: string; uri: string | null; payload: Uint8Array }`; `async function* warcRecords(stream: Readable): AsyncGenerator<WarcRecord>` (the stream is the gunzipped bytes; a header block longer than 8 KB or a payload longer than 16 MB throws `WarcError`; a truncated file throws `WarcError`); `robotsLine(payload: Uint8Array): string | null` (the first `Mad-Source` value of a status-200 HTTP response, trimmed, 1 to 512 characters; `null` for any other status, no such line, or a value out of bounds). In `tests/helpers/warc.ts`: `type Capture = { uri: string; status: number; body: string; date?: string }`; `warcGz(captures: Capture[]): Uint8Array` (a multi-member gzip in the archive's shape: a `warcinfo` record, then for each capture a `request` and a `response` record, with the headers Common Crawl writes).

**Acceptance Criteria:**
- `warcRecords` yields every record of the fixture with its type, `WARC-Target-URI` and payload bytes exactly, and the decompressed byte offset of each record's `WARC/1.0` line; it yields the same for the real Common Crawl sample's layout (headers CRLF, blank line, payload, two CRLFs).
- `robotsLine` returns the first `Mad-Source` value of a 200 response whatever the field's letter case and surrounding whitespace, ignores the field in a 301/404/403/429/503 response, ignores a line that only contains the word, returns `null` for a value over 512 characters or empty, and never uses a regular expression over the body.
- `fixtures/robotstxt/sample.warc.gz` equals `warcGz` over the captures its README lists (the test regenerates and compares), gunzips with Node, and holds 200 and non-200 responses and two captures of one host.

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

/** The committed fixture's captures: two sources named, 200 and non-200 answers, and two captures of one host. */
export const SAMPLE_CAPTURES: Capture[] = [
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n" },
  { uri: "http://beta.example/robots.txt", status: 200, body: "# a comment\nUser-agent: *\nDisallow: /private/\nmad-source:   https://beta.example/discovery/source.json   \nMad-Source: https://beta.example/second/source.json\n" },
  { uri: "http://gamma.example/robots.txt", status: 404, body: "Mad-Source: https://gamma.example/source.json\n" },
  { uri: "http://delta.example/robots.txt", status: 301, body: "" },
  { uri: "http://epsilon.example/robots.txt", status: 200, body: "User-agent: *\nDisallow:\n" },
  { uri: "http://alpha.example/robots.txt", status: 200, body: "User-agent: *\nAllow: /\n\nMad-Source: https://mad.alpha.example/source.json\n", date: "2026-01-02T00:00:00Z" },
  { uri: "http://zeta.example/robots.txt", status: 200, body: "Mad-Source\nMad-Source: \nMad-Source: not an address\n" },
];
```

`gzipSync` writes a fixed header (no file name, mtime 0) so the output is deterministic; the test below pins it.

- [ ] **Step 2: Write the failing tests**

`tests/warc.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { createGunzip, gunzipSync } from "node:zlib";
import { warcRecords, robotsLine, WarcError } from "../src/finders/warc.ts";
import { warcGz, SAMPLE_CAPTURES } from "./helpers/warc.ts";

const FIXTURE = fileURLToPath(new URL("../fixtures/robotstxt/sample.warc.gz", import.meta.url));
const records = async (gz: Uint8Array) => { const out = []; for await (const r of warcRecords(Readable.from([Buffer.from(gz)]).pipe(createGunzip()))) out.push(r); return out; };

test("the committed fixture is the helper's output over its listed captures, and Node gunzips every member", () => {
  const committed = new Uint8Array(readFileSync(FIXTURE));
  assert.deepEqual(committed, warcGz(SAMPLE_CAPTURES), "regenerate with tests/helpers/warc.ts when the captures change");
  const text = gunzipSync(committed).toString("latin1");
  assert.equal((text.match(/WARC-Type: response/g) ?? []).length, SAMPLE_CAPTURES.length);
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

test("warcRecords refuses a header block over 8 KB, a payload over 16 MB and a truncated file", async () => {
  const big = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nX: ${"a".repeat(9000)}\r\nContent-Length: 0\r\n\r\n\r\n\r\n`, "latin1");
  await assert.rejects(records(new Uint8Array(gunzipRoundTrip(big))), (e: unknown) => e instanceof WarcError);
  const huge = Buffer.from(`WARC/1.0\r\nWARC-Type: response\r\nContent-Length: ${17 * 1024 * 1024}\r\n\r\n`, "latin1");
  await assert.rejects(records(new Uint8Array(gunzipRoundTrip(huge))), (e: unknown) => e instanceof WarcError);
  const cut = warcGz(SAMPLE_CAPTURES.slice(0, 1));
  const plain = gunzipSync(cut);
  await assert.rejects(records(new Uint8Array(gunzipRoundTrip(plain.subarray(0, plain.length - 40)))), (e: unknown) => e instanceof WarcError, "a record cut short");
});

import { gzipSync } from "node:zlib";
const gunzipRoundTrip = (plain: Uint8Array): Buffer => gzipSync(plain);

test("robotsLine takes the first Mad-Source value of a 200 response, whatever its case and spacing, and nothing from any other answer", async () => {
  const all = await records(warcGz(SAMPLE_CAPTURES));
  const responses = all.filter((r) => r.type === "response");
  assert.deepEqual(responses.map((r) => robotsLine(r.payload)), [
    "https://mad.alpha.example/source.json",
    "https://beta.example/discovery/source.json",
    null,   // 404 with the line: not read
    null,   // 301
    null,   // 200 without the line
    "https://mad.alpha.example/source.json",   // the second capture of alpha
    "not an address",   // the first value that is not empty; the build drops what is not a source address
  ]);
  const long = Buffer.from(`HTTP/1.1 200 OK\r\n\r\nMad-Source: ${"a".repeat(513)}\n`, "latin1");
  assert.equal(robotsLine(long), null, "a value over 512 characters");
  const crlf = Buffer.from(`HTTP/1.1 200 OK\r\ncontent-type: text/plain\r\n\r\nUser-agent: *\r\nMAD-SOURCE:https://x.example/source.json\r\n`, "latin1");
  assert.equal(robotsLine(crlf), "https://x.example/source.json");
  assert.equal(robotsLine(Buffer.from("not http", "latin1")), null);
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

const MAX_HEADER = 8 * 1024;           // a record's header block
const MAX_PAYLOAD = 16 * 1024 * 1024;  // a record's payload; a robots.txt capture is kilobytes
const CRLFCRLF = Buffer.from("\r\n\r\n", "latin1");

/**
 * The records of a WARC file (WARC/1.0 and 1.1 as Common Crawl writes them): a header block of CRLF lines ending in an empty line,
 * Content-Length bytes of payload, then two CRLFs. Yields each record with the decompressed byte offset of its first line.
 * A stranger's file: every length is bounded and nothing is interpreted beyond the two headers the finder needs.
 */
export async function* warcRecords(stream: Readable): AsyncGenerator<WarcRecord> {
  let buf = Buffer.alloc(0);
  let consumed = 0;   // bytes of the stream before buf[0]
  let ended = false;
  const iterator = stream[Symbol.asyncIterator]();
  const more = async (): Promise<boolean> => {
    if (ended) return false;
    const n = await iterator.next();
    if (n.done) { ended = true; return false; }
    buf = Buffer.concat([buf, n.value as Buffer]);
    return true;
  };
  for (;;) {
    // Skip any blank lines between records, then require a header block.
    let headEnd = buf.indexOf(CRLFCRLF);
    while (headEnd < 0 && buf.length <= MAX_HEADER) if (!(await more())) break;
    headEnd = buf.indexOf(CRLFCRLF);
    if (headEnd < 0) {
      if (buf.toString("latin1").trim() === "") return;   // end of file
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
    while (buf.length < need) if (!(await more())) throw new WarcError(`a record cut short at ${offset}`);
    const payload = new Uint8Array(buf.subarray(headEnd + 4, headEnd + 4 + length));
    if (!buf.subarray(headEnd + 4 + length, need).equals(CRLFCRLF)) throw new WarcError(`a record without its trailing CRLFs at ${offset}`);
    yield { offset, type: headers.get("warc-type") ?? "", uri: headers.get("warc-target-uri") ?? null, payload };
    buf = buf.subarray(need);
    consumed += need;
  }
}

const MAX_VALUE = 512;   // the address rule's bound; the build applies the rule itself

/** The first Mad-Source value of a status-200 HTTP response payload, or null. Line splitting and a prefix check: no pattern over a stranger's text. */
export function robotsLine(payload: Uint8Array): string | null {
  const text = Buffer.from(payload).toString("utf8");
  const headEnd = text.indexOf("\r\n\r\n");
  if (headEnd < 0) return null;
  const status = text.slice(0, headEnd).split("\r\n")[0] ?? "";
  if (!(status.startsWith("HTTP/1.1 200") || status.startsWith("HTTP/1.0 200"))) return null;
  for (const raw of text.slice(headEnd + 4).split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line.length < 11 || line.slice(0, 11).toLowerCase() !== "mad-source:") continue;
    const value = line.slice(11).trim();
    if (value.length >= 1 && value.length <= MAX_VALUE) return value;
    return null;   // the first Mad-Source line is the one that counts, and it is out of bounds
  }
  return null;
}
```

Note on `robotsLine`'s last branch: the design says the first `Mad-Source` line is the candidate; the zeta capture in the fixture has an empty first value, and the test expects `"not an address"`, the first non-empty value. Make the two agree before running: the simpler rule, which the test pins, is "the first `Mad-Source` line whose value is non-empty and within bounds; an empty value is not a line"; change the `return null` in the loop to `continue` for an empty value and keep `return null` for an over-long one, and amend the acceptance criterion's wording to match. Record the choice in the Executed header.

- [ ] **Step 5: The committed fixture and its README**

Generate once, from the repository root: `node -e 'import("./tests/helpers/warc.ts").then((m) => require("node:fs").writeFileSync("fixtures/robotstxt/sample.warc.gz", m.warcGz(m.SAMPLE_CAPTURES)))'` (or a one-off `.ts` script run with `node`, then deleted). Add `fixtures/robotstxt/sample.warc.gz -text` to `.gitattributes` (the fixtures folder's existing pattern may already cover it; check). Write `fixtures/robotstxt/README.md`:

```markdown
# robots.txt archive fixture

`sample.warc.gz` is a WARC file in the shape of Common Crawl's robots.txt archive (`crawl-data/<crawl>/segments/<segment>/robotstxt/*.warc.gz`,
measured 2026-11-12: one gzip member per record; a `warcinfo` record, then a `request` and a `response` record per capture; CRLF line ends;
a response's payload is the HTTP response). It is written by `tests/helpers/warc.ts` from `SAMPLE_CAPTURES` and pinned by `tests/warc.test.ts`:
regenerate it with that helper when the captures change. The hosts are `.example` names; nothing in it came from the archive.

It holds: two hosts naming a source in a `Mad-Source` line (one with the field in another case and with surrounding spaces, and a second
line that is ignored), a 404 and a 301 whose bodies are not read, a 200 without the line, a second capture of the first host, and a host
whose first `Mad-Source` lines are empty or not an address.
```

- [ ] **Step 6: Run the tests and the type check, then commit**

Run: `npm run check && node --test tests/warc.test.ts`

```bash
git add src/finders/warc.ts tests/helpers/warc.ts tests/warc.test.ts fixtures/robotstxt/sample.warc.gz fixtures/robotstxt/README.md .gitattributes
git commit -m "feat: the WARC record parser and the robots line; a fixture in the archive's shape (<bead id>)"
```

---

### Task 3: The robots finder

**Files:**
- Create: `src/finders/candidates.ts`, `src/finders/robots.ts`, `tests/finder-robots.test.ts`
- Modify: `src/catalog.ts` (import `CandidateFile` from `./finders/candidates.ts` instead of defining it)

**Interfaces:**
- Consumes: `Input` (Task 1), `warcRecords`, `robotsLine` (Task 2), `asciiJson`.
- Produces: in `src/finders/candidates.ts`: `type Candidate = { address: string; place: Record<string, string | number> }`; `type CandidateFile = { finder: string; snapshot: string; candidates: Candidate[] }` (moved from `src/catalog.ts`, which re-exports nothing and imports it); `type FinderResult = CandidateFile & { summary: Record<string, number> }`; `candidateFileBytes(result: FinderResult): Uint8Array` (candidates sorted by address, then by `JSON.stringify(place)`; `asciiJson` plus a final newline). In `src/finders/robots.ts`: `const CRAWL = /^CC-MAIN-\d{4}-\d{2}$/`; `listCrawls(input: Input): Promise<string[]>` (the ids of `collinfo.json` matching `CRAWL`, in the order given, newest first); `robotsFinder(snapshot: string, input: Input, progress?: (done: number, total: number) => void): Promise<FinderResult>`.

**Acceptance Criteria:**
- `listCrawls` reads `<index>collinfo.json` (at most 1 MB), returns the ids that match `CRAWL`; a non-JSON answer or no matching id is an error.
- `robotsFinder` refuses a snapshot not matching `CRAWL`; reads `<archive>crawl-data/<snapshot>/robotstxt.paths.gz` (at most 16 MB compressed), gunzips it, requires every line to be a relative path under `crawl-data/<snapshot>/` ending in `.warc.gz` (anything else is an error); streams each file through gunzip and `warcRecords` with up to 16 in flight; for each `response` record whose `robotsLine` is non-null adds `{ address: value, place: { file: <path>, offset, robots: <uri> } }` (uri bounded at 512 characters, else the record is skipped and counted); `summary` has `files`, `records`, `responses`, `lines` (candidates), `skipped`; `progress(done, total)` is called after each file.
- If any file fails (an `InputError` after retries, a `WarcError`, a bad gunzip) the finder rejects with that error and nothing is returned; the candidates found so far are discarded.
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

test("listCrawls reads collinfo.json and keeps the crawl ids, newest first", async () => {
  origin.put("index/collinfo.json", JSON.stringify([{ id: "CC-MAIN-2026-43", name: "October 2026 Index" }, { id: "CC-MAIN-2026-39" }, { id: "weird" }, { id: "CC-MAIN-2026-34" }]));
  assert.deepEqual(await listCrawls(input()), ["CC-MAIN-2026-43", "CC-MAIN-2026-39", "CC-MAIN-2026-34"]);
  origin.put("index/collinfo.json", "not json");
  await assert.rejects(listCrawls(input()));
});

test("the robots finder reads every file of a crawl and takes the first Mad-Source line of each 200 response, with its place", async () => {
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "b.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`, warcGz(SAMPLE_CAPTURES));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/b.warc.gz`, warcGz([{ uri: "http://eta.example/robots.txt", status: 200, body: "Mad-Source: https://eta.example/source.json\n" }]));
  const seen: [number, number][] = [];
  const r = await robotsFinder(SNAP, input(), (done, total) => seen.push([done, total]));
  assert.equal(r.finder, "robots"); assert.equal(r.snapshot, SNAP);
  assert.deepEqual(seen, [[1, 2], [2, 2]]);
  assert.deepEqual(r.summary, { files: 2, records: 1 + 2 * 7 + 1 + 2, responses: 8, lines: 5, skipped: 0 });
  const addresses = r.candidates.map((c) => c.address).sort();
  assert.deepEqual(addresses, ["https://beta.example/discovery/source.json", "https://eta.example/source.json", "https://mad.alpha.example/source.json", "https://mad.alpha.example/source.json", "not an address"]);
  const alpha = r.candidates.filter((c) => c.address === "https://mad.alpha.example/source.json");
  assert.equal(alpha.length, 2, "two captures of one host are two candidates; the build de-duplicates");
  for (const c of alpha) { assert.equal(c.place["file"], `crawl-data/${SNAP}/segments/1.2/robotstxt/a.warc.gz`); assert.equal(c.place["robots"], "http://alpha.example/robots.txt"); assert.equal(typeof c.place["offset"], "number"); }
  assert.notEqual(alpha[0]!.place["offset"], alpha[1]!.place["offset"]);
  const bytes = candidateFileBytes(r);
  const text = new TextDecoder().decode(bytes);
  assert.ok(/^[\x20-\x7e\n]*$/.test(text), "ASCII");
  const parsed = JSON.parse(text) as { candidates: { address: string }[] };
  assert.deepEqual(parsed.candidates.map((c) => c.address), addresses, "sorted by address");
  assert.deepEqual(candidateFileBytes({ ...r, candidates: [...r.candidates].reverse() }), bytes, "the order of discovery does not change the file");
});

test("a snapshot that is not a crawl name, a bad path listing, or one unreadable file fails the whole snapshot", async () => {
  await assert.rejects(robotsFinder("../etc", input()), /snapshot/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, gzipSync(Buffer.from("crawl-data/OTHER/x.warc.gz\n")));
  await assert.rejects(robotsFinder(SNAP, input()), /path/);
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "missing.warc.gz"]));
  await assert.rejects(robotsFinder(SNAP, input()), (e: unknown) => (e as { reason?: string }).reason === "status");
  origin.put(`archive/crawl-data/${SNAP}/robotstxt.paths.gz`, paths(["a.warc.gz", "bad.warc.gz"]));
  origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, new Uint8Array([1, 2, 3]));
  await assert.rejects(robotsFinder(SNAP, input()), "not gzip");
  const cut = warcGz(SAMPLE_CAPTURES); origin.put(`archive/crawl-data/${SNAP}/segments/1.2/robotstxt/bad.warc.gz`, cut.subarray(0, cut.length - 30));
  await assert.rejects(robotsFinder(SNAP, input()), "a truncated member");
});

test("many files run with at most 16 in flight, and a 503 on one of them is retried", async () => {
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
    const r = await robotsFinder(SNAP, input());
    assert.equal(r.candidates.length, 40); assert.equal(r.summary.files, 40);
    assert.ok(peak <= 16, `peak ${peak}`);
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
export type Candidate = { address: string; place: Record<string, string | number> };

/** What a finder writes and the build reads (docs/design.md "What a finder returns"). */
export type CandidateFile = { finder: string; snapshot: string; candidates: Candidate[] };

export type FinderResult = CandidateFile & { summary: Record<string, number> };

const compare = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/** The candidate file's bytes: candidates sorted by address then place, ASCII, so two runs over one snapshot write the same file. */
export function candidateFileBytes(result: FinderResult): Uint8Array {
  const candidates = [...result.candidates].sort((a, b) => compare(a.address, b.address) || compare(JSON.stringify(a.place), JSON.stringify(b.place)));
  return new TextEncoder().encode(asciiJson({ finder: result.finder, snapshot: result.snapshot, candidates, summary: result.summary }) + "\n");
}
```

In `src/catalog.ts`, delete the local `CandidateFile` type and add `import type { CandidateFile } from "./finders/candidates.ts"; export type { CandidateFile };` so the tests that import it from `./catalog.ts` keep working (or update them to the new module; either way, one definition).

`src/finders/robots.ts`:

```ts
import { createGunzip, gunzipSync } from "node:zlib";
import { Input } from "./input.ts";
import { warcRecords, robotsLine } from "./warc.ts";
import type { Candidate, FinderResult } from "./candidates.ts";

export const CRAWL = /^CC-MAIN-\d{4}-\d{2}$/;
const MAX_PATHS = 16 * 1024 * 1024;   // the compressed path listing; 100,000 lines is about 3 MB
const MAX_INFO = 1024 * 1024;
const MAX_URI = 512;

/** The crawls Common Crawl lists, newest first, by their own names. */
export async function listCrawls(input: Input): Promise<string[]> {
  const bytes = await input.readAll(`${input.bases.index}collinfo.json`, MAX_INFO, { accept: "application/json" });
  const value: unknown = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (!Array.isArray(value)) throw new Error("collinfo.json is not a list");
  const ids = value.map((v) => (typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string" ? (v as { id: string }).id : "")).filter((id) => CRAWL.test(id));
  if (ids.length === 0) throw new Error("collinfo.json names no crawl");
  return ids;
}

/**
 * The robots finder (docs/design.md "Finding sources nobody linked"): every robots.txt WARC file of one crawl, streamed through gunzip
 * and the record parser; from each response with status 200, the first Mad-Source line, with the file, the record's offset and the
 * robots.txt address as its place. All of the crawl or nothing: one unreadable file fails the snapshot.
 */
export async function robotsFinder(snapshot: string, input: Input, progress: (done: number, total: number) => void = () => {}): Promise<FinderResult> {
  if (!CRAWL.test(snapshot)) throw new Error(`not a crawl snapshot name: ${snapshot}`);
  const listing = gunzipSync(Buffer.from(await input.readAll(`${input.bases.archive}crawl-data/${snapshot}/robotstxt.paths.gz`, MAX_PATHS))).toString("latin1");
  const files = listing.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const prefix = `crawl-data/${snapshot}/`;
  for (const f of files) if (!f.startsWith(prefix) || !f.endsWith(".warc.gz") || f.includes("..") || !/^[A-Za-z0-9._\/-]+$/.test(f)) throw new Error(`not a path of this crawl: ${f}`);
  const candidates: Candidate[] = [];
  const summary = { files: 0, records: 0, responses: 0, lines: 0, skipped: 0 };
  const one = async (file: string): Promise<void> => {
    const { stream } = await input.open(`${input.bases.archive}${file}`);
    const gunzip = createGunzip();
    stream.on("error", (e) => gunzip.destroy(e));
    for await (const record of warcRecords(stream.pipe(gunzip))) {
      summary.records++;
      if (record.type !== "response") continue;
      summary.responses++;
      const value = robotsLine(record.payload);
      if (value === null) continue;
      if (record.uri === null || record.uri.length > MAX_URI) { summary.skipped++; continue; }
      candidates.push({ address: value, place: { file, offset: record.offset, robots: record.uri } });
      summary.lines++;
    }
    summary.files++;
    progress(summary.files, files.length);
  };
  // Up to 16 files in flight: the Input's agent holds at most 16 sockets, and this keeps at most 16 parsers' buffers alive.
  const queue = [...files];
  const workers = Array.from({ length: Math.min(16, queue.length) }, async () => { for (let f = queue.shift(); f !== undefined; f = queue.shift()) await one(f); });
  await Promise.all(workers);
  return { finder: "robots", snapshot, candidates, summary };
}
```

`Promise.all` rejects on the first failure and the rejection carries that file's error; the other workers' pending streams are abandoned (the agent's sockets are closed by `catalog find`'s `input.close()`). `summary` is cut when the finder rejects, as required (nothing is returned).

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
- Consumes: `Input` (`readAll`), `parseSourceAddress`, `FinderResult`.
- Produces: `githubFinder(input: Input, today: string, opts?: { test?: boolean }): Promise<FinderResult>` where `today` is the snapshot name (`YYYY-MM-DD`, UTC, supplied by the caller so the finder itself reads no clock); `const TOPIC = "mad-source"`; `const PAGE = 100`, `const MAX_PAGES = 10`, `const PAUSE_MS = 6500`.

**Acceptance Criteria:**
- Requests `<github>search/repositories?q=topic:mad-source&per_page=100&page=N` with `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`, pages 1.. until a page returns fewer than 100 items or page 10, pausing `PAUSE_MS` between pages through the `Input`'s `sleep` (so tests inject one); each page at most 4 MB.
- For each item with a string `homepage` that passes the source address rule (`parseSourceAddress` with the finder's `test` option) and a string `full_name` of at most 140 characters, a candidate `{ address: <canonical>, place: { repository: full_name } }`; items without a homepage, with a homepage that is not a source address, or with an unusable name are counted under `summary.skipped`; `summary` has `pages`, `items`, `candidates`, `skipped`.
- A non-JSON page, a page without an `items` array, or an `InputError` rejects the finder (nothing written).
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
const page = (items: unknown[]) => JSON.stringify({ total_count: items.length, incomplete_results: false, items });

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
    assert.deepEqual(r.summary, { pages: 1, items: 4, candidates: 2, skipped: 2 });
    assert.deepEqual(slept, [], "one page: no pause");
  } finally { origin.behave = null; }
});

test("pages until a short page or the tenth, pausing between pages; a bad page fails the run", async () => {
  const item = (n: number) => ({ full_name: `u/r${n}`, homepage: `https://r${n}.example/source.json`, topics: ["mad-source"] });
  const pages: Record<string, string> = { "1": page(Array.from({ length: 100 }, (_, i) => item(i))), "2": page(Array.from({ length: 100 }, (_, i) => item(100 + i))), "3": page([item(200)]) };
  origin.behave = (req, res) => {
    const m = /[?&]page=(\d+)/.exec(req.url ?? "");
    if (req.url?.startsWith("/github/search/repositories") && m) { res.setHeader("content-type", "application/json"); res.end(pages[m[1]!] ?? page([])); return true; }
    return false;
  };
  try {
    slept.length = 0;
    const r = await githubFinder(input(), "2026-11-12");
    assert.equal(r.candidates.length, 201); assert.equal(r.summary.pages, 3);
    assert.deepEqual(slept, [PAUSE_MS, PAUSE_MS], "a pause before the second and third pages");
    for (let p = 1; p <= 12; p++) pages[String(p)] = page(Array.from({ length: 100 }, (_, i) => item(p * 1000 + i)));
    slept.length = 0;
    const capped = await githubFinder(input(), "2026-11-12");
    assert.equal(capped.summary.pages, 10, "GitHub's 1,000-result ceiling"); assert.equal(capped.candidates.length, 1000);
    pages["1"] = "<html>";
    await assert.rejects(githubFinder(input(), "2026-11-12"));
    pages["1"] = JSON.stringify({ total_count: 0 });
    await assert.rejects(githubFinder(input(), "2026-11-12"), /items/);
  } finally { origin.behave = null; }
});

test("a search that fails after retries writes nothing; a snapshot name that is not a date is refused", async () => {
  origin.behave = (req, res) => { if (req.url?.startsWith("/github/")) { res.statusCode = 503; res.end(); return true; } return false; };
  try {
    await assert.rejects(githubFinder(input(), "2026-11-12"), (e: unknown) => (e as { reason?: string }).reason === "status");
    await assert.rejects(githubFinder(input(), "today"), /snapshot/);
  } finally { origin.behave = null; }
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `node --test tests/finder-github.test.ts`
Expected: FAIL, cannot find module `../src/finders/github.ts`.

- [ ] **Step 4: Write `src/finders/github.ts`**

```ts
import { Input } from "./input.ts";
import { parseSourceAddress } from "../address.ts";
import type { Candidate, FinderResult } from "./candidates.ts";

export const TOPIC = "mad-source";
export const PAGE = 100;
export const MAX_PAGES = 10;       // GitHub returns at most 1,000 results for one query
export const PAUSE_MS = 6500;      // unauthenticated search: 10 requests a minute
const MAX_PAGE_BYTES = 4 * 1024 * 1024;
const MAX_NAME = 140;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The GitHub-topic finder (Ruling 10): public repositories carrying the topic mad-source whose homepage is a source address, read through
 * GitHub's repository search. One company's index with no snapshot: the file is named by the UTC date it ran (the caller supplies it), and a
 * build copies the file into its output so another party can compare.
 */
export async function githubFinder(input: Input, today: string, opts: { test?: boolean } = {}): Promise<FinderResult> {
  if (!DATE.test(today)) throw new Error(`not a date snapshot name: ${today}`);
  const candidates: Candidate[] = [];
  const summary = { pages: 0, items: 0, candidates: 0, skipped: 0 };
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await input.sleep(PAUSE_MS);
    const url = `${input.bases.github}search/repositories?q=${encodeURIComponent(`topic:${TOPIC}`)}&per_page=${PAGE}&page=${page}`;
    const bytes = await input.readAll(url, MAX_PAGE_BYTES, { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" });
    let value: unknown;
    try { value = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { throw new Error(`page ${page} is not JSON`); }
    const items = typeof value === "object" && value !== null ? (value as { items?: unknown }).items : undefined;
    if (!Array.isArray(items)) throw new Error(`page ${page} has no items list`);
    summary.pages++;
    for (const item of items) {
      summary.items++;
      const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const homepage = record["homepage"];
      const name = record["full_name"];
      const parsed = typeof homepage === "string" ? parseSourceAddress(homepage, { test: opts.test }) : null;
      if (parsed === null || typeof name !== "string" || name.length === 0 || name.length > MAX_NAME) { summary.skipped++; continue; }
      candidates.push({ address: parsed.address, place: { repository: name } });
      summary.candidates++;
    }
    if (items.length < PAGE) break;
  }
  return { finder: "github", snapshot: today, candidates, summary };
}
```

`input.sleep` must be reachable: in `src/finders/input.ts` make `sleep` a public readonly member (`readonly sleep: (ms: number) => Promise<void>`) so the finder pauses through the same injected clock the retries use.

- [ ] **Step 5: Run the tests and the type check, then commit**

Run: `npm run check && node --test tests/finder-github.test.ts tests/input.test.ts`

```bash
git add src/finders/github.ts src/finders/input.ts tests/finder-github.test.ts fixtures/github/search-sample.json
git commit -m "feat: the GitHub-topic finder over the repository search, named by the day it ran (<bead id>)"
```

---

### Task 5: `catalog find`

**Files:**
- Modify: `src/cli.ts`, `tests/cli.test.ts`

**Interfaces:**
- Consumes: `Input`, `PUBLIC_INPUTS`, `listCrawls`, `robotsFinder`, `CRAWL`, `githubFinder`, `candidateFileBytes`, `flag`, `flags`, `usage`, `asciiJson`.
- Produces: `catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...`; `RunOptions.finderInputs?: { archive: string; index: string; github: string; pause?: number; today?: string }` (test only: the bases, a pause for the retries and the GitHub pages, and the date the GitHub finder names its file by); the usage line `mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` in place of the step 6 refusal.

**Acceptance Criteria:**
- Usage errors (exit 2, nothing printed on stdout, nothing fetched): no `--finder` or one that is not `robots`/`github`; no `--out`; `--snapshot` with `github`; a `--snapshot` for `robots` not matching `CRAWL`.
- `--out` may exist and hold files; `<out>/<finder>/<snapshot>.json` already present is kept and that snapshot is not read (no request for it); the folder is created when missing; nothing else in it is touched.
- `robots` with no `--snapshot` reads `collinfo.json` and takes the three newest crawls; when the index cannot be read the command prints `{ problems: ["the crawl list could not be read; name the crawls with --snapshot"] }`, exit 1, having fetched nothing else.
- Each requested snapshot that is not kept runs the finder and writes `candidateFileBytes` to its path; a finder failure leaves no file for that snapshot and the command goes on to the next; the summary `{ finder, written: [snapshot...], kept: [snapshot...], failed: [{ snapshot, reason }] , summary: { <snapshot>: counts } }` is printed through `asciiJson`; exit 0 when `failed` is empty, else 1.
- Progress lines (`<snapshot>: <done>/<total> files`) go to stderr every 1,000 files and at the end; never to stdout.
- In production the inputs are `PUBLIC_INPUTS` with a 16-connection `Input`; `bin/mad-discovery.ts` passes no options, so the `finderInputs` bases cannot be set from the command line.
- The `github` finder's snapshot is today's UTC date (`new Date().toISOString().slice(0, 10)`) unless `finderInputs.today` is given (tests).

- [ ] **Step 1: Write the failing tests**

Append to `tests/cli.test.ts` (reusing its helpers; `warcGz` and `SAMPLE_CAPTURES` from `./helpers/warc.ts`; `gzipSync` from `node:zlib`; `existsSync`, `readFileSync`, `mkdtempSync`, `writeFileSync`, `mkdirSync`, `join`, `tmpdir` are imported there or add them):

```ts
test("catalog find writes one candidate file per snapshot, keeps files already there, and names what failed", async () => {
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
    assert.deepEqual(r.failed.map((f: { snapshot: string }) => f.snapshot), ["CC-MAIN-2026-34"]);
    assert.ok(existsSync(join(out, "robots", `${SNAP}.json`)) && !existsSync(join(out, "robots", "CC-MAIN-2026-34.json")));
    const file = JSON.parse(readFileSync(join(out, "robots", `${SNAP}.json`), "utf8")) as { finder: string; snapshot: string; candidates: { address: string }[]; summary: Record<string, number> };
    assert.equal(file.finder, "robots"); assert.equal(file.snapshot, SNAP); assert.equal(file.candidates.length, 4); assert.equal(file.summary.files, 1);
    assert.ok(/^[\x20-\x7e\n]*$/.test(readFileSync(join(out, "robots", `${SNAP}.json`), "utf8")), "ASCII");
    assert.ok(c.err().includes(`${SNAP}: 1/1 files`), "progress on stderr");
    // A second run keeps the two files and reads nothing for them.
    const before = cc.requests.length;
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", out, "--snapshot", SNAP, "--snapshot", "CC-MAIN-2026-39"], c.io, opts), 0);
    r = c.json(); assert.deepEqual(r.kept, [SNAP, "CC-MAIN-2026-39"]); assert.deepEqual(r.written, []);
    assert.equal(cc.requests.length, before, "kept snapshots cost no request");
    // GitHub: named by the day; kept the second time.
    cc.put("github/search/repositories", "");   // the path exists; behave answers the query
    cc.behave = (req, res) => { if (req.url?.startsWith("/github/search/repositories")) { res.setHeader("content-type", "application/json"); res.end(readFileSync(join(fixtures, "github", "search-sample.json"))); return true; } return false; };
    c = capture();
    assert.equal(await main(["catalog", "find", "--finder", "github", "--out", out], c.io, opts), 0);
    assert.deepEqual(c.json().written, ["2026-11-12"]);
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
    assert.equal(await main(["catalog", "find", "--finder", "robots", "--out", out2], c.io, { ...opts, finderInputs: { ...bases, pause: 0 } }), 1);
    assert.deepEqual(c.json(), { problems: ["the crawl list could not be read; name the crawls with --snapshot"] });
    assert.equal(cc.requests.slice(requests).filter((p) => !p.startsWith("index/")).length, 0);
    // Usage.
    for (const args of [["catalog", "find"], ["catalog", "find", "--finder", "bing", "--out", out2], ["catalog", "find", "--finder", "robots"], ["catalog", "find", "--finder", "github", "--out", out2, "--snapshot", "x"], ["catalog", "find", "--finder", "robots", "--out", out2, "--snapshot", "../x"]]) {
      c = capture();
      assert.equal(await main(args, c.io, opts), 2, args.join(" ")); assert.equal(c.out(), "");
    }
  } finally { cc.behave = null; await cc.close(); }
});
```

Update the existing test that asserts `catalog find` is refused with the step 6 note (from the step 5 plan's cli test) so that `["catalog", "find", "--finder", "robots", "--out", out]` is no longer in the usage-error loop there (it now needs `finderInputs` to run and would otherwise reach the public hosts; keep `["catalog"]` and the others).

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/cli.test.ts`
Expected: the new test fails (`catalog find` is refused).

- [ ] **Step 3: Extend `src/cli.ts`**

Imports: `import { Input, PUBLIC_INPUTS, type InputBases } from "./finders/input.ts"; import { listCrawls, robotsFinder, CRAWL } from "./finders/robots.ts"; import { githubFinder } from "./finders/github.ts"; import { candidateFileBytes, type FinderResult } from "./finders/candidates.ts";` and `mkdirSync`, `existsSync`, `writeFileSync` from `node:fs` (merge with the existing import). `RunOptions` gains `finderInputs?: InputBases & { pause?: number; today?: string };   // test code only: local origins standing for the public inputs`. In `USAGE` replace nothing but add the line `  mad-discovery catalog find --finder <robots|github> --out <folder> [--snapshot <name>]...` before the `catalog build` line. In `catalog()`, replace `if (sub === "find") return usage(io, "catalog find arrives with the finders (step 6).");` with `if (sub === "find") return await find(rest, io, options);` and add:

```ts
const NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/;   // a snapshot name becomes a file name (the build's rule for a candidate file)

async function find(args: string[], io: Io, options: RunOptions): Promise<number> {
  const finder = flag(args, "--finder");
  const out = flag(args, "--out");
  const named = flags(args, "--snapshot");
  if ((finder !== "robots" && finder !== "github") || out === undefined) return usage(io, "catalog find needs --finder robots or github, and --out.");
  if (finder === "github" && named.length > 0) return usage(io, "the GitHub finder has no snapshots: its file is named by the day it runs.");
  for (const s of named) if (!CRAWL.test(s) || !NAME.test(s)) return usage(io, `not a crawl name: ${s}`);
  const bases = options.finderInputs ?? PUBLIC_INPUTS;
  const input = new Input(bases, { test: options.finderInputs !== undefined, pause: options.finderInputs?.pause });
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
        const result: FinderResult = finder === "robots" ? await robotsFinder(snapshot, input, progress) : await githubFinder(input, snapshot, { test: options.test });
        writeFileSync(path, candidateFileBytes(result), { flag: "wx" });   // never over a file that appeared meanwhile
        written.push(snapshot);
        summary[snapshot] = result.summary;
      } catch (e) {
        failed.push({ snapshot, reason: e instanceof Error ? (("reason" in e && typeof (e as { reason?: unknown }).reason === "string") ? `${(e as { reason: string }).reason}` : e.message) : String(e) });
      }
    }
    io.out(asciiJson({ finder, written, kept, failed, summary }) + "\n");
    return failed.length === 0 ? 0 : 1;
  } finally { input.close(); }
}
```

`failed[].reason` is the tool's own text (an `InputError`'s reason word, a `WarcError`'s or the finder's message, which name a path of the crawl or a page number, never a stranger's text; the WARC error messages carry only numbers). Keep it that way.

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
- Two sources on two local origins, each serving the same definition, neither introducing the other, neither named on any command line; a third origin stands for Common Crawl's archive and index, serving a crawl listing and one WARC file (built at run time, in the archive's shape) that holds a 200 capture naming each source, a 404 capture naming a third address, a 301, a 200 without the line, and a second capture of the first host; `catalog find --finder robots --snapshot <crawl> --out <c>` writes the candidate file; `catalog build --out <k> --candidates <c>/robots/<crawl>.json` succeeds with `seeded: false`; `said/<leaf>.json` lists both sources under `serves`; `catalog.json` names the candidate file with its finder and snapshot and `droppedCandidates` 0 (the 404's address was never a candidate); `sources.json` says each source was found `by: "finder"` with the robots place; the index page carries no seeded note.
- No request leaves loopback.

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
import { WALK, CATALOG } from "../src/limits.ts";
import { readInputs } from "../src/inputs.ts";
import { warcGz } from "./helpers/warc.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const LEAF = "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1";
const capture = () => { const o: string[] = [], e: string[] = []; const io: Io = { out: (s) => { o.push(s); }, err: (s) => { e.push(s); } }; return { io, out: () => o.join(""), err: () => e.join(""), json: () => JSON.parse(o.join("")) as Record<string, unknown> }; };

test("the stranger, by fixture: two sources that never link, named in a WARC fixture, meet in one catalog row", async () => {
  const [a, b, cc] = [await Origin.start(), await Origin.start(), await Origin.start()];
  try {
    const robotsOk = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (s: string) => void }) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\nDisallow:\n"); return true; } return false; };
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
    const file = join(candidates, "robots", `${SNAP}.json`);
    const found = JSON.parse(readFileSync(file, "utf8")) as { candidates: { address: string }[] };
    assert.deepEqual(found.candidates.map((x) => x.address).sort(), [aAddr, aAddr, bAddr].sort(), "two captures of alpha, one of beta; the 404's line is not read");
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
      assert.ok(s.found.every((f) => f.by === "finder" && f.finder === "robots" && typeof f.place?.["file"] === "string" && typeof f.place?.["offset"] === "number"), `${addr} found by the finder alone`);
    }
    assert.equal(sources.sources.find((x) => x.address === aAddr)!.found.length, 2, "alpha was seen twice; the same way twice is not recorded twice, but two places are two ways");
    assert.ok(!readFileSync(join(out, "pages", "index.html"), "utf8").includes("hand-kept"), "not a seeded catalog");
  } finally { a.behave = null; b.behave = null; await a.close(); await b.close(); await cc.close(); }
});
```

The `found.length === 2` assertion follows from step 5's `found` de-duplication by `JSON.stringify` of the whole entry: the two captures have different offsets, so they are two entries. If step 5's code folds them (it should not), the assertion says so.

- [ ] **Step 2: Run the test**

Run: `node --test tests/stranger.test.ts`
Expected: PASS at once if Tasks 1 to 5 are right; it is the acceptance test, written after the code. If it fails, the failure names which earlier task is wrong; fix there, not here.

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
- README Status says step 6 is built: `catalog find` with the robots finder over Common Crawl's robots.txt archive and the GitHub-topic finder, the stranger-by-fixture clause met by test; Running it lists `catalog find`; the paragraph after the code block says what each finder reads and that a finder fetches no address a stranger chose.
- `docs/design.md`: the files block under "What a finder returns" or its text records the plan's decisions: the crawl list from `collinfo.json`; `place` shapes (`file`, `offset` as the decompressed record offset, `robots`; `repository`); the candidate file's `summary`; `catalog find`'s exit status and progress; the GitHub finder's paging and pause. Acceptance clause 1 marked done with the date.
- Workspace `CLAUDE.md`'s mad-discovery entry says step 6 is built and step 7 (the live check, hosting) remains; nested `CLAUDE.md` lists `docs/plans/catalog-find.md` as current.
- `npm --prefix mad-discovery run check && npm --prefix mad-discovery test` passes from the workspace root.

- [ ] **Step 1: README**

In `## Status`, after the step 5 sentence ("...`who --catalog` seeds a walk from a catalog's row. The finders (`catalog find`) are step 6."), replace "The finders (`catalog find`) are step 6." with: "Step 6 is built: `catalog find --finder robots` reads a Common Crawl crawl's robots.txt archive (100,000 WARC files, about 150 GB) and writes the `Mad-Source` lines it finds as candidates, all of the crawl or nothing; `catalog find --finder github` reads GitHub's repository search for the topic `mad-source` and writes the homepages that are source addresses, named by the day it ran (Ruling 10); the second epic's first clause, the stranger by fixture, is met by test. What remains is step 7: the live stranger check, which waits on Common Crawl capturing a host that carries a line or on a repository carrying the topic, and the maintainer's hosted catalog." In `## Running it`, add after the `catalog build` line:

```bash
node bin/mad-discovery.ts catalog find --finder robots --out <folder> [--snapshot CC-MAIN-YYYY-WW]...
node bin/mad-discovery.ts catalog find --finder github --out <folder>
```

and to the paragraph after the block: "`catalog find` reads only its finder's public input (`data.commoncrawl.org` and `index.commoncrawl.org`, or `api.github.com`), hosts fixed in code, and fetches no address a stranger chose; a candidate file is read by `catalog build --candidates`, which fetches and checks each address like any introduction. The robots finder reads about 150 GB per crawl on 16 connections."

- [ ] **Step 2: The design**

Under "What a finder returns", after the paragraph beginning "The robots finder reads responses with status 200 only.", add: "As built (step 6, 2026-11): the crawl list is `collinfo.json` on `index.commoncrawl.org`, newest first; a robots candidate's place is `{ file, offset, robots }`, the archive path, the byte offset of the record in the decompressed file and the robots.txt address Common Crawl fetched; a GitHub candidate's place is `{ repository }`; a candidate file also carries a `summary` of counts (files, records, responses, lines; pages, items); `catalog find` exits 0 when every requested snapshot's file exists afterwards, written or kept, 1 when any failed, and prints progress on stderr; the GitHub finder reads 100 results a page, at most 10 pages, 6.5 seconds apart, unauthenticated. The finders read their inputs through `src/finders/input.ts`, the one other place a socket is opened, with TLS verified, no redirect followed, and five retries doubling from one second." In "Acceptance", clause 1: append " Done 2026-11-DD (tests/stranger.test.ts)." with the date of the commit.

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
2. **One real crawl scan**, with the maintainer's go, since it reads about 150 GB over his connection for one to three hours: `node bin/mad-discovery.ts catalog find --finder robots --out <scratch> --snapshot CC-MAIN-2026-43`. Record: wall-clock time, the summary's counts, how many candidates and how many are source addresses (`catalog build --candidates <file> --out <scratch2>` over them, which is the design's "shows whether it fits the job it will run in"; it fetches the strangers' addresses the lines name, which is what a build does), and whether `mad.seriouscoder.one` or `mad.josephleehunsaker.com` appear (they will not until a crawl captures those hosts; the design and Ruling 10 say so). This step may be deferred to step 7 if the maintainer prefers; say so in the header.

---

## Self-review

**Spec coverage.** "The catalog": `catalog find --finder <name> --out <folder> [--snapshot <name>]...` (Task 5). "Finding sources nobody linked": the robots finder (Tasks 2, 3) and the GitHub-topic finder (Task 4, Ruling 10), each stating its reach in the README (Task 7). "What a finder returns": a module in this package, no outside code (Tasks 3, 4); writes `<finder>/<snapshot>.json`; a file already there kept and not read again (Task 5 test); all of a snapshot or nothing and exit non-zero (Tasks 3, 4, 5); one candidate per place, the first `Mad-Source` line (Task 2; the empty-value reading recorded); non-addresses dropped by the build (step 5; Task 6 asserts `droppedCandidates`); the GitHub file named by the date (Tasks 4, 5); status 200 only (Task 2); Common Crawl's names, the three most recent by default (Tasks 3, 5); 503 retried no faster than once a second (Task 1); nothing written for a crawl if any file cannot be read (Task 3); the finder's reads outside the limits, 16 connections, files over 1 MB (Task 1, decision 1). "Who runs a catalog", stage 1 (Find fetches no address a stranger chose): by construction (the finder writes values, never fetches them; Task 5's test counts requests). "Tests", the stranger case by fixture (Task 6, with the fixture in the archive's shape from Task 2). "Acceptance" clause 1 (Task 6). "Build order" step 6: the fixture, the GitHub finder with a fixture of its answer (Task 4), and one full scan of a real crawl (closing step 2, gated on the maintainer). Decision 10's text (Task 7 marks the clause).

**Decisions for the gate.** Eight, listed above; the ones with a real trade-off: the second network path (decision 1), the decompressed offset in `place` (decision 3), the GitHub finder's unauthenticated 10-page ceiling (decision 5).

**Placeholders.** `<bead id>` in commit messages is the orchestrator's. Task 2's `robotsLine` note resolves its one ambiguity (an empty first value) before the code runs and records the choice. Task 6's date in the design is the commit's. No other.

**Type consistency.** `Candidate`/`CandidateFile`/`FinderResult` live in `src/finders/candidates.ts`; `src/catalog.ts` imports and re-exports `CandidateFile`; `robotsFinder` and `githubFinder` return `FinderResult`; `candidateFileBytes(FinderResult)`; `Input.open` returns `{ status: 200; stream; headers }`, `Input.readAll` a `Uint8Array`, `Input.sleep` is public for the GitHub finder's pauses; `InputError.reason` is `InputReason`; `RunOptions.finderInputs` is `InputBases & { pause?; today? }`; `warcRecords` yields `WarcRecord` with `offset`, `type`, `uri`, `payload`; `robotsLine` takes a `Uint8Array`.
