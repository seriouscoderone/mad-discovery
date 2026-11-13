import { randomInt } from "node:crypto";
import { checkSaid, isSaid } from "./said.ts";
import { paths, parseBounded } from "./scan.ts";
import { definitionAddress, parseCatalogAddress, parseSourceAddress } from "./address.ts";
import { readSource, redirectTarget, type Reason, type Unresolved } from "./read.ts";
import { Session } from "./session.ts";
import type { Dropped } from "./document.ts";
import { isRecord, type Publication } from "./source.ts";
import { levels, type Candidate, type Extra, type Node } from "./crawl.ts";

export type Report = {
  said: string;
  from: string;
  sources: { address: string; via: string[]; by?: string; oobi?: string }[];   // every source read, in visit order; by and oobi as stated, never verified
  serves: { source: string; via: string[] }[];
  publications: { source: string; via: string[]; publication: Publication }[];
  referrers: { source: string; via: string[]; said: string; paths: string[]; appearances: number }[];
  unresolved: Unresolved[];
  dropped: { source: string; entries: number; publications: number }[];
  catalogs: string[];
  reached: number;
  catalog?: { address: string; listed: number; taken: number; reason?: Reason; target?: string };
};

/** Everything one visit found; merged into the report once the depth is complete. */
export type Visited = Node & {
  by?: string;        // the operator's stated AID, when the document states one
  oobi?: string;      // where that AID resolves, when stated; shown, never fetched
  serves: boolean;
  publications: Publication[];
  referrers: { said: string; paths: string[]; appearances: number }[];
  unresolved: Unresolved[];
  dropped: Dropped | null;
  catalogs: string[];
};

export type WalkOutcome = { ok: true; report: Report } | { ok: false; reason: Reason; target?: string };

const fresh = (c: Candidate): Visited => ({ address: c.address, via: c.via, fetched: false, read: false, serves: false, publications: [], referrers: [], unresolved: [], dropped: null, catalogs: [], introductions: [] });

/**
 * Steps 1 to 4 of docs/design.md "The walk" for one source: fetch its document, fetch and check the definition when it lists the
 * SAID, collect its publications of the SAID, fetch and check each definition whose refers lists the SAID and confirm the
 * appearance by the scan. The document is fetched whole and matched here, so the SAID goes only to a source that lists it.
 */
async function visitSource(said: string, c: Candidate, session: Session): Promise<Visited> {
  const v = fresh(c);
  const host = Session.hostOf(c.address);
  const unresolved = (reason: Reason, more: Partial<Unresolved> = {}): void => { v.unresolved.push({ address: c.address, via: c.via, reason, ...more }); };
  const stop = session.exhausted(host);
  if (stop !== null) { unresolved("skipped", { limit: stop }); return v; }
  const r = await readSource(c.address, c.via, session);
  if (!r.ok) { v.unresolved.push(r.unresolved); return v; }
  v.fetched = true;
  const { document, base, dropped } = r;

  // Definitions to fetch, in SAID order: the SAID itself when served, and every served definition said to contain it.
  const wanted = document.serves.filter((s) => s.said === said || s.refers.includes(said)).map((s) => s.said);
  const taken = wanted.slice(0, session.limits.definitionsPerSource);
  for (const target of taken) {
    if (session.exhausted(host) !== null) break;
    const g = await session.fetch(definitionAddress(base, target));
    if (g.outcome !== "ok") { unresolved(g.outcome, { said: target, ...redirectTarget(g) }); continue; }
    if (!checkSaid(g.bytes, target)) { unresolved("failed-check", { said: target }); continue; }
    if (target === said) { v.serves = true; continue; }
    const p = paths(g.bytes, said);
    if (p.count === 0) unresolved("not-contained", { said: target });
    else v.referrers.push({ said: target, paths: p.paths, appearances: p.count });
  }
  // The host's time or bytes went during this source: nothing of it is kept. The document was read, so this is a later failure, not a start that could not be read.
  if (session.exhausted(host) !== null) return { ...fresh(c), fetched: true, unresolved: [{ address: c.address, via: c.via, reason: "timed-out" }] };

  v.read = true;
  if (document.by !== undefined) v.by = document.by;
  if (document.oobi !== undefined) v.oobi = document.oobi;
  if (wanted.length > taken.length) unresolved("truncated", { limit: "definitions" });
  v.publications = document.publications.filter((p) => p.target === said);
  if (dropped.entries > 0 || dropped.publications > 0) v.dropped = dropped;
  v.catalogs = document.catalogs;
  v.introductions = document.introductions.slice(0, session.limits.introductionsPerSource);
  if (document.introductions.length > v.introductions.length) unresolved("truncated", { limit: "introductions" });
  const mentions = wanted.length > 0 || v.publications.length > 0;
  if (c.named && !mentions) unresolved("not-there");
  return v;
}

/** The report from every visit, in the order visited: depth, then address. */
function assemble(said: string, from: string, visits: Visited[], skipped: Unresolved[]): Report {
  const read = visits.filter((v) => v.read);
  return {
    said,
    from,
    sources: read.map((v) => ({ address: v.address, via: v.via, ...(v.by !== undefined ? { by: v.by } : {}), ...(v.oobi !== undefined ? { oobi: v.oobi } : {}) })),
    serves: visits.filter((v) => v.serves).map((v) => ({ source: v.address, via: v.via })),
    publications: visits.flatMap((v) => v.publications.map((publication) => ({ source: v.address, via: v.via, publication }))),
    referrers: visits.flatMap((v) => v.referrers.map((r) => ({ source: v.address, via: v.via, ...r }))),
    unresolved: [...visits.flatMap((v) => v.unresolved), ...skipped],
    dropped: visits.filter((v) => v.dropped !== null).map((v) => ({ source: v.address, ...v.dropped! })),
    catalogs: [...new Set(visits.flatMap((v) => v.catalogs))].sort(),
    reached: read.length,
  };
}

type RowRead = { addresses: string[]; listed: number } | { reason: Reason; target?: string };

/** The row's source addresses, each one that passes the rule; or why the row could not be read. */
async function readRow(catalog: string, said: string, session: Session): Promise<RowRead> {
  if (!isSaid(said)) throw new Error("only a SAID names a row");
  const parsed = parseCatalogAddress(catalog, { test: session.test });
  if (parsed === null) return { reason: "refused-address" };
  const f = await session.fetch(`${parsed.base}said/${said}.json`);
  if (f.outcome !== "ok") return { reason: f.outcome, ...redirectTarget(f) };
  const row = parseBounded(f.bytes);
  if (!row.ok || !isRecord(row.value) || !Array.isArray(row.value["serves"])) return { reason: "invalid" };
  const addresses: string[] = [];
  for (const s of row.value["serves"]) {
    const a = isRecord(s) && typeof s["source"] === "string" ? parseSourceAddress(s["source"], { test: session.test }) : null;
    if (a !== null && !addresses.includes(a.address)) addresses.push(a.address);
  }
  return { addresses: addresses.sort(), listed: row.value["serves"].length };
}

/** A random sample of n, in address order; the row is open to flooding and any fixed order can be occupied. */
function sample(addresses: string[], n: number): string[] {
  const pool = [...addresses];
  const picked: string[] = [];
  while (picked.length < n && pool.length > 0) picked.push(pool.splice(randomInt(pool.length), 1)[0]!);
  return picked.sort();
}

/**
 * docs/design.md "The walk": breadth-first, every source at one depth before any at the next; within a depth the sources run under
 * the session's host scheduling and are merged in address order, so the report does not depend on who answered first.
 */
export async function walk(said: string, from: string, session: Session, catalog?: string): Promise<WalkOutcome> {
  let seeded: Report["catalog"];
  // The row is read after the start, inside the driver's first level, so that a start that cannot be read costs the catalog nothing.
  const extraLists = async (depth: number, here: Visited[]): Promise<Extra[]> => {
    if (catalog === undefined || depth !== 0 || !here[0]!.fetched) return [];
    const row = await readRow(catalog, said, session);
    if ("reason" in row) { seeded = { address: catalog, listed: 0, taken: 0, reason: row.reason, ...(row.target !== undefined ? { target: row.target } : {}) }; return []; }
    const room = Math.max(0, session.limits.sourcesPerRun - 1);
    const chosen = row.addresses.length > room ? sample(row.addresses, room) : row.addresses;
    seeded = { address: catalog, listed: row.listed, taken: 0 };
    return [{ key: catalog, candidates: chosen.map((address) => ({ address, via: [catalog], named: true })) }];
  };
  const { visits, skipped } = await levels([{ address: from, via: [], named: false }], session, (c) => visitSource(said, c, session), (i) => i.for.includes(said), extraLists);
  const start = visits[0]!;
  if (!start.fetched) {
    const u = start.unresolved[0]!;
    return { ok: false, reason: u.reason, ...(u.target !== undefined ? { target: u.target } : {}) };
  }
  const report = assemble(said, from, visits, skipped);
  if (seeded !== undefined) {
    if (seeded.reason === undefined) seeded.taken = visits.filter((v) => v.via.length === 1 && v.via[0] === catalog).length;
    report.catalog = seeded;
  }
  return { ok: true, report };
}
