import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { escapeHtml, renderPages } from "../src/pages.ts";
import { saidOf } from "../src/said.ts";
import type { SourceDocument } from "../src/source.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const gymPlan = () => {
  const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(new URL("pretty/", fixtures), d, { recursive: true });
  return planBuild(readInputs(d).inputs, parseConfig(readFileSync(new URL("gym-config.json", fixtures), "utf8")));
};
const text = (b: Uint8Array) => Buffer.from(b).toString("utf8");
const ALLOWED_TAGS = /^<\/?(!doctype|html|head|meta|title|link|body|header|main|nav|section|h1|h2|h3|p|a|ul|ol|li|dl|dt|dd|code|pre|span|footer)\b/i;

test("every served SAID has a page and the index names them", () => {
  const plan = gymPlan();
  const index = text(plan.files.get("pages/index.html")!);
  for (const s of plan.document.serves) {
    const page = text(plan.files.get(`pages/${s.said}/index.html`)!);
    assert.ok(page.includes(s.said));
    assert.ok(page.includes(`mad-discovery verify https://gym.example/mad/definitions/${s.said}.json ${s.said}`));
    assert.ok(index.includes(`href="${s.said}/index.html"`));
  }
  for (const p of plan.document.publications) assert.ok(index.includes(escapeHtml(p.name)));
});

test("what a page shows", () => {
  const plan = gymPlan();
  const [selection] = plan.document.publications;
  const page = text(plan.files.get(`pages/${selection!.target}/index.html`)!);
  assert.ok(page.includes(escapeHtml(selection!.description)));
  const entry = plan.document.serves.find((s) => s.said === selection!.target)!;
  for (const inner of entry.refers) assert.ok(page.includes(`href="../${inner}/index.html"`), `links ${inner}`);
  const contained = plan.document.serves.find((s) => s.refers.length > 0 && plan.document.serves.some((o) => o.refers.includes(s.said)))!;
  const containedPage = text(plan.files.get(`pages/${contained.said}/index.html`)!);
  const container = plan.document.serves.find((o) => o.refers.includes(contained.said))!;
  assert.ok(containedPage.includes(`href="../${container.said}/index.html"`), "contained-by links back");
  assert.ok(page.includes('http-equiv="Content-Security-Policy"'));
  assert.ok(page.includes('href="../style.css"'));
  assert.ok(!/ style=/.test(page));
});

test("every string on a page is a stranger's", () => {
  const hostile = ["</script><script>alert(1)</script>", '"><img src=x onerror=alert(1)>', "javascript:alert(1)", "‮right-to-left‬"];
  const content = JSON.stringify({ d: "#".repeat(44), note: hostile, [hostile[1]!]: hostile[2] });
  const said = saidOf(new TextEncoder().encode(content));
  const bytes = new TextEncoder().encode(content.replace("#".repeat(44), said));
  const document: SourceDocument = {
    source: "https://x.example/mad/source.json", pages: true,
    serves: [{ said, refers: [] }],
    publications: [{ target: said, name: hostile[0]!, description: hostile[1]!, tags: [hostile[2]!], collection: hostile[3]! }],
    introductions: [{ source: "https://y.example/mad/source.json", for: [said] }],
    catalogs: ["https://c.example/cat/catalog.json"],
  };
  const files = renderPages({ document, base: "https://x.example/mad/", definitions: new Map([[said, bytes]]) });
  for (const [path, page] of files) {
    if (!path.endsWith(".html")) continue;
    assert.ok(!page.includes("<script"), path);
    assert.ok(!page.includes(hostile[1]!), `${path} shows the markup string raw`);
    assert.ok(!page.includes("‮"), `${path} holds a raw bidirectional control`);
    assert.ok(!page.includes('href="javascript:'), `${path} makes a stranger's string a link`);
    for (const m of page.matchAll(/<[^>]*>/g)) assert.match(m[0], ALLOWED_TAGS, `${path}: ${m[0]}`);
    for (const m of page.matchAll(/href="([^"]*)"/g)) {
      const href = m[1]!;
      assert.ok(/^(\.\.\/)?(style\.css|[A-Za-z0-9_-]{44}\/index\.html|index\.html)$/.test(href) || href === "https://y.example/mad/source.json" || href === `https://c.example/cat/pages/${said}/index.html`, `${path}: ${href}`);
    }
  }
  const page = files.get(`pages/${said}/index.html`)!;
  assert.ok(page.includes("Introductions"), "a fixed label");
  assert.ok(page.includes(escapeHtml(hostile[0]!)));
});

test("a definition too deep for an outline is shown as text and still has a page", () => {
  const content = "[".repeat(100_000) + '"' + "#".repeat(44) + '"' + "]".repeat(100_000);
  const said = saidOf(new TextEncoder().encode(content));
  const bytes = new TextEncoder().encode(content.replace("#".repeat(44), said));
  const document: SourceDocument = { source: "https://x.example/mad/source.json", pages: true, serves: [{ said, refers: [] }], publications: [], introductions: [], catalogs: [] };
  const files = renderPages({ document, base: "https://x.example/mad/", definitions: new Map([[said, bytes]]) });
  const page = files.get(`pages/${said}/index.html`)!;
  assert.ok(page.includes("<pre>"), "shown as text");
  assert.ok(!page.includes("<ol>"), "not as an outline");
});
