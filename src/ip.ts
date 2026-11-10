/** The address check of docs/design.md "Fetching safely": which resolved addresses the routine may connect to. */

/** Dotted IPv4 to its 32-bit value, or null: exactly four decimal octets, no leading zero beyond "0" itself. */
export function parseIPv4(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (m === null) return null;
  let v = 0;
  for (let i = 1; i <= 4; i++) {
    const text = m[i]!;
    const o = Number(text);
    if (o > 255 || (text.length > 1 && text.startsWith("0"))) return null;
    v = v * 256 + o;
  }
  return v;
}

/** IPv6 text (with :: compression and an optional dotted IPv4 tail) to its 128-bit value, or null. No zone id. */
export function parseIPv6(s: string): bigint | null {
  if (s.includes("%")) return null;
  let text = s;
  const lastColon = text.lastIndexOf(":");
  if (lastColon >= 0 && text.includes(".", lastColon)) {
    const tail = parseIPv4(text.slice(lastColon + 1));
    if (tail === null) return null;
    text = `${text.slice(0, lastColon + 1)}${(tail >>> 16).toString(16)}:${(tail & 0xffff).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const groups = (part: string): number[] | null => {
    if (part === "") return [];
    const out: number[] = [];
    for (const g of part.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = groups(halves[0]!);
  const rest = halves.length === 2 ? groups(halves[1]!) : [];
  if (head === null || rest === null) return null;
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  let v = 0n;
  for (const g of [...head, ...new Array<number>(missing).fill(0), ...rest]) v = (v << 16n) | BigInt(g);
  return v;
}

// this-network, private, carrier-grade NAT, loopback, link-local, protocol assignment, documentation, benchmarking, multicast, reserved and broadcast
const V4_REFUSED: [number, number][] = ([
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as [string, number][]).map(([base, bits]) => [parseIPv4(base)!, bits]);

type V6Prefix = { shift: bigint; top: bigint };
const v6Prefix = (base: string, bits: number): V6Prefix => ({ shift: BigInt(128 - bits), top: parseIPv6(base)! >> BigInt(128 - bits) });

// Parsed once: the two prefixes that carry IPv4, global unicast, and the protocol-assignment, documentation and 6to4 ranges inside it.
const V6_MAPPED = v6Prefix("::ffff:0:0", 96);
const V6_NAT64 = v6Prefix("64:ff9b::", 96);
const V6_GLOBAL = v6Prefix("2000::", 3);
const V6_REFUSED: V6Prefix[] = [v6Prefix("2001::", 23), v6Prefix("2001:db8::", 32), v6Prefix("2002::", 16)];

const inV4 = (v: number, base: number, bits: number): boolean => (v >>> (32 - bits)) === (base >>> (32 - bits));
const inV6 = (v: bigint, p: V6Prefix): boolean => (v >> p.shift) === p.top;

function isPublicIPv4(v: number): boolean {
  return !V4_REFUSED.some(([base, bits]) => inV4(v, base, bits));
}

/** True when the routine may connect to this address outside tests. Anything that does not parse is not public. */
export function isPublic(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4 !== null) return isPublicIPv4(v4);
  const v6 = parseIPv6(address);
  if (v6 === null) return false;
  // An IPv4 address carried inside IPv6 is judged by the IPv4 list, so IPv6-only readers still reach IPv4-only sources.
  if (inV6(v6, V6_MAPPED) || inV6(v6, V6_NAT64)) return isPublicIPv4(Number(v6 & 0xffffffffn));
  return inV6(v6, V6_GLOBAL) && !V6_REFUSED.some((p) => inV6(v6, p));
}

/** 127/8 and ::1: what test code alone may connect to. */
export function isLoopback(address: string): boolean {
  const v4 = parseIPv4(address);
  if (v4 !== null) return inV4(v4, parseIPv4("127.0.0.0")!, 8);
  return parseIPv6(address) === 1n;
}
