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

export function publicationsFor(document: SourceDocument, said: string): Publication[] {
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

export const STYLE_CSS = `body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:48rem;padding:1rem}
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
