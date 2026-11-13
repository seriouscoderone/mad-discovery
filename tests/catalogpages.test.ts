import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogPages } from "../src/catalogpages.ts";
import type { Row } from "../src/catalog.ts";

const X = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const Y = "EFQ6ngR2kib-dwmW8mizJ4k5IdO0YysG0xSty9ESHDE4";
const A = "https://a.example/mad/source.json";
const B = "https://b.example/source.json";
const hostile = { target: X, name: "</script><script>alert(1)</script>", description: "javascript:alert(1) \u202e reversed", tags: ["<b>"], collection: "\"><img src=x onerror=alert(1)>" };
const rows: Row[] = [
  { said: X, serves: [{ source: A }, { source: B }], publications: [{ source: B, by: "EKxyAID", publication: hostile }], referrers: [{ source: A, said: Y, paths: ["/rrs/0"], appearances: 1 }], counts: [{ source: A, publications: 0, referrers: 1 }, { source: B, publications: 3, referrers: 0 }], omittedSources: 1 },
  { said: Y, serves: [{ source: A }], publications: [], referrers: [], counts: [{ source: A, publications: 0, referrers: 0 }] },
];
const sources = new Map([[A, { pages: true, base: "https://a.example/mad/" }], [B, { pages: false, base: "https://b.example/" }]]);
const links = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!);
const tags = (html: string) => [...html.matchAll(/<([a-zA-Z0-9]+)[\s>]/g)].map((m) => m[1]!.toLowerCase());

const SEEDED = "Built from a hand-kept list of sources, not from a finder: a seeded catalog, not a search over strangers.";

test("the index lists rows in SAID order with names beside their source, linking each SAID to its page; a seeded build says so there", () => {
  const files = catalogPages(rows, sources,false);
  const index = files.get("pages/index.html")!;
  assert.ok(!index.includes("hand-kept"), "a build from candidate files says nothing about seeding");
  assert.ok(catalogPages(rows, sources,true).get("pages/index.html")!.includes(SEEDED), "a seeded build says so on the index");
  assert.ok(index.indexOf(X) < index.indexOf(Y));
  assert.deepEqual(links(index).filter((l) => l !== "style.css"), [`${X}/index.html`, `${Y}/index.html`]);
  assert.ok(index.includes("&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;"), "the hostile name is text");
  assert.ok(!/<(script|img)\b/i.test(index), "no script or img element");
  assert.ok(files.has("pages/style.css"));
});

test("a SAID's page links a serving source only when it has pages, shows publications and counts, and renders hostile text inert", () => {
  const page = catalogPages(rows, sources,true).get(`pages/${X}/index.html`)!;
  const hrefs = links(page);
  assert.ok(hrefs.includes(`https://a.example/mad/pages/${X}/index.html`), "A has pages: linked");
  assert.ok(!hrefs.some((h) => h.startsWith("https://b.example")), "B has no pages: shown as text only");
  assert.ok(page.includes("https://b.example/source.json"));
  assert.ok(hrefs.includes(`https://a.example/mad/pages/${Y}/index.html`), "the referrer links to A's page for Y");
  assert.ok(page.includes("/rrs/0"));
  assert.ok(page.includes("1 source left out"), "omittedSources shown");
  assert.ok(page.includes("3 publications"), "the count from B");
  assert.ok(page.includes("EKxyAID"), "the row's by reaches the page");
  assert.ok(!/<(script|img)\b/i.test(page), "no element came of the hostile strings");
  assert.ok(!hrefs.some((h) => /^javascript:/i.test(h)), "no link came of them");
  assert.ok(page.includes("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"), "the attribute-shaped string is escaped text");
  assert.ok(page.includes("&#x202e;"), "the bidi control is a numeric reference");
  for (const h of hrefs) assert.ok(/^(\.\.\/(style\.css|index\.html)|\.\.\/E[A-P][A-Za-z0-9_-]{42}\/index\.html|https:\/\/a\.example\/mad\/pages\/E[A-P][A-Za-z0-9_-]{42}\/index\.html)$/.test(h), h);
  for (const m of page.matchAll(/<a href="(https:[^"]*)"([^>]*)>/g)) assert.ok(m[2]!.includes('rel="noopener noreferrer"'), `an outbound link sends no Referer: ${m[1]}`);
  const allowed = new Set(["html", "head", "meta", "title", "link", "body", "header", "main", "footer", "h1", "h2", "p", "ul", "li", "a", "code", "section", "span"]);
  for (const t of tags(page)) assert.ok(allowed.has(t), `element ${t}`);
  assert.ok(page.includes(`content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'"`));
  assert.ok(!page.includes("hand-kept"), "the seeded note is on the index only; a row says what sources say");
  const y = catalogPages(rows, sources, false).get(`pages/${Y}/index.html`)!;
  assert.ok(y.includes("No publication.") && y.includes("No definition in this catalog contains it."), "the empty branches render");
  assert.ok(!y.includes("left out"), "no omittedSources, no note");
  const stranger = "https://c.example/source.json";
  const orphan = catalogPages([{ said: Y, serves: [{ source: stranger }], publications: [], referrers: [], counts: [{ source: stranger, publications: 0, referrers: 0 }] }], sources, false).get(`pages/${Y}/index.html`)!;
  assert.ok(!links(orphan).some((h) => h.startsWith("https://c.example")) && orphan.includes(stranger), "a source the pages map does not know is shown as text, never linked");
  assert.throws(() => catalogPages([{ ...rows[1]!, said: "../../etc/passwd" }], sources, false), /SAID/);
});
