import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readInputs } from "../src/inputs.ts";
import { parseConfig } from "../src/config.ts";
import { planBuild } from "../src/build.ts";
import { checkSaid, saidOf, FILL } from "../src/said.ts";
import { appearances } from "../src/scan.ts";
import { Session } from "../src/session.ts";
import { WALK, type Limits } from "../src/limits.ts";
import { get } from "../src/get.ts";
import { Origin } from "./helpers/servers.ts";

const { inputs } = readInputs(fileURLToPath(new URL("../fixtures/compact/", import.meta.url)));
const SELECTION = "EDVEy5suX6WPROMl6vSc5Kc4I86mXxyFsa_xBla4A_dY";
const origins: Origin[] = [];
const start = async () => { const o = await Origin.start(); origins.push(o); return o; };
after(async () => { for (const o of origins) await o.close(); });
const session = (more: Partial<Limits> = {}) => new Session({ ...WALK, requestMs: 2000, runMs: 10_000, ...more }, { test: true });
/** The closure of a SAID over the fixture folder. */
const closure = (said: string): string[] => { const seen = new Set<string>(); const q = [said]; while (q.length) { const s = q.shift()!; if (seen.has(s) || !inputs.has(s)) continue; seen.add(s); q.push(...appearances(inputs.get(s)!, s)); } return [...seen].sort(); };
/** A sub-map of the fixtures. */
const only = (saids: string[]) => new Map(saids.map((s) => [s, inputs.get(s)!]));

test("a closure split across the start and an introduced source comes home whole, in build's input shape", async () => {
  const all = closure(SELECTION);
  const half = Math.floor(all.length / 2);
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  // b serves the second half of the closure as a source of its own; its closure may reach into the first half, and a is asked first.
  // a holds only the first half, so it serves what it can reach from the selection within that half; whatever it cannot, b does.
  b.source("mad/", { serve: all.slice(half) }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr, for: all.slice(half) }] }, only(all.slice(0, half).concat(SELECTION)));
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok, JSON.stringify(r));
  if (!r.ok) return;
  assert.deepEqual(r.result.written, all);
  assert.deepEqual(r.result.missing, []);
  assert.deepEqual(r.result.unresolved, []);
  for (const [file, bytes] of r.files) assert.ok(checkSaid(bytes, file.slice(0, -5)), file);
  const dir = mkdtempSync(join(tmpdir(), "home-"));
  for (const [file, bytes] of r.files) writeFileSync(join(dir, file), bytes);
  const { inputs: homed, refused } = readInputs(dir);
  assert.deepEqual(refused, []);
  const plan = planBuild(homed, parseConfig(JSON.stringify({ source: "https://home.example/source.json", serve: [SELECTION] })));
  assert.deepEqual(plan.document.serves.map((s) => s.said), all);
  // a was asked first for what it lists; b only for what a does not list
  const askedOfB = b.requests.filter((p) => p.startsWith("mad/definitions/")).map((p) => p.slice("mad/definitions/".length, -5));
  assert.ok(askedOfB.every((s) => !a.files.has(`mad/definitions/${s}.json`)), "nothing b was asked for was listed by a");
});

test("a SAID-shaped string nobody lists is missing, with where it was looked for, and is requested from nobody", async () => {
  const shape = (said: string, inner: string) => `{"d":"${said}","rely":"${inner}"}`;
  const ghost = "EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";   // SAID-shaped, nowhere
  const said = saidOf(new TextEncoder().encode(shape(Buffer.from(FILL).toString("ascii"), ghost)));
  const bytes = new TextEncoder().encode(shape(said, ghost));
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const aAddr = `${a.origin}/mad/source.json`;
  a.put("mad/source.json", JSON.stringify({ source: aAddr, serves: [{ said, refers: [ghost] }], introductions: [{ source: bAddr }] }));
  a.put(`mad/definitions/${said}.json`, bytes);
  const r = await get(said, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.result.written, [said]);
  assert.deepEqual(r.result.missing, [{ said: ghost, looked: [aAddr, bAddr] }]);
  for (const o of [a, b]) assert.ok(!o.requests.some((p) => p.includes(ghost)), "never requested");
});

test("wrong bytes add no file; the first listing source is the one asked", async () => {
  const all = closure(SELECTION);
  const victim = all.find((s) => s !== SELECTION)!;
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: [{ source: bAddr }] }, inputs);
  a.put(`mad/definitions/${victim}.json`, '{"d":"' + victim + '"}');
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(!r.files.has(`${victim}.json`));
  assert.deepEqual(r.result.unresolved, [{ address: aAddr, via: [], reason: "failed-check", said: victim }]);
  assert.ok(!b.requests.some((p) => p.includes(victim)), "a listed it, so b was not asked");
  assert.deepEqual(r.result.written, all.filter((s) => s !== victim));
});

test("the start unreadable, or the asked SAID unverified, is a failure with nothing to write", async () => {
  const dead = await Origin.start();
  const deadAddr = `${dead.origin}/mad/source.json`;
  await dead.close();
  const r1 = await get(SELECTION, deadAddr, session());
  assert.deepEqual(r1, { ok: false, problem: "the starting source could not be read: unreachable", unresolved: [{ address: deadAddr, via: [], reason: "unreachable" }] });
  const a = await start();
  const { address } = a.source("mad/", { serve: [SELECTION] }, inputs);
  a.put(`mad/definitions/${SELECTION}.json`, "{}");
  const r2 = await get(SELECTION, address, session());
  assert.ok(!r2.ok && r2.problem === "the definition asked for was not fetched and verified" && r2.unresolved[0]!.reason === "failed-check");
  const b = await start();
  const { address: bAddr } = b.source("mad/", { serve: [closure(SELECTION).find((s) => s !== SELECTION)!] }, inputs);
  const r3 = await get(SELECTION, bAddr, session());
  assert.ok(!r3.ok && r3.problem === "the definition asked for was not fetched and verified", "the start does not list it and introduces nobody");
});

test("the SAID asked for may come from an introduced source when the start does not list it", async () => {
  const [a, b] = [await start(), await start()];
  const bAddr = `${b.origin}/mad/source.json`;
  b.source("mad/", { serve: [SELECTION] }, inputs);
  const other = closure(SELECTION).find((s) => s !== SELECTION)!;
  const { address: aAddr } = a.source("mad/", { serve: [other], introductions: [{ source: bAddr, for: [SELECTION] }] }, inputs);
  const r = await get(SELECTION, aAddr, session());
  assert.ok(r.ok, "the design's get prose: the first source that lists it, among the start and its introductions");
  if (!r.ok) return;
  assert.deepEqual(r.result.written, closure(SELECTION));
  assert.ok(b.requests.includes(`mad/definitions/${SELECTION}.json`));
});

test("introductions and definitions limits are applied and recorded", async () => {
  const all = closure(SELECTION);
  const others = [await start(), await start(), await start()];
  const otherAddrs = others.map((o) => `${o.origin}/mad/source.json`);
  for (const o of others) o.source("mad/", { serve: [SELECTION] }, inputs);
  const a = await start();
  const { address: aAddr } = a.source("mad/", { serve: [SELECTION], introductions: otherAddrs.map((source) => ({ source })) }, inputs);
  const r = await get(SELECTION, aAddr, session({ introductionsPerSource: 2 }));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.result.unresolved, [{ address: aAddr, via: [], reason: "truncated", limit: "introductions" }]);
  const read = others.filter((o) => o.requests.includes("mad/source.json")).length;
  assert.equal(read, 2);

  const r2 = await get(SELECTION, aAddr, session({ introductionsPerSource: 3, definitionsPerSource: 4 }));
  assert.ok(r2.ok);
  if (!r2.ok) return;
  assert.ok(all.length > 4 && all.length <= 16, "the class-brick closure is 12 today: more than one source's four, within four sources' sixteen");
  assert.deepEqual(r2.result.written, all, "the start gives four, then each introduced source gives four: every SAID is still written");
  assert.ok(r2.result.unresolved.some((u) => u.address === aAddr && u.reason === "truncated" && u.limit === "definitions"), "the start reached its limit");
});
