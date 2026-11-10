import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild, writePlan, BuildError } from "../src/build.ts";
import { checkSaid } from "../src/said.ts";
import { appearances } from "../src/scan.ts";
import type { SourceDocument } from "../src/source.ts";

const fixtures = new URL("../fixtures/", import.meta.url);
const gymDir = () => { const d = mkdtempSync(join(tmpdir(), "gym-")); cpSync(new URL("pretty/", fixtures), d, { recursive: true }); return d; };
const gymConfig = readFileSync(new URL("gym-config.json", fixtures), "utf8");
const QVI = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";

test("the gym build serves the selections and what they contain, and nothing else", () => {
  const dir = gymDir();
  const { inputs } = readInputs(dir);
  const config = parseConfig(gymConfig);
  const plan = planBuild(inputs, config);
  assert.equal(plan.document.serves.length, 26);
  assert.ok(!plan.document.serves.some((s) => s.said === QVI), "the GLEIF schema is in the folder and is not served");
  const saids = plan.document.serves.map((s) => s.said);
  assert.deepEqual(saids, [...saids].sort());
  for (const s of plan.document.serves) {
    const bytes = plan.files.get(`definitions/${s.said}.json`)!;
    assert.equal(checkSaid(bytes, s.said), true, s.said);
    assert.deepEqual(s.refers, appearances(bytes, s.said), s.said);
  }
  assert.equal(plan.document.pages, true);
  assert.equal(plan.document.by, undefined);
  assert.deepEqual(plan.document.publications.map((p) => p.name), config.publications.map((p) => p.name));
  assert.deepEqual(plan.unserved, [], "every appearance is served or introduced");
  assert.equal(plan.robotsLine, "Mad-Source: https://gym.example/mad/source.json");
  assert.equal(plan.sitemapLine, "Sitemap: https://gym.example/mad/sitemap.xml");
  for (const path of ["source.json", "pages/index.html", "pages/style.css", "sitemap.xml", `pages/${saids[0]}/index.html`]) assert.ok(plan.files.has(path), path);
});

test("two plans over the same input are byte-identical", () => {
  const a = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  const b = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  assert.deepEqual([...a.files.keys()].sort(), [...b.files.keys()].sort());
  for (const [k, v] of a.files) assert.deepEqual(Buffer.from(v), Buffer.from(b.files.get(k)!), k);
});

test("a serve SAID with no input file is refused by name", () => {
  const cfg = JSON.parse(gymConfig); cfg.serve.push("EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F");
  assert.throws(() => planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg))), (e: BuildError) => e.problems.join().includes("EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F"));
});

test("with serve empty, the publication targets the folder holds are served", () => {
  const cfg = JSON.parse(gymConfig); cfg.serve = []; cfg.publications = [cfg.publications[0]];
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg)));
  assert.ok(plan.document.serves.some((s) => s.said === cfg.publications[0].target));
  assert.ok(plan.document.serves.length < 26);
});

test("an unserved appearance is reported", () => {
  const dir = gymDir();
  const cfg = JSON.parse(gymConfig);
  const { inputs } = readInputs(dir);
  const first = cfg.serve[0] as string;
  const contained = appearances(inputs.get(first)!, first)[0]!;
  inputs.delete(contained);
  const plan = planBuild(inputs, parseConfig(JSON.stringify(cfg)));
  assert.ok(plan.unserved.some((u) => u.said === contained && u.appearsIn.includes(first)));
});

test("writePlan needs an absent or empty folder and writes every file", () => {
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(gymConfig));
  const out = join(mkdtempSync(join(tmpdir(), "out-")), "site");
  writePlan(plan, out);
  assert.ok(existsSync(join(out, "source.json")));
  const doc = JSON.parse(readFileSync(join(out, "source.json"), "utf8")) as SourceDocument;
  assert.equal(doc.source, "https://gym.example/mad/source.json");
  assert.equal(readdirSync(join(out, "definitions")).length, 26);
  writeFileSync(join(out, "stray.txt"), "x");
  assert.throws(() => writePlan(plan, out), /not empty/);
});

test("a publication's by is its second member", () => {
  const cfg = JSON.parse(gymConfig);
  cfg.publications[0].by = "EKxy";
  const plan = planBuild(readInputs(gymDir()).inputs, parseConfig(JSON.stringify(cfg)));
  assert.deepEqual(Object.keys(plan.document.publications[0]!), ["target", "by", "name", "description", "tags", "collection"]);
});

test("a source.json over 1 MB is refused", () => {
  const cfg = JSON.parse(gymConfig);
  const first = cfg.publications[0];
  cfg.publications = Array.from({ length: 600 }, () => ({ ...first, description: "x".repeat(2000) }));
  const { inputs } = readInputs(gymDir());
  assert.throws(
    () => planBuild(inputs, parseConfig(JSON.stringify(cfg))),
    (e: unknown) => e instanceof BuildError && e.problems.join("\n").includes("source.json"),
  );
});
