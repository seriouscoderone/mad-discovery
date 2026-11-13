/** The source document and its records, as docs/design.md defines them. */
import { isSaid } from "./said.ts";
import { PUBLICATION } from "./limits.ts";

export const AID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

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

// Refused in a stranger's string, like a control character (Rulings 12 and 13): the C0 and C1 controls, which must not reach a terminal
// or a page; the bidirectional controls, which reverse displayed text; and the format characters that do not show, which make two
// names look alike. The joiners U+200C and U+200D stay: emoji sequences and Persian need them.
const FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]|[\u{e0000}-\u{e007f}]/u;

function hasForbiddenCharacters(s: string): boolean {
  return FORBIDDEN.test(s);
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Records in the order of one string member, by code unit, as a bare sort orders strings. */
export const byKey = <K extends string>(key: K) => (a: Record<K, string>, b: Record<K, string>): number => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0);

/** The members a publication may carry. */
export const PUBLICATION_MEMBERS: ReadonlySet<string> = new Set(["target", "by", "name", "description", "tags", "collection"]);

/** A publication's shape, limits and patterns. */
export function validatePublication(value: unknown): { ok: true; publication: Publication } | { ok: false; problem: string } {
  if (!isRecord(value)) return { ok: false, problem: "not an object" };
  for (const k of Object.keys(value)) if (!PUBLICATION_MEMBERS.has(k)) return { ok: false, problem: `unknown member: ${k}` };
  const text = (k: string, max: number): string | { problem: string } => {
    const v = value[k];
    if (typeof v !== "string") return { problem: `${k} is not a string` };
    if (v.length > max) return { problem: `${k} is longer than ${max} characters` };
    if (hasForbiddenCharacters(v)) return { problem: `${k} holds a control or format character` };
    if (!v.isWellFormed()) return { problem: `${k} is not well-formed Unicode` };
    return v;
  };
  const target = value["target"]; if (typeof target !== "string" || !isSaid(target)) return { ok: false, problem: "target is not a SAID" };
  const name = text("name", PUBLICATION.name); if (typeof name !== "string") return { ok: false, problem: name.problem };
  const description = text("description", PUBLICATION.description); if (typeof description !== "string") return { ok: false, problem: description.problem };
  const collection = text("collection", PUBLICATION.collection); if (typeof collection !== "string") return { ok: false, problem: collection.problem };
  const tags = value["tags"];
  if (!Array.isArray(tags) || tags.length > PUBLICATION.tags) return { ok: false, problem: `tags is not a list of at most ${PUBLICATION.tags}` };
  for (const [i, t] of tags.entries()) if (typeof t !== "string" || t.length > PUBLICATION.tag || hasForbiddenCharacters(t) || !t.isWellFormed()) return { ok: false, problem: `tags[${i}] is not a string of at most ${PUBLICATION.tag} characters of well-formed Unicode without control or format characters` };
  const publication: Publication = { target, name, description, tags: tags as string[], collection };
  if (value["by"] !== undefined) {
    if (typeof value["by"] !== "string" || !AID_PATTERN.test(value["by"])) return { ok: false, problem: "by is not an AID" };
    publication.by = value["by"];
  }
  return { ok: true, publication };
}
