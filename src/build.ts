import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { checkSaid } from "./said.ts";
import { appearances } from "./scan.ts";
import type { ServesEntry, SourceDocument } from "./source.ts";
import { FILE_BYTES } from "./limits.ts";
import type { Inputs } from "./inputs.ts";
import type { Config } from "./config.ts";
import type { AddressOptions } from "./address.ts";
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
export function planBuild(inputs: Inputs, config: Config, opts: AddressOptions = {}): BuildPlan {
  const problems: string[] = [];

  // What a source serves: the named SAIDs, or the publication targets the folder holds; then what appears in them.
  const start = config.serve.length > 0 ? config.serve : config.publications.map((p) => p.target).filter((t) => inputs.has(t));
  for (const said of config.serve) if (!inputs.has(said)) problems.push(`serve names ${said}, which has no input file`);
  if (problems.length > 0) throw new BuildError(problems);

  const served = new Set<string>();
  const refersOf = new Map<string, string[]>();
  const unserved = new Map<string, Set<string>>();
  const queue = [...start];
  while (queue.length > 0) {
    const said = queue.shift()!;
    if (served.has(said)) continue;
    const bytes = inputs.get(said)!;
    served.add(said);
    const found = appearances(bytes, said);
    refersOf.set(said, found);
    for (const inner of found) {
      if (inputs.has(inner)) queue.push(inner);
      else { if (!unserved.has(inner)) unserved.set(inner, new Set()); unserved.get(inner)!.add(said); }
    }
  }
  const introducedFor = new Set(config.introductions.flatMap((i) => i.for));

  const saids = [...served].sort();
  const serves: ServesEntry[] = saids.map((said) => ({ said, refers: refersOf.get(said)! }));

  // Built once in a fixed member order, so two builds of one input are byte-identical.
  const document: SourceDocument = {
    source: config.source.address,
    ...(config.by !== undefined ? { by: config.by } : {}),
    ...(config.oobi !== undefined ? { oobi: config.oobi } : {}),
    pages: true,
    serves,
    publications: config.publications.map((p) => ({
      target: p.target,
      ...(p.by !== undefined ? { by: p.by } : {}),
      name: p.name,
      description: p.description,
      tags: p.tags,
      collection: p.collection,
    })),
    introductions: config.introductions,
    catalogs: config.catalogs,
  };

  const files = new Map<string, Uint8Array>();
  const sourceBytes = encoder.encode(JSON.stringify(document, null, 2) + "\n");
  if (sourceBytes.length > FILE_BYTES) problems.push(`source.json would be ${sourceBytes.length} bytes, over 1 MB; split the source`);
  files.set("source.json", sourceBytes);
  for (const said of saids) {
    const bytes = inputs.get(said)!;
    if (!checkSaid(bytes, said)) problems.push(`definitions/${said}.json does not verify`);
    files.set(`definitions/${said}.json`, bytes);
  }
  for (const [path, text] of renderPages({ document, base: config.source.base, definitions: new Map(saids.map((s) => [s, inputs.get(s)!] as [string, Uint8Array])), options: opts })) files.set(path, encoder.encode(text));
  files.set("sitemap.xml", encoder.encode(sitemapXml(config.source.base, saids)));
  if (problems.length > 0) throw new BuildError(problems);

  return {
    files,
    document,
    unserved: [...unserved.keys()].sort().map((said) => ({ said, appearsIn: [...unserved.get(said)!].sort() })).filter((u) => !introducedFor.has(u.said)),
    robotsLine: `Mad-Source: ${config.source.address}`,
    sitemapLine: `Sitemap: ${config.source.base}sitemap.xml`,
  };
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
