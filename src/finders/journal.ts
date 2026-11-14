import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { asciiJson } from "../json.ts";
import { isRecord } from "../source.ts";
import { parseSourceAddress } from "../address.ts";
import { printableAscii, type FinderCandidate, type Journal, type RobotsCounts, type RobotsRecord } from "./candidates.ts";

const COUNTS: (keyof RobotsCounts)[] = ["records", "responses", "lines", "candidates", "notAddresses", "skipped"];

/**
 * A robots finder's progress, kept in the output folder (the one thing kept between runs): one <n>.json per finished archive file,
 * n its position in the listing, written whole (.part, then renamed). An entry is trusted only as far as it checks: anything else is
 * read again from the archive.
 */
export class FolderJournal implements Journal {
  readonly folder: string;
  private readonly test: boolean;
  reused = 0;

  constructor(folder: string, opts: { test?: boolean } = {}) {
    this.folder = folder;
    this.test = opts.test === true;
    mkdirSync(folder, { recursive: true });
  }

  read(n: number, file: string): RobotsRecord | null {
    let raw: unknown;
    try { raw = JSON.parse(readFileSync(join(this.folder, `${n}.json`), "utf8")); } catch { return null; }
    const record = entry(raw, file, this.test);
    if (record !== null) this.reused++;
    return record;
  }

  write(n: number, record: RobotsRecord): void {
    const path = join(this.folder, `${n}.json`);
    writeFileSync(`${path}.part`, asciiJson(record) + "\n");
    renameSync(`${path}.part`, path);
  }

  remove(): void {
    rmSync(this.folder, { recursive: true, force: true });
  }
}

/** A journal entry as this finder writes it, for this file; null for anything else. */
function entry(raw: unknown, file: string, test: boolean): RobotsRecord | null {
  if (!isRecord(raw) || raw["file"] !== file || !Array.isArray(raw["candidates"]) || !isRecord(raw["counts"])) return null;
  const given = raw["counts"];
  const counts = {} as RobotsCounts;
  for (const k of COUNTS) {
    const v = given[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return null;
    counts[k] = v;
  }
  if (counts.records < counts.responses || counts.responses < counts.lines || counts.lines !== counts.candidates + counts.notAddresses + counts.skipped) return null;
  const candidates: FinderCandidate[] = [];
  for (const c of raw["candidates"]) {
    if (!isRecord(c) || typeof c["address"] !== "string" || parseSourceAddress(c["address"], { test })?.address !== c["address"] || !isRecord(c["place"])) return null;
    const p = c["place"];
    if (p["file"] !== file || typeof p["offset"] !== "number" || !Number.isInteger(p["offset"]) || p["offset"] < 0 || typeof p["robots"] !== "string" || p["robots"].length > 512 || !printableAscii(p["robots"])) return null;
    candidates.push({ address: c["address"], place: { file, offset: p["offset"], robots: p["robots"] } });
  }
  if (candidates.length !== counts.candidates) return null;
  return { file, candidates, counts };
}
