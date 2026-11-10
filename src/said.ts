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
