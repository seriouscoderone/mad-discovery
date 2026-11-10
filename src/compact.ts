/**
 * Remove the whitespace between JSON tokens, without interpreting any value.
 * Inside a string every byte is kept, including escapes; outside, space, tab, LF and CR are dropped.
 */
export function compactJson(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  let n = 0;
  let inString = false;
  let escaped = false;
  for (const c of bytes) {
    if (inString) {
      out[n++] = c;
      if (escaped) escaped = false;
      else if (c === 0x5c) escaped = true;       // backslash
      else if (c === 0x22) inString = false;     // closing quote
    } else if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      continue;
    } else {
      out[n++] = c;
      if (c === 0x22) inString = true;
    }
  }
  return out.subarray(0, n);
}
