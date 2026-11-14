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
