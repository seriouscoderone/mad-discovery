import { isSaid } from "./said.ts";
import { parseSourceAddress, type AddressOptions } from "./address.ts";
import { escapeHtml, shell, pageLink, addressLink, offered, STYLE_CSS } from "./pages.ts";
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
  const publications = row.publications.map((p) => `${offered(p.publication, p.by)}<p>From <code>${escapeHtml(p.source)}</code></p>`);
  const referrers = row.referrers.map((r) => `<li>${sourceFor(r.source, r.said, sources, opts)}: ${pageLink(r.said, false)}${r.paths.length > 0 ? ` at ${r.paths.map((p) => `<code>${escapeHtml(p)}</code>`).join(", ")}` : ""}${r.appearances > r.paths.length ? ` (${r.appearances} appearances)` : ""}</li>`);
  const counts = row.counts.map((c) => `<li><code>${escapeHtml(c.source)}</code>: ${c.publications} publications, ${c.referrers} definitions that contain it</li>`);
  const omitted = row.omittedSources !== undefined ? `<p>${row.omittedSources} source${row.omittedSources === 1 ? "" : "s"} left out: the row reached its size limit.</p>` : "";
  const body = `<header><p><a href="../index.html">This catalog</a></p><h1><code>${escapeHtml(row.said)}</code></h1></header>
<main>
<section><h2>Served by</h2>${serves.length > 0 ? `<ul>${serves.join("")}</ul>` : "<p>No source.</p>"}${omitted}</section>
<section><h2>Offered as</h2>${publications.length > 0 ? publications.join("\n") : "<p>No publication.</p>"}</section>
<section><h2>Contained by</h2>${referrers.length > 0 ? `<ul>${referrers.join("")}</ul>` : "<p>No definition in this catalog contains it.</p>"}</section>
<section><h2>Counts</h2><ul>${counts.join("")}</ul><p>A count of sources is a count of addresses.</p></section>
</main>
<footer><p>A catalog repeats what sources say and settles nothing; the check runs on the bytes at a definition's address.</p></footer>`;
  return shell(row.said, "../style.css", body);
}

/** docs/design.md: a seeded crawl says so in these words; a reader of the pages should see them where catalog.json is never read. */
const SEEDED_NOTE = "Built from a hand-kept list of sources, not from a finder: a seeded catalog, not a search over strangers.";

function indexPage(rows: Row[], seeded: boolean): string {
  const items = rows.map((r) => `<li>${pageLink(r.said, true)}${r.publications.map((p) => ` ${escapeHtml(p.publication.name)} <code>${escapeHtml(p.source)}</code>`).join("")}</li>`);
  const note = seeded ? `<p>${SEEDED_NOTE}</p>` : "";
  return shell("Definitions in this catalog", "style.css", `<header><h1>Definitions in this catalog</h1>${note}</header>\n<main><ul>${items.join("")}</ul></main>`);
}

/** The catalog's pages: an index and a page per row, in SAID order, with the page writer's guards. A row keyed by anything but a SAID is refused. */
export function catalogPages(rows: Row[], sources: SourcePages, opts: AddressOptions, seeded: boolean): Map<string, string> {
  const sorted = [...rows].sort((a, b) => (a.said < b.said ? -1 : a.said > b.said ? 1 : 0));
  for (const r of sorted) if (!isSaid(r.said)) throw new Error("a row is keyed by a SAID");
  const files = new Map<string, string>();
  files.set("pages/index.html", indexPage(sorted, seeded));
  files.set("pages/style.css", STYLE_CSS);
  for (const r of sorted) files.set(`pages/${r.said}/index.html`, rowPage(r, sources, opts));
  return files;
}
