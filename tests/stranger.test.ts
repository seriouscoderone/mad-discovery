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
import { SEEDED_NOTE } from "../src/catalogpages.ts";
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
    const finderInputs = { archive: `${cc.origin}/archive/`, index: `${cc.origin}/index/`, github: `${cc.origin}/github/`, pause: 0, ccRate: Infinity };
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
    const sources = JSON.parse(readFileSync(join(out, "sources.json"), "utf8")) as { sources: { address: string; found: { by: string; finder?: string; snapshot?: string; place?: Record<string, unknown> }[] }[] };
    for (const addr of [aAddr, bAddr]) {
      const s = sources.sources.find((x) => x.address === addr)!;
      assert.ok(s.found.every((f) => f.by === "finder" && f.finder === "robots" && f.snapshot === SNAP && typeof f.place?.["file"] === "string" && typeof f.place?.["offset"] === "number" && typeof f.place?.["robots"] === "string"), `${addr} found by the finder alone`);
    }
    assert.equal(sources.sources.find((x) => x.address === aAddr)!.found.length, 2, "alpha was seen twice at two offsets: two places, two ways");
    assert.equal(sources.sources.find((x) => x.address === bAddr)!.found.length, 1, "beta was seen once");
    assert.ok(!readFileSync(join(out, "pages", "index.html"), "utf8").includes(SEEDED_NOTE), "not a seeded catalog");
  } finally { a.behave = null; b.behave = null; await a.close(); await b.close(); await cc.close(); }
});
