import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import { LIMITS, type ServesEntry, type SourceDocument } from "./source.ts";
import type { Inputs } from "./inputs.ts";
import type { Config } from "./config.ts";
import { renderPages, sitemapXml } from "./pages.ts";

export type BuildPlan = {
  files: Map<string, Uint8Array>;
  document: SourceDocument;
  unserved: { said: string; appearsIn: string[] }[];
  robotsLine: string;
  sitemapLine: string;
};

export class BuildError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`the build has ${problems.length} problem(s)`);
    this.problems = problems;
  }
}

const encoder = new TextEncoder();

/** Everything in memory, every output checked. Nothing is written here. */
export function planBuild(inputs: Inputs, config: Config): BuildPlan {
  const problems: string[] = [];

  // What a source serves: the named SAIDs, or the publication targets the folder holds; then what appears in them.
  const start = config.serve.length > 0 ? config.serve : config.publications.map((p) => p.target).filter((t) => inputs.has(t));
  for (const said of config.serve) if (!inputs.has(said)) problems.push(`serve names ${said}, which has no input file`);
  if (problems.length > 0) throw new BuildError(problems);

  const served = new Set<string>();
  const unserved = new Map<string, Set<string>>();
  const queue = [...start];
  while (queue.length > 0) {
    const said = queue.shift()!;
    if (served.has(said)) continue;
    const bytes = inputs.get(said);
    if (bytes === undefined) continue;
    served.add(said);
    for (const inner of appearances(bytes, said)) {
      if (inputs.has(inner)) queue.push(inner);
      else { if (!unserved.has(inner)) unserved.set(inner, new Set()); unserved.get(inner)!.add(said); }
    }
  }
  const introducedFor = new Set(config.introductions.flatMap((i) => i.for));

  const saids = [...served].sort();
  const serves: ServesEntry[] = saids.map((said) => ({ said, refers: appearances(inputs.get(said)!, said) }));

  const document: SourceDocument = { source: config.source.address, serves, publications: config.publications, introductions: config.introductions, catalogs: config.catalogs, pages: true };
  if (config.by !== undefined) document.by = config.by;
  if (config.oobi !== undefined) document.oobi = config.oobi;
  const ordered = orderDocument(document);

  const files = new Map<string, Uint8Array>();
  const sourceBytes = encoder.encode(JSON.stringify(ordered, null, 2) + "\n");
  if (sourceBytes.length > LIMITS.file) problems.push(`source.json would be ${sourceBytes.length} bytes, over 1 MB; split the source`);
  files.set("source.json", sourceBytes);
  for (const said of saids) {
    const bytes = inputs.get(said)!;
    if (!checkSaid(bytes, said)) problems.push(`definitions/${said}.json does not verify`);
    files.set(`definitions/${said}.json`, bytes);
  }
  for (const [path, text] of renderPages({ document: ordered, base: config.source.base, definitions: new Map(saids.map((s) => [s, inputs.get(s)!] as [string, Uint8Array])) })) files.set(path, encoder.encode(text));
  files.set("sitemap.xml", encoder.encode(sitemapXml(config.source.base, saids)));
  if (problems.length > 0) throw new BuildError(problems);

  return {
    files,
    document: ordered,
    unserved: [...unserved.keys()].sort().map((said) => ({ said, appearsIn: [...unserved.get(said)!].sort() })).filter((u) => !introducedFor.has(u.said)),
    robotsLine: `Mad-Source: ${config.source.address}`,
    sitemapLine: `Sitemap: ${config.source.base}sitemap.xml`,
  };
}

/** A fixed member order, so two builds of one input are byte-identical. */
function orderDocument(d: SourceDocument): SourceDocument {
  const out: SourceDocument = { source: d.source } as SourceDocument;
  if (d.by !== undefined) out.by = d.by;
  if (d.oobi !== undefined) out.oobi = d.oobi;
  out.pages = d.pages ?? false;
  out.serves = d.serves;
  out.publications = d.publications.map((p) => {
    const q = { target: p.target } as typeof p;
    if (p.by !== undefined) q.by = p.by;
    q.name = p.name;
    q.description = p.description;
    q.tags = p.tags;
    q.collection = p.collection;
    return q;
  });
  out.introductions = d.introductions;
  out.catalogs = d.catalogs;
  return out;
}

/** --out must be absent or an empty folder: null when it is, otherwise the problem. */
export function outDirProblem(outDir: string): string | null {
  let isDirectory: boolean;
  try { isDirectory = statSync(outDir).isDirectory(); } catch { return null; }
  if (!isDirectory) return `${outDir} is not a folder`;
  return readdirSync(outDir).length > 0 ? `${outDir} is not empty` : null;
}

/** Writes every planned file, creating folders as needed, after checking the out-folder rule. */
export function writePlan(plan: BuildPlan, outDir: string): void {
  const problem = outDirProblem(outDir);
  if (problem !== null) throw new Error(problem);
  mkdirSync(outDir, { recursive: true });
  for (const [path, bytes] of plan.files) {
    const full = join(outDir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, bytes);
  }
}
