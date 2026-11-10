import { isSaid } from "./said.ts";
import { parseSourceAddress, parseCatalogAddress, parseHttpsAddress, type Address, type AddressOptions } from "./address.ts";
import { AID_PATTERN, isRecord, validatePublication, type Publication, type Introduction } from "./source.ts";

/** The operator's one authored input. Read strictly: an unknown member is a mistake, not an extension. */
export type Config = {
  source: Address;
  by?: string;
  oobi?: string;
  serve: string[];
  publications: Publication[];
  introductions: Introduction[];
  catalogs: string[];
};

export class ConfigError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`the configuration has ${problems.length} problem(s)`);
    this.problems = problems;
  }
}

const ALLOWED = new Set(["source", "by", "oobi", "serve", "publications", "introductions", "catalogs"]);

export function parseConfig(text: string, opts: AddressOptions = {}): Config {
  const problems: string[] = [];
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new ConfigError(["not JSON"]); }
  if (!isRecord(raw)) throw new ConfigError(["not an object"]);
  const r = raw;
  for (const k of Object.keys(r)) if (!ALLOWED.has(k)) problems.push(`unknown member: ${k}`);

  const source = typeof r["source"] === "string" ? parseSourceAddress(r["source"], opts) : null;
  if (source === null) problems.push("source is missing or is not a source address");

  let by: string | undefined;
  if (r["by"] !== undefined) {
    if (typeof r["by"] === "string" && AID_PATTERN.test(r["by"])) by = r["by"]; else problems.push("by is not an AID");
  }
  let oobi: string | undefined;
  if (r["oobi"] !== undefined) {
    const o = typeof r["oobi"] === "string" ? parseHttpsAddress(r["oobi"], opts) : null;
    if (o === null) problems.push("oobi is not an https address"); else oobi = o;
  }

  const list = (k: string): unknown[] => {
    const v = r[k];
    if (v === undefined) return [];
    if (!Array.isArray(v)) { problems.push(`${k} is not a list`); return []; }
    return v;
  };
  const serve: string[] = [];
  list("serve").forEach((v, i) => { if (typeof v === "string" && isSaid(v)) serve.push(v); else problems.push(`serve[${i}] is not a SAID`); });

  const publications: Publication[] = [];
  list("publications").forEach((v, i) => {
    const res = validatePublication(v);
    if (!res.ok) { problems.push(`publications[${i}]: ${res.problem}`); return; }
    publications.push(res.publication);
  });

  const introductions: Introduction[] = [];
  list("introductions").forEach((v, i) => {
    if (!isRecord(v)) { problems.push(`introductions[${i}] is not an object`); return; }
    const o = v;
    for (const k of Object.keys(o)) if (k !== "source" && k !== "for") problems.push(`introductions[${i}]: unknown member: ${k}`);
    const addr = typeof o["source"] === "string" ? parseSourceAddress(o["source"], opts) : null;
    if (addr === null) { problems.push(`introductions[${i}].source is not a source address`); return; }
    const fors: string[] = [];
    const f = o["for"] === undefined ? [] : o["for"];
    if (!Array.isArray(f)) { problems.push(`introductions[${i}].for is not a list`); return; }
    f.forEach((s, j) => { if (typeof s === "string" && isSaid(s)) fors.push(s); else problems.push(`introductions[${i}].for[${j}] is not a SAID`); });
    introductions.push({ source: addr.address, for: fors });
  });

  const catalogs: string[] = [];
  list("catalogs").forEach((v, i) => {
    const c = typeof v === "string" ? parseCatalogAddress(v, opts) : null;
    if (c === null) problems.push(`catalogs[${i}] is not a catalog address`); else catalogs.push(c.address);
  });

  if (problems.length > 0 || source === null) throw new ConfigError(problems);
  const config: Config = { source, serve, publications, introductions, catalogs };
  if (by !== undefined) config.by = by;
  if (oobi !== undefined) config.oobi = oobi;
  return config;
}
