import { readSourceDocument, type Dropped } from "./document.ts";
import { parseSourceAddress } from "./address.ts";
import type { Fetched, Outcome } from "./fetch.ts";
import type { SourceDocument } from "./source.ts";
import type { Session } from "./session.ts";

/** An outcome of the fixed list, or one of the three per-entry endings docs/design.md adds under "Outcomes". */
export type Reason = Outcome | "failed-check" | "not-contained" | "not-there";

/** One thing a run was pointed at and could not fetch or check in full. address is always a source address. */
export type Unresolved = { address: string; via: string[]; reason: Reason; said?: string; limit?: string; target?: string };

export type ReadSource =
  | { ok: true; document: SourceDocument; base: string; dropped: Dropped }
  | { ok: false; unresolved: Unresolved };

/** The redirect's target as a member to spread into an entry, when the answer named one. */
export function redirectTarget(f: Fetched): { target: string } | Record<never, never> {
  return f.outcome === "redirected" && f.target !== null ? { target: f.target } : {};
}

/** Fetch a source document and read it; on any failure, the unresolved entry that says why. */
export async function readSource(address: string, via: string[], session: Session): Promise<ReadSource> {
  const f = await session.fetch(address);
  if (f.outcome !== "ok") return { ok: false, unresolved: { address, via, reason: f.outcome, ...redirectTarget(f) } };
  const d = readSourceDocument(f.bytes, address, { test: session.test });
  if (!d.ok) return { ok: false, unresolved: { address, via, reason: "invalid" } };
  return { ok: true, document: d.document, base: parseSourceAddress(address, { test: session.test })!.base, dropped: d.dropped };
}
