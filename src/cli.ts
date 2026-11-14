import { readFileSync } from "node:fs";
import { isSaid, checkSaid, saidOf, replaceAll, FILL } from "./said.ts";
import { parseConfig, ConfigError } from "./config.ts";
import { readInputs } from "./inputs.ts";
import { planBuild, writeFiles, outDirProblem, BuildError } from "./build.ts";
import { parseHttpsAddress, parseSourceAddress, parseCatalogAddress } from "./address.ts";
import { Session } from "./session.ts";
import { WALK, CATALOG, ROW, CONTAINED, type Limits } from "./limits.ts";
import { walk } from "./walk.ts";
import { get } from "./get.ts";
import { redirectTarget } from "./read.ts";
import { readSourceDocument } from "./document.ts";
import type { Resolve } from "./fetch.ts";
import { asciiJson } from "./json.ts";
import { buildCatalog, readCandidateFile, toolCommit, type CandidateFile } from "./catalog.ts";
import { Robots } from "./robots.ts";
import { illFormedStrings } from "./scan.ts";

export type Io = { out: (s: string) => void; err: (s: string) => void };
/** test, resolve and limits exist for the tests; the bin passes none, so a local origin is never a source outside a test. */
export type RunOptions = { test?: boolean; resolve?: Resolve; limits?: Limits };

const FROM_NOTE = "--from must be a source address: https, a DNS name, a path ending in /source.json.";

const USAGE = `usage:
  mad-discovery build <folder> --config <file> --out <folder>
  mad-discovery verify <file or address> <SAID>
  mad-discovery verify <source address>
  mad-discovery who <SAID> --from <source address> [--catalog <catalog address>]
  mad-discovery get <SAID> --from <source address> --out <folder>
  mad-discovery catalog build --out <folder> [--candidates <file>]... [--from <source address>]...
Every command prints JSON on standard output. Exit 0: success. 1: failure. 2: usage.`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  const value = i >= 0 ? args[i + 1] : undefined;
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function flags(args: string[], name: string): string[] {
  const out: string[] = [];
  args.forEach((a, i) => { const v = args[i + 1]; if (a === name && v !== undefined && !v.startsWith("--")) out.push(v); });
  return out;
}

function usage(io: Io, note = ""): number {
  io.err(USAGE + "\n" + (note === "" ? "" : note + "\n"));
  return 2;
}

export async function main(argv: string[], io: Io, options: RunOptions = {}): Promise<number> {
  const [command, ...rest] = argv;
  // An exception no command expected is still a reported failure: the message is the tool's own or Node's, never a stranger's string.
  try {
    if (command === "build") return build(rest, io);
    if (command === "verify") return await verify(rest, io, options);
    if (command === "who") return await who(rest, io, options);
    if (command === "get") return await bringHome(rest, io, options);
    if (command === "catalog") return await catalog(rest, io, options);
    return usage(io);
  } catch (e) {
    io.out(asciiJson({ problems: [e instanceof Error ? e.message : String(e)] }) + "\n");
    return 1;
  }
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
    // Ruling 12's amendment: the definitions served, sorted by SAID, that hold a lone surrogate; written as given all the same.
    const warnings = plan.document.serves.map((s) => ({ said: s.said, illFormed: illFormedStrings(inputs.get(s.said)!).count })).filter((w) => w.illFormed > 0);
    io.out(asciiJson({
      written: plan.files.size,
      serves: plan.document.serves.map((s) => s.said),
      unserved: plan.unserved,
      robots: plan.robotsLine,
      sitemap: plan.sitemapLine,
      aiCatalog: plan.aiCatalog,
      ...(warnings.length > 0 ? { warnings } : {}),
    }) + "\n");
    return 0;
  } catch (e) {
    const more = e instanceof ConfigError || e instanceof BuildError ? e.problems : [(e as Error).message];
    io.out(asciiJson({ problems: [...problems, ...more] }) + "\n");
    return 1;
  }
}

/** Ruling 12's amendment: a definition holding a lone surrogate is reported, never refused; a well-formed or non-JSON one adds nothing. */
function illFormed(bytes: Uint8Array): { wellFormed?: false; illFormed?: number } {
  const r = illFormedStrings(bytes);
  return r.parsed && r.count > 0 ? { wellFormed: false, illFormed: r.count } : {};
}

const isAddress = (s: string): boolean => /^https?:\/\//i.test(s);

/**
 * Asks as a wallet does (BROWSER_HEADERS: Origin, Cache-Control: no-cache, Pragma: no-cache): a host may send Access-Control-Allow-Origin
 * only to a request with Origin, and may drop it for one that carries the cache headers. One request.
 * `browserWallets` is information for the operator, never a failure: a source need not be readable from a browser.
 */
async function fetchAsBrowser(address: string, options: RunOptions) {
  const f = await session(options).fetch(address, { asBrowser: true });
  if (f.outcome !== "ok") return f;
  const browserWallets = f.anyOrigin ? "can read this file: it was sent with Access-Control-Allow-Origin: *" : "cannot read this file: it was sent without Access-Control-Allow-Origin: *";
  return { ...f, browserWallets };
}

async function verify(args: string[], io: Io, options: RunOptions): Promise<number> {
  const [target, said] = args;
  if (target !== undefined && said === undefined && isAddress(target)) {
    const source = parseSourceAddress(target, { test: options.test });
    if (source !== null) return await verifySource(source.address, io, options);
  }
  if (target === undefined || said === undefined || !isSaid(said)) return usage(io, said === undefined && target !== undefined && isAddress(target) ? "One address alone must be a source address: https, a DNS name, a path ending in /source.json. A definition's address needs its SAID." : "The SAID is required and must match the pattern.");
  let bytes: Uint8Array;
  let where: { address?: string } = {};
  let browsers: { browserWallets?: string } = {};
  if (isAddress(target)) {
    const address = parseHttpsAddress(target, { test: options.test });
    if (address === null) { io.out(asciiJson({ verified: false, expected: said, address: target, reason: "refused-address" }) + "\n"); return 1; }
    const f = await fetchAsBrowser(address, options);
    if (f.outcome !== "ok") { io.out(asciiJson({ verified: false, expected: said, address, reason: f.outcome, ...redirectTarget(f) }) + "\n"); return 1; }
    bytes = f.bytes;
    where = { address };
    browsers = { browserWallets: f.browserWallets };
  } else {
    try { bytes = new Uint8Array(readFileSync(target)); }
    catch { io.out(asciiJson({ verified: false, expected: said, reason: `cannot read ${target}` }) + "\n"); return 1; }
  }
  const unicode = illFormed(bytes);
  if (checkSaid(bytes, said)) { io.out(asciiJson({ verified: true, said, ...where, bytes: bytes.length, ...browsers, ...unicode }) + "\n"); return 0; }
  const needle = Buffer.from(said, "ascii");
  const present = Buffer.from(bytes).includes(needle);
  const computed = present ? saidOf(replaceAll(bytes, needle, FILL)) : saidOf(bytes);
  const reason = !present ? "the SAID is not in the bytes"
    : computed !== said ? "the digest of the hashed form is not the SAID"
    : "the hashed form does not rebuild to the served bytes";
  io.out(asciiJson({ verified: false, expected: said, ...where, computed, reason, ...browsers, ...unicode }) + "\n");
  return 1;
}

/** The source document at a source address: readable as a source (dropped entries are counted, not a failure), and by browser wallets. */
async function verifySource(source: string, io: Io, options: RunOptions): Promise<number> {
  const f = await fetchAsBrowser(source, options);
  if (f.outcome !== "ok") { io.out(asciiJson({ source, document: f.outcome, ...redirectTarget(f) }) + "\n"); return 1; }
  const r = readSourceDocument(f.bytes, source, { test: options.test });
  if (!r.ok) { io.out(asciiJson({ source, document: "not a source document", browserWallets: f.browserWallets }) + "\n"); return 1; }
  const d = r.document;
  io.out(asciiJson({ source, document: "ok", serves: d.serves.length, publications: d.publications.length, introductions: d.introductions.length, dropped: r.dropped, browserWallets: f.browserWallets }) + "\n");
  return 0;
}

async function who(args: string[], io: Io, options: RunOptions): Promise<number> {
  const said = args[0];
  const from = flag(args, "--from");
  if (said === undefined || !isSaid(said) || from === undefined) return usage(io, "The SAID must match the pattern and --from is required.");
  const start = parseSourceAddress(from, { test: options.test });
  if (start === null) return usage(io, FROM_NOTE);
  const catalogFlag = flag(args, "--catalog");
  let catalogAddress: string | undefined;
  if (args.includes("--catalog")) {
    const parsed = catalogFlag === undefined ? null : parseCatalogAddress(catalogFlag, { test: options.test });
    if (parsed === null) return usage(io, "--catalog must be a catalog address: https, a DNS name, a path ending in /catalog.json.");
    catalogAddress = parsed.address;
  }
  const r = await walk(said, start.address, session(options), catalogAddress);
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
  if (start === null) return usage(io, FROM_NOTE);
  const outProblem = outDirProblem(out);
  if (outProblem !== null) { io.out(asciiJson({ problems: [outProblem] }) + "\n"); return 1; }
  const r = await get(said, start.address, session(options));
  if (!r.ok) { io.out(asciiJson({ said, from: start.address, problem: r.problem, unresolved: r.unresolved }) + "\n"); return 1; }
  writeFiles(r.files, out);
  io.out(asciiJson(r.result) + "\n");
  return 0;
}

async function catalog(args: string[], io: Io, options: RunOptions): Promise<number> {
  const [sub, ...rest] = args;
  if (sub === "find") return usage(io, "catalog find arrives with the finders (step 6).");
  if (sub !== "build") return usage(io);
  const out = flag(rest, "--out");
  const from = flags(rest, "--from");
  const candidatePaths = flags(rest, "--candidates");
  if (out === undefined || (from.length === 0 && candidatePaths.length === 0)) return usage(io, "catalog build needs --out and at least one --from or --candidates.");
  for (const f of from) if (parseSourceAddress(f, { test: options.test }) === null) return usage(io, FROM_NOTE);
  const outProblem = outDirProblem(out);
  if (outProblem !== null) { io.out(asciiJson({ problems: [outProblem] }) + "\n"); return 1; }
  const candidates: { file: CandidateFile; bytes: Uint8Array }[] = [];
  for (const path of candidatePaths) {
    let bytes: Uint8Array;
    try { bytes = new Uint8Array(readFileSync(path)); } catch { io.out(asciiJson({ problems: [`cannot read ${path}`] }) + "\n"); return 1; }
    const file = readCandidateFile(Buffer.from(bytes).toString("utf8"));
    if (file === null) { io.out(asciiJson({ problems: [`${path} is not a candidate file`] }) + "\n"); return 1; }
    candidates.push({ file, bytes });
  }
  const s = new Session(options.limits ?? CATALOG, { test: options.test, resolve: options.resolve });
  const r = await buildCatalog({ from, candidates, session: s, robots: new Robots(s), row: ROW, contained: CONTAINED, toolCommit: toolCommit(new URL("../", import.meta.url)) });
  if (!r.ok) { io.out(asciiJson({ problems: [r.problem] }) + "\n"); return 1; }
  writeFiles(r.files, out);
  io.out(asciiJson({ written: r.files.size, ...r.summary, from: from.length, candidates: candidates.length }) + "\n");
  return 0;
}
