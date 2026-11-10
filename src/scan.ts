import { isSaid } from "./said.ts";

export const PATH_LIMITS = { maxPaths: 16, maxLength: 256, maxDepth: 64 } as const;

const B64 = /[A-Za-z0-9_-]/;
const CANDIDATE = /E[A-P][A-Za-z0-9_-]{42}/g;

/** Every position where a SAID-shaped run of 44 characters has no base64url character on either side. */
function occurrences(text: string): { said: string; at: number }[] {
  const found: { said: string; at: number }[] = [];
  CANDIDATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CANDIDATE.exec(text)) !== null) {
    const at = m.index;
    const before = text[at - 1];
    const after = text[at + 44];
    if ((before !== undefined && B64.test(before)) || (after !== undefined && B64.test(after))) {
      CANDIDATE.lastIndex = at + 1;
      continue;
    }
    found.push({ said: m[0], at });
  }
  return found;
}

/** Bytes as one character per byte, so positions are byte offsets and SAIDs (ASCII) are unchanged. */
function latin1(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
}

/** The SAIDs that appear in the bytes, other than own, each once, sorted as strings. */
export function appearances(bytes: Uint8Array, own?: string): string[] {
  const set = new Set<string>();
  for (const o of occurrences(latin1(bytes))) if (o.said !== own) set.add(o.said);
  return [...set].sort();
}

/** Nesting depth of the JSON tokens, counted outside strings; cheap, and safe on any bytes. */
export function depth(text: string): number {
  let d = 0, max = 0, inString = false, escaped = false;
  for (const c of text) {
    if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; }
    else if (c === '"') inString = true;
    else if (c === "{" || c === "[") { d++; if (d > max) max = d; }
    else if (c === "}" || c === "]") d--;
  }
  return max;
}

const escapePointer = (s: string) => s.replace(/~/g, "~0").replace(/\//g, "~1");

function holds(s: string, said: string): boolean {
  return occurrences(s).some((o) => o.said === said);
}

/** JSON Pointers of the strings and keys that hold the SAID, bounded; the count is of every occurrence in the bytes. */
export function paths(bytes: Uint8Array, said: string): { parsed: boolean; count: number; paths: string[] } {
  const text = latin1(bytes);
  const count = occurrences(text).filter((o) => o.said === said).length;
  if (!isSaid(said) || depth(text) > PATH_LIMITS.maxDepth) return { parsed: false, count, paths: [] };
  let value: unknown;
  try { value = JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return { parsed: false, count, paths: [] }; }
  const out: string[] = [];
  const visit = (v: unknown, pointer: string): void => {
    if (out.length >= PATH_LIMITS.maxPaths) return;
    if (typeof v === "string") { if (holds(v, said) && pointer.length <= PATH_LIMITS.maxLength) out.push(pointer); return; }
    if (Array.isArray(v)) { v.forEach((item, i) => visit(item, `${pointer}/${i}`)); return; }
    if (v !== null && typeof v === "object") {
      for (const [k, item] of Object.entries(v as Record<string, unknown>)) {
        const p = `${pointer}/${escapePointer(k)}`;
        if (holds(k, said) && p.length <= PATH_LIMITS.maxLength && out.length < PATH_LIMITS.maxPaths) out.push(p);
        visit(item, p);
      }
    }
  };
  visit(value, "");
  return { parsed: true, count, paths: out };
}
