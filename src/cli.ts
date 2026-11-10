import { readFileSync } from "node:fs";
import { isSaid, checkSaid, saidOf, replaceAll, FILL } from "./said.ts";
import { parseConfig, ConfigError } from "./config.ts";
import { readInputs } from "./inputs.ts";
import { planBuild, writePlan, outDirProblem, BuildError } from "./build.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };

const USAGE = `usage:
  mad-discovery build <folder> --config <file> --out <folder>
  mad-discovery verify <file> <SAID>
Every command prints JSON on standard output. Exit 0: success. 1: failure. 2: usage.`;

/** JSON with every character outside printable ASCII as a \\u escape, so a stranger's string cannot reach a terminal raw. */
export function asciiJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  const value = i >= 0 ? args[i + 1] : undefined;
  return value === undefined || value.startsWith("--") ? undefined : value;
}

export function main(argv: string[], io: Io): number {
  const [command, ...rest] = argv;
  if (command === "build") return build(rest, io);
  if (command === "verify") return verify(rest, io);
  io.err(USAGE + "\n");
  return 2;
}

function build(args: string[], io: Io): number {
  const folder = args[0];
  const configPath = flag(args, "--config");
  const out = flag(args, "--out");
  if (folder === undefined || folder.startsWith("--") || configPath === undefined || out === undefined) { io.err(USAGE + "\n"); return 2; }
  const problems: string[] = [];
  let configText: string;
  try { configText = readFileSync(configPath, "utf8"); }
  catch { io.out(asciiJson({ problems: [`cannot read the configuration ${configPath}`] }) + "\n"); return 1; }
  try {
    const config = parseConfig(configText);
    const { inputs, refused } = readInputs(folder);
    for (const r of refused) problems.push(`${r.file}: ${r.reason}`);
    const outProblem = outDirProblem(out);
    if (outProblem !== null) problems.push(outProblem);
    if (problems.length > 0) { io.out(asciiJson({ problems }) + "\n"); return 1; }
    const plan = planBuild(inputs, config);
    writePlan(plan, out);
    io.out(asciiJson({
      written: plan.files.size,
      serves: plan.document.serves.map((s) => s.said),
      unserved: plan.unserved,
      robots: plan.robotsLine,
      sitemap: plan.sitemapLine,
    }) + "\n");
    return 0;
  } catch (e) {
    const more = e instanceof ConfigError || e instanceof BuildError ? e.problems : [(e as Error).message];
    io.out(asciiJson({ problems: [...problems, ...more] }) + "\n");
    return 1;
  }
}

function verify(args: string[], io: Io): number {
  const [target, said] = args;
  if (target === undefined || said === undefined || !isSaid(said)) { io.err(USAGE + "\nThe SAID is required and must match the pattern.\n"); return 2; }
  if (/^https?:\/\//.test(target)) { io.err("verify over an address arrives with the walk (step 2); give a file.\n"); return 2; }
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(readFileSync(target)); }
  catch { io.out(asciiJson({ verified: false, expected: said, reason: `cannot read ${target}` }) + "\n"); return 1; }
  if (checkSaid(bytes, said)) { io.out(asciiJson({ verified: true, said, bytes: bytes.length }) + "\n"); return 0; }
  const needle = Buffer.from(said, "ascii");
  const present = Buffer.from(bytes).includes(needle);
  const computed = present ? saidOf(replaceAll(bytes, needle, FILL)) : saidOf(bytes);
  const reason = !present ? "the SAID is not in the bytes"
    : computed !== said ? "the digest of the hashed form is not the SAID"
    : "the hashed form does not rebuild to the served bytes";
  io.out(asciiJson({ verified: false, expected: said, computed, reason }) + "\n");
  return 1;
}
