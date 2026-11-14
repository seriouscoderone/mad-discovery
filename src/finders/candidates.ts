import { asciiJson } from "../json.ts";

/** One place a finder saw a source address; the build fetches and checks the address like any introduction. */
export type FinderCandidate = { address: string; place: Record<string, string | number> };

/** What a finder writes and the build reads (docs/design.md "What a finder returns"). */
export type CandidateFile = { finder: string; snapshot: string; candidates: FinderCandidate[] };

export type FinderResult = CandidateFile & { summary: Record<string, number> };

/** What the robots finder found in one archive file, as its journal keeps it. */
export type RobotsCounts = { records: number; responses: number; lines: number; candidates: number; notAddresses: number; skipped: number };
export type RobotsRecord = { file: string; candidates: FinderCandidate[]; counts: RobotsCounts };

/** Where a finder keeps the files it has finished, so a failed or killed run resumes; n is the file's position in the listing. */
export type Journal = { read(n: number, file: string): RobotsRecord | null; write(n: number, record: RobotsRecord): void };

/** At least one character, every one printable ASCII, no space: what a crawler's URL is, and all a place's URL may be. */
export function printableAscii(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c < 0x21 || c > 0x7e) return false; }
  return true;
}

const compare = (p: string, q: string): number => (p < q ? -1 : p > q ? 1 : 0);

/** The candidate file's bytes: candidates sorted by address then place, ASCII, so two runs over one snapshot write the same file. */
export function candidateFileBytes(result: FinderResult): Uint8Array {
  const candidates = [...result.candidates].sort((a, b) => compare(a.address, b.address) || compare(JSON.stringify(a.place), JSON.stringify(b.place)));
  return new TextEncoder().encode(asciiJson({ finder: result.finder, snapshot: result.snapshot, candidates, summary: result.summary }) + "\n");
}
