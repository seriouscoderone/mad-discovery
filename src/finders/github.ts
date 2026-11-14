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
