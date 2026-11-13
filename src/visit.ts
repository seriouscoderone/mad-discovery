import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { checkSaid } from "./said.ts";
import { appearances, paths } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, type Reason } from "./read.ts";
import { Session } from "./session.ts";
import { CONTAINED, type ContainedLimits } from "./limits.ts";
import type { Robots } from "./robots.ts";
import type { Candidate, Node } from "./crawl.ts";
import type { Dropped } from "./document.ts";
import type { SourceDocument } from "./source.ts";

export type Contains = { said: string; paths: string[]; appearances: number };
/** A verified definition, by what its bytes contain; the bytes themselves are not kept, and the record is bounded (omittedContained counts the rest). */
export type Definition = { said: string; contains: Contains[]; omittedContained: number };

export type SourceVisit = Node & {
  outcome: Reason | "ok";
  limits: string[];                            // the count limits that cut it, in table order; or the budget that stopped it before it started
  digest: string | null;                       // hex Blake3-256 of the document bytes as read
  dropped: Dropped;
  document: SourceDocument | null;
  base: string | null;
  verified: Definition[];
  failed: { said: string; outcome: Reason }[];
  untried: number;                             // definitions beyond the cut, never fetched
  omittedContained: number;                    // contained SAIDs beyond the recording limits, counted but not recorded
  notContained: { in: string; said: string }[];
};

const empty = (c: Candidate): SourceVisit => ({ address: c.address, via: c.via, fetched: false, read: false, introductions: [], outcome: "ok", limits: [], digest: null, dropped: { entries: 0, publications: 0 }, document: null, base: null, verified: [], failed: [], untried: 0, omittedContained: 0, notContained: [] });

/**
 * The catalog build's visit of one source (docs/design.md "The catalog", step 3): the robots.txt rule, then the document, then every
 * served definition in SAID order up to the limit, each checked and scanned. What a definition contains is recorded with the scan's
 * paths so that no bytes outlive the visit. A refers entry the scan does not find in verified bytes ends not-contained.
 */
export async function visitAll(c: Candidate, session: Session, robots: Robots, contained: ContainedLimits = CONTAINED): Promise<SourceVisit> {
  const v = empty(c);
  let recorded = 0;   // contained SAIDs recorded for this source, against contained.perSource
  const host = Session.hostOf(c.address);
  const stop = session.exhausted(host);
  if (stop !== null) return { ...v, outcome: "skipped", limits: [stop] };
  const may = await robots.allows(c.address);
  if (may === false) return { ...v, outcome: "disallowed" };
  if (may !== true) return { ...v, outcome: may };
  const r = await readSource(c.address, c.via, session);
  if (!r.ok) return { ...v, outcome: r.unresolved.reason };
  v.fetched = true;
  v.digest = bytesToHex(blake3(r.bytes));
  const { document, base, dropped } = r;
  const taken = document.serves.slice(0, session.limits.definitionsPerSource);
  for (const entry of taken) {
    if (session.exhausted(host) !== null) break;
    const address = definitionAddress(base, entry.said);
    const allowed = await robots.allows(address);
    if (allowed !== true) { v.failed.push({ said: entry.said, outcome: allowed === false ? "disallowed" : allowed }); continue; }
    const g = await session.fetch(address);
    if (g.outcome !== "ok") { v.failed.push({ said: entry.said, outcome: g.outcome }); continue; }
    if (!checkSaid(g.bytes, entry.said)) { v.failed.push({ said: entry.said, outcome: "failed-check" }); continue; }
    const found = appearances(g.bytes, entry.said).sort();   // lowest SAID first: the order the recording limits cut in
    const kept = found.slice(0, Math.min(contained.perDefinition, Math.max(0, contained.perSource - recorded)));
    recorded += kept.length;
    v.omittedContained += found.length - kept.length;
    v.verified.push({ said: entry.said, contains: kept.map((said) => { const p = paths(g.bytes, said); return { said, paths: p.paths, appearances: p.count }; }), omittedContained: found.length - kept.length });
    for (const claimed of entry.refers) if (!found.includes(claimed)) v.notContained.push({ in: entry.said, said: claimed });   // against the full scan, not the cut
  }
  // The host's time or bytes went during this source: nothing of its definitions is kept; the document's digest is, for comparison.
  if (session.exhausted(host) !== null) return { ...empty(c), fetched: true, digest: v.digest, outcome: "timed-out" };
  v.read = true;
  v.untried = document.serves.length - taken.length;
  v.introductions = document.introductions.slice(0, session.limits.introductionsPerSource);
  if (v.untried > 0) v.limits.push("definitions");
  if (document.introductions.length > v.introductions.length) v.limits.push("introductions");
  if (v.omittedContained > 0) v.limits.push("contained");
  v.outcome = v.limits.length > 0 ? "truncated" : "ok";
  v.dropped = dropped;
  v.document = document;
  v.base = base;
  return v;
}
