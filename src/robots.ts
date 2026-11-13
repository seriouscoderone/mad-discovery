import { Session } from "./session.ts";
import { parseHttpsAddress } from "./address.ts";

/** One group's rules, in file order: path is normalized once here, length is the rule's raw length, which the longest match compares. */
export type RobotsRules = { groups: { agents: string[]; rules: { allow: boolean; path: string; length: number }[] }[] };

const MAX_RULE = 512;    // a longer rule path is ignored
const MAX_RULES = 1000;  // per group, and for the groups combined for one product

/**
 * A robots.txt, read as RFC 9309 says: groups of User-agent lines followed by rules; text after # dropped; unknown lines ignored.
 * Nothing here is interpreted beyond that: a robots.txt is a stranger's file, so its size and its rules are bounded.
 */
export function parseRobots(text: string): RobotsRules {
  const groups: RobotsRules["groups"] = [];
  let current: RobotsRules["groups"][number] | null = null;
  let collectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!collectingAgents || current === null) { current = { agents: [], rules: [] }; groups.push(current); collectingAgents = true; }
      current.agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && current !== null) {
      collectingAgents = false;
      if (value === "") continue;      // an empty Disallow allows everything; an empty Allow says nothing
      if (value.length > MAX_RULE || current.rules.length >= MAX_RULES) continue;
      current.rules.push({ allow: field === "allow", path: normalizePath(value), length: value.length });
    } else collectingAgents = false;
  }
  return { groups };
}

/** The product token of a user agent, lowercased: "Mad-Discovery/1.0 (+https://...)" is "mad-discovery". */
function productToken(agent: string): string {
  return agent.split(/[\s/]/)[0]!.toLowerCase();
}

/**
 * RFC 9309 path matching without a regular expression: * matches any run, $ anchors the end, the pattern is a prefix otherwise.
 * The two-pointer glob walk is linear in the path for each star, so a stranger's rule cannot make it backtrack.
 */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const p = anchored ? pattern.slice(0, -1) : pattern;
  let i = 0, j = 0, star = -1, mark = 0;
  while (i < path.length) {
    if (j < p.length && p[j] === "*") { star = j++; mark = i; }   // before the literal test: a * in the rule is always the wildcard
    else if (j < p.length && p[j] === path[i]) { i++; j++; }
    else if (!anchored && j === p.length) return true;   // the pattern is consumed and is a prefix of the path
    else if (star >= 0) { j = star + 1; i = ++mark; }
    else return false;
  }
  while (j < p.length && p[j] === "*") j++;
  return j === p.length;                                 // the path is consumed: the pattern must be too
}

/** Each UTF-8 byte of a code point above US-ASCII, as an upper-case %XX. */
function encodeNonAscii(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch.codePointAt(0)! <= 0x7f) { out += ch; continue; }
    for (const b of Buffer.from(ch, "utf8")) out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

/** RFC 9309 2.2.2: an octet outside US-ASCII is percent-encoded; a percent-encoded unreserved octet is the character; any other escape is compared upper-cased. */
function normalizePath(s: string): string {
  return encodeNonAscii(s).replace(/%([0-9A-Fa-f]{2})/g, (m, hex: string) => { const c = String.fromCharCode(parseInt(hex, 16)); return /[A-Za-z0-9\-._~]/.test(c) ? c : m.toUpperCase(); });
}

/**
 * Whether the rules allow this path for this product: the product's groups, else the * groups, else yes, every matching group's
 * rules combined into one (RFC 9309 2.2.1, capped at 1,000 rules); longest match wins, Allow a tie.
 */
export function allows(rules: RobotsRules, product: string, path: string): boolean {
  const token = productToken(product);
  let groups = rules.groups.filter((g) => g.agents.some((a) => productToken(a) === token));
  if (groups.length === 0) groups = rules.groups.filter((g) => g.agents.includes("*"));
  if (groups.length === 0) return true;
  const combined = groups.flatMap((g) => g.rules).slice(0, MAX_RULES);
  const target = normalizePath(path);
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of combined) {
    if (!matches(rule.path, target)) continue;
    const length = rule.length;
    if (best === null || length > best.length || (length === best.length && rule.allow && !best.allow)) best = { allow: rule.allow, length };
  }
  return best === null ? true : best.allow;
}

type HostRules = RobotsRules | "allow-all" | "disallowed" | "refused-address";

/** The robots.txt of each host, fetched once per build through the session. */
export class Robots {
  private readonly session: Session;
  private readonly hosts = new Map<string, Promise<HostRules>>();

  constructor(session: Session) {
    this.session = session;
  }

  private rulesFor(origin: string): Promise<HostRules> {
    let p = this.hosts.get(origin);
    if (p === undefined) {
      p = this.session.fetch(`${origin}/robots.txt`, { type: "text" }).then((f) => {
        if (f.outcome === "ok") return parseRobots(Buffer.from(f.bytes).toString("utf8"));
        if (f.outcome === "not-found") return "allow-all";
        if (f.outcome === "invalid" && f.status !== undefined && f.status >= 400 && f.status < 500) return "allow-all";   // another 4xx: no restrictions
        if (f.outcome === "refused-address") return "refused-address";
        // 5xx, no answer, timed out, a redirect, or a 200 that is not a readable text/plain file. A host whose session budget
        // was already spent lands here too: it is timed-out without a request.
        return "disallowed";
      });
      this.hosts.set(origin, p);
    }
    return p;
  }

  /** true or false by the host's rules for this address's path; "disallowed" when the file could not be read; "refused-address" when the address was. */
  async allows(address: string): Promise<true | false | "disallowed" | "refused-address"> {
    // The address rule bounds the path the matcher walks (512 characters): an address it refuses is never judged or asked about.
    const href = parseHttpsAddress(address, { test: this.session.test });
    if (href === null) return "refused-address";
    const url = new URL(href);
    const rules = await this.rulesFor(url.origin);
    if (rules === "disallowed" || rules === "refused-address") return rules;
    if (rules === "allow-all") return true;
    return allows(rules, "mad-discovery", url.pathname);
  }
}
