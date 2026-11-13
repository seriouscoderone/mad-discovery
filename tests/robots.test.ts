import { test, after } from "node:test";
import assert from "node:assert/strict";
import { parseRobots, allows, Robots } from "../src/robots.ts";
import { Session } from "../src/session.ts";
import { WALK } from "../src/limits.ts";
import { Origin } from "./helpers/servers.ts";

const origin = await Origin.start();
after(() => origin.close());

test("the group for mad-discovery wins over *, and * over nothing", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /\n\nUser-agent: mad-discovery\nAllow: /mad/\nDisallow: /\n\nUser-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /private/\n");
  assert.equal(allows(rules, "mad-discovery", "/mad/source.json"), true);
  assert.equal(allows(rules, "mad-discovery", "/other/source.json"), false);
  assert.equal(allows(rules, "Mad-Discovery/1.0", "/mad/source.json"), true, "case and version are ignored");
  assert.equal(allows(rules, "somebody", "/mad/source.json"), false, "falls to *");
  assert.equal(allows(rules, "bingbot", "/private/x"), false, "a shared group");
  assert.equal(allows(parseRobots("User-agent: Googlebot\nDisallow: /\n"), "mad-discovery", "/anything"), true, "no group for us and no *: allowed");
  assert.equal(allows(parseRobots(""), "mad-discovery", "/anything"), true);
  assert.equal(allows(parseRobots("User-agent: *\nDisallow:\n"), "mad-discovery", "/anything"), true, "empty Disallow allows all");
});

test("longest match wins, Allow wins a tie, * and $ are understood, text after # is ignored", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /mad/\nAllow: /mad/source.json # the one file\nDisallow: /*.json$\nAllow: /mad/definitions/\nDisallow: /tmp*\n");
  assert.equal(allows(rules, "mad-discovery", "/mad/source.json"), true);
  assert.equal(allows(rules, "mad-discovery", "/mad/pages/index.html"), false);
  assert.equal(allows(rules, "mad-discovery", "/mad/definitions/E.json"), true, "/mad/definitions/ (17) beats /*.json$ (8)");
  assert.equal(allows(rules, "mad-discovery", "/x/y.json"), false, "$ anchors the end");
  assert.equal(allows(rules, "mad-discovery", "/x/y.json.bak"), true);
  assert.equal(allows(rules, "mad-discovery", "/tmpfiles/a"), false);
  assert.equal(allows(parseRobots("User-agent: *\nAllow: /a\nDisallow: /a\n"), "mad-discovery", "/a/b"), true, "a tie goes to Allow");
  assert.equal(allows(parseRobots("User-agent: *\nDisallow: /mad/\n"), "mad-discovery", "/%6Dad/source.json"), false, "a percent-encoded unreserved octet is the character (RFC 9309 2.2.2)");
  assert.equal(allows(parseRobots("User-agent: *\nDisallow: /%7Ejoe\n"), "mad-discovery", "/~joe/x"), false, "in the rule as well");
  assert.equal(allows(parseRobots("User-agent: *\nDisallow: /*x\n"), "mad-discovery", "/*ax"), false, "a * in the rule is the wildcard even where the path holds a literal * (RFC 9309 2.2.3)");
  const cafe = "/caf" + String.fromCharCode(0xe9);
  assert.equal(allows(parseRobots(`User-agent: *\nDisallow: ${cafe}\n`), "mad-discovery", new URL(`https://a.test${cafe}`).pathname), false, "a non-ASCII rule is percent-encoded as UTF-8 before comparison (RFC 9309 2.2.2)");
});

test("every group that names the product is combined into one (RFC 9309 2.2.1)", () => {
  const rules = parseRobots("User-agent: mad-discovery\nDisallow: /a\n\nUser-agent: *\nDisallow: /c\n\nUser-agent: mad-discovery\nDisallow: /b\n");
  assert.equal(allows(rules, "mad-discovery", "/a/x"), false);
  assert.equal(allows(rules, "mad-discovery", "/b/x"), false, "the second group counts too");
  assert.equal(allows(rules, "mad-discovery", "/c/x"), true, "the * group does not join the product's");
});

test("a hostile rule cannot stall the matcher, and oversize rules and groups are bounded", () => {
  const rules = parseRobots(`User-agent: *\nDisallow: ${"/*".repeat(24)}/x$\n`);
  const path = "/mad/" + "a/".repeat(90) + "b";
  const t0 = performance.now();
  assert.equal(allows(rules, "mad-discovery", path), true);
  assert.ok(performance.now() - t0 < 50, `took ${performance.now() - t0} ms`);
  assert.equal(allows(parseRobots("User-agent: *\nDisallow: /" + "x".repeat(600) + "\n"), "mad-discovery", "/" + "x".repeat(600)), true, "a rule over 512 characters is ignored");
  // Zero-padded: a rule is a prefix match, so /p1 would otherwise disallow /p1499.
  const many = parseRobots("User-agent: *\n" + Array.from({ length: 1500 }, (_, i) => `Disallow: /p${String(i).padStart(4, "0")}\n`).join(""));
  assert.equal(many.groups[0]!.rules.length, 1000);
  assert.equal(allows(many, "mad-discovery", "/p1499"), true, "beyond the thousandth rule, nothing is read");
  assert.equal(allows(many, "mad-discovery", "/p0999"), false);
});

test("rules beyond 16,384 characters in a group, or in the groups combined, are ignored in file order", () => {
  // Each rule is 500 characters: the 33rd brings the total to 16,500.
  const rule = (i: number) => `/p${String(i).padStart(2, "0")}` + "x".repeat(496);
  const lines = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => `Disallow: ${rule(from + k)}\n`).join("");
  const one = parseRobots("User-agent: *\n" + lines(0, 40));
  assert.equal(one.groups[0]!.rules.length, 32);
  assert.equal(allows(one, "mad-discovery", rule(31)), false);
  assert.equal(allows(one, "mad-discovery", rule(32)), true, "the rule that passes the cap is ignored");
  assert.equal(allows(one, "mad-discovery", rule(39)), true, "and every rule after it");
  const two = parseRobots("User-agent: *\n" + lines(0, 20) + "\nUser-agent: *\n" + lines(20, 40));
  assert.equal(allows(two, "mad-discovery", rule(31)), false);
  assert.equal(allows(two, "mad-discovery", rule(32)), true, "the combined group is capped too");
});

/** A seeded generator (mulberry32), so the differential check is the same on every run. */
function seeded(seed: number): () => number {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The RFC 9309 meaning of a rule, as a RegExp over the test's own generated pattern: * is any run, a final $ anchors, any other character is itself. */
function reference(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = "^" + body.split("*").map((part) => part.replace(/[$/]/g, "\\$&")).join("[^]*") + (anchored ? "$" : "");
  return new RegExp(source).test(path);
}

test("the matcher agrees with a RegExp reference over random rules and paths", () => {
  const random = seeded(9309);
  const pick = (alphabet: string, min: number, max: number) => { const n = min + Math.floor(random() * (max - min + 1)); let s = ""; for (let i = 0; i < n; i++) s += alphabet[Math.floor(random() * alphabet.length)]; return s; };
  const disagreements: string[] = [];
  for (let k = 0; k < 500; k++) {
    const pattern = "/" + pick("ab/*$", 0, 7);
    const path = "/" + pick("ab/*$", 0, 9);
    const matched = !allows(parseRobots(`User-agent: *\nDisallow: ${pattern}\n`), "mad-discovery", path);
    if (matched !== reference(pattern, path)) disagreements.push(`${pattern} ${path}`);
  }
  assert.deepEqual(disagreements, []);
});

test("the address judged is bounded by the address rule: the worst case at the cap is fast, and a refused address asks nothing", async () => {
  const s = new Session({ ...WALK, requestMs: 5000 }, { test: true });
  const o = await Origin.start();
  try {
    // A rule about half the path's length is the worst case for a backtracking glob.
    const rule = "/*" + "a".repeat(255) + "b";
    o.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: *\n" + `Disallow: ${rule}\n`.repeat(1000)); return true; } return false; };
    const robots = new Robots(s);
    assert.equal(await robots.allows(`${o.origin}/mad/source.json`), true, "the file is read once, before the timing");
    const atCap = `${o.origin}/` + "a".repeat(512 - o.origin.length - 1);
    assert.equal(atCap.length, 512);
    const t0 = performance.now();
    assert.equal(await robots.allows(atCap), true);
    const took = performance.now() - t0;
    assert.ok(took < 5, `took ${took} ms`);
    const asked = o.requests.length;
    assert.equal(await robots.allows(atCap + "a"), "refused-address", "over 512 characters");
    assert.equal(await robots.allows("not an address"), "refused-address");
    assert.equal(await robots.allows(`${o.origin}/mad/source.json?q=1`), "refused-address", "a query is refused by the address rule");
    assert.equal(await new Robots(new Session({ ...WALK, requestMs: 5000 })).allows(`${o.origin}/mad/source.json`), "refused-address", "plain http without the test option");
    assert.equal(o.requests.length, asked, "no request for a refused address");
  } finally { await o.close(); }
});

test("one fetch per host; 4xx allows everything; 5xx, a redirect, no answer and a wrong type disallow the host; a refused address keeps its outcome", async () => {
  const s = new Session({ ...WALK, requestMs: 1000 }, { test: true });
  origin.behave = (req, res) => { if (req.url === "/robots.txt") { res.setHeader("content-type", "text/plain"); res.end("User-agent: mad-discovery\nDisallow: /secret/\n"); return true; } return false; };
  try {
    const robots = new Robots(s);
    const before = origin.requests.filter((p) => p === "robots.txt").length;
    assert.equal(await robots.allows(`${origin.origin}/mad/source.json`), true);
    assert.equal(await robots.allows(`${origin.origin}/secret/source.json`), false);
    assert.equal(origin.requests.filter((p) => p === "robots.txt").length, before + 1, "one request for the host");

    for (const [answer, expected] of [[404, true], [410, true], [403, true], [500, "disallowed"], [302, "disallowed"]] as const) {
      const o = await Origin.start();
      try {
        o.behave = (_req, res) => { res.statusCode = answer; if (answer === 302) res.setHeader("location", `${o.origin}/elsewhere`); res.end(); return true; };
        assert.equal(await new Robots(s).allows(`${o.origin}/mad/source.json`), expected, String(answer));
        if (answer === 302) assert.deepEqual(o.requests, ["robots.txt"], "the redirect is not followed");
      } finally { await o.close(); }
    }
    const html = await Origin.start();
    try {
      html.behave = (_req, res) => { res.setHeader("content-type", "text/html"); res.end("<p>no</p>"); return true; };
      assert.equal(await new Robots(s).allows(`${html.origin}/mad/source.json`), "disallowed", "not text/plain");
    } finally { await html.close(); }
    const dead = await Origin.start(); const deadAddr = `${dead.origin}/mad/source.json`; await dead.close();
    assert.equal(await new Robots(s).allows(deadAddr), "disallowed", "no answer");
    const privateHost = new Session({ ...WALK, requestMs: 1000 }, { test: true, resolve: async () => ["10.0.0.1"] });
    assert.equal(await new Robots(privateHost).allows("https://a.test/mad/source.json"), "refused-address", "the connection check refused it; nothing was asked");
  } finally { origin.behave = null; }
});
