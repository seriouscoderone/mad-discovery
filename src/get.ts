import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, redirectTarget, type ReadSource, type Unresolved } from "./read.ts";
import { Session } from "./session.ts";
import { byKey, type Introduction } from "./source.ts";

export type GetResult = {
  said: string;
  from: string;
  written: string[];
  missing: { said: string; looked: string[] }[];
  unresolved: Unresolved[];
};

export type GetOutcome =
  | { ok: true; files: Map<string, Uint8Array>; result: GetResult }
  | { ok: false; problem: string; unresolved: Unresolved[] };

type Known = {
  address: string;
  via: string[];
  base: string;
  serves: Set<string>;
  fetched: number;      // definitions asked of this source, against definitionsPerSource
  cut: boolean;         // it listed a SAID it was not asked for because it had reached that limit
  exhausted: boolean;   // its host's time or bytes ran out; it supplies nothing more
};

const knownOf = (address: string, via: string[], r: Extract<ReadSource, { ok: true }>): Known =>
  ({ address, via, base: r.base, serves: new Set(r.document.serves.map((s) => s.said)), fetched: 0, cut: false, exhausted: false });

/**
 * docs/design.md "Bringing a definition home": read the starting source and the sources its introductions name, one step and no
 * further; work outward from the SAID asked for, taking appearances in sorted order; fetch each SAID from the first source that lists
 * it (the start, then the introduced sources in address order); check every definition; a SAID no read source lists is missing and
 * is requested from nobody. Nothing is written here: the caller writes the files once the SAID asked for is among them.
 */
export async function get(said: string, from: string, session: Session): Promise<GetOutcome> {
  const unresolved: Unresolved[] = [];
  // A source read, or the entry that says why not; the caller merges these in address order, so the report does not depend on who answered first.
  const known = async (address: string, via: string[]): Promise<Known | Unresolved> => {
    const stop = session.exhausted(Session.hostOf(address));
    if (stop !== null) return { address, via, reason: "skipped", limit: stop };
    const r = await readSource(address, via, session);
    return r.ok ? knownOf(address, via, r) : r.unresolved;
  };
  const startRead = await readSource(from, [], session);
  if (!startRead.ok) return { ok: false, problem: `the starting source could not be read: ${startRead.unresolved.reason}`, unresolved: [startRead.unresolved] };
  const start = knownOf(from, [], startRead);

  const listed = startRead.document.introductions.slice(0, session.limits.introductionsPerSource);
  if (startRead.document.introductions.length > listed.length) unresolved.push({ address: from, via: [], reason: "truncated", limit: "introductions" });
  // An address already read is not read again: the start introducing itself would otherwise count as a second lister.
  const visited = new Set<string>([from]);
  const introductions: Introduction[] = [];
  for (const i of listed) if (!visited.has(i.source)) { visited.add(i.source); introductions.push(i); }
  const others: (Known | Unresolved | null)[] = introductions.map(() => null);
  await session.each(introductions.map((i, k) => ({ i, k })), ({ i }) => Session.hostOf(i.source), async ({ i, k }) => { others[k] = await known(i.source, [from]); });
  const sources: Known[] = [start];
  for (const o of others) if (o !== null) { if ("reason" in o) unresolved.push(o); else sources.push(o); }

  const files = new Map<string, Uint8Array>();
  const missing: { said: string; looked: string[] }[] = [];
  const seen = new Set<string>([said]);
  const queue = [said];
  while (queue.length > 0) {
    const target = queue.shift()!;
    let holder: Known | undefined;
    for (const s of sources) {
      if (!s.serves.has(target) || s.exhausted) continue;
      if (s.fetched < session.limits.definitionsPerSource) { holder = s; break; }
      s.cut = true;
    }
    if (holder === undefined) { missing.push({ said: target, looked: sources.map((s) => s.address) }); continue; }
    holder.fetched++;
    const g = await session.fetch(definitionAddress(holder.base, target));
    if (session.exhausted(Session.hostOf(holder.address)) !== null) {
      // The host's time or bytes ran out: one entry for the source, nothing more asked of it; the SAID goes back to the queue for the next lister.
      holder.exhausted = true;
      unresolved.push({ address: holder.address, via: holder.via, reason: "timed-out" });
      if (g.outcome === "timed-out") { queue.unshift(target); continue; }
    }
    if (g.outcome !== "ok") { unresolved.push({ address: holder.address, via: holder.via, reason: g.outcome, said: target, ...redirectTarget(g) }); continue; }
    if (!checkSaid(g.bytes, target)) { unresolved.push({ address: holder.address, via: holder.via, reason: "failed-check", said: target }); continue; }
    files.set(`${target}.json`, g.bytes);
    for (const inner of appearances(g.bytes, target)) if (!seen.has(inner)) { seen.add(inner); queue.push(inner); }
  }
  for (const s of sources) if (s.cut) unresolved.push({ address: s.address, via: s.via, reason: "truncated", limit: "definitions" });

  if (!files.has(`${said}.json`)) return { ok: false, problem: "the definition asked for was not fetched and verified", unresolved };
  missing.sort(byKey("said"));
  return { ok: true, files, result: { said, from, written: [...files.keys()].map((f) => f.slice(0, -5)).sort(), missing, unresolved } };
}
