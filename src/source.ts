/** The source document and its records, as docs/design.md defines them. */
export const AID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const LIMITS = {
  file: 1_000_000,       // a source document or a definition, in bytes
  name: 200,
  description: 2000,
  tags: 32,
  tag: 64,
  collection: 200,
} as const;

export type Publication = { target: string; by?: string; name: string; description: string; tags: string[]; collection: string };
export type Introduction = { source: string; for: string[] };
export type ServesEntry = { said: string; refers: string[] };
export type SourceDocument = {
  source: string;
  by?: string;
  oobi?: string;
  pages?: boolean;
  serves: ServesEntry[];
  publications: Publication[];
  introductions: Introduction[];
  catalogs: string[];
};

// C0 and C1 control characters, which must not reach a terminal or a page.
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export function hasControlCharacters(s: string): boolean {
  return CONTROL.test(s);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A publication's shape and limits. The caller checks that target and by match their patterns. */
export function validatePublication(value: unknown): { ok: true; publication: Publication } | { ok: false; problem: string } {
  if (!isRecord(value)) return { ok: false, problem: "not an object" };
  const allowed = new Set(["target", "by", "name", "description", "tags", "collection"]);
  for (const k of Object.keys(value)) if (!allowed.has(k)) return { ok: false, problem: `unknown member: ${k}` };
  const text = (k: string, max: number): string | { problem: string } => {
    const v = value[k];
    if (typeof v !== "string") return { problem: `${k} is not a string` };
    if (v.length > max) return { problem: `${k} is longer than ${max} characters` };
    if (hasControlCharacters(v)) return { problem: `${k} holds a control character` };
    return v;
  };
  const target = text("target", 44); if (typeof target !== "string") return { ok: false, problem: target.problem };
  const name = text("name", LIMITS.name); if (typeof name !== "string") return { ok: false, problem: name.problem };
  const description = text("description", LIMITS.description); if (typeof description !== "string") return { ok: false, problem: description.problem };
  const collection = text("collection", LIMITS.collection); if (typeof collection !== "string") return { ok: false, problem: collection.problem };
  const tags = value["tags"];
  if (!Array.isArray(tags) || tags.length > LIMITS.tags) return { ok: false, problem: `tags is not a list of at most ${LIMITS.tags}` };
  for (const t of tags) if (typeof t !== "string" || t.length > LIMITS.tag || hasControlCharacters(t)) return { ok: false, problem: "a tag is not a string of at most 64 characters without control characters" };
  const publication: Publication = { target, name, description, tags: tags as string[], collection };
  if (value["by"] !== undefined) {
    if (typeof value["by"] !== "string" || !AID_PATTERN.test(value["by"])) return { ok: false, problem: "by is not an AID" };
    publication.by = value["by"];
  }
  return { ok: true, publication };
}
