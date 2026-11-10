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
    if (addr === null || addr.address === address || introductions.has(addr.address)) { dropped.entries++; continue; }
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
