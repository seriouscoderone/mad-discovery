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
