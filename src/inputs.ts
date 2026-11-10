import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isSaid, checkSaid } from "./said.ts";
import { compactJson } from "./compact.ts";
import { LIMITS } from "./source.ts";

/** SAID to the compact, verified bytes of that definition. */
export type Inputs = Map<string, Uint8Array>;

/**
 * One file per definition, named <SAID>.json as a bpm-core store names them. The file name is the expected SAID;
 * the bytes are taken as they are when they verify, else with whitespace removed, else refused.
 */
export function readInputs(dir: string): { inputs: Inputs; refused: { file: string; reason: string }[] } {
  const inputs: Inputs = new Map();
  const refused: { file: string; reason: string }[] = [];
  for (const file of readdirSync(dir).sort()) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) continue;
    if (!file.endsWith(".json") || !isSaid(file.slice(0, -5))) { refused.push({ file, reason: "not named by a SAID" }); continue; }
    const said = file.slice(0, -5);
    if (statSync(path).size > LIMITS.file) { refused.push({ file, reason: "larger than 1 MB" }); continue; }
    const raw = new Uint8Array(readFileSync(path));
    if (checkSaid(raw, said)) { inputs.set(said, raw); continue; }
    const compact = compactJson(raw);
    if (checkSaid(compact, said)) { inputs.set(said, compact); continue; }
    refused.push({ file, reason: "does not verify against its name, as given or with whitespace removed; supply the compact bytes the SAID was computed over" });
  }
  return { inputs, refused };
}
