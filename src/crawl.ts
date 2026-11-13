import { Session } from "./session.ts";
import { byKey, type Introduction } from "./source.ts";
import type { Unresolved } from "./read.ts";

/** A source a run will visit: how it got there, and whether an introduction named the looked-up SAID in `for`. */
export type Candidate = { address: string; via: string[]; named: boolean };

/** What the driver needs to know of a visit. */
export type Node = {
  address: string;
  via: string[];
  fetched: boolean;              // the source document was fetched and read
  read: boolean;                 // the source is kept: ok or truncated
  introductions: Introduction[]; // the ones to follow, already cut to the limit and in address order
};

/** A list of named candidates from outside the sources (a catalog row), keyed by where it came from. */
export type Extra = { key: string; candidates: Candidate[] };

/**
 * The next depth's candidates in the design's order: introductions the predicate names first; among equals one from each introducing
 * source in turn, introducing sources in address order (here is sorted) and each source's introductions in address order. `extra`
 * lists (a catalog row's addresses, keyed by the catalog's address) take part in the named round-robin, ordered among the sources by
 * key. An address already visited, or taken earlier in this level, is not taken again.
 */
export function nextLevel(named: (i: Introduction) => boolean, here: Node[], visited: Set<string>, extra: Extra[] = []): Candidate[] {
  const namedLists: { key: string; list: Candidate[] }[] = extra.map((e) => ({ key: e.key, list: e.candidates }));
  const otherLists: Candidate[][] = [];
  for (const v of here) {
    if (!v.read) continue;
    const via = [...v.via, v.address];
    const n: Candidate[] = [];
    const o: Candidate[] = [];
    for (const i of v.introductions) (named(i) ? n : o).push({ address: i.source, via, named: named(i) });
    namedLists.push({ key: v.address, list: n });
    otherLists.push(o);
  }
  namedLists.sort(byKey("key"));
  const out: Candidate[] = [];
  const seen = new Set(visited);
  for (const lists of [namedLists.map((l) => l.list), otherLists]) {
    for (let k = 0; ; k++) {
      let any = false;
      for (const l of lists) {
        if (k >= l.length) continue;
        any = true;
        const c = l[k]!;
        if (!seen.has(c.address)) { seen.add(c.address); out.push(c); }
      }
      if (!any) break;
    }
  }
  return out;
}

/**
 * Breadth-first over sources: every source at one depth before any at the next; within a depth the sources run under the session's
 * host scheduling and are merged in address order; the depth limit and the room (sources per run, the starts included) cut in that
 * order and record what they cut as skipped, once per address.
 */
export async function levels<V extends Node>(
  starts: Candidate[],
  session: Session,
  visit: (c: Candidate, depth: number) => Promise<V>,
  named: (i: Introduction) => boolean,
  extra: (depth: number, here: V[]) => Extra[] | Promise<Extra[]> = () => [],
): Promise<{ visits: V[]; skipped: Unresolved[] }> {
  // A repeated start is one visit. Whether the starts fit the room is the caller's to settle before calling: a catalog build refuses when they do not.
  const unique = starts.filter((c, i) => starts.findIndex((d) => d.address === c.address) === i);
  const visited = new Set<string>(unique.map((c) => c.address));
  let taken = unique.length;
  const visits: V[] = [];
  const skipped: Unresolved[] = [];
  let level: Candidate[] = unique;
  for (let depth = 0; level.length > 0; depth++) {
    const here: V[] = [];
    await session.each(level, (c) => Session.hostOf(c.address), async (c) => { here.push(await visit(c, depth)); });
    here.sort(byKey("address"));
    visits.push(...here);
    const next = nextLevel(named, here, visited, await extra(depth, here));
    if (next.length === 0) break;
    if (depth + 1 > session.limits.introductionDepth) {
      for (const c of next) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "depth" });
      break;
    }
    const room = Math.max(0, session.limits.sourcesPerRun - taken);
    for (const c of next.slice(room)) skipped.push({ address: c.address, via: c.via, reason: "skipped", limit: "sources" });
    level = next.slice(0, room);
    taken += level.length;
    for (const c of next) visited.add(c.address);
  }
  return { visits, skipped };
}
