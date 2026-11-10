import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import { definitionAddress } from "./address.ts";
import { readSource, redirectTarget, type Unresolved } from "./read.ts";
import { Session } from "./session.ts";

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

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * docs/design.md "Bringing a definition home": read the starting source and the sources its introductions name, one step and no
 * further; work outward from the SAID asked for, taking appearances in sorted order; fetch each SAID from the first source that lists
 * it (the start, then the introduced sources in address order); check every definition; a SAID no read source lists is missing and
 * is requested from nobody. Nothing is written here: the caller writes the files once the SAID asked for is among them.
 */
export async function get(said: string, from: string, session: Session): Promise<GetOutcome> {
  const unresolved: Unresolved[] = [];
  const known = async (address: string, via: string[]): Promise<Known | null> => {
    const stop = session.exhausted(Session.hostOf(address));
    if (stop !== null) { unresolved.push({ address, via, reason: "skipped", limit: stop }); return null; }
    const r = await readSource(address, via, session);
    if (!r.ok) { unresolved.push(r.unresolved); return null; }
    return { address, via, base: r.base, serves: new Set(r.document.serves.map((s) => s.said)), fetched: 0, cut: false, exhausted: false };
  };
  const startRead = await readSource(from, [], session);
  if (!startRead.ok) return { ok: false, problem: `the starting source could not be read: ${startRead.unresolved.reason}`, unresolved: [startRead.unresolved] };
  const start: Known = { address: from, via: [], base: startRead.base, serves: new Set(startRead.document.serves.map((s) => s.said)), fetched: 0, cut: false, exhausted: false };

  const introductions = startRead.document.introductions.slice(0, session.limits.introductionsPerSource);
  if (startRead.document.introductions.length > introductions.length) unresolved.push({ address: from, via: [], reason: "truncated", limit: "introductions" });
  const others: (Known | null)[] = introductions.map(() => null);
  await session.each(introductions.map((i, k) => ({ i, k })), ({ i }) => Session.hostOf(i.source), async ({ i, k }) => { others[k] = await known(i.source, [from]); });
  const sources: Known[] = [start, ...others.filter((k): k is Known => k !== null)];

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
  missing.sort((a, b) => byString(a.said, b.said));
  return { ok: true, files, result: { said, from, written: [...files.keys()].map((f) => f.slice(0, -5)).sort(byString), missing, unresolved } };
}
