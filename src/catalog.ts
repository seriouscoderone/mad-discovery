import { readFileSync } from "node:fs";
import { isSaid } from "./said.ts";
import { parseSourceAddress } from "./address.ts";
import { levels, type Candidate } from "./crawl.ts";
import { visitAll } from "./visit.ts";
import { byKey, isRecord, type Publication } from "./source.ts";
import { asciiJson } from "./json.ts";
import { PATH_LIMITS, PUBLICATION, type RowLimits, type ContainedLimits } from "./limits.ts";
import { catalogPages, type SourcePages } from "./catalogpages.ts";
import type { Session } from "./session.ts";
import type { Robots } from "./robots.ts";

/** What a finder writes (docs/design.md "What a finder returns"); place is the finder's own record of where it saw the line. */
export type CandidateFile = { finder: string; snapshot: string; candidates: { address: string; place: Record<string, string | number> }[] };

export type Found =
  | { by: "from" }
  | { by: "introduction"; from: string }
  | { by: "finder"; finder: string; snapshot: string; place: Record<string, string | number> };

export type Row = {
  said: string;
  serves: { source: string }[];
  publications: { source: string; by?: string; publication: Publication }[];
  referrers: { source: string; said: string; paths: string[]; appearances: number }[];
  counts: { source: string; publications: number; referrers: number }[];
  omittedSources?: number;
};

export type BuildInput = { from: string[]; candidates: { file: CandidateFile; bytes: Uint8Array }[]; session: Session; robots: Robots; row: RowLimits; contained: ContainedLimits; toolCommit: string | null };
export type BuildOutcome =
  | { ok: true; files: Map<string, Uint8Array>; summary: { rows: number; sources: { ok: number; truncated: number; other: number }; seeded: boolean } }
  | { ok: false; problem: string };

const SEEDED_NOTE = "A seeded crawl: the sources are a hand-kept list given on the command line, which Ruling 3 does not count as meeting the objective for strangers. A catalog that does is built from a finder's candidate files.";
const NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/;   // a finder or snapshot name: it becomes a path, so no leading dot (".", "..", a hidden file)
const PLACE_KEY = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;

const encoder = new TextEncoder();
const jsonBytes = (value: unknown): Uint8Array => encoder.encode(asciiJson(value) + "\n");
/** The order of a source's found entries: --from, then finders, then introductions by introducing address. */
const foundKey = (f: Found): string => f.by === "from" ? "0" : f.by === "finder" ? `1 ${f.finder} ${f.snapshot} ${JSON.stringify(f.place)}` : `2 ${f.from}`;
const compare = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/** A candidate file as written by catalog find; null when it is not one. Addresses are checked later, against the rule, and counted. */
export function readCandidateFile(text: string): CandidateFile | null {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!isRecord(raw) || typeof raw["finder"] !== "string" || !NAME.test(raw["finder"]) || typeof raw["snapshot"] !== "string" || !NAME.test(raw["snapshot"]) || !Array.isArray(raw["candidates"])) return null;
  const candidates: CandidateFile["candidates"] = [];
  for (const c of raw["candidates"]) {
    if (!isRecord(c) || typeof c["address"] !== "string" || (c["place"] !== undefined && !isRecord(c["place"]))) return null;
    const place: Record<string, string | number> = {};
    if (isRecord(c["place"])) for (const [k, v] of Object.entries(c["place"])) if (PLACE_KEY.test(k) && ((typeof v === "string" && v.isWellFormed()) || typeof v === "number")) place[k] = v;   // Ruling 12: an ill-formed string is dropped
    candidates.push({ address: c["address"], place });
  }
  return { finder: raw["finder"], snapshot: raw["snapshot"], candidates };
}

/** The commit the tool runs from: .git/HEAD (or the folder a worktree's .git file names), through the ref it names, loose or packed. null when this is not a checkout. */
export function toolCommit(checkout: URL): string | null {
  const read = (url: URL): string | null => { try { return readFileSync(url, "utf8"); } catch { return null; } };
  let git = new URL(".git/", checkout);
  const file = read(new URL(".git", checkout));
  if (file !== null && file.startsWith("gitdir: ")) git = new URL(file.slice(8).trim().replace(/\/?$/, "/"), checkout);
  const common = read(new URL("commondir", git));   // a worktree keeps HEAD in its own folder and the refs in the repository's
  const refs = common === null ? git : new URL(common.trim().replace(/\/?$/, "/"), git);
  const head = read(new URL("HEAD", git))?.trim();
  if (head === undefined) return null;
  if (/^[0-9a-f]{40}$/.test(head)) return head;
  const ref = head.startsWith("ref: ") ? head.slice(5).trim() : null;
  if (ref === null) return null;
  const loose = read(new URL(ref, refs))?.trim();
  if (loose !== undefined && /^[0-9a-f]{40}$/.test(loose)) return loose;
  const packed = read(new URL("packed-refs", refs));
  if (packed === null) return null;
  for (const line of packed.split("\n")) { const [sha, name] = line.split(" "); if (name === ref && sha !== undefined && /^[0-9a-f]{40}$/.test(sha)) return sha; }
  return null;
}

/**
 * docs/design.md "The catalog": gather the candidates, visit breadth-first within the limits, then write the static files from what
 * verified. Rows exist only for served bytes that passed the check; every statement names the source it was fetched from; counts are
 * counts of addresses. Pages are added by the caller.
 */
export async function buildCatalog(input: BuildInput): Promise<BuildOutcome> {
  const { session, robots, row, contained } = input;
  const test = session.test;
  // 0. The copies: one file per path, on a case-insensitive file system too.
  const copyPaths = new Set<string>();
  for (const { file } of input.candidates) {
    const key = `${file.finder}/${file.snapshot}`.toLowerCase();
    if (copyPaths.has(key)) return { ok: false, problem: `two candidate files would both be written as candidates/${file.finder}/${file.snapshot}.json` };
    copyPaths.add(key);
  }
  // 1. Candidates: canonical, de-duplicated, sorted; the rule drops and counts; too many is a refusal before any fetch. The same way twice is recorded once.
  const found = new Map<string, Found[]>();
  let droppedCandidates = 0;
  const add = (address: string, how: Found): void => {
    const parsed = parseSourceAddress(address, { test });
    if (parsed === null) { droppedCandidates++; return; }
    const list = found.get(parsed.address) ?? [];
    if (!list.some((f) => JSON.stringify(f) === JSON.stringify(how))) found.set(parsed.address, [...list, how]);
  };
  for (const a of input.from) add(a, { by: "from" });
  for (const { file } of input.candidates) for (const c of file.candidates) add(c.address, { by: "finder", finder: file.finder, snapshot: file.snapshot, place: c.place });
  const starts: Candidate[] = [...found.keys()].sort().map((address) => ({ address, via: [], named: false }));
  if (starts.length > session.limits.sourcesPerRun) return { ok: false, problem: `${starts.length} candidates, more than the limit of ${session.limits.sourcesPerRun} sources per run` };

  // 2. Visit. Every introducing source is recorded, not only the one whose chain reached a source first.
  const { visits, skipped } = await levels(starts, session, (c) => visitAll(c, session, robots, contained), () => false);
  const tried = new Set<string>([...visits.map((v) => v.address), ...skipped.map((s) => s.address)]);
  const read = visits.filter((v) => v.read);
  for (const v of read) for (const i of v.introductions) if (tried.has(i.source)) found.set(i.source, [...(found.get(i.source) ?? []), { by: "introduction", from: v.address }]);
  for (const [address, list] of found) found.set(address, [...list].sort((p, q) => compare(foundKey(p), foundKey(q))));
  if (read.length === 0) return { ok: false, problem: "no source could be read" };

  // 3. Rows, in the build's order of sources (depth, then address: the order of visits).
  const rows = new Map<string, Row>();
  const rowFor = (said: string): Row => { let r = rows.get(said); if (r === undefined) { r = { said, serves: [], publications: [], referrers: [], counts: [] }; rows.set(said, r); } return r; };
  for (const v of read) for (const d of v.verified) rowFor(d.said).serves.push({ source: v.address });
  for (const v of read) {
    const perSaid = new Map<string, { publications: Publication[]; referrers: { said: string; paths: string[]; appearances: number }[] }>();
    const bucket = (said: string) => { let b = perSaid.get(said); if (b === undefined) { b = { publications: [], referrers: [] }; perSaid.set(said, b); } return b; };
    for (const d of v.verified) bucket(d.said);   // a serving source has a counts entry even with nothing to count
    for (const p of v.document!.publications) if (rows.has(p.target)) bucket(p.target).publications.push(p);
    for (const d of v.verified) for (const c of d.contains) if (rows.has(c.said)) bucket(c.said).referrers.push({ said: d.said, paths: c.paths, appearances: c.appearances });
    for (const [said, b] of perSaid) {
      const r = rowFor(said);
      if (b.publications.length > 0) {
        const first = b.publications[0]!;
        const by = first.by ?? v.document!.by;
        r.publications.push({ source: v.address, ...(by !== undefined ? { by } : {}), publication: first });
      }
      b.referrers.sort(byKey("said"));
      for (const ref of b.referrers.slice(0, row.referrersPerSource)) r.referrers.push({ source: v.address, ...ref });
      r.counts.push({ source: v.address, publications: b.publications.length, referrers: b.referrers.length });
    }
  }
  const servedBy = new Map([...rows].map(([said, r]) => [said, r.serves.length]));   // counts before any row cut, for the index
  // 4. The row size limit: keep contributing sources in the build's order up to the limit, never the first one out, and say how many were left out.
  const files = new Map<string, Uint8Array>();
  for (const said of [...rows.keys()].sort()) {
    if (!isSaid(said)) throw new Error("a row key is always a verified SAID");
    let r = rows.get(said)!;
    let bytes = jsonBytes(r);
    if (bytes.length > row.rowBytes) {
      const contributors = read.map((v) => v.address).filter((a) => r.counts.some((c) => c.source === a));
      const kept = new Set(contributors);
      let omitted = 0;
      while (bytes.length > row.rowBytes && kept.size > 1) {
        kept.delete(contributors[kept.size - 1]!);
        omitted++;
        r = { ...r, serves: r.serves.filter((s) => kept.has(s.source)), publications: r.publications.filter((p) => kept.has(p.source)), referrers: r.referrers.filter((x) => kept.has(x.source)), counts: r.counts.filter((c) => kept.has(c.source)), omittedSources: omitted };
        bytes = jsonBytes(r);
      }
      // Unreachable at the shipped limits (one source's share is about 215 KB: a publication, 50 referrers of 16 paths of 256 characters, a counts entry); the guard of the invariant for any other limits.
      if (bytes.length > row.rowBytes) return { ok: false, problem: `the row for ${said} from ${contributors[0]} alone is larger than the row limit` };
    }
    files.set(`said/${said}.json`, bytes);
    rows.set(said, r);
  }
  // 5. index.json, sources.json, the copied candidate files, catalog.json.
  const index = { saids: [...rows.keys()].sort().map((said) => { const r = rows.get(said)!; return { said, sources: servedBy.get(said)!, names: r.publications.map((p) => ({ name: p.publication.name, source: p.source })) }; }) };
  files.set("index.json", jsonBytes(index));
  const entries = [
    ...visits.map((v) => ({ address: v.address, found: found.get(v.address) ?? [], outcome: v.outcome, limits: v.limits, dropped: v.dropped, digest: v.digest, definitions: v.failed, untried: v.untried, omittedContained: v.omittedContained, refers: v.notContained.map((n) => ({ in: n.in, said: n.said, outcome: "not-contained" })) })),
    ...skipped.map((s) => ({ address: s.address, found: found.get(s.address) ?? [], outcome: "skipped", limits: s.limit !== undefined ? [s.limit] : [], dropped: { entries: 0, publications: 0 }, digest: null, definitions: [], untried: 0, omittedContained: 0, refers: [] })),
  ].sort(byKey("address"));
  files.set("sources.json", jsonBytes({ sources: entries }));
  const candidates = input.candidates.map(({ file, bytes }) => {
    const path = `candidates/${file.finder}/${file.snapshot}.json`;
    files.set(path, bytes);   // the bytes read, so another party can compare the input
    return { finder: file.finder, snapshot: file.snapshot, count: file.candidates.length, path };
  });
  const seeded = input.candidates.length === 0;
  files.set("catalog.json", jsonBytes({
    tool: { commit: input.toolCommit },
    from: [...new Set(input.from.map((a) => parseSourceAddress(a, { test })?.address).filter((a): a is string => a !== undefined))].sort(),
    candidates,
    droppedCandidates,
    limits: { ...session.limits, paths: PATH_LIMITS, publication: PUBLICATION, row, contained },
    seeded,
    ...(seeded ? { note: SEEDED_NOTE } : {}),
  }));
  const sourcePages: SourcePages = new Map(read.map((v) => [v.address, { pages: v.document!.pages === true, base: v.base! }]));
  for (const [path, text] of catalogPages([...rows.values()], sourcePages, seeded)) files.set(path, encoder.encode(text));
  return { ok: true, files, summary: { rows: rows.size, sources: { ok: visits.filter((v) => v.outcome === "ok").length, truncated: visits.filter((v) => v.outcome === "truncated").length, other: visits.length + skipped.length - read.length }, seeded } };
}
