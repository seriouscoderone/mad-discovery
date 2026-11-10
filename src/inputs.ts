import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { isSaid, checkSaid } from "./said.ts";
import { compactJson } from "./compact.ts";
import { FILE_BYTES } from "./limits.ts";

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
    if (file.startsWith(".")) continue;
    const path = join(dir, file);
    let size: number;
    try {
      const st = statSync(path);
      if (st.isDirectory()) continue;
      size = st.size;
    } catch (e) { refused.push({ file, reason: `cannot be read: ${errorText(e)}` }); continue; }
    if (!file.endsWith(".json") || !isSaid(file.slice(0, -5))) { refused.push({ file, reason: "not named by a SAID" }); continue; }
    const said = file.slice(0, -5);
    if (size > FILE_BYTES) { refused.push({ file, reason: "larger than 1 MB" }); continue; }
    let raw: Uint8Array;
    try { raw = new Uint8Array(readFileSync(path)); }
    catch (e) { refused.push({ file, reason: `cannot be read: ${errorText(e)}` }); continue; }
    if (checkSaid(raw, said)) { inputs.set(said, raw); continue; }
    const compact = compactJson(raw);
    if (checkSaid(compact, said)) { inputs.set(said, compact); continue; }
    refused.push({ file, reason: "does not verify against its name, as given or with whitespace removed; supply the compact bytes the SAID was computed over" });
  }
  return { inputs, refused };
}

function errorText(e: unknown): string {
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : e instanceof Error ? e.message : String(e);
}
