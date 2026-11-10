import { blake3 } from "@noble/hashes/blake3.js";

/** The one text form of a SAID here: Blake3-256, CESR code E, 44 characters. */
export const SAID_PATTERN = /^E[A-P][A-Za-z0-9_-]{42}$/;

export function isSaid(s: string): boolean {
  return SAID_PATTERN.test(s);
}

/** One zero byte, then the 32 digest bytes, as base64url; the first character (always A) becomes E. */
export function encodeSaid(digest: Uint8Array): string {
  if (digest.length !== 32) throw new Error("a Blake3-256 digest is 32 bytes");
  const padded = new Uint8Array(33);
  padded.set(digest, 1);
  return "E" + Buffer.from(padded).toString("base64url").slice(1);
}

/** The SAID of a hashed form: the bytes with the SAID's slot holding 44 '#'. */
export function saidOf(hashed: Uint8Array): string {
  return encodeSaid(blake3(hashed));
}

/** 44 '#': what stands in the SAID's slot while the digest is computed. */
export const FILL: Uint8Array = new Uint8Array(44).fill(0x23);

function asBuffer(b: Uint8Array): Buffer {
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
}

/** Replace every occurrence of needle, scanning left to right without overlap. Works on octets. */
export function replaceAll(bytes: Uint8Array, needle: Uint8Array, by: Uint8Array): Uint8Array {
  const hay = asBuffer(bytes);
  const nee = asBuffer(needle);
  const parts: Uint8Array[] = [];
  let from = 0;
  for (;;) {
    const at = hay.indexOf(nee, from);
    if (at < 0) break;
    parts.push(bytes.subarray(from, at), by);
    from = at + needle.length;
  }
  parts.push(bytes.subarray(from));
  return new Uint8Array(Buffer.concat(parts));
}

/**
 * The byte check of docs/design.md, "Checking bytes against a SAID":
 * 1. the SAID is present; 2. every occurrence becomes 44 '#'; 3. the digest of that is the SAID;
 * 4. putting the SAID back for every run of 44 '#' (left to right) gives the served bytes.
 */
export function checkSaid(served: Uint8Array, said: string): boolean {
  if (!isSaid(said)) return false;
  const needle = Buffer.from(said, "ascii");
  if (asBuffer(served).indexOf(needle) < 0) return false;
  const hashed = replaceAll(served, needle, FILL);
  if (saidOf(hashed) !== said) return false;
  const rebuilt = replaceAll(hashed, FILL, needle);
  return asBuffer(rebuilt).equals(asBuffer(served));
}
