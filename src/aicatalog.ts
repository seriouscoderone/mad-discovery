import { definitionAddress } from "./address.ts";
import type { Publication, SourceDocument } from "./source.ts";

/** Written against the AI Catalog specification at github.com/Agent-Card/ai-catalog commit 6e26a18 (2026-11-05), Level 1. */
export const SPEC_VERSION = "1.0";
/** The one dot-folder a source may have, and only at the root of a host (Ruling 5). */
export const WELL_KNOWN_PATH = ".well-known/ai-catalog.json";

export type CatalogEntry = {
  identifier: string;
  type: "application/json";
  url: string;
  displayName?: string;
  description?: string;
  tags?: string[];
};

export type AiCatalog = { specVersion: string; entries: CatalogEntry[] };

/** True when the source's base is the root of its host, the only place the well-known file can live. */
export function isHostRoot(base: string): boolean {
  return new URL(base).pathname === "/";
}

/**
 * docs/design.md "AI Catalog entries": one entry per served definition, in SAID order; identifier the SAID, type application/json,
 * url the definition's derived address. displayName, description and tags come only from this source's own publication of the
 * SAID (the first, when there are several). Nothing is read from a definition's content; digest, host and every other optional
 * member are left out.
 */
export function aiCatalog(document: SourceDocument, base: string): AiCatalog {
  const first = new Map<string, Publication>();
  for (const p of document.publications) if (!first.has(p.target)) first.set(p.target, p);
  return {
    specVersion: SPEC_VERSION,
    entries: document.serves.map(({ said }) => {
      const p = first.get(said);
      const entry: CatalogEntry = { identifier: said, type: "application/json", url: definitionAddress(base, said) };
      if (p !== undefined) { entry.displayName = p.name; entry.description = p.description; entry.tags = p.tags; }
      return entry;
    }),
  };
}

/** The file's bytes, in the shape source.json has, so two builds of one input are byte-identical. */
export function aiCatalogJson(document: SourceDocument, base: string): string {
  return JSON.stringify(aiCatalog(document, base), null, 2) + "\n";
}
