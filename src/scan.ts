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

type Frame =
  | { kind: "object"; pointer: string; expectKey: boolean; key: string }
  | { kind: "array"; pointer: string; index: number };

/** JSON Pointers of the strings and keys that hold the SAID, one per occurrence in the bytes, bounded; the count is of every occurrence. */
export function paths(bytes: Uint8Array, said: string): { parsed: boolean; count: number; paths: string[] } {
  const text = latin1(bytes);
  const occs = occurrences(text).filter((o) => o.said === said);
  const count = occs.length;
  if (!isSaid(said) || depth(text) > PATH_LIMITS.maxDepth) return { parsed: false, count, paths: [] };
  try { JSON.parse(Buffer.from(bytes).toString("utf8")); } catch { return { parsed: false, count, paths: [] }; }
  // Valid JSON from here: walk its tokens once, iteratively, and give each occurrence the pointer of the string token around it.
  const out: string[] = [];
  const stack: Frame[] = [];
  const valuePointer = (): string => {
    const top = stack[stack.length - 1];
    if (top === undefined) return "";
    return top.kind === "object" ? `${top.pointer}/${top.key}` : `${top.pointer}/${top.index}`;
  };
  let k = 0;
  let i = 0;
  while (i < text.length && k < count) {
    const c = text[i];
    const top = stack[stack.length - 1];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "{") { stack.push({ kind: "object", pointer: valuePointer(), expectKey: true, key: "" }); i++; continue; }
    if (c === "[") { stack.push({ kind: "array", pointer: valuePointer(), index: 0 }); i++; continue; }
    if (c === "}" || c === "]") { stack.pop(); i++; continue; }
    if (c === ",") { if (top?.kind === "object") top.expectKey = true; else if (top?.kind === "array") top.index++; i++; continue; }
    if (c === ":") { if (top?.kind === "object") top.expectKey = false; i++; continue; }
    if (c === '"') {
      let j = i + 1;
      while (text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      const end = j + 1;
      let pointer: string;
      if (top?.kind === "object" && top.expectKey) {
        top.key = escapePointer(JSON.parse(Buffer.from(bytes.subarray(i, end)).toString("utf8")) as string);
        pointer = `${top.pointer}/${top.key}`;
      } else pointer = valuePointer();
      while (k < count && occs[k]!.at + 44 <= end) {
        if (occs[k]!.at >= i && pointer.length <= PATH_LIMITS.maxLength && out.length < PATH_LIMITS.maxPaths) out.push(pointer);
        k++;
      }
      i = end;
      continue;
    }
    while (i < text.length && !/[\s{}\[\],:"]/.test(text[i]!)) i++;
  }
  return { parsed: true, count, paths: out };
}
