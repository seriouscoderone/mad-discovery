import { readFileSync } from "node:fs";
import { isSaid, checkSaid, saidOf, replaceAll, FILL } from "./said.ts";
import { parseConfig, ConfigError } from "./config.ts";
import { readInputs } from "./inputs.ts";
import { planBuild, writeFiles, outDirProblem, BuildError } from "./build.ts";
import { parseHttpsAddress, parseSourceAddress } from "./address.ts";
import { Session } from "./session.ts";
import { WALK, type Limits } from "./limits.ts";
import { walk } from "./walk.ts";
import { get } from "./get.ts";
import { redirectTarget } from "./read.ts";
import type { Resolve } from "./fetch.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };
/** test, resolve and limits exist for the tests; the bin passes none, so a local origin is never a source outside a test. */
export type RunOptions = { test?: boolean; resolve?: Resolve; limits?: Limits };

const USAGE = `usage:
  mad-discovery build <folder> --config <file> --out <folder>
  mad-discovery verify <file or address> <SAID>
  mad-discovery who <SAID> --from <source address>
  mad-discovery get <SAID> --from <source address> --out <folder>
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

function usage(io: Io, note = ""): number {
  io.err(USAGE + "\n" + (note === "" ? "" : note + "\n"));
  return 2;
}

export async function main(argv: string[], io: Io, options: RunOptions = {}): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "build") return build(rest, io);
  if (command === "verify") return verify(rest, io, options);
  if (command === "who") return who(rest, io, options);
  if (command === "get") return bringHome(rest, io, options);
  return usage(io);
}

const session = (options: RunOptions): Session => new Session(options.limits ?? WALK, { test: options.test, resolve: options.resolve });

function build(args: string[], io: Io): number {
  const folder = args[0];
  const configPath = flag(args, "--config");
  const out = flag(args, "--out");
  if (folder === undefined || folder.startsWith("--") || configPath === undefined || out === undefined) return usage(io);
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
    writeFiles(plan.files, out);
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

async function verify(args: string[], io: Io, options: RunOptions): Promise<number> {
  const [target, said] = args;
  if (target === undefined || said === undefined || !isSaid(said)) return usage(io, "The SAID is required and must match the pattern.");
  let bytes: Uint8Array;
  let where: { address?: string } = {};
  if (/^https?:\/\//i.test(target)) {
    const address = parseHttpsAddress(target, { test: options.test });
    if (address === null) { io.out(asciiJson({ verified: false, expected: said, address: target, reason: "refused-address" }) + "\n"); return 1; }
    const f = await session(options).fetch(address);
    if (f.outcome !== "ok") { io.out(asciiJson({ verified: false, expected: said, address, reason: f.outcome, ...redirectTarget(f) }) + "\n"); return 1; }
    bytes = f.bytes;
    where = { address };
  } else {
    try { bytes = new Uint8Array(readFileSync(target)); }
    catch { io.out(asciiJson({ verified: false, expected: said, reason: `cannot read ${target}` }) + "\n"); return 1; }
  }
  if (checkSaid(bytes, said)) { io.out(asciiJson({ verified: true, said, ...where, bytes: bytes.length }) + "\n"); return 0; }
  const needle = Buffer.from(said, "ascii");
  const present = Buffer.from(bytes).includes(needle);
  const computed = present ? saidOf(replaceAll(bytes, needle, FILL)) : saidOf(bytes);
  const reason = !present ? "the SAID is not in the bytes"
    : computed !== said ? "the digest of the hashed form is not the SAID"
    : "the hashed form does not rebuild to the served bytes";
  io.out(asciiJson({ verified: false, expected: said, ...where, computed, reason }) + "\n");
  return 1;
}

async function who(args: string[], io: Io, options: RunOptions): Promise<number> {
  if (args.includes("--catalog")) return usage(io, "--catalog arrives with the catalog, the second epic.");
  const said = args[0];
  const from = flag(args, "--from");
  if (said === undefined || !isSaid(said) || from === undefined) return usage(io, "The SAID must match the pattern and --from is required.");
  const start = parseSourceAddress(from, { test: options.test });
  if (start === null) return usage(io, "--from must be a source address: https, a DNS name, a path ending in /source.json.");
  const r = await walk(said, start.address, session(options));
  if (!r.ok) {
    io.out(asciiJson({ said, from: start.address, problem: `the starting source could not be read: ${r.reason}`, ...(r.target !== undefined ? { target: r.target } : {}) }) + "\n");
    return 1;
  }
  io.out(asciiJson(r.report) + "\n");
  return 0;
}

async function bringHome(args: string[], io: Io, options: RunOptions): Promise<number> {
  const said = args[0];
  const from = flag(args, "--from");
  const out = flag(args, "--out");
  if (said === undefined || !isSaid(said) || from === undefined || out === undefined) return usage(io, "The SAID must match the pattern; --from and --out are required.");
  const start = parseSourceAddress(from, { test: options.test });
  if (start === null) return usage(io, "--from must be a source address: https, a DNS name, a path ending in /source.json.");
  const outProblem = outDirProblem(out);
  if (outProblem !== null) { io.out(asciiJson({ problems: [outProblem] }) + "\n"); return 1; }
  const r = await get(said, start.address, session(options));
  if (!r.ok) { io.out(asciiJson({ said, from: start.address, problem: r.problem, unresolved: r.unresolved }) + "\n"); return 1; }
  writeFiles(r.files, out);
  io.out(asciiJson(r.result) + "\n");
  return 0;
}
