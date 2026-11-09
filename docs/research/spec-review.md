# Review of the draft build spec

This is the record of a review run on 2026-11-08, before any design or code. It reviews `MAD-DISCOVERY-SPEC.md` as committed in `713a12f`; section and line numbers below refer to that file (`git show 713a12f:MAD-DISCOVERY-SPEC.md`). The spec has since been replaced by [the design](../design.md).

**Method.** Six reviewers each read the spec against one thing (a lens). A second, skeptical reviewer per lens then re-opened every cited source and tried to refute each finding. A finding's verdict is the skeptic's: *confirmed*, *partly* (true in a narrower form, with the corrected claim given), *refuted* or *unverifiable*. All reviewers were read-only. The text below is the reviewers' own, unedited apart from formatting.

**Reading it.** Severity is the first reviewer's: *blocker* (work cannot sensibly start), *decision* (the maintainer must choose) or *note*. Where a skeptic corrected a finding, trust the correction over the claim. Paths are absolute paths on the maintainer's machine. Bead ids are from the workspace's beads database. The maintainer's rulings that followed are in [the README](../../README.md#rulings).

| Lens | Findings | Confirmed | Partly | Refuted or unverifiable |
|---|---|---|---|---|
| [MAD's own model](#mad-model) | 17 | 9 | 8 | 0 |
| [bpm-core](#bpm-core) | 13 | 7 | 6 | 0 |
| [The beads backlog](#backlog) | 16 | 10 | 6 | 0 |
| [The external standards](#external) | 15 | 7 | 8 | 0 |
| [Technical soundness](#soundness) | 28 | 20 | 8 | 0 |
| [Fit to the objective](#objective-fit) | 19 | 3 | 16 | 0 |
| **Total** | **108** | **56** | **52** | **0** |

<a id="mad-model"></a>

## MAD's own model

*What a MAD definition is today, and what MAD's design documents already say about discovery, publishing and identity.*

**Reviewer's summary.** MAD contains no DCR graphs: in mad/src a definition is a Model, an Authorization or a Responsibility (RR), and a search of the source and tests for DCR, milestone and marking finds nothing. Spec section 2 therefore describes a format no MAD author produces, and its DCR JSON cannot carry any of the three kinds, so Phase 1 (mad-hash) cannot sensibly start as written. The "do not fold DCR" sentence is a HANDOFF passage (line 161), not a numbered ruling; it is scoped to the mad/ prototype, but the reasoning behind it rejects the event-history pattern the spec's own sample uses. MAD computes no hash or SAID for anything today: identifiers are prototype strings (`demo:kind:id:rN`), definitions live in localStorage and TypeScript seed modules, and there is no export. The spec's CIDv1/sha2-256/JCS scheme, its sort-everything normal form and its Weisfeiler-Lehman structural hash each pre-empt or compete with direction MAD already wrote down: SAID compatibility (Blake3-256 CESR in bead bpm-nq3.3), the unmade property-order ruling bpm-nq3.1, and the category SAID (bpm-nq3.7, with a working `category()` in model-tools.ts). The natural unit is each definition hashed separately with references by hash; models are the only link between blocks, so the reverse index that serves the maintainer's objective is "who else issues or relies on model X", which the spec's one-file-one-hash index cannot answer. MAD's discovery model is local-first over introductions with "no required central catalog", and a publication is an endorsement by a principal, not a domain serving bytes; the spec's hosted indexer with a hand-kept seed list and domain-keyed "publishers" conflicts with both and is itself an aggregation site. The deferred epic bpm-nq3 and icebox beads bpm-upm.21 to .23 already own most of this scope, behind four unmade rulings. I found no sign-in, account, wizard or KERI-ceremony wording in the spec; the vocabulary collision is "publish" used for what the workspace calls freeze plus publish. The spec's catalog entry does fit MAD's open "introduction" slot without conflict.

### mad-model-01: Spec section 2 defines a format MAD does not have: a MAD definition is a Model, Authorization or Responsibility, not a DCR graph

*blocker · conflict · spec section 2, 3, 8 (question 2) · skeptic's verdict: **partly***

**Claim.** In MAD's code a definition is one of three kinds: `ModelDefinition` (a JSON Schema plus an optional source restriction), `AuthorizationDefinition` (a fixed model, terms, optional root restriction) and `ResponsibilityDefinition` (holdings, reliances, triggers, outcomes, CEL rules, actions, identity parameters). A search of mad/src and mad/tests for `DCR`, `milestone` and `marking` returns no file. The spec's DCR JSON (events with id/label/role, five relation types, a marking) cannot carry any of the three: a Model is a JSON Schema, and nothing in an RR (required authorizations, evidence models with source acceptance, CEL expressions, disclosure, identity pins) maps to condition/response/include/exclude/milestone. Answer to section 8 question 2 from this lens: there is no earlier MAD DCR JSON. The only DCR in the workspace is bpm-core's projection, which is derived, never stored, and exported only as XES or DCR XML.

**Skeptic's correction.** mad/ has no DCR and a MAD definition is a Model, Authorization or RR. But 'exported only as XES or DCR XML' is wrong, and so is the answer given to section 8 question 2. bpm-core prints its DCR projection as JSON by default: `bpm dcr --format json` emits to_payload(graph, marking) (model.py:92-135), and four golden files are committed under /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/. Its shape is events {id, label, kind, doc, group, owners}, relations {type, source, target, rr, origin} over six types (the spec's five plus no-response) and a per-event marking; `bpm sim` run headers store the marking as three sorted id lists {included, executed, pending}, the same shape as the spec's. XES and DCR XML are only the backend's export formats. Separately, spec section 2 matches field for field the textual format in section 6 of /Users/seriouscoderone/Downloads/workflow-architecture.md (events id/label/role, relations type/from/to, the same five relation types, an approve/submit example). That is the reference /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md reviewed and declined as MAD's contract language. So two DCR formats exist, one derived and one declined; neither is a format anyone authors MAD definitions in.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:42
  > A MAD definition is a DCR graph in JSON:
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:25
  > export type Definition = ModelDefinition | AuthorizationDefinition | ResponsibilityDefinition;
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:24
  > export interface ResponsibilityDefinition extends BaseDefinition { kind: 'rr'; actions: BusinessAction[]; holds: Holding[]; relies: Reliance[]; triggers: Trigger[]; outcomes: Outcome[]; rules: BusinessRule[]; state: Declaration[]; views: Declaration[];
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:7
  > export interface ModelDefinition extends BaseDefinition { kind: 'model'; schema: Schema; source?: string[] }
- /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md:68 (file is untracked in the mad repo as of this review)
  > DCR's execution semantics track executed, included, and pending events; MAD checks locally received and accepted facts and standing.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:37
  > Derived, never stored: a role's authorization set; an aggregate's writer within a selection; the trust chain (holds → issuers → root or open seam); the DCR graph.
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/protocol.py:50
  > def export(self, handle: object, fmt: str) -&gt; bytes: ...  # "xes" | "dcr-xml"

**Implication.** Phase 1 (JSON Schema, normal form, structural hash, golden fixtures) would be built and frozen for a format nobody authors. Every later phase inherits it: the media type `application/vnd.mad.dcr+json`, the index and the end-to-end test.

**Reviewer's suggested resolution.** Before Phase 1, rewrite section 2 over MAD's three definition kinds, or state plainly that the project indexes DCR graphs and stop calling them MAD definitions.

**What the skeptic checked.** Spec line 42 and /Users/seriouscoderone/code/bpm/mad/src/domain.ts:7, 24, 25 are quoted exactly. A grep of mad/src, mad/tests, shell.html and the generated HTML for DCR, milestone and marking finds nothing, so MAD's three definition kinds and the absence of DCR in mad/ both hold. /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:37 and /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/protocol.py:50 exist as quoted. I then read /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py, /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/cli/main.py:364-401 and 979-1005, /Users/seriouscoderone/code/bpm/bpm-core/tests/test_dcr_goldens.py, /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/sim/run.py:198-208 and /Users/seriouscoderone/Downloads/workflow-architecture.md sections 4 and 6. The last sentence of the claim does not survive that reading.

### mad-model-02: The 'do not fold DCR' sentence is a HANDOFF passage scoped to the mad/ prototype, and its reasoning rejects the spec's own sample

*decision · conflict · spec section 2 · skeptic's verdict: **confirmed***

**Claim.** The workspace CLAUDE.md sentence (line 191) condenses HANDOFF.md line 161, which sits in 'How this workspace is structured, and why'. It is not one of the eight numbered Rulings; none of them mentions DCR. It rules two things: a change to bpm-core does not change MAD, and bpm-core's historical DCR/shared-run behaviour is not to be folded into the prototype merely because the repos share a workspace. The why is elsewhere: MAD decides from what each actor holds and accepts, never from a shared record of which events ran. Read literally the passage covers 'this prototype', so a separate repo is not barred by it. But the spec's sample (an `approve` event conditioned on `submit`, with an executed/included/pending marking) is the exact pattern HANDOFF calls insufficient.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:161
  > Do not assume changes to `bpm-core` automatically change MAD, or fold its historical DCR/shared-run behavior into this prototype merely because both are in the same workspace.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:92
  > A hidden global record saying that an Approve node ran earlier is insufficient.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:21
  > Adopting event-history semantics as MAD's contract language would change the present design; a familiar diagram does not require that change.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:19
  > **An event having happened is not sufficient evidence for a later act.**
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:180
  > An assembly graph may explain, inspect and suggest missing RRs; it must never become the engine's central workflow controller.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:187
  > No bpm-core integration yet; that is revisited later, and bpm-core may be rewritten to match MAD.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:48-50
  > "events":    [{ "id": "approve", "label": "Approve invoice", "role": "manager" }],

**Implication.** Publishing DCR graphs under the name 'MAD definition' would put on the public record a contract language MAD's design documents declined. The maintainer has to say whether the separate repo is exempt or the same reasoning applies.

**Reviewer's suggested resolution.** Decide together with mad-model-01. If DCR stays, it is a derived view of some RRs at most, and the spec should say so and name the thing differently.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:161, 92, 180, 187 and /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:19, 21 are exact. I read Rulings 1 to 8 (HANDOFF.md:186-193): none mentions DCR. /Users/seriouscoderone/code/bpm/CLAUDE.md:191 carries the condensed sentence; git history shows it entered CLAUDE.md in a49c87c and HANDOFF.md in the mad repo's initial commit, both on 2026-10-15, and no later ruling or bead touches it (`bd search DCR` returns only bpm-core beads bpm-9h5 and bpm-n11). Corroboration the reviewer did not cite: /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md:7-9 ('DCR here is an authoring feedback tool, not the runtime ... Nobody runs a business on this projection'), /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:72 (refused: a rule that reads the marking or the run log) and /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:340 (the DCR projection 'loses a gate' with two providers). One nuance: CLAUDE.md:191 says 'into MAD' without HANDOFF's qualifier 'into this prototype merely because both are in the same workspace', so a project that calls DCR graphs 'MAD definitions' meets the CLAUDE.md wording even from a separate repo.

### mad-model-03: What a MAD definition is today: types, storage, identifiers

*note · fact · spec section 2, 4 · skeptic's verdict: **confirmed***

**Claim.** Types are in /Users/seriouscoderone/code/bpm/mad/src/domain.ts: `BaseDefinition`, `ModelDefinition`, `AuthorizationDefinition`, `ResponsibilityDefinition` (lines 6-8, 24), with `Placement` and `Assembly` (26, 28) and `RehearsalScenario` (41, the UI's 'situation'). Constructors are in src/definitions.ts. Published examples are TypeScript modules (src/catalog.ts, src/data/gym.ts, src/data/jurisdictions.ts) bundled into the HTML. Drafts, assemblies, contacts and publication previews are one JSON blob in localStorage under `mad.authoring` (`StudyData`); situations are under `mad.rehearsals`. There is no export or import of a definition: no file input, Blob, download, clipboard or fetch in src. No hash, SAID or CID is computed for any definition, assembly or scenario. The only deterministic encoding is `canonicalJson` in crypto.ts, used for ECDSA signatures over facts, grants, messages and subscriptions. A definition's reference is `demo:<kind>:<id>:r<revision>`, and definitions point at each other by bare local id.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:6
  > export interface BaseDefinition { id: string; kind: 'model' | 'authorization' | 'rr'; name: string; summary: string; category: string; curator: string; endorsers: string[]; revision: number; tags: string[]; local?: boolean; derivedFrom?: string }
- /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:1041
  > export const CATALOG: Definition[] = [...VISITS, ...gymDefinitions, ...jurisdictionResponsibilityDefinitions];
- /Users/seriouscoderone/code/bpm/mad/src/views.ts:49
  > export interface StudyData { counter: number; selected: string; drafts: Definition[]; bookmarks: string[]; publications: Publication[]; contacts: Record&lt;string, Contact&gt;; localIdentity: string; selections: Assembly[] }
- /Users/seriouscoderone/code/bpm/mad/README.md:116
  > Storage keys are `mad.authoring` (drafts, assemblies, contacts, publication previews), `mad.rehearsals` (scenario setups and review notes) and `mad.appearance` (theme).
- /Users/seriouscoderone/code/bpm/mad/src/ui.ts:86
  > function reference(e:Definition|Assembly):string{return `demo:${'kind' in e?e.kind:'assembly'}:${e.id}:r${e.revision}`;}
- /Users/seriouscoderone/code/bpm/mad/src/services/crypto.ts:15
  > /** Deterministic JSON encoding for this protocol; not a KERI/SAID implementation. */
- /Users/seriouscoderone/code/bpm/mad/README.md:120
  > Publication is a local preview that signs and sends nothing, definition identifiers are prototype IDs, and no KERI runtime or real SAID protocol is used.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:177
  > Prototype IDs are not SAIDs, and the prototype has no KERI runtime dependency; do not describe either as present.
- /Users/seriouscoderone/code/bpm/mad/docs/creatability-audit.md:5
  > There is no whole-definition or whole-scenario JSON editor that silently fills those gaps.

**Implication.** Nothing MAD produces today can be dropped into the spec's `definitions/*.json`. Getting definitions out of MAD is new work, and the file format for it is the unmade ruling bpm-vfn.1 (see mad-model-13).

**What the skeptic checked.** All nine quotes are at the cited lines. Storage keys confirmed at /Users/seriouscoderone/code/bpm/mad/src/ui.ts:47, 77, 190 and /Users/seriouscoderone/code/bpm/mad/src/studio-ui.ts:32; the store is JSON via /Users/seriouscoderone/code/bpm/mad/src/data/repository.ts. A grep of mad/src and shell.html for Blob, createObjectURL, download, clipboard, fetch(, FileReader and file inputs finds nothing. No digest call exists anywhere in mad/src: /Users/seriouscoderone/code/bpm/mad/src/services/crypto.ts only signs and verifies (ECDSA P-256 with SHA-256) over the four kinds fact, grant, message, subscription (crypto.ts:2; sign calls in /Users/seriouscoderone/code/bpm/mad/src/services/rehearsal.ts). blake3 and saidify do not occur in mad/. One thing the finding names only in passing: StudyData.publications holds `Publication` previews (/Users/seriouscoderone/code/bpm/mad/src/views.ts:45), which is MAD's existing shape for what gets published; see missed item 2.

### mad-model-04: CIDv1 / sha2-256 conflicts with MAD's stated SAID compatibility

*decision · conflict · spec section 3 · skeptic's verdict: **partly***

**Claim.** The spec fixes identity as CIDv1 (raw codec, sha2-256, base32) over JCS. MAD's vision says definition identities are intended to be SAIDs compatible with the KERI ecosystem, and the deferred bead that implements them specifies a Blake3-256 CESR digest that matches bpm-core's `saidify` byte for byte, with gym-bp's frozen SAIDs as fixtures. A CID and a SAID over the same content are different strings computed over different bytes.

**Skeptic's correction.** The conflict holds and is stronger than stated. bpm-nq3.3 specifies a Blake3-256 CESR digest matching bpm-core's saidify without condition; said.py implements it (the `d` field blanked to 44 '#' characters, then hashed); and bpm-core/AGENTS.md:59 locks it: 'SAID is Blake3-256 CESR matching KERI Saider ... Do not invent another digest.' The maintainer's Category-SAIDs.md values were computed with keripy. A CIDv1 over JCS bytes differs in hash function, in the bytes hashed and in encoding. The overstated part is 'with gym-bp's frozen SAIDs as fixtures': the bead makes that conditional ('if bpm-5sj.3 keeps them and bpm-nq3.1 chose bpm-core's profile'), and bpm-5sj.3 closed with the question open ('whether its JSON definitions and frozen SAIDs become fixtures is decided in the bpm-core evaluation').

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:67
  > **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13
  > Precise definitions receive content-derived identities, intended to use SAIDs compatible with the KERI ecosystem.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:259
  > This design remains KERI-agnostic apart from the intended SAID compatibility.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:298
  > The portable contract should be expressible and executable with no KERI runtime. SAIDs remain compatible with the KERI ecosystem.
- bead bpm-nq3.3 (bd show bpm-nq3.3, from /Users/seriouscoderone/code/bpm)
  > with a Blake3-256 CESR digest (E prefix) that matches bpm-core's saidify byte-for-byte; gym-bp's frozen SAIDs serve as digest-compatibility fixtures

**Implication.** The index would key on identifiers that neither gym-bp's pinned SAIDs nor MAD's later SAIDs can be looked up by. Either the workspace carries two identity systems for the same definitions, or every published hash is replaced later.

**Reviewer's suggested resolution.** Choose one: the SAID is the identifier (a CID may be carried as a secondary alias in the catalog entry), or rule that discovery uses CIDs and amend HANDOFF and bpm-nq3.3.

**What the skeptic checked.** Spec line 67, /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13, /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:259 and /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:298 are exact. `bd show bpm-nq3.3` contains the quoted words, but the quote stops before a condition. I also read `bd show bpm-5sj.3`, /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py and /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59.

### mad-model-05: The spec's normal form pre-empts the unmade property-order ruling and would break an RR's positional references

*decision · conflict · spec section 3 · skeptic's verdict: **confirmed***

**Claim.** The spec sorts arrays and serializes with JCS, which sorts object keys, so authored order never contributes to identity. Whether authored order is identity-bearing is the deferred ruling bpm-nq3.1; one of its two options (bpm-core's profile) hashes a schema body byte for byte, making order identity-bearing. Separately, in an RR an action names its rules and outcomes by array index, so sorting those arrays the way the spec sorts events and relations would silently re-point the references.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:63-65
  > Sort `events` by `id`, sort `relations` by `(type, from, to)`, and sort marking arrays.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:84
  > The eventual SAID serialization profile must explicitly settle whether that presentation order contributes to identity.
- bead bpm-nq3.1 (bd show bpm-nq3.1)
  > a schema body is hashed byte-for-byte, so authored JSON Schema property order IS identity-bearing
- bead bpm-nq3.1 (bd show bpm-nq3.1)
  > the profile cannot be frozen before this call, and SAIDs computed first would all change if the ruling went the other way
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:13
  > export interface BusinessAction { id: string; name: string; model: string; token: string; actorInitiated: boolean; relies: string[]; rules: number[]; outcomes: number[]; note?: string }
- /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:538-543
  > "rules": [
  >           0
  >         ],
  >         "outcomes": [
  >           0
  >         ],

**Implication.** Golden-file fixtures written in Phase 1 lock in an answer to bpm-nq3.1 that the maintainer has not given. A normal form that sorts RR arrays changes meaning unless the index references are rewritten too.

**Reviewer's suggested resolution.** Close bpm-nq3.1 first (or record its answer in the spec), and write the normal form per definition kind rather than one generic sort.

**What the skeptic checked.** Spec line 63, /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:84, /Users/seriouscoderone/code/bpm/mad/src/domain.ts:13 and /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:538-543 are exact; both bpm-nq3.1 quotes are in `bd show bpm-nq3.1`, which is still deferred and unruled. Index references also appear at domain.ts:58 (Decision.outcomeIndexes) and /Users/seriouscoderone/code/bpm/mad/src/views.ts:135. Counter-example check: the spec's own format refers to events by id, so its sort is safe for itself; the re-pointing happens only if the same sort is applied to an RR, which is how the finding words it. Uncited corroboration: /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:216-221 (set-valued lists are sorted, every other array 'is a sequence the author wrote ... and is never reordered', a schema body is hashed byte-for-byte); /Users/seriouscoderone/Downloads/Category-SAIDs.md:57 ('the same properties in a different order, is a different category. Structure and key order stay the modeler's choice'); mad-ux-design.md:96 ('Categories preserve the surrounding content, including ordering under the chosen serialization profile'). The maintainer's own write-ups lean toward order counting, the opposite of JCS.

### mad-model-06: One file, one hash ignores references: MAD definitions point at each other by local id

*decision · defect · spec section 2, 3, 4 · skeptic's verdict: **confirmed***

**Claim.** An RR names its models and authorizations by bare local id (`"model": "admission"`), and a model nests another by `$ref: "model:<id>"`. MAD's identity rule is that a definition's identity covers its committed references. The spec hashes each `definitions/*.json` alone and has no notion of a reference (nested sub-graphs are out of scope). Applied to MAD, a hash of an RR would cover the word `admission`, not the Admission model's content.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:481-486
  > "relies": [
  >       {
  >         "model": "admission",
  >         "as": "admission",
  >         "slot": "venue-operator"
  >       }
- /Users/seriouscoderone/code/bpm/mad/src/services/schema.ts:31-32
  > /** The one $ref spelling for a model: revision-free, because a draft's revision moves on every edit. */
  > export const modelRef = (d: { id: string }): string =&gt; 'model:' + d.id;
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15
  > Structural categories help discovery; exact identity still refers to the complete definition and its committed references.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:54
  > The listings have different identities because their committed references differ.
- bead bpm-nq3.3 (bd show bpm-nq3.3)
  > replace prototype string ids with SAIDs and keep names as attributed aliases
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:55
  > Nested sub-graphs are out of scope for v0.

**Implication.** Two publishers whose RRs read the same but whose `admission` models differ would share a `full` hash, and two who use the same model under different local names would never match. The index would report agreement that does not exist and miss agreement that does.

**Reviewer's suggested resolution.** Hash leaf definitions first and replace each local id with the referenced definition's hash before hashing the referrer, which is what bpm-nq3.3 already plans.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:481-486 (and line 450, '$ref': 'model:address-b'), /Users/seriouscoderone/code/bpm/mad/src/services/schema.ts:31-32, /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15, /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:54 and spec line 55 are exact; `bd show bpm-nq3.3` has the quoted line. Reasoning check: the spec's format has no references, so the false match and the missed match arise only when its one-file-one-hash rule is applied to MAD's kinds, which is what the finding says. bpm-core's freeze already does the proposed substitution (/Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:11, 'when you freeze, every pointer becomes a digest'). One limit of the suggested resolution: leaf-first hashing has no answer for a recursive model reference, and MAD already displays those (/Users/seriouscoderone/code/bpm/mad/src/views.ts:115, 'Recursive reference to ...').

### mad-model-07: The unit to hash is each definition separately; models are the link, and the index needs reference edges

*decision · decision · spec section 2, 5 · skeptic's verdict: **partly***

**Claim.** MAD's settled position: the units are the definitions (models, authorizations and above all responsibilities); the RR is the block a runtime instantiates; an assembly can be published but is never instantiated; blocks link only through shared models. Whether an assembly gets an identity others can pin is the unmade ruling bpm-nq3.6, and scenario data never leaves with a definition. So the hashable units are Model, Authorization and RR, each on its own. For the maintainer's objective, the question that replaces a protocol reference site is 'who else issues or relies on statements of model X', which needs model hashes plus RR-to-model edges. The spec's index maps one hash to its publishers and stores no edges.

**Skeptic's correction.** The runtime unit is the RR, blocks link only by shared models, and the index needs model-to-RR edges: all confirmed. But MAD does not treat the assembly as something to leave out of publishing. Its design and code make the assembly a fourth target that is published, endorsed and found: mad-ux-design.md:247 ('Publishing begins with a review of the exact model, authorization, responsibility or assembly and its dependencies'), :68 ('An assembly endorsement targets the assembly'), :251 (assemblies as 'published immutable snapshots'); views.ts:45 (Publication.kind is a definition kind or 'assembly', with components and bindings); ui.ts:86 (assemblies get a reference); /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:35 ('Definitions and compositions that others can discover and pin'); HANDOFF.md:58 (a pinned assembly is 'found among open ones'); and the maintainer's words in bpm-nq3.7 ('people find RRs and assemblies'). What bpm-nq3.6 leaves unruled is only whether an assembly's identity is a frozen SAID others can pin. An index that omits assemblies drops the one target that reads like a whole protocol.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:17
  > The language is a protocol language. Its units are the definitions (models, authorizations and above all responsibilities); a runtime instantiates responsibilities, each for the principal that operates it.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > it can be published, but no runtime instantiates an assembly. **Blocks link only through shared models.**
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > any RR that issues statements of that model can satisfy it, the way any Lego brick with the same nubs fits.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:192
  > blocks link only through shared models, never by referring to one another; who issues can be open, closed or hybrid; and the RR, not the assembly, is what a runtime instantiates
- bead bpm-nq3.6 (bd show bpm-nq3.6)
  > Options: definitions only; assemblies freeze as pinnable packages; a selection inside an assembly freezes while placements stay local.
- bead bpm-nq3.5 (bd show bpm-nq3.5)
  > scenario records, run fixtures and drafts never leave with a definition
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120
  > PK `hash#<cid>`, SK `pub#<urn>`;

**Implication.** A whole-process graph is closest to an assembly, the one thing MAD says is not the unit. An index without model-to-RR edges can say who serves the same bytes but not who can interoperate, which is the answer the objective needs.

**Reviewer's suggested resolution.** Publish and index the three kinds separately, record for each RR the model hashes it holds, relies on, responds to and establishes, and add a lookup by model hash. Leave assemblies out until bpm-nq3.6 is ruled.

**What the skeptic checked.** All four HANDOFF quotes (/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:17, 58, 192), both bead quotes (bpm-nq3.5, bpm-nq3.6) and spec line 120 are exact. The index table at spec lines 119-121 has attributes kind, defUrl, domain, verified, firstSeen and lastSeen, so 'stores no edges' holds. I then read /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:60-70 and 245-252, /Users/seriouscoderone/code/bpm/mad/src/views.ts:45, /Users/seriouscoderone/code/bpm/mad/src/ui.ts:86 and 288, and `bd show bpm-nq3.7` to test 'leave assemblies out'.

### mad-model-08: Which fields are identity-bearing is not ruled, and the spec's `x-` convention and 'ignore IDs, labels and roles' do not fit MAD

*decision · gap · spec section 3 · skeptic's verdict: **confirmed***

**Claim.** MAD's documents give the principle (names and catalog annotations outside identity; fields, constraints and references inside) but no field list. Reading domain.ts against them: clearly outside identity are `id` (replaced by the hash), `name`, `summary`, `category`, `curator`, `endorsers`, `tags`, `revision`, `local`, `derivedFrom`, and `Assembly.headings`. Clearly inside are `kind`; a model's `schema` and `source`; an authorization's `model`, `terms` and `under`; and an RR's `holds`, `relies`, `triggers`, `outcomes`, `actions`, rule `kind`/`expression`/`applies`, `actorSlot`, `subjectSlot`, and every identity pin (a pinned definition is a different definition). Undecided are the prose fields: rule `title` and `body` (for a `terms` rule the body is the rule), `note` on actions and triggers, `Outcome.lifecycle`, `serviceTerms`, and `description`/`title` annotations inside a schema. MAD's presentational fields carry no `x-` prefix, so the spec's rule would hash all of them or, as 'unknown keys', drop them silently. The spec's structural hash ignores ids, labels and roles; in MAD the operative names (tokens, parameter names, the `as` alias read by CEL) are executable, not labels.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:58
  > Local display names and catalog annotations can remain outside the committed definition, while its fields, constraints, and references stay inside.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:88
  > Presentation metadata, such as a curator's description, remains separate from semantic content.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:188
  > outside any definition's SAID (the bpm-upm.11 shape); it does not return as a field on a definition.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > a pinned model is a different model, so only statements from that issuer fit it
- /Users/seriouscoderone/code/bpm/mad/src/views.ts:176
  > The same operative name, in the same declared context, has a defined meaning. Display names are free to be friendly.
- /Users/seriouscoderone/code/bpm/mad/src/services/interactions.ts:24
  > output.token === trigger.token && output.model === trigger.model &&
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:28
  > Presentation only: no service reads it, and editing it changes no revision.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:339
  > | Freeze behavior includes authored labels and leaves some schema representation untouched. | Define an identity profile deliberately suited to independently authored, reusable definitions. |
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:64
  > Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:69
  > `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.

**Implication.** Without a ruled field list two honest implementers produce different hashes for the same RR. Dropping unknown keys before hashing also means two definitions that differ only in a key the schema does not know get the same hash; validation should reject instead.

**Reviewer's suggested resolution.** Have the maintainer rule the prose fields, write the list into the spec per kind, and make unknown keys a validation error rather than something dropped.

**What the skeptic checked.** All ten quotes are at the cited lines. /Users/seriouscoderone/code/bpm/mad/src/definitions.ts:29 confirms that a rule with no expression gets kind 'terms', so its body is its whole content. The CEL expression at /Users/seriouscoderone/code/bpm/mad/src/catalog.ts:517 reads `evidence.admission.venue`, so the `as` alias is executable. No ruling or bead lists identity-bearing fields: bpm-nq3.1 gives only the rename rule, and the finding presents its classification as a reading, not a ruling. Uncited precedent for the suggested resolution: /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:211-212, 'A key the template does not declare never reaches freeze: both parsers refuse it as UNKNOWN_FIELD first, Ruling 132', which is the opposite of the spec's 'Drop unknown ... keys'.

### mad-model-09: The Weisfeiler-Lehman structural hash competes with MAD's category SAID, which already has code and two beads

*decision · overlap · spec section 3, 5 · skeptic's verdict: **partly***

**Claim.** MAD already defines structural matching: a category is the same document with its references to other definitions blanked, under a versioned comparison profile. A working version for models exists in model-tools.ts, and beads bpm-nq3.7 and bpm-upm.23 own the design. The spec's structural hash is a different notion (graph isomorphism up to renaming of ids, labels and roles). The category answers 'same surrounding structure, different referenced type', which is what leads an author to adopt or translate; the WL hash answers a question MAD's documents do not ask. MAD also declines a similarity score, which bears on the spec's `/similar` endpoint.

**Skeptic's correction.** Two incompatible meanings of 'structurally the same' is confirmed. MAD's is the category: references blanked, everything else kept, names and order included. Category-SAIDs.md says it is itself a real SAID ('Anyone can compute it. It comes from the document alone. No registry, and no agreement on names') and 'Not semantic. It groups by exact structure', which is the opposite of a rename-invariant Weisfeiler-Lehman fingerprint with admitted collisions. micro-apps-vision.md:64-68 calls the category exploratory, 'with its algorithms and profiles left for later design', so 'already has code' means one line for models. The overstated part is the `/similar` endpoint: it returns the members of one structural key as candidates to be confirmed by comparing fetched definitions (spec lines 75-76, 126) and produces no score, so mad-ux-design.md:98 (no 'universal compatibility percentage') does not bear on it.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:94
  > A category SAID identifies the template obtained by normalizing designated nested SAID references under a declared profile.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:98
  > MAD therefore reports concrete differences instead of a misleading universal compatibility percentage.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:62
  > a derived description that retains a definition's own structure while replacing its referenced type identities with markers in the same positions
- /Users/seriouscoderone/code/bpm/mad/src/model-tools.ts:42
  > const category = (s: Schema | boolean): string =&gt; JSON.stringify(transform(s,true,()=&gt;''));
- bead bpm-nq3.7 (bd show bpm-nq3.7)
  > It groups by exact structure, its holes are untyped, and it is a classification key, not an integrity commitment.
- bead bpm-nq3.7 (bd show bpm-nq3.7)
  > Question to work out: whether identity pins (Ruling 8) are blanked like SAID references when computing a category, so a closed RR and its open original share a category
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:70
  > Compute it with Weisfeiler–Lehman color refinement over the relation graph:

**Implication.** Shipping the WL hash publishes a second, incompatible meaning of 'structurally the same' before the first is designed, and leaves the open pin question in bpm-nq3.7 unanswered.

**Reviewer's suggested resolution.** Make the second hash the category (references and, if so ruled, pins blanked), or drop the structural hash from the first version.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:94, 98, /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:62, /Users/seriouscoderone/code/bpm/mad/src/model-tools.ts:42 and spec line 70 are exact; both bpm-nq3.7 quotes are in the bead. I read model-tools.ts:25-42 and 101-107: `category` is an unhashed JSON string with external $ref values blanked, for models only, used to suggest comparisons. I also read /Users/seriouscoderone/Downloads/Category-SAIDs.md in full and spec lines 75-76 and 126.

### mad-model-10: The spec's 'publisher' is a domain serving bytes; MAD's publication is an endorsement by a principal

*decision · conflict · spec section 4, 5 · skeptic's verdict: **confirmed***

**Claim.** MAD separates four things the spec merges under 'publisher': the principal who endorses an exact definition, the author, the introducer, and the host a copy was retrieved from. A mirror, a download or an index entry is not an endorsement. The spec identifies a publisher by a domain URN, keys index rows by it, and does no signing. Its re-hash check does match what MAD asks of a definition (exact identity verification), so `verified` is sound for content; it says nothing about who stands behind it.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:108
  > A mirror or download is not automatically an endorsement. Principal IDs identify contributors; display names are attributed information about them. A retrieval host is not necessarily the author or signer.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66
  > Reposting an unchanged definition adds an attributable endorsement without changing its SAID. Downloading, bookmarking, indexing or automatically mirroring it does not.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:62
  > Verification results and the accountable signer, independently of the retrieval host.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74
  > The recipient retrieves the material and checks it: exact SAID verification for a definition, or the expected principal's signature for an attributable statement.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:144
  > a hash commits content, but does not authenticate its author
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:100
  > No signing in v0. The trust manifest is optional, and same-origin keys add no real security.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:125
  > `GET /hash/{cid}` → list of publishers (verified first) for a full or structural hash.

**Implication.** 'Who else publishes hash X' would count any domain that lists the bytes, so adoption can be inflated by mirrors, and the answer cannot be tied to a self-held identity later without changing the index key.

**Reviewer's suggested resolution.** Call unsigned rows sources (retrieval observations) and keep 'publisher' or 'endorser' for a principal-signed statement, with the index key leaving room for a principal identifier.

**What the skeptic checked.** All five MAD quotes and spec lines 100 and 125 are exact; spec line 143 also lists 'Signing/trust manifests' as out of scope. MAD's code already carries the principal: `Publication.endorser` (/Users/seriouscoderone/code/bpm/mad/src/views.ts:45) is set from the local identity (/Users/seriouscoderone/code/bpm/mad/src/ui.ts:288), and the publish screen says 'An intentional publication endorses the exact target. Downloading or mirroring it does not' (views.ts:177). One sentence the reviewer did not quote sharpens the finding: /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66, 'Intentional publication or republication is an endorsement under MAD's publication convention.' A domain that lists a definition in its own catalog is publishing intentionally, so under MAD's convention the row would read as an endorsement, yet it is unsigned and attributed to a DNS name, not a principal ID.

### mad-model-11: Vocabulary: 'publish' covers what the workspace splits into freeze and publish, and that split is an unmade ruling

*decision · conflict · spec section 4 (and the package name `publisher`) · skeptic's verdict: **confirmed***

**Claim.** The spec uses publish for normalizing, hashing and uploading in one command. The workspace's locked vocabulary reserves freeze for the identity boundary and publish for serving or endorsing frozen bytes; whether MAD adopts that split is bead bpm-nq3.2, deferred, and CLAUDE.md says to rename neither side until it closes. The spec's sense of publish (serving bytes at an endpoint) agrees with the reserved meaning; what it lacks is a word for the hash step. I found no sign-in, log-in or account wording (the only 'account' is the AWS account ID at line 13), no wizard or guided authoring, and no KERI ceremony terms in the spec.

**Evidence.**

- /Users/seriouscoderone/code/bpm/CLAUDE.md:211
  > Vocabulary: *freeze*, not *publish*; using a package **pins SAIDs**; a draft alias never joins a frozen document's alias.
- bead bpm-nq3.2 (bd show bpm-nq3.2)
  > freeze = the immutability/identity boundary and publish = serving or endorsing frozen bytes; MAD uses 'publish' for both, and today its Publish is a local unsigned preview.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:249
  > Freezing a local definition and making it retrievable through a source are separate operations, with separate outcomes.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:116
  > Whether MAD's Publish splits into freeze and publish is the ruling bead bpm-nq3.2.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:102
  > Command: `npm run publish` builds, diffs against S3, uploads, and invalidates the catalog path only.

**Implication.** A third project using publish for the combined act makes bpm-nq3.2 harder to close cleanly and gives `mad-hash --normalize` no name in the shared vocabulary.

**Reviewer's suggested resolution.** Rule bpm-nq3.2 now, or have the spec say freeze for normalize-and-hash and publish for upload-and-list.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/CLAUDE.md:211, /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:249, /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:116 and spec line 102 are exact; bpm-nq3.2 is still deferred and its text matches. /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:19-22 confirms the reserved meaning ('The word publish is reserved for serving frozen bytes at an endpoint'). A grep of the spec for sign, log in, account, wizard, guided, present, grant, admit, IPEX and OOBI finds only 'account ID' (line 13), 'No signing' (line 100) and 'Signing/trust manifests ... auth on the query API' (line 143). Two smaller word collisions went unreported: 'Pin the specVersion' (line 20) and 'IPFS pinning' (line 143) use pin outside its locked sense (/Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:46, 'Using a package pins SAIDs'; Ruling 8); and bpm-core/AGENTS.md:42 locks 'Catalog is the loaded folder, not a SAD', while MAD's documents use catalog for a discovery catalog, as the spec does.

### mad-model-12: A hosted indexer with a hand-kept seed list conflicts with MAD's local-first discovery and is itself an aggregation site

*decision · conflict · spec section 5, 8 (question 4) · skeptic's verdict: **partly***

**Claim.** MAD's discovery design is that each instance searches what it has learned through introductions and retained locally, with a catalog allowed but never required. The spec builds one hosted crawler, one DynamoDB reverse index and one public query API, fed by a seed list of domains the operator maintains, and makes that indexer a registry. Measured against the maintainer's objective, that is a protocol aggregation site with a curated list behind it; the need for someone to run one remains unless any party can compute the same reverse index from the catalogs it has been introduced to.

**Skeptic's correction.** The spec does build one hosted crawler, index and query API, and MAD's documents do say search runs over locally retained knowledge with no required central catalog. Two parts are overstated. First, the spec has two entry paths that need no operator action: the crawler recurses into nested application/ai-catalog+json entries to depth 3 (line 111) and queries ARD registries for the MAD media type (line 109). The reviewer's proposed fix, 'catalogs that list other catalogs', is already in the spec; only the starting seeds are operator-kept. Second, MAD's documents allow such a service: 'Catalogs may search, categorize, recommend, and return introductions' (micro-apps-vision.md:76) and 'bootstrapped introductions to available catalogs' (mad-ux-design.md:43). They exclude a required or single one. What remains true: the spec never says the index is optional or reproducible by others, gives a MAD instance no way to compute the same answer over catalogs it has learned, and retains nothing locally. Whether an automated index built only from publishers' own catalogs counts as an 'aggregation site' under the objective is the maintainer's call; MAD's documents do not decide it.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106
  > Explore is intended to search what the local app has learned through introductions and retained definitions.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106
  > An RDF-style knowledge graph is useful as a query projection, with no required central catalog or database engine.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43
  > MAD learns definitions through bootstrapped introductions to available catalogs and retains them locally with provenance. Search operates over that local knowledge.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:70
  > This design does not prescribe a database engine or require a central MAD server.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76
  > We can adopt useful discovery conventions without requiring one global catalog or a new mandatory discovery service.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15
  > Content addressing alone does not discover peers, grant trust or make different definitions interchangeable.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:107-108
  > Seed sources (in a DynamoDB `sources` table or an S3 config file):
  >    - a list of domains;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:127-128
  > This makes
  >   our indexer itself a valid ARD registry.

**Implication.** As specified, the answer to 'who else uses X' exists only where someone hosts the index and keeps its seed list, which is the role the objective wants to make unnecessary. The spec also gives no way for a source to enter the index except by the operator adding it.

**Reviewer's suggested resolution.** Decide whether the indexer is the product or a reference deployment of a crawler anyone (including a MAD instance) runs over its own introductions, and state how a new source becomes known without the operator's seed list (for example, catalogs that list other catalogs).

**What the skeptic checked.** All six MAD quotes and spec lines 107-108 and 127-128 are exact. I re-read spec section 5 against the sentence 'the spec also gives no way for a source to enter the index except by the operator adding it', and re-read /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74-76 and /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43 for what MAD says about catalogs.

### mad-model-13: Deferred beads already own this scope, behind four unmade rulings and Ruling 5's order

*decision · overlap · spec section whole spec; registration · skeptic's verdict: **partly***

**Claim.** Epic bpm-nq3 (deferred) covers the normalization profile, real SAIDs, freeze and publish, and search by tags and category SAIDs. Its icebox followers cover the rest of the spec: bpm-upm.21 (provenance over retained introductions), bpm-upm.22 (Explore over introductions with endorsement semantics), bpm-upm.23 (structural category), bpm-upm.26 (KERI adapter, OOBI). The rulings they wait on are all open: bpm-nq3.1 (property order), bpm-nq3.2 (publish vs freeze), bpm-nq3.6 (assembly identity) and bpm-vfn.1 (the shared file format, itself waiting on the open maintainer review bpm-jzi.13). Ruling 5 puts the file format after hardening. In bpm-core, open epic bpm-n13 already plans publish and pull of frozen documents by digest, with S3 as a later provider. Only four labels exist (bpm-core, gym-bp, mad, cruft).

**Skeptic's correction.** The overlap is real but narrower than 'cover the rest of the spec'. The beads own the identity half: the normalization profile and digest (bpm-nq3.3), freeze and publish (bpm-nq3.5), the category (bpm-nq3.7, bpm-upm.23), and local provenance and Explore (bpm-upm.21, .22). No bead covers the network half: a well-known catalog, a crawler, a reverse index across publishers or a query API. Where the two do overlap they plan a different mechanism: bpm-nq3.5 defines publish as 'sign and emit a shareable bundle of frozen definitions with provenance that another MAD instance can import', and bpm-upm.21 builds provenance 'from imported publish bundles'. So mad-discovery duplicates bpm-nq3.3 and bpm-upm.23, competes with bpm-nq3.5, and adds scope that nothing tracks. bpm-n13's original text also planned a registry ('A registry would list published packages, fetch their SAID documents, and pin them into a workspace as locked'), so the earlier bpm-core design expected the kind of site the objective wants to make unnecessary.

**Evidence.**

- bead bpm-nq3 (bd show bpm-nq3)
  > every child is deferred until Vibe-code closes or the maintainer pulls them forward
- bead bpm-nq3 (bd show bpm-nq3)
  > Out: Explore over introductions, provenance panel, structural compare, KERI adapter (icebox, blocked on this epic).
- bead bpm-nq3.7 (bd show bpm-nq3.7)
  > people find RRs and assemblies by searching their own crowd-sourced tags and categories, and also by deterministic content-addressable identities that show or prove definitions are aligning and coalescing.
- bead bpm-upm.22 (bd show bpm-upm.22)
  > intentional republication of the same SAID endorses and a mirror does not; the endorser filter becomes real.
- bead bpm-vfn.1 (bd show bpm-vfn.1)
  > a project folder of plain files (one per definition, assembly, scenario) watched by a local server; a local database the server owns; a content-addressed store close to bpm-core's frozen store.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:128
  > First harden the UI and the model's conceptual contours until the maintainer is satisfied. Then choose the storage medium or file format the CLI and UI share
- bead bpm-n13 (bd show bpm-n13)
  > A provider is untrusted by construction: bytes either hash to their name or are rejected.
- /Users/seriouscoderone/code/bpm/CLAUDE.md:199
  > Labels are `bpm-core`, `gym-bp` and `mad`, plus `cruft` on cruft chores

**Implication.** Starting mad-discovery pulls MAD's 'later' horizon forward and settles its rulings by implementation. Registering the project means deciding its label and whether its epic supersedes, absorbs or is blocked by the beads above; otherwise two trees track the same work.

**Reviewer's suggested resolution.** Before filing the epic, the maintainer says whether mad-discovery implements bpm-nq3.3/.5/.7 and bpm-upm.21 to .23 (re-parent or close them against it) or is a separate experiment, and which of the four rulings it must wait for.

**What the skeptic checked.** Ran `bd show` on bpm-nq3, bpm-nq3.1 to .7, bpm-upm.21, .22, .23, .26, bpm-vfn.1, bpm-jzi.13, bpm-n13 and bpm-n13.4. Every quote is present. bpm-nq3 and its seven children are deferred; bpm-nq3.1, .2, .6 and bpm-vfn.1 are unruled; bpm-vfn.1 depends on bpm-jzi.13, which is open; bpm-n13 is open with S3 deferred in bpm-n13.4. `bd label list-all` shows exactly four labels. No bead created or updated since 2026-10-21 touches discovery; the newest are documentation and UI fixes dated 2026-11-08.

### mad-model-14: Where the hashing code and the definitions live: 'one library, shared' and Ruling 1 against a separate monorepo with its own schema and source of truth

*decision · decision · spec section 1, 3, 4 · skeptic's verdict: **confirmed***

**Claim.** The spec puts canonicalization and validation in a new monorepo, with its own JSON Schema for definitions and a `definitions/` folder it calls the source of truth. MAD's direction is one TypeScript library shared by CLI and UI and one store both write, and bead bpm-nq3.3 places SAID generation inside MAD. Ruling 1 says everything MAD lives inside `mad/` and that nothing of MAD lives at the workspace root. The maintainer's note on the format ruling says the RR grammar itself should be a JSON Schema, which is the same artifact `packages/mad-hash/schema/` would need. Registration fact: `mad-discovery/` is untracked in the workspace repo and matched by no `.gitignore` pattern, while the workspace repo is to track no code.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:127
  > **One library, shared.** The CLI and the UI share nearly everything (domain, validation, rule evaluation, rehearsal) as one TypeScript library.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:124
  > A UI edit goes where the CLI writes; both use one store.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:186
  > Everything MAD lives inside `mad/`
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:155
  > Shared instructions (`CLAUDE.md`), the beads tracker and the nested repositories. Nothing of MAD lives there.
- bead bpm-vfn.1, comment of 2026-10-18 (bd show bpm-vfn.1)
  > express the RR grammar itself as a JSON Schema whose instances are RRs
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:36
  > definitions/     # the user's own MAD definitions (source of truth, JSON)
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:62
  > Validate against a JSON Schema (store in `packages/mad-hash/schema/`).
- /Users/seriouscoderone/code/bpm/.gitignore:3-6
  > bpm-core/
  > gym-bp/
  > *-bp/
  > mad/
- /Users/seriouscoderone/code/bpm/CLAUDE.md:187
  > `~/code/bpm/` is the **workspace repo**: it tracks work and shared configuration, never code.

**Implication.** A second schema, a second validator and a second copy of the definitions would have to be kept equal to MAD's by hand, in a workspace whose rules forbid parallel implementations. A `git add` at the workspace root would also commit the new folder into the repo that tracks no code.

**Reviewer's suggested resolution.** Decide whether the hash library is part of MAD's shared library (with mad-discovery holding only the catalog builder, crawler and infrastructure) and where definitions are read from; make mad-discovery its own nested repo and add it to `.gitignore` before any code lands.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:124, 127, 155, 186, /Users/seriouscoderone/code/bpm/CLAUDE.md:187, /Users/seriouscoderone/code/bpm/.gitignore:3-6 and spec lines 36 and 62 are exact. `git status` shows '?? mad-discovery/' and `git check-ignore mad-discovery` exits 1. The bpm-vfn.1 comment of 2026-10-18 holds the quoted words; the maintainer's own words there are 'the RRs are JSON Schemas, at least in my head', and 'express the RR grammar itself as a JSON Schema' is recorded as input for the ruling, not as a ruling. Two attribution details: 'Nothing of MAD lives there' is the workspace table (HANDOFF.md:155), not Ruling 1, and Ruling 1's 'Everything MAD lives inside mad/' (line 186) introduces a list of the files moved in October. Neither changes the conclusion. The uncommitted edit to /Users/seriouscoderone/code/bpm/CLAUDE.md:187 ('clone or create new bpm-related repos here') and /Users/seriouscoderone/code/CLAUDE.md both invite a new nested repo under bpm/, which supports the suggested resolution.

### mad-model-15: The spec's catalog entry fits MAD's 'introduction', whose wire profile was left open

*note · precedent · spec section 4, 5 · skeptic's verdict: **partly***

**Claim.** MAD's documents already describe discovery as an introduction: an identifier plus a candidate location, retrieved and then verified by the recipient, with 'catalog entry' named as one carrier and the wire format explicitly undecided. The spec's catalog entry (hash, URL, fetch, re-hash) is that shape, so the AI Catalog format can serve as the wire profile without contradicting anything in MAD. MAD's one added requirement is that the retrieval source is recorded separately from authorship and endorsement.

**Skeptic's correction.** The shape match holds: MAD names a catalog entry as one carrier of an introduction, leaves the wire profile open, and asks for the fetch-and-re-hash check the spec performs. 'Without contradicting anything in MAD' and 'one added requirement' are too strong. In the spec's entry the primary identifier is a publisher-domain urn:air: URN, and the content hash rides in a custom mad:hashes field (lines 92, 98). MAD's introduction carries the content identity as the expected identity, says catalogs 'do not assign the identity of the definitions they describe' (micro-apps-vision.md:76) and says URLs 'are not substitutes for definition SAIDs' (mad-ux-design.md:33). MAD also asks for the introducer when known, three provenance states ('claimed, verified or unresolved', mad-ux-design.md:64) where the spec has verified true or false, and local retention ('a remote outage does not erase retained definitions', mad-ux-design.md:43).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74
  > a link, catalog entry, shared file, or known peer can introduce a document SAID or principal ID together with a candidate location.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76
  > Catalogs may search, categorize, recommend, and return introductions; they do not assign the identity of the definitions they describe.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76
  > “OOBI-inspired” describes the proposal until an actual wire profile is chosen.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:60
  > OOBI-inspired introductions, expected identities, introducers when known, and candidate locators.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-guided-review.md:35
  > Record introduction and retrieval sources separately from authorship and endorsement; OOBIs can locate copies but do not grant business authority.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:113-114
  > fetch the definition and re-hash it with `mad-hash`;
  >    2. record `verified=true` only if the computed hashes match the claimed ones;

**Implication.** The publishing half of the spec (sections 4 and the crawler's verify step) is compatible with MAD once the unit, the hash and the publisher wording are fixed; the conflicts are in what is hashed and who hosts the index, not in using a well-known catalog.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74, 76, /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:60, /Users/seriouscoderone/code/bpm/mad/docs/mad-guided-review.md:35 and spec lines 113-114 are exact. I compared the spec's catalog entry (lines 91-98) with what MAD says an introduction carries (mad-ux-design.md:56-64).

### mad-model-16: A version marker inside the hashed content, in a workspace that bars version fields while greenfield

*note · conflict · spec section 2 · skeptic's verdict: **partly***

**Claim.** The spec's definition carries `"mad": "0"`, a known key and therefore hashed, and labels the format v0. The workspace rule bars version numbers while greenfield and Ruling 4 bars version fields in stored data (for the browser stores). MAD's documents do expect a versioned profile for identity, but as a named convention, not necessarily a field inside every definition.

**Skeptic's correction.** The marker exists and Ruling 4 is correctly scoped to the browser stores. Two parts do not hold as stated. The spec never says whether `mad` is hashed: step 3 drops 'unknown/non-semantic keys' without saying which known keys are semantic, so 'therefore hashed' is an inference. And the greenfield rule does not bar this marker. Its next sentence, which the finding does not quote, reads 'A tag or a version is cruft until something outside this workspace depends on it', and a public hashing profile that other publishers must reproduce is exactly that case. HANDOFF.md:15 ('versioned conventions'), /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:94 ('under a declared profile') and bead bpm-upm.23 ('versioned comparison profile') all expect a profile identifier. What remains open is the question in the suggested resolution: whether that identifier sits inside the hashed bytes or beside them.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:46
  > "mad": "0",
- /Users/seriouscoderone/code/bpm/CLAUDE.md:14
  > No versioning while greenfield: no release tags, no version numbers bumped for their own sake, no `v1`/`v2` names for things that coexist.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:189
  > no version fields or version predicates in stored data, no migration code
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15
  > Normalization and versioned conventions are part of making this reproducible.

**Implication.** Because the marker is inside the hashed bytes, changing it changes every `full` hash and splits the index into before and after.

**Reviewer's suggested resolution.** Say whether the profile identifier is part of the hashed content or travels beside it in the catalog entry.

**What the skeptic checked.** Spec line 46, /Users/seriouscoderone/code/bpm/CLAUDE.md:14 and /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15, 189 are exact. I read the whole of CLAUDE.md:14 and spec section 3 step 3.

### mad-model-17: Rulings and vision statements in mad/ that bear on discovery, publishing, identity and sharing (those not already quoted above)

*note · precedent · spec section whole spec · skeptic's verdict: **confirmed***

**Claim.** Collected for the record. Together they say: identity comes from content and nobody allocates it; names, tags and endorsements are attributed metadata beside it; the same exact identity is one definition however many publications describe it; a definition's identity is never a person's or an event's; published means immutable; KERI terms stay at the runtime layer and MAD authoring stays KERI-agnostic; and none of discovery, real SAIDs or network distribution is implemented.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13
  > Two independent authors who produce the same committed definition under the same representation conventions obtain the same identity. No central language owner allocates every business type or approves every contribution.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15
  > They can discover the difference, explicitly translate between them, or adopt the same definition. Adoption can make containing definitions converge too.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:19
  > This makes possible **standards through adoption**, durable contracts and independently built systems that can interoperate.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:30
  > An independent author should be able to discover and reuse an exact definition; a consumer should accept another conforming provider without rewriting its responsibility
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:56
  > A content-addressed definition's identity is distinct from the identity of a record, a person or a particular occurrence.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > The definitions are the protocol, a type; an application exists only when a runtime instantiates its RRs with identities, keys and data.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > A filled-in identity names identifiers, never keys, which is what lets it last through key rotation.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:78
  > on KERI, records become credentials, messages become exchange messages, and the bookkeeping stays local.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106
  > Identity comes from the definition; attributed names, descriptions, tags, endorsements and retrieval sources help people find it.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:108
  > An intentional republication can endorse the exact same definition without changing its identity.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:110
  > Published definitions are read only; editing creates a draft.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:116
  > Publishing is intended to share exact definitions with attributable discovery metadata. The prototype's Publish is a local preview
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:149
  > MAD carries forward accountable identities, authority chains and independently verifiable evidence while keeping business contracts independent of a KERI runtime.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190 (Ruling 5)
  > The simulator is the first runtime; later runtimes (KERI the target) meet the same protocol, not built yet.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:191 (Ruling 6)
  > On KERI each delivery is an IPEX grant and admit; MAD's process shows only the business step.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:193 (Ruling 8)
  > Openness is a choice at every level: an issuer's identity may be filled in on a model, an authorization, an RR, an assembly or a deployment, each with known consequences
- /Users/seriouscoderone/code/bpm/mad/README.md:118
  > No network discovery or OOBI resolution, remote transport, encrypted delivery, durable key custody, recovery or rotation, or live revocation-freshness protocol is implemented
- /Users/seriouscoderone/code/bpm/mad/README.md:3
  > Published definitions are read only; editable copies are drafts. There is no MAD backend or platform account.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:7
  > It is not a live discovery client or publishing service.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:33
  > URLs locate UI state, not private payloads or cryptographic secrets, and are not substitutes for definition SAIDs.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:45
  > Those placements belong to their curators and do not change the definition's identity.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:49
  > Results with the same exact SAID share one definition. Multiple publications contribute descriptions, categories and endorsements.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:64
  > One record can have several retrieval paths. A mirror is not automatically its author, and an unknown introducer stays unknown.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:68
  > Endorsements remain attached to their exact versions. Catalog endorsement also grants no runtime authority.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:74
  > The navigation footer identifies the **local identity**, rather than implying a platform account or subscription.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:86
  > **Published definitions are immutable.** “Edit a copy” creates a local draft with its source relationship retained.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:165
  > frozen definitions preserve the required meaning through explicit expansion or pinned semantic references.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:217
  > Only exact definition identity counts: a changed draft does not match merely because its name is unchanged.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:247
  > Discovery metadata belongs to the publication, while semantic changes affect the target definition.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:259
  > Real SAID generation, network discovery and distribution, execution across separate processes, durable key custody and key rotation are implementation work beyond this prototype.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:35
  > | A reusable library | Definitions and compositions that others can discover and pin |
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:43
  > **A SAID either matches or it does not.** Looking only at two different identifiers tells us nothing about how their definitions relate.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:56
  > **independent authors can discover the same identity, and deliberate adoption can propagate convergence through a whole composition.** Nobody allocates the identity or decides which author owns it.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:58
  > SAIDs commit serialized content; the language needs a shared normalization profile so incidental authoring differences do not defeat convergence.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:68
  > A category match answers “these definitions have the same surrounding structure under this comparison profile.” It does not authorize substituting one exact type for another.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:111
  > A definition's SAID is never a person's identity or a substitute for identifying an event.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:309
  > We are adopting an ACDC-like concept of attributable, chainable evidence without prescribing ACDC serialization, KELs, TELs, witnesses, or IPEX for every runtime.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:319
  > A changed definition acquires a new identity. Existing references continue to name the previous definition.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:352
  > Two independent authors produce the same precise address definition and obtain the same identity. Different local display names do not change it. A meaningful constraint change does.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-guided-review.md:15
  > Similar words alone do not establish the same definition.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-guided-review.md:37
  > The author does not invent SAIDs manually. Tooling computes and verifies identifiers under the chosen profile. Sharing reusable definitions is separate from revealing scenario identities, private records or contact information.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-guided-review.md:49
  > A publication pins exact definitions and intended metadata.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-intake-review.md:132
  > Sharing definitions also does not imply sharing private scenario records.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:25
  > MAD pins independently addressable models and RRs.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-authority-design.md:140
  > there is no KERI runtime, remote discovery, encryption or live revocation synchronization.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md:84 (untracked file)
  > It does not automatically equate differently expressed meanings, establish trust in an issuer, or make a definition discoverable.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md:74 (untracked file)
  > Borrow immutable references and explicit dependency evolution, while defining MAD's own identity conventions.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md:73 (untracked file)
  > Fits discovery catalogs of definitions, publishers, endorsements, sources, and curated collections.

**Implication.** Any rewrite of the spec can be checked against this list. The statements most at odds with the current text are the SAID-compatibility ones (mad-model-04), the endorsement-versus-mirror ones (mad-model-10) and the no-required-central-catalog ones (mad-model-12).

**What the skeptic checked.** A script checked every single-line quote in all seventeen findings against its cited file and line: 121 of 121 found at the cited line, including all 46 in this finding. The two untracked files are real (`git -C /Users/seriouscoderone/code/bpm/mad status` shows docs/mad-comparison.md untracked). The summary sentence follows from the quotes, and no later ruling contradicts any of them: Rulings 1 to 8 are the whole list and the newest is dated 2026-10-18. The list is not complete, though. Statements it leaves out, all in /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md unless noted: line 45 ('Explore combines search by business term, definition kind, curator, endorser and structural relationship with human-curated directory trees'); line 64 (provenance labelled 'claimed, verified or unresolved'); line 66 ('Intentional publication or republication is an endorsement under MAD's publication convention'); line 68 ('An assembly endorsement targets the assembly'); line 247 (publishing reviews 'the exact model, authorization, responsibility or assembly'); line 251 (assemblies as 'published immutable snapshots'); /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:68 (the category's 'algorithms and profiles left for later design') and :340 (the DCR projection loses a gate). Most of these bear on finding 07.

### What the skeptic added (mad-model)

**Two DCR formats already exist near MAD, and spec section 2 mirrors the one MAD's workflow review declined** *(decision)*

Spec section 8 question 2 has a concrete answer the first reviewer reported as absent. bpm-core prints its DCR projection as deterministic JSON and commits golden files for it. An external reference format, which MAD's own review document assessed and declined as a contract language, has the same fields as spec section 2: events id/label/role, relations type/from/to, the same five relation types and an approve/submit example. The spec's DCR shape therefore appears to come from material MAD has already ruled out as its language, not from MAD.

Evidence: /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:92-135 (to_payload: 'The deterministic dict form: goldens compare it, `bpm dcr` prints it'); /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/cli/main.py:383-388 (--format choices json and dcr-portal, default json); four files under /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/; /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/sim/run.py:198-208 (marking stored as included/executed/pending id lists); /Users/seriouscoderone/Downloads/workflow-architecture.md section 6 ('- { type: condition|response|include|exclude|milestone, from: &lt;event_id or [ids]&gt;, to: &lt;event_id or [ids]&gt;'); /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:3 ('They do not describe the same executable language') and :21.

**MAD already has a publication shape, and the spec's catalog entry and index carry almost none of it** *(decision)*

In MAD the published thing is a publication: an exact target (a model, authorization, RR or assembly, the last with its components and bindings) plus a name, description, tags, a collection placement and the endorsing principal. People find things by those attributes; the maintainer said so on 2026-10-18. The spec's catalog entry has only displayName, a URL, the hashes and generated representativeQueries. Its index table stores only hash, URL, domain, verified and two timestamps, so POST /search has no stored text to search, and nothing can be found by tag, collection, curator or endorser. A reference site is where a person goes before holding an identifier; the spec answers only once the hash is known.

Evidence: /Users/seriouscoderone/code/bpm/mad/src/views.ts:45 ('export interface Publication { name: string; description: string; tags: string; collection: string; target: string; targetId: string; endorser: string; kind: Definition["kind"] | "assembly"; components: ...'); /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:247 ('The user supplies a name, description, tags and a collection placement. Discovery metadata belongs to the publication') and :45; bead bpm-nq3.7 ('people find RRs and assemblies by searching their own crowd-sourced tags and categories, and also by deterministic content-addressable identities'); /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:91-98 and 119-121 ('attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`').

**The spec's exact hash must change when a label changes; MAD's exact identity must not** *(decision)*

The spec requires as a test that renaming labels changes the `full` hash, and its end-to-end check expects two definitions that differ only by labels to get different full hashes. MAD's criterion for exact identity runs the other way: renaming leaves the SAID unchanged and only a constraint change alters it. Under the spec, two authors with the same content and different labels meet only at the structural hash, which the spec itself calls a candidate with possible collisions. That weakens the property the objective rests on: independent authors arriving at the same identity without a site to reconcile them. Caveat: the spec does keep displayName and x-description outside the hash, so the collision concerns labels inside the definition, whose MAD counterparts (action name, rule title) are the unruled prose fields of finding 08.

Evidence: /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:82 ('renaming IDs/labels changes `full` but not `structural`') and 138-139; bead bpm-nq3.4 ('then rename a label (SAID unchanged) and add a constraint (SAID changes)'); bead bpm-nq3.3 ('renaming a definition keeps its SAID and a constraint change changes it'); /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:352 ('Different local display names do not change it. A meaningful constraint change does') and :339; /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13.

**Category-SAIDs.md exists and settles more than the first reviewer assumed** *(decision)*

The basis document the first reviewer did not open is on disk outside the tree (bead bpm-uaj.4, which brings it in, is still open). It defines the category as the document's SAID recomputed with every SAID reference blanked. It says the result is itself a real SAID that can be published and verified, that anyone can compute it with no registry, that key order and field names count, and that the values were computed with keripy. This bears on three findings: a SAID, not a CID (04); order counts, so JCS sorting contradicts it (05); and an exact structural digest, not a Weisfeiler-Lehman candidate (09). It is also the nearest statement of the maintainer's objective in his own words.

Evidence: /Users/seriouscoderone/Downloads/Category-SAIDs.md:25 ('SAIDify the document again, but first blank every point-by-SAID reference exactly the way the document's own SAID field is blanked'); :50-51 ('The category is a real SAID ... Anyone can compute it. It comes from the document alone. No registry, and no agreement on names.'); :57 ('An extra property, or the same properties in a different order, is a different category. Structure and key order stay the modeler's choice.'); :53 ('ordinary SAIDification (keripy's `Saider.saidify`)'). Cited from /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:257 and bead bpm-nq3.7.

**MAD's planned publish is a signed bundle another MAD instance imports; the spec has no path from the index back into MAD** *(decision)*

The deferred design distributes definitions as a signed bundle that a second MAD instance imports, verifies and retains, and Explore then searches what was retained. The spec distributes unsigned files at a well-known URL that only its crawler reads, and puts any UI out of scope. Nothing in it imports a found definition into MAD, retains it or shows it, so it yields 'who else publishes hash X' but not 'discover and reuse an exact definition', which is MAD's stated success criterion. Today MAD's provenance dialog shows hard-coded example sources and says they are not retrieved. If the objective is that nobody needs a reference site, the missing half is how a person reads and adopts what the index points at.

Evidence: Bead bpm-nq3.5 ('publish = sign and emit a shareable bundle of frozen definitions with provenance that another MAD instance can import'; acceptance 'a bundle exported from one browser profile imports into another and verifies'); bead bpm-upm.22 ('Explore over the local catalog plus retained definitions and introductions, not only CATALOG plus drafts'); /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:30 ('An independent author should be able to discover and reuse an exact definition'); /Users/seriouscoderone/code/bpm/mad/src/views.ts:197 ('discovery sources are not retrieved', with https://catalog.example and https://mirror.example placeholders); /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:143 ('Signing/trust manifests, IPFS pinning, nested DCR sub-graphs, auth on the query API, UI').

### Looked for and not found (mad-model)

- Any DCR construct (events, condition/response/include/exclude/milestone relations, markings) in /Users/seriouscoderone/code/bpm/mad/src or /Users/seriouscoderone/code/bpm/mad/tests: a search for DCR, milestone and marking over *.ts and *.mjs matched no file. The only hits in mad/ are prose in HANDOFF.md, four docs, and 'milestone' in its ordinary sense in sources/membership-management-v2.1.md.
- A numbered Ruling in mad/HANDOFF.md that mentions DCR: Rulings 1 to 8 do not. The sentence lives at HANDOFF.md:161, outside the Rulings list.
- Any hash, SAID, CID or digest computed for a definition, assembly or scenario in mad/src. Only ECDSA/SHA-256 signatures over facts, grants, messages and subscriptions (src/services/crypto.ts) and an unhashed `category()` JSON string for models (src/model-tools.ts:42).
- Any export or import of a definition, assembly or whole study in mad/src: no file input, Blob, object URL, download, clipboard or fetch call.
- blake3 or saidify anywhere in mad/: absent; they exist only as the plan in bead bpm-nq3.3.
- openhaven, 'protocol aggregation', ai-catalog, agenticresourcediscovery, urn:air, CIDv1, multiformats, JCS / RFC 8785 or Weisfeiler anywhere in the workspace other than the spec itself (searched md, ts, mjs, json, py, toml, excluding node_modules, .git, .venv); nothing in beads (`bd search openhaven`, `bd search mad-discovery`) or in `bd memories openhaven` / `bd memories discovery`.
- A made ruling on property order (bpm-nq3.1), publish vs freeze (bpm-nq3.2), assembly identity (bpm-nq3.6) or the shared file format (bpm-vfn.1): all four are deferred and unruled.
- Sign-in, log-in or account wording (other than the AWS account ID at spec line 13), wizard or guided-authoring wording, or KERI ceremony terms (present, grant, admit, IPEX, OOBI) in the spec: none.
- The Category-SAIDs.md basis document inside the workspace: mad-ux-design.md:257 cites it at /Users/seriouscoderone/Downloads/Category-SAIDs.md and open bead bpm-uaj.4 is to bring it in-tree. I did not open the Downloads copy.
- A mad/docs/references/ folder (named in Ruling 1): it does not exist.
- A MAD-side statement of the maintainer's objective (no protocol reference or aggregation sites needed): not written in HANDOFF.md, README.md or mad/docs; the nearest statements are 'no required central catalog' (HANDOFF.md:106) and 'without requiring one global catalog or a new mandatory discovery service' (micro-apps-vision.md:76).

<a id="bpm-core"></a>

## bpm-core

*The earlier library: its DCR projection, its SAIDs, its locked vocabulary and its publish-and-pull design.*

**Reviewer's summary.** bpm-core has no counterpart to the spec's unit: it derives the DCR graph from a composed selection, never stores or hashes it, and the workspace instructions say not to fold DCR into MAD, so the definition format in section 2 needs a maintainer ruling before phase 1. bpm-core's DCR JSON (the `bpm dcr` payload) differs from section 2 in nearly every field: `source`/`target` instead of `from`/`to`, six relation types including `no-response`, multi-owner events instead of one role, and a per-event marking map kept outside the graph. Identity in bpm-core is a Blake3-256 CESR SAID embedded in `d`, hashed over shape-template-ordered compact JSON with unknown keys refused; the spec's JCS plus sha2-256 CIDv1 is a second digest that AGENTS.md forbids and that pre-empts the deferred MAD identity epic (bpm-nq3). One definition can carry both identifiers only with the CID kept outside the document and with two serializations, because JCS reorders schema bodies that bpm-core hashes as authored. bpm-core has no structural-equivalence notion at all; the only one in the workspace is the maintainer's deferred category SAID (bpm-nq3.7), which the Weisfeiler-Lehman hash duplicates, and the spec's required test that changing any relation changes both hashes fails on bpm-core's own two-event attendance graph. The open epic bpm-n13 already frames publish and pull as providers with put and get by digest, with S3 deferred as bpm-n13.4, so sections 4 and 5 overlap it under a different digest. bpm-core measures adoption by who pins a digest in a pointer, not by who re-serves the same bytes, and the section 2 format has no pointer field, so the reverse index cannot see the convergence the designs rely on. The spec also collides with the locked vocabulary on publish versus freeze, package, registry, catalog, definition, version numbers and pin. Nothing is implemented for publish, pull or a registry in bpm-core, and no bead, label or .gitignore entry exists yet for mad-discovery.

### bpm-core-01: A stored, hashed DCR graph called a MAD definition has no counterpart: bpm-core derives DCR and never stores it, and the workspace says not to fold DCR into MAD

*blocker · conflict · spec section Header, section 2, section 8 question 2 · skeptic's verdict: **confirmed***

**Claim.** In bpm-core the DCR graph is a projection recomputed from a composed selection. It has no `d`, no kind and no file, and GOAL.md lists it under derived, never stored. The content-addressed units are five document kinds (aggregate, fact, authorization, rr, selection) plus schema files. Separately, the workspace instructions say not to fold DCR into MAD, MAD's model per Ruling 5 is models, authorizations, RRs, assemblies and scenarios, and a MAD design note says adopting DCR as the contract language would change the design. So the answer to the spec's own question 2 from this lens: an earlier DCR JSON exists (the `bpm dcr` payload), but it is feedback output, not a definition format, and nothing in the workspace treats a DCR graph as a definition. A grep of /Users/seriouscoderone/code/bpm/mad/src for the word DCR returned no files.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:42
  > A MAD definition is a DCR graph in JSON:
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:148
  > 2. Is there an existing DCR JSON format from earlier MAD work that §2 should match instead?
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:37
  > Derived, never stored: a role's authorization set; an aggregate's writer within a selection; the trust chain (holds → issuers → root or open seam); the DCR graph.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md:9
  > business on this projection; the simulation (M11) is its only consumer.
- /Users/seriouscoderone/code/bpm/CLAUDE.md:191
  > Do not fold DCR or shared-run behavior into MAD.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190
  > MAD's model (models, authorizations, RRs, assemblies, scenarios) is an application protocol complete enough to build applications from.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:21
  > DCR could describe local process behavior or a derived diagnostic projection. Adopting event-history semantics as MAD's contract language would change the present design; a familiar diagram does not require that change.

**Implication.** Phase 1 (mad-hash) is built entirely on the section 2 format. If the unit is wrong, the hash library, its fixtures, the media type and the index keys are all rebuilt. A whole-graph hash also cannot detect shared bricks: two selections that both use the Attendance cards produce different composed graphs and share neither hash.

**Reviewer's suggested resolution.** Before phase 1 the maintainer rules which unit is hashed and indexed: (a) the authored definitions (RRs, papers, models), with DCR left as a derived projection; or (b) a DCR projection as a new publishable artifact, with an explicit exception to the CLAUDE.md line above.

**What the skeptic checked.** Re-opened all seven sources; each quote is at the cited line: /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:42 and :148; /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:37; /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md:9; /Users/seriouscoderone/code/bpm/CLAUDE.md:191 (present in HEAD and in the working copy); /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190 (Ruling 5); /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:21. Confirmed that to_payload (/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:91-134) emits no d and no envelope kind, and that src/bpm_core/shapes holds only the five kinds. Re-ran the grep: the word DCR is absent from /Users/seriouscoderone/code/bpm/mad/src (the only case-insensitive hits are the letters inside 'breadcrumb'). Searched for counter-evidence (a later ruling, a bead, or a MAD document that treats a DCR graph as a definition) and found none. Found further support the reviewer did not cite: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:161 ('or fold its historical DCR/shared-run behavior into this prototype') and /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md:68. The shared-brick reasoning holds: a composed gym graph and the attendance graph differ in events and relations, so neither hash matches. One caveat on framing: the spec marks section 2 'confirm with user' and asks question 2 itself, so this answers an open question; it does not contradict a settled part of the spec.

### bpm-core-02: Field-by-field: bpm-core's DCR JSON and spec section 2 differ in envelope, event shape, relation field names, relation types, marking and sort order

*decision · overlap · spec section Section 2 · skeptic's verdict: **confirmed***

**Claim.** Envelope: the spec has `mad` and `kind: dcr-graph`; bpm-core's payload has neither and no `d`. Event: the spec has `{id, label, role}`; bpm-core has `{id, label, kind, doc, group, owners[{rr, role, job}]}`, where an event may have zero owners (a seam) or several (`DCR_MULTI_OWNER`). Event ids: bpm-core uses `fact:<id>`, `authz:<id>`, `act:<rr>:<id>`, with the document's SAID as `<id>` once frozen; the spec uses free strings. Relation: the spec has `{type, from, to}`; bpm-core has `{type, source, target, rr, origin}`, and the authored `follow` entry is `{type, source, target}`. Relation types: bpm-core has six, adding `no-response`; the spec has five. Marking: the spec has three arrays of ids inside the definition; bpm-core has a map from event id to `{included, executed, pending}`, optional and computed separately from the graph. Sort: the spec sorts relations by (type, from, to); bpm-core by (source, target, type, rr, origin). Nesting: absent in both; bpm-core's `group` is presentational, semantic nesting was declined, and bpm-n11 (time, nestings) is deferred. bpm-core also has a second serialization, DCR-portal XML export.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:48-50
  > "relations": [{ "type": "condition", "from": "submit", "to": "approve" }],
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:54
  > Relation `type` ∈ `condition | response | include | exclude | milestone`.
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:67
  > type: str  # condition | response | include | exclude | milestone | no-response
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:88
  > Marking = dict[str, EventMarking]  # event id → marking
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:122
  > key=lambda r: (r.source, r.target, r.type, r.rr, r.origin),
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/rr.py:13-20
  > RELATION_TYPES = (
- /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/sitting.json:9
  > "owners": [{"rr": "claim-settled", "role": "claims-adjuster", "job": "respond_to"}]
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md:72
  > | `track` | — | — grouping metadata only; pm4py nestings and subprocesses stay empty |
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/cli/main.py:365
  > "dcr", help="print the DCR projection, or export it as DCR-portal XML"

**Implication.** A bpm-core projection cannot be written in the section 2 format without loss: multi-owner events, seams, `no-response` and relation provenance have no place. The spec's `from`/`to` also differs from the only DCR vocabulary already in the workspace.

**Reviewer's suggested resolution.** If DCR stays the unit, adopt `source`/`target` and the six relation types, and decide how owners and roles are represented; otherwise state in section 2 that the format is deliberately unrelated to bpm-core's projection.

**What the skeptic checked.** Checked every field against /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:42-49, :65-71, :88, :91-134; /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/rr.py:13-20 (six relation types); /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:112 (follow is {source, target, type}); dcr.md:20-37, :72, :94-102; /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/sitting.json:9 and :25 (an event with owners: []); /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/cli/main.py:365 and :386 (--format json or dcr-portal); the m10-m13 DECISIONS file line 132 ('semantic DCR nesting from `track`' declined); bd show bpm-n11 (deferred). All hold. One omission: the bpm-core payload also has a top-level issues key, and the `bpm dcr` output and goldens add analysis; section 2 has no place for either.

### bpm-core-03: The spec's JCS plus sha2-256 CIDv1 is a second digest scheme beside bpm-core's Blake3-256 CESR SAID, which AGENTS.md forbids and MAD's deferred identity epic plans to reuse

*decision · conflict · spec section Section 3 · skeptic's verdict: **partly***

**Claim.** bpm-core computes a SAID as follows: set `d` to 44 `#` characters; serialize with Python `json.dumps` using compact separators and `ensure_ascii=False`, UTF-8, keys in insertion order with no sorting (a test asserts key order changes the SAID); take the Blake3-256 digest; encode as CESR, the letter E followed by base64url of a zero byte plus the digest with the first character dropped, 44 characters. No field is excluded; `d` is blanked. At freeze, before hashing, a document's own fields are put in shape-template order, empty optional lists are dropped, `uniqueItems` token lists and a fold's `on` keys are sorted, authored sequences are untouched, and `schema` bodies and schema files are hashed as authored. Pointers are resolved to SAIDs first, so a SAID commits to its closure. The spec instead uses lexicographic JCS, sha2-256, CIDv1 base32 with the raw codec, an identifier held outside the document, and drops unknown keys. AGENTS.md says not to invent another digest, and the deferred MAD task bpm-nq3.3 plans a digest matching `saidify` byte for byte, gated on the unruled property-order question bpm-nq3.1.

**Skeptic's correction.** The JCS plus sha2-256 CIDv1 would be a second content identifier beside the Blake3-256 CESR SAID, built before the identity rulings it touches. /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59 fixes the SAID algorithm inside bpm-core; by its own terms it does not govern a separate TypeScript project or an identifier that is not a SAID, so nothing outright forbids a CID. The stronger authority for the conflict is MAD's: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13 ('intended to use SAIDs compatible with the KERI ecosystem') and the deferred epic bpm-nq3 with bpm-nq3.3 (Blake3-256 CESR matching saidify), gated on the unruled bpm-nq3.1. MAD has no real SAIDs today (HANDOFF.md:177, 'Prototype IDs are not SAIDs'), so mad-hash would be the first digest implemented in TypeScript in the workspace. What needs a ruling is which identifier is a definition's identity.

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:18-22
  > raw_json = json.dumps(copy, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:22
  > full = "E" + base64.urlsafe_b64encode(bytes([0]) + digest).decode("ascii").rstrip("=")[1:]
- /Users/seriouscoderone/code/bpm/bpm-core/tests/test_said.py:27
  > def test_key_order_changes_said():
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59
  > **SAID** is Blake3-256 CESR matching KERI Saider (dummy `d` is 44 `#`). Do not invent another digest.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:10
  > Blake3-256 CESR digest of the document, normalized to its shape (Digest normalization, below), with `d` blanked to 44 `#` characters.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:65-67
  > **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- bd show bpm-nq3.3 (run from /Users/seriouscoderone/code/bpm; output is line-wrapped)
  > matches bpm-core's saidify byte-for-byte
- bd show bpm-nq3.1 (run from /Users/seriouscoderone/code/bpm)
  > the profile cannot be frozen before

**Implication.** mad-hash would be a second identity scheme in the workspace, built before the identity rulings it pre-empts. Documents already frozen under SAIDs (gym-bp's store) would not be findable in the index by the identifier they already carry.

**Reviewer's suggested resolution.** The maintainer chooses: SAID only; CID only, with the AGENTS.md line amended; or both, with a stated job for each. If SAIDs are involved at all, bpm-nq3.1 (property order) is ruled first.

**What the skeptic checked.** Read /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:13-24 and tests/test_said.py:27-30; the SAID recipe is exactly as described (d set to 44 '#', json.dumps with compact separators and ensure_ascii=False, insertion order, Blake3-256, 'E' plus base64url of a zero byte and the digest with the first character dropped). Normalization rules match normalize.py:17-42 and documents.md:206-228. bd show bpm-nq3.1 and bpm-nq3.3 contain the quoted text; bpm-nq3.1 blocks bpm-nq3.3 and both are deferred. /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store holds 36 SAID-named documents. The overstatement is the word 'forbids' in the title: AGENTS.md:59 sits in bpm-core's Model section and fixes how bpm-core computes a SAID. Minor: the supersedes pointer is not resolved at freeze (documents.md:199), so 'commits to its closure' holds for the pointer-table fields only.

### bpm-core-04: One definition can carry both a SAID and a CID, but only with the CID outside the document and two serializations

*note · fact · spec section Section 3, section 4 · skeptic's verdict: **confirmed***

**Claim.** The SAID sits inside the document in `d` and covers every field, including `alias`, `name` and the `role` label, plus the resolved pointer digests. The CID sits outside, in the file name and the catalog entry's `mad:hashes`, and covers the JCS bytes of the spec's normal form. Three constraints follow from bpm-core's code. First, a bpm-core document cannot hold the CID or any `x-` key, because an undeclared key is refused; so the SAID can never cover the CID, and the CID covers the SAID only if mad-hash's schema declares `d`. Second, bpm-core verifies a SAID after reordering only the keys its shape declares and copies a `schema` body as authored, so the JCS-sorted bytes the spec serves at `/defs/<cid>.json` would not verify against the SAID of any document with a schema body. That is an inference from reading normalize.py; I did not run it. Third, bpm-core recognises a digest as 44 characters starting with E, so a CID cannot be used as a pointer inside a bpm-core document.

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/normalize.py:39
  > object — the value is copied byte-for-byte as authored.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:86
  > **A document carries no key its shape does not declare (Ruling 132).**
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/ids.py:16
  > return isinstance(token, str) and len(token) == 44 and token.startswith("E")
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:90
  > - `/defs/<full-cid>.json`: normalized definition, immutable, `Cache-Control: max-age=31536000, immutable`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:98
  > - custom field `"mad:hashes": { "full": "...", "structural": "..." }`.

**Implication.** Carrying both means choosing which identifier addresses the served bytes. If the served file stays SAID-verifiable, the CID is the hash of a re-canonicalization and not of the served bytes, which is not what a raw-codec CID conventionally means. If the served file is the JCS form, the SAID needs a second copy to verify against.

**Reviewer's suggested resolution.** If both are kept, state in section 4 which serialization is served and that the other identifier is recomputed, not byte-addressed.

**What the skeptic checked.** Quotes verified at normalize.py:39, documents.md:86, ids.py:16, spec:90 and :98. The reviewer flagged the second constraint as an untested inference, so I ran it read-only with bpm-core's venv over the 36 documents in /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store: each store copy verifies as stored; after a recursive lexicographic key sort (what JCS does), verify_document fails for all 15 documents with a schema body (8 aggregates, 2 authorizations, 5 facts) and for the 1 schema file, and still passes for all 13 RRs and all 7 selections. So the inference holds on real data. Strictly the failure needs a schema body not already authored in lexicographic order, which is every one in gym-bp. A CIDv1 base32 sha2-256 string is 59 characters starting with 'b', so is_said returns false and bpm-core would read it as an alias.

### bpm-core-05: Dropping unknown and `x-` keys before hashing reverses bpm-core's Ruling 132 and collides with `x-cel`, which is semantic

*decision · defect · spec section Section 3, normal form steps 1 and 3 · skeptic's verdict: **partly***

**Claim.** The spec drops unknown keys and every `x-` key before hashing. bpm-core ruled the opposite: an undeclared key is refused at load and at edit, specifically so that it cannot affect the digest. In bpm-core `x-cel` is a JSON Schema keyword that validators enforce, and changing it makes a schema change non-additive, so it is not metadata. The spec does not say whether dropping applies at the top level only or recursively, nor how step 1 (validate against a schema) and step 3 (drop unknown keys) interact: a closed schema rejects unknown keys at step 1 and leaves nothing to drop, while an open schema lets two source files that differ in an unknown key share one `full` hash.

**Skeptic's correction.** The spec and Ruling 132 share one goal: a key the model does not read must not reach the digest. They differ in mechanism. bpm-core refuses the key (UNKNOWN_FIELD); the spec silently drops it. That is a different mechanism with a worse failure mode (a mistyped key vanishes without an error), not a reversal of the ruling. The x-cel collision is hypothetical: a section 2 definition has no schema body, so nothing in it carries x-cel. It becomes real only if the hashed unit changes to documents that embed JSON Schema and the drop is recursive. The step 1 versus step 3 ambiguity is real, but the finding's two readings are not the only ones: a schema closed except for keys matching ^x- makes 'unknown' mean exactly the x- keys, and the spec already relies on one (x-description, spec:97).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:62-64
  > 3. Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed).
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:95
  > `issued_by` on a need, say — would otherwise freeze into the SAID, and one responsibility would pin
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/schema_cel.py:43
  > _Validator = extend(Draft202012Validator, {"x-cel": _check})
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/lineage.py:6
  > Any change to x-cel (including add/remove) returns False."""

**Implication.** If definitions ever embed JSON Schema the way bpm-core's papers do, a recursive `x-` drop strips business rules out of the hashed form, and two definitions with different rules share a `full` hash.

**Reviewer's suggested resolution.** Close the schema and refuse unknown keys, following Ruling 132. Limit the metadata rule to named top-level keys, or use a prefix that does not collide with `x-cel`.

**What the skeptic checked.** Quotes verified: spec:64; /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:86-98 (line 95 as quoted); /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/schema_cel.py:43; /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/lineage.py:6 and :9. x-cel is enforced and non-additive as stated. Read Ruling 132's stated reason (documents.md:94-96) and compared it with the spec's step 3. Checked section 2 for any place a JSON Schema body could sit: there is none.

### bpm-core-06: bpm-core has no structural-equivalence notion; the workspace's only one is the maintainer's deferred category SAID, which the Weisfeiler-Lehman hash duplicates

*decision · overlap · spec section Section 3, `structural` hash · skeptic's verdict: **partly***

**Claim.** Nothing in bpm-core's source or docs expresses shape equivalence or the same definition under different labels. Convergence there is exact digest equality plus pinning. Normalization exists so that one meaning is one SAID, but it only removes ordering differences, and labels are identity-bearing: `alias` and `name` are hashed fields and `role` is in the RR's identity triple. The nearest mechanisms are `is_additive`, a schema-shape comparison along a `supersedes` chain, and `PORT_MULTI_PROVIDER`, two RRs issuing the same SAID. The only structural-identity design in the workspace is the category SAID in deferred MAD beads bpm-nq3.7 and bpm-upm.23: blank every reference-by-SAID and hash the rest, as a classification key. MAD's planned exact identity also excludes display names, while the spec's `full` hash changes on a label rename.

**Skeptic's correction.** bpm-core has no structural-equivalence notion. The workspace's design for one is MAD's category SAID, and it is written in-tree (micro-apps-vision.md:60-68, mad-ux-design.md:94-98), not only in two deferred beads and files under ~/Downloads. The Weisfeiler-Lehman hash does not duplicate it; they are different equivalences. A category keeps the definition's own field names, constraints and ordering and blanks only designated referenced identities ('it does not strip every digest-looking string indiscriminately'; 'Categories preserve the surrounding content, including ordering'), and a document with no references has a category equal to its own SAID. The spec's structural hash erases ids, labels and roles and keeps only graph shape. A section 2 graph has no references, so the category construction applied to it collapses to the full hash; 'make structural the category SAID' is therefore not an available option unless the format gains pointers. The point about labels stands, with one precision: bpm-core hashes alias and name, so the spec's full hash matches bpm-core's behaviour and differs from MAD's plan (bpm-nq3.3, 'renaming a definition keeps its SAID').

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/normalize.py:11
  > SAID. In an ecosystem where adoption is the vote, byte-equal meaning has to be
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/normalize.py:22-23
  > RR the template's order is the header (role, outcome, track — the
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:328
  > Two responsibilities provide the same paper type (the same SAID); both are legitimate bindings — not two instances and not two purposes.
- bd show bpm-nq3.7 (run from /Users/seriouscoderone/code/bpm; output is line-wrapped)
  > A category SAID is the SAID of a document with
- bd show bpm-nq3.7
  > is a classification key, not an integrity commitment.
- bd show bpm-nq3.3
  > renaming a definition keeps its SAID and a
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:82
  > - renaming IDs/labels changes `full` but not `structural`;

**Implication.** The spec's `structural` hash is a second, different answer to a question the maintainer has already written up, and the spec's `full` hash disagrees with MAD's planned SAID on whether a rename changes identity. An index keyed on the Weisfeiler-Lehman hash would not line up with MAD's later compare and adopt work.

**Reviewer's suggested resolution.** The maintainer decides whether `structural` is the category SAID construction or a separate hash, and whether labels are inside `full`.

**What the skeptic checked.** Grepped /Users/seriouscoderone/code/bpm/bpm-core src, README, AGENTS.md and all of docs (plans and ledgers included) for isomorph, equivalen, same shape, Weisfeiler, coalesc, converg, category: no structural-equivalence notion, so that half is confirmed. Quotes verified at normalize.py:11 and :22, documents.md:328, spec:82, and in bd show bpm-nq3.7 and bpm-nq3.3. Then read the in-tree MAD text the beads point to: /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:58-68 and /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:94-98.

### bpm-core-07: The required test that changing any relation changes both hashes fails on bpm-core's two-event attendance graph, and `structural` ignores who may act

*decision · defect · spec section Section 3, `structural` hash and tests; section 5 · skeptic's verdict: **confirmed***

**Claim.** Three defects. (a) bpm-core's attendance projection has two events with identical marking flags and one `condition` between them. Reversing that relation gives a graph isomorphic to the original once ids, labels and roles are ignored, so any hash that ignores them must return the same `structural` value; the spec's required test cannot pass for that change. (b) `structural` drops roles entirely. In bpm-core's projection the owner and role on an event carry the authorization content, which GOAL.md names as the main concern, so two graphs with the same shape and different assignments of who acts are reported as similar. Dropping roles is also different from renaming them consistently. (c) Section 3 says the indexer confirms structural candidates by comparing the fetched definitions, but section 5 has no such step, no comparison rule and no stored field for the result.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:83
  > - changing any relation changes both;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:69
  > - `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
- /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/attendance.json:22
  > "type": "condition",
- /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/attendance.json:32-39
  > "pending": true
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:7
  > including its cross-cutting concerns, above all **authorization**
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:75-76
  > confirms matches by comparing the fetched definitions.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:121
  > - attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.

**Implication.** Phase 1 carries a required test that is false for the simplest graph, so the implementer either picks examples that hide it or stalls. `GET /definition/{cid}/similar` would return unconfirmed candidates, including processes whose authority structure differs.

**Reviewer's suggested resolution.** Restate the test as: changing a relation changes `full`, and changes `structural` unless the result is isomorphic. Decide whether the role partition (which events share a role) is part of shape. Either add the confirm step with its rule and stored field, or delete the sentence.

**What the skeptic checked.** Built the counter-example from /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/attendance.json: two events, both included true, executed false, pending true (lines 31-40), one condition (lines 21-27). Reversing the relation gives a graph that maps onto the original by swapping the two events, preserving marking flags and relation type. Under the spec's own recipe the initial colours are {condition-out plus flags} and {condition-in plus flags} in both graphs, so the sorted multiset of colours and the relation list in colour space are identical; structural is unchanged while full changes. The required test at spec:83 therefore cannot pass for this change, and the spec's own section 2 example (submit and approve, same flags) has the same property. Part (b): spec:69 drops roles; GOAL.md:7 quote verified. Part (c): spec:75-76 promises a confirm step; section 5 (spec:106-128) has no such step and the index attributes at spec:121 have no field for its result. No spec sentence resolves any of the three.

### bpm-core-08: The normal form hashes a marking without saying it is the initial one, and does not say whether duplicate relations are removed

*decision · defect · spec section Section 2, section 3 normal form step 2 · skeptic's verdict: **confirmed***

**Claim.** The spec puts `marking` inside the hashed definition and uses marking flags as the initial colour of the structural hash. In bpm-core the marking is not part of the graph: it is computed from the composition as the initial marking, is an optional argument to the payload function, and afterwards is run state. An initial marking can legitimately contain executed events, since a seam starts executed, so the spec cannot rely on an empty `executed` list to tell a definition from a snapshot. Separately, bpm-core's own sitting projection contains two relations with the same type, source and target that differ only in provenance; in the section 2 format they are exact duplicates, and the spec does not say whether the relation list is a set.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:63
  > 2. Sort `events` by `id`, sort `relations` by `(type, from, to)`, and sort marking arrays.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:71
  > - initial color = relation-type signature + marking flags;
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:91
  > def to_payload(graph: ProcessGraph, marking: Marking | None = None) -&gt; dict:
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/compile.py:374
  > """Spec §5.7, v2: every event included=True; executed iff a seam (Ruling
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:47
  > A SAID is a definition, not a visit or a person.
- /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/sitting.json:57-58
  > {"type": "condition", "source": "authz:claim-approved", "target": "fact:claim-settled", "rr": "claim-settled", "origin": "rely_on"},

**Implication.** The same process gets different `full` hashes depending on which marking was saved or whether a duplicate relation was kept, so the reverse index under-reports exact matches.

**Reviewer's suggested resolution.** State that the hashed marking is the initial marking, or keep marking out of both hashes. State that relations are a set and that duplicates are removed or refused before hashing.

**What the skeptic checked.** Verified spec:63 and :71; model.py:91 (marking is an optional argument); /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/compile.py:373-397 (initial_marking: executed iff the event is a seam); dcr.md:35-37; AGENTS.md:47; and sitting.json:57-58 plus :60-61, two pairs of relations identical in type, source and target that differ only in origin. Read the whole spec for a sentence saying the hashed marking is the initial one, or that relations form a set: neither exists.

### bpm-core-09: Vocabulary: the spec collides with bpm-core's locked list on publish versus freeze, package, registry, catalog, definition, kind, version numbers, pin and identity

*decision · conflict · spec section Sections 1 to 5 · skeptic's verdict: **partly***

**Claim.** Publish: the spec uses it for the whole pipeline, including normalizing and hashing; bpm-core reserves it for serving frozen bytes and calls the identity boundary freeze. The spec's serving step fits the reserved meaning; what is missing is freeze as a word and a step, and the workspace says to rename neither side until bpm-nq3.2 closes. Package: the spec's `packages/` folders versus a package as a frozen selection others pin. Registry: the spec's ARD search endpoint versus the registry that browses and pins frozen sets. Catalog: the spec's `ai-catalog.json` listing versus the loaded folder, with a catalog document on the refused list. Definition and kind: a DCR graph with `kind: dcr-graph` versus a SAID as a definition among five kinds, with a ClosedGraph document refused. Version numbers: `"mad": "0"` and v0 versus no versioning while greenfield; bpm-core documents carry no format-version field and record versions as a `supersedes` trail. Pin: pinning a spec version and IPFS pinning versus a digest in a pointer. Identity: a publisher-domain URN as `identifier` versus identity is `d`.

**Skeptic's correction.** Four real collisions with the locked list: 'publish' covering build, hash and upload with no freeze step; 'catalog' (ai-catalog.json versus the loaded folder); 'definition' with kind: dcr-graph versus the five kinds; and a format marker inside the hashed bytes. The others do not collide in meaning. packages/ is the npm-workspaces directory name. 'Pin the specVersion' and 'IPFS pinning' are unrelated to pinning a definition. The spec's 'registry' is the same role bpm-core names ('registry later', AGENTS.md:45; 'a registry beside this library', v1 design line 60), so it aligns. The urn:air identifier names a publisher's catalog entry, while the definition's identity in the spec is the CID, so it is not a rival to 'identity is d'. On versions, the finding quotes only the first sentence of CLAUDE.md:14; the next sentence reads 'A tag or a version is cruft until something outside this workspace depends on it', and outside consumers are this project's purpose, so a format marker is a maintainer call. The 'rename neither side' guard concerns MAD's and bpm-core's wording until bpm-nq3.2 closes; the suggested freeze and publish split for the new CLI would itself anticipate that ruling.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:102
  > - Command: `npm run publish` builds, diffs against S3, uploads, and invalidates the catalog path only.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:19-20
  > freeze. The word *publish* is **reserved for serving** frozen bytes at an endpoint for somebody else
- /Users/seriouscoderone/code/bpm/CLAUDE.md:211
  > Until it closes, rename neither side.
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:45
  > **Not a kind, not a SAD.** **Ecosystem** is the world of those pinned sets (registry later).
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:42
  > **Catalog** is the loaded folder, not a SAD. Role bundles, ClosedGraph documents, and package SADs are not in the model.
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:71
  > a package SAD, catalog SAD, or ClosedGraph document (the package *is* the frozen documents plus a closed selection)
- /Users/seriouscoderone/code/bpm/CLAUDE.md:14
  > No versioning while greenfield: no release tags, no version numbers bumped for their own sake, no `v1`/`v2` names for things that coexist.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:46-47
  > "mad": "0",
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:39
  > **Versioning is a trail, not feedback.** `supersedes` and `evolution` record which frozen document a new one replaces.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:92
  > - `identifier`: the publisher-domain `urn:air:` URN form, per the current spec;

**Implication.** The new repo's docs and CLI would contradict the locked list from the first commit. The `"mad": "0"` field also sits inside the hashed bytes, so a format bump would change every `full` hash for unchanged graphs and split the index.

**Reviewer's suggested resolution.** Add a vocabulary section to the spec. Split the publisher command into freeze (normalize and hash to dist) and publish (upload). Move the format version out of the hashed bytes or drop it.

**What the skeptic checked.** All ten quotes are at the cited lines (spec:46, :92, :102; documents.md:19-20; workspace CLAUDE.md:14 and :211; AGENTS.md:42, :45, :71; GOAL.md:39). Extra support found: bpm-core enforces the wording with a test (/Users/seriouscoderone/code/bpm/bpm-core/tests/test_conventions.py:156, test_the_normative_docs_say_frozen_not_published). Then weighed each listed term against what the two sides mean by it, read the rest of CLAUDE.md:14, and read bd show bpm-nq3.2.

### bpm-core-10: Open epic bpm-n13 already frames publish and pull as providers with put and get by digest, with S3 deferred; spec sections 4 and 5 overlap it under a different digest

*decision · overlap · spec section Section 4, section 5 crawler step 3 · skeptic's verdict: **confirmed***

**Claim.** bpm-n13 (open, P2, label bpm-core) was reframed on 2026-09-02 from a package registry into publish and pull: a provider interface of put and get by digest; a first provider that is a local directory committed at the workspace root; later providers S3 and a KERI/OOBI-style endpoint (bpm-n13.4, deferred); pull verifies the digest before writing and follows pointers transitively; a provider is untrusted. The spec's S3 `/defs/<cid>.json` is an S3 provider's put, and its fetch, re-hash and verified-only-on-match is pull's verification. The differences are the digest, the absence of a closure walk because section 2 definitions have no pointers, and the parts bpm-n13 never had: a catalog listing, a crawler, a reverse index and search. bpm-n13.1 calls for a brainstorm before code. Nothing is implemented: bpm-core's source has no publish, pull or provider code, and the `published/` directory does not exist. Ruling 5 parks bpm-core's backlog and puts the CLI and UI in one TypeScript library.

**Evidence.**

- bd show bpm-n13 (run from /Users/seriouscoderone/code/bpm; output is line-wrapped)
  > Provider interface is two operations, put and get by digest. First provider:
- bd show bpm-n13
  > the local .bpm/store. A provider is untrusted by construction: bytes either
- bd show bpm-n13.4
  > Providers beyond disk: S3, a KERI/OOBI-style endpoint
- bd show bpm-n13.1
  > Brainstorm before code (BOARD rule). Settle: the provider interface (two
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:113-114
  > 2. record `verified=true` only if the computed hashes match the claimed ones;
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190
  > The CLI and UI share nearly everything as one TypeScript library; bpm-core is the earlier CLI attempt
- /Users/seriouscoderone/code/bpm/CLAUDE.md:189
  > Its backlog waits until the MAD UI and model are hardened; then it is evaluated for its conceptual contours and updated or rewritten as one TypeScript library and CLI shared with MAD.

**Implication.** The workspace would hold two publish designs. mad-discovery would in effect be the S3 provider that bpm-n13.4 defers, under a different digest, and `packages/mad-hash` would be a separate TypeScript library holding canonicalization that Ruling 5 places in the one shared library.

**Reviewer's suggested resolution.** The maintainer rules whether mad-discovery supersedes bpm-n13 (close or re-parent its children), implements bpm-n13.4 behind the put and get interface, or is deliberately separate. Link the beads whichever way it goes.

**What the skeptic checked.** bd show bpm-n13, bpm-n13.1 and bpm-n13.4 contain every quoted line; bpm-n13 is open, P2, label bpm-core, reframed 2026-09-02; children .1 to .3 are open and .4 is deferred. Grepped bpm-core/src for publish, pull, provider and registry: only store hydration at catalog.py:838 and unrelated uses. /Users/seriouscoderone/code/bpm/published does not exist. No publish or pull spec under docs/superpowers/specs. HANDOFF.md:190 and CLAUDE.md:189 quotes verified. Two qualifications that leave the finding standing: bpm-n13 is a bead description whose brainstorm (bpm-n13.1) has not run, so the workspace holds a framing and not a second design; and one related open bead is not mentioned, bpm-n07.6 (gym-bp, 'Replace the vendored bricks with `bpm pull` from the workspace publish directory'). The open epic bpm-n15 ('Directory / Listing') is a business directory package and says 'Not N13'; it does not overlap.

### bpm-core-11: bpm-core counts adoption by who pins a digest in a pointer; the spec indexes who re-serves the same bytes, and its format has no pointer field

*decision · gap · spec section Header, section 2, section 5 · skeptic's verdict: **partly***

**Claim.** In bpm-core an adopter does not serve a copy of the thing adopted. It references the digest from its own documents through pointer fields (`hold`, `issue`, `rely_on`, `rrs`, schema `$ref`), and that is what the designs call the vote. The spec's reverse index answers who else publishes a definition with hash X, and a section 2 definition is a self-contained graph with no way to reference another definition by digest. Adoption by reference can therefore be neither expressed nor indexed. bpm-core's reframing of N13 also dropped the registry's listing role in favour of fetching by digest; it never designed browse, crawl or a seed list, so it offers no precedent for how a digest is found in the first place.

**Skeptic's correction.** True for bpm-core: adoption there is a digest in a pointer field, and a section 2 definition cannot reference another definition by digest, so composition by reference cannot be expressed inside a definition. Narrower on three points. (1) The index records catalog entries (hash, publisher URN, defUrl). Nothing in section 5 requires an entry's url to be on the lister's own origin, so listing X without re-serving its bytes is expressible in a catalog; only the spec's own publisher always re-serves. (2) The workspace's newer authority treats republication of the same identity as the adoption signal: 'Reposting an unchanged definition adds an attributable endorsement without changing its SAID. Downloading, bookmarking, indexing or automatically mirroring it does not.' (mad-ux-design.md:66; also HANDOFF.md:108). So 'who else publishes hash X' is MAD's measure, provided the publication is attributable to a principal; the spec's unsigned, domain-keyed index cannot tell an endorser from a mirror. (3) bpm-core has no precedent for finding a digest, but the workspace does: introductions, 'without requiring one global catalog or a new mandatory discovery service' (micro-apps-vision.md:76). Also, bpm-n13's title says it 'absorbs N13 registry' and keeps the original ticket text; listing is unscheduled there, not explicitly dropped. The seed-list point stands.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:4
  > standard, plus a reverse index that answers: **"who else publishes a definition with hash X?"**
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:45
  > Two frozen Attendance selections are two SAID sets; the ecosystem votes by **adoption** (who pins), not committee.
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:46
  > Pin is a digest in a pointer, not a working copy
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:69-70
  > **A paper names neither its holder nor its issuer.** That is what makes one `admission` reusable by a
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:172-189
  > | `rely_on[].said` | `fact` **or** `authorization` |
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:107-109
  > - a list of domains;
- bd show bpm-n13
  > A registry would list published packages, fetch their SAID documents, and

**Implication.** For the objective of making aggregation sites unnecessary, an index of who serves hash X measures copying. It misses a gym that pins Attendance without re-serving it, which is the normal case in bpm-core's model. The seed list of domains is also a curated list that somebody maintains, and bpm-core has no design that removes that role.

**Reviewer's suggested resolution.** Decide whether the index also records references (digest X appears as a pointer inside definition Y from publisher P). That requires the definition format to carry pointers by digest, which ties back to bpm-core-01.

**What the skeptic checked.** Quotes verified at spec:4 and :108; AGENTS.md:45 and :46; documents.md:69-70 and :180; and in bd show bpm-n13. Section 2 has no field that can hold another definition's digest. Then re-read spec section 5 for what the index actually keys on, and read MAD's design authority on what counts as adoption: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106-108, /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43-66, /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:70-76.

### bpm-core-12: Precedent: bpm-core always placed a registry outside the library and reserved publish for a KERI/OOBI endpoint; the spec's choice of AI Catalog and ARD is new

*note · precedent · spec section Section 4, section 5 · skeptic's verdict: **partly***

**Claim.** The v1 design puts browse, find and pin in a registry beside the library, not in a catalog document. The M10 to M13 decisions declined every icebox item including N13 for the library itself, and the deferred workspace epic bpm-950 holds the layers above bpm-core, including publishing in the KERI sense. The decision that reserved the word publish describes it as serving bytes at an endpoint to be OOBI'd. A separate project for discovery is therefore consistent with precedent. What is new and recorded nowhere in bpm-core is the transport: AI Catalog and ARD over HTTPS with no signing, instead of the KERI/OOBI endpoint the designs anticipated.

**Skeptic's correction.** Browse, find and pin were always placed in a registry beside the library (v1 design lines 60 and 574; AGENTS.md:45). Publish was reserved for 'serving frozen bytes at an endpoint for somebody else to fetch' (documents.md:19-21), with OOBI as the example, not for a KERI/OOBI endpoint only. The later bpm-n13 reframing names a local directory and S3 as publish providers and defines `bpm publish` and `bpm pull` as bpm CLI verbs under the bpm-core label, so publish and pull are no longer outside the library in the latest framing, and S3 serving was already anticipated (deferred in bpm-n13.4). What is new is AI Catalog and ARD as the listing layer, and publishing without signatures. 'Direction change' overstates the first: MAD's vision leaves the wire profile open ('"OOBI-inspired" describes the proposal until an actual wire profile is chosen', micro-apps-vision.md:76) and allows catalogs that 'search, categorize, recommend, and return introductions'. The part that does cut against recorded design is unsigned publication, because MAD defines publication as an attributable endorsement (mad-ux-design.md:66; bpm-nq3.5, 'publish = sign and emit a shareable bundle').

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/docs/superpowers/specs/2026-08-16-bpm-core-design.md:60
  > Browse/find/pin is a registry beside this library, not a catalog SAD.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/superpowers/specs/2026-08-16-bpm-core-design.md:574
  > This library loads a catalog and composes a selection; it does not find Attendance in the world.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/superpowers/plans/2026-08-31-bpm-core-m10-m13-DECISIONS.md:133-134
  > raw XML on stdout; whole-report goldens; a second DCR/CEL engine; occupancy checks; every icebox
- /Users/seriouscoderone/code/bpm/bpm-core/docs/superpowers/plans/2026-08-27-bpm-core-m6-m7-DECISIONS.md:8
  > publish would be serving the bytes at an endpoint to be OOBI'd, which is a KERI-runtime concern
- bd show bpm-950 (run from /Users/seriouscoderone/code/bpm)
  > Layers above bpm-core: organization and occupancy, the enterprise runtime, publishing in the KERI sense
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:100
  > - No signing in v0. The trust manifest is optional, and same-origin keys add no real security.

**Implication.** Nothing in bpm-core blocks a separate discovery repo. The choice of ARD over the anticipated KERI/OOBI publication is a direction change that no ruling records yet.

**What the skeptic checked.** Quotes verified: v1 design lines 60 and 574; m10-m13 DECISIONS lines 133-134; m6-m7 DECISIONS line 8 (and line 14, 'Reserve "publish" for the out-of-scope act of serving frozen bytes at an endpoint'); bd show bpm-950; spec:100. Grepped bpm-core docs and src and the gym-bp README for openhaven, ARD, AI Catalog, ai-catalog and urn:air: nothing. Compared dates: the bpm-n13 reframing (2026-09-02) is later than both DECISIONS files. Read MAD's vision on the wire profile.

### bpm-core-13: Registration facts: no bead, label or .gitignore entry exists for mad-discovery, and bpm-core requires a bead or brainstorm before code

*note · fact · spec section Whole project · skeptic's verdict: **confirmed***

**Claim.** bpm-core's AGENTS.md says new product work gets a bead or a brainstorm before coding, and no bead mentions mad-discovery. The workspace label list is `bpm-core`, `gym-bp` and `mad`, with no label for this project. Nested repos must be listed in the workspace `.gitignore`; it lists `bpm-core/`, `gym-bp/`, `*-bp/` and `mad/` but not `mad-discovery/`, which shows as untracked in the workspace repo. Beads to link when the project is registered: bpm-n13 and bpm-n13.4 (publish and pull, S3 provider), bpm-nq3.2 (publish versus freeze), bpm-nq3.1 and bpm-nq3.3 (identity profile and SAIDs), bpm-nq3.7 and bpm-upm.23 (search and category SAIDs), bpm-950 (publishing above bpm-core). bpm-core is Python only, so mad-discovery cannot import its hashing; a TypeScript port of `saidify` and `normalize` is the work bpm-nq3.3 already describes.

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:74
  > New product work: file a bead first (`bd create`, from `~/code/bpm`), or brainstorm, before coding.
- /Users/seriouscoderone/code/bpm/CLAUDE.md:199
  > Labels are `bpm-core`, `gym-bp` and `mad`, plus `cruft` on cruft chores
- /Users/seriouscoderone/code/bpm/CLAUDE.md:208
  > **Never** gitlink a nested repo: `bpm-core/`, `gym-bp/`, `*-bp/` and `mad/` stay in `.gitignore`.
- /Users/seriouscoderone/code/bpm/.gitignore:3-6
  > *-bp/
- bd search mad-discovery (run from /Users/seriouscoderone/code/bpm)
  > No issues found matching 'mad-discovery'
- bd show bpm-nq3.7
  > Search and publish: find RRs and assemblies by crowd-sourced tags and by category SAIDs that show definitions converging

**Implication.** Registering the project needs a label decision, a `.gitignore` line if it becomes a nested repo, and dependency links to the identity and publish beads so that the rulings they wait on are visible as blockers.

**What the skeptic checked.** AGENTS.md:74, CLAUDE.md:199 and :208, and /Users/seriouscoderone/code/bpm/.gitignore:3-6 verified; git status shows mad-discovery/ untracked; bd search mad-discovery returns nothing; each listed bead exists with the stated content; pyproject.toml confirms bpm-core is a Python package. Re-ran the reviewer's not-found searches and all are still empty: JCS, CID, sha2 and IPFS in bpm-core; openhaven, ARD and AI Catalog anywhere in bpm-core, gym-bp or beads; publish, pull or provider code; a registry ruling in the ledgers; a JSON Schema for the DCR payload; a format-version field in the shapes; the published/ directory; a registry or publish memory. Additions: /Users/seriouscoderone/code/bpm/mad-discovery has no .git of its own; it is an untracked folder holding only the spec inside a workspace repo that 'tracks work and shared configuration, never code' (CLAUDE.md:187), so nested repo or not is the first registration decision. Beads missing from the link list: bpm-n07.6, bpm-nq3.5, bpm-upm.21 and bpm-upm.22.

### What the skeptic added (bpm-core)

**Spec section 2 has the shape of an external workflow reference that MAD's own review says is not MAD's language** *(decision)*

The answer to the spec's question 2 is not only the `bpm dcr` payload. Section 2's events {id, label, role}, relations {type, from, to} and the five relation types in that order match the definition language in an external document the maintainer already had reviewed. That review, in-tree, concludes the reference and MAD 'do not describe the same executable language' and that adopting its event-history semantics as MAD's contract language 'would change the present design'. The spec calls this shape 'a MAD definition'. The reference also keeps only an initial marking of included and pending per event, with no executed list.

Evidence: /Users/seriouscoderone/Downloads/workflow-architecture.md:257-258: '- { type: condition|response|include|exclude|milestone, from: &lt;event_id or [ids]&gt;, to: &lt;event_id or [ids]&gt;,'; its section 4.1 lists id, label, role, kind and an initial marking of included and pending for each event; line 81: 'Each event is owned by exactly one role'. /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:3: 'They do not describe the same executable language.'; :17: 'Principals are actors; roles are descriptions of standing.'; :21 (already cited by the first reviewer); :25: 'A pinned selection is not a mandatory global workflow definition.' The reference file sits outside the repository and is linked from the review by absolute path.

**The DCR projection is lossy by rule, so an equal `full` hash over a DCR graph does not mean an equal process** *(decision)*

The first reviewer showed that `structural` ignores who may act. The exact hash has a related blind spot when the unit is a DCR graph. In bpm-core, rules (CEL), data shapes (JSON Schema), `see` and `track` project to no event and no relation, and a convention gate onto an event with two issuers is skipped altogether. Two processes whose business rules or paper schemas differ can therefore produce the same events, relations and marking. In section 2's format (free-string ids, no owners, no document digests) nothing would distinguish them, and 'who else publishes hash X' would report them as the same definition. Of the four parts GOAL.md lists as the output, the DCR graph carries one.

Evidence: /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md:72-74: track '— grouping metadata only', see '— projects into the simulation run log, not the graph', rules '— data-free; evaluated when the outcome fires'; dcr.md:96-100: 'The compiler skips the edge and emits `DCR_MULTI_OWNER`'. /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:304-309: '`track`, `see` and `rules` produce neither event nor relation'. /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:11: 'rules (CEL), processes (projected to DCR), data shapes (JSON Schema), and authorization'. /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:340: 'The gym example separates two admission providers because its DCR projection loses a gate when both are present.'

**No lineage and no retention rule: the index cannot say what replaced X, and a superseded hash may disappear** *(decision)*

bpm-core writes the version trail into the frozen document (`supersedes`, `evolution`) and never withdraws a frozen document. Section 2 has no lineage field, and step 3 would drop one as an unknown key. The catalog has one entry per current file in definitions/, and section 4 does not say whether the 'diffs against S3' step deletes the previous /defs/&lt;cid&gt;.json when a source file changes. An edited definition therefore becomes an unrelated hash, the old hash leaves the catalog and may leave S3, and the index holds a stale row with nothing marking it superseded. Showing what the current version is and what it replaced is one of the jobs a protocol reference site does.

Evidence: /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:39: '`supersedes` and `evolution` record which frozen document a new one replaces'; GOAL.md:51: 'new SAID if the meaning changed; old SAID stays'. /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:57 (envelope: d, kind, alias, name, supersedes, evolution) and :286-292 (an additive supersedes chain lets two digests join). /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:64 (unknown keys dropped), :91 ('catalog with one entry per definition'), :102 ('builds, diffs against S3, uploads'), :121 (index attributes: firstSeen and lastSeen only).

**The workspace already has a discovery design (introductions, no global catalog, publication as a signed endorsement) that the spec's central index should be measured against** *(decision)*

These sources are in mad/, outside bpm-core, but they are the counter-evidence to the first reviewer's statement that there is no precedent for how a digest is found, and they bear directly on the maintainer's objective. MAD's design says definitions are learned through introductions and kept locally, that catalogs may return introductions but no global catalog is required, that a publisher is a principal and not a host, and that indexing or mirroring is not an endorsement. The spec builds one crawler-fed index from a curated seed list, makes it an ARD registry, keys publishers by domain and signs nothing. As written, the index is itself an aggregation service, and its answer to 'who else publishes X' cannot separate an endorser from a mirror.

Evidence: /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74-76: 'a link, catalog entry, shared file, or known peer can introduce a document SAID ... together with a candidate location'; 'without requiring one global catalog or a new mandatory discovery service'. /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106: 'with no required central catalog or database engine'; :108: 'A mirror or download is not automatically an endorsement ... A retrieval host is not necessarily the author or signer.' /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43, :64, :66. Spec:100 ('No signing in v0'), :107-109 (seed sources), :120-121 (SK pub#&lt;urn&gt;, attribute domain), :127-128 ('our indexer itself a valid ARD registry'). Related deferred beads: bpm-upm.21, bpm-upm.22, bpm-nq3.5.

**bpm-core anchors its digest to an external vector and forbids goldens generated from code output; the spec's required tests have neither** *(note)*

The spec's required tests for mad-hash are self-consistency properties plus 'golden-file fixtures', with no rule on where the goldens come from and no vector from an independent implementation. A canonicalization or encoding mistake that is internally consistent would pass all of them, and every hash published and indexed afterwards would carry it. bpm-core's precedent is to pin saidify to a known KERI value and to hand-derive projection goldens.

Evidence: /Users/seriouscoderone/code/bpm/bpm-core/tests/test_said.py:5-11: JOHN_SAID = 'EKITsBR9udlRGaSGKq87k8bgDozGWElqEOFiXFjHJi8Y' checked by test_saidify_matches_keri_golden. /Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md, Fixtures section: '`tests/goldens/dcr/` holds hand-derived projection goldens — never regenerate them from code output.' /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:80-84 (the four required tests).

### Looked for and not found (bpm-core)

- Any notion of structural, shape or isomorphism equivalence, or of the same definition under different labels, in bpm-core source or docs (grepped src, GOAL.md, AGENTS.md, conventions and the v2 design for isomorph, equivalen, structural, Weisfeiler, category, converg, coalesc)
- JCS, RFC 8785, sha2-256, multihash, CID or IPFS anywhere in bpm-core (grep of src and the normative docs)
- Implemented publish, pull, provider or registry code in /Users/seriouscoderone/code/bpm/bpm-core/src (only local store hydration by digest in catalog.py:838)
- A design spec or brainstorm document for publish and pull under /Users/seriouscoderone/code/bpm/bpm-core/docs/superpowers/specs (only out-of-scope lines pointing at bpm-n13 or N13)
- A numbered Ruling in the bpm-core plan ledgers about a registry, listing, browse or discovery service (the ledgers' registry hits are all the issue-code registry)
- The directory /Users/seriouscoderone/code/bpm/published/ that bpm-n13 names as the local provider location
- Any mention of openhaven, ARD, AI Catalog, ai-catalog, agenticresourcediscovery or urn:air in bpm-core docs or src, the gym-bp README, or beads
- Any bead mentioning mad-discovery (bd search)
- A JSON Schema for the DCR payload in bpm-core (src/bpm_core/shapes holds only aggregate, authorization, fact, rr, selection)
- A format-version field in bpm-core documents (the envelope is d, kind, alias, name, supersedes, evolution)
- Any use of the word DCR in /Users/seriouscoderone/code/bpm/mad/src (grep returned no files)
- A bd memory about a registry or publish design for bpm-core (bd memories registry and publish returned only MAD memories)

<a id="backlog"></a>

## The beads backlog

*Beads that overlap the spec, and what adding a project meant last time.*

**Reviewer's summary.** The backlog already contains this project under other names: bpm-nq3.7 ("Search and publish"), the MAD icebox group "Discovery and endorsement" (bpm-upm.21, .22, .23) and bpm-n13/bpm-n13.4 (publish/pull, S3 provider), all deferred or on hold behind identity work (bpm-nq3.1, .2, .3, .5) and the open maintainer gate bpm-jzi.13. Two contradictions stop phase 1 as written. First, the spec defines a MAD definition as a DCR graph, while the workspace defines it as a model, authorization or RR, treats DCR as a derived, never-stored projection, and instructs "Do not fold DCR ... into MAD". Second, the spec mints a CIDv1/sha2-256 digest where the locked vocabulary says SAID is Blake3-256 CESR and "Do not invent another digest". The spec's WL "structural" hash also competes with the maintainer's own category-SAID design, and its unsigned, domain-keyed "publishers" contradict the recorded endorsement rule (signed intentional publication by a principal; a mirror or index does not count). Against the stated objective, the indexer in section 5 is itself a seed-list aggregation site, and MAD's design authority says "no required central catalog"; the objective and a checkable done_when are absent from the spec. For registration, mad-discovery/ is currently untracked and not ignored in the workspace repo, with no home ruling, remote or label. The mad precedent ran rulings first (home bpm-5sj.1, structure via bpm-uaj.3, push bpm-m97), then repo, .gitignore, CLAUDE.md sections, epics, icebox chore and memory. A hyphenated label is fine (bpm-core and gym-bp exist); the hyphen rule covers bead ids only. No bead titled "Brainstorming" has ever existed here, and no chore is open: the type is used only for P0 cruft and the one icebox parent.

### backlog-01: The spec's subject (a DCR graph) is not a MAD definition kind

*blocker · conflict · spec section Header l.3; section 2 l.40-55; section 8 Q2 l.148 · skeptic's verdict: **partly***

**Claim.** The spec hashes, publishes and indexes 'MAD definitions (DCR graphs)'. In this workspace a MAD definition is a model, an authorization or an RR. DCR exists only in bpm-core as a derived projection that is never stored, and the workspace instruction forbids folding DCR into MAD. The record therefore answers the spec's own open question 2: there is no stored DCR JSON format from MAD work to match.

**Skeptic's correction.** The core conflict holds and is stronger than reported: a MAD definition is a model, authorization or RR, and MAD's design authority has already reviewed a DCR-graph workflow format and declined it as the contract language (mad-workflow-review.md l.21: "Adopting event-history semantics as MAD's contract language would change the present design"). But it is false that no tool in the workspace emits or stores the artifact, and false that open question 2 is answered "none". bpm-core's `bpm dcr` prints a deterministic JSON projection (events id/label/kind/doc/group/owners; relations type/source/target/rr/origin; a per-event marking map) with committed goldens, and the maintainer's earlier reference workflow-architecture.md section 6 defines the events/role/relations(type, from, to) shape that section 2 copies. Question 2's answer is: yes, two exist, they differ from section 2 and from each other, and MAD's design documents already ruled DCR a derived diagnostic at most.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.3 and l.42
  > Content-addressed MAD definitions (DCR graphs), published via the ARD / AI Catalog standard ... A MAD definition is a DCR graph in JSON:
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.191
  > Do not fold DCR or shared-run behavior into MAD.
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts l.6
  > export interface BaseDefinition { id: string; kind: 'model' | 'authorization' | 'rr'; name: string; summary: string; category: string; curator: string; endorsers: string[]; revision: number; tags: string[];
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.17
  > Its units are the definitions (models, authorizations and above all responsibilities); a runtime instantiates responsibilities
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md l.37
  > Derived, never stored: a role's authorization set; an aggregate's writer within a selection; the trust chain (holds → issuers → root or open seam); the DCR graph.
- bead bpm-vfn.2 (deferred, labels bpm-core + mad), comment 2026-10-17 16:23
  > a DCR projection of an assembly could serve as a derived diagnostic and as the CLI's headless check (reachability, never-accepting, conformance of a rehearsal), never as the runtime.

**Implication.** Phase 1 (schema, normal form, WL hash over 'the relation graph') is designed around an artifact that no tool in the workspace emits or stores, so nothing MAD produces could be published or found. The reverse index matters most for models, because blocks link only through shared models, and the section 2 format cannot represent a model.

**Reviewer's suggested resolution.** Rule before phase 1 what is content-addressed. Either it is MAD's model, authorization and RR documents (sections 2 and 3 are then rewritten and references between documents come into scope), or it is a DCR projection treated as a deliberately separate artifact (the 'MAD definition' wording then changes and CLAUDE.md l.191 is amended).

**What the skeptic checked.** Re-opened every cited source: spec l.3 and l.42; /Users/seriouscoderone/code/bpm/CLAUDE.md l.191; /Users/seriouscoderone/code/bpm/mad/src/domain.ts l.6; /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.17; /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md l.37; bd show bpm-vfn.2 (16:23 comment). All quotes exist and say what is claimed. Then looked for the DCR formats the reviewer said do not exist. Found: (1) /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py l.91-134, `to_payload`, docstring "The deterministic dict form: goldens compare it, ``bpm dcr`` prints it", plus four committed projections in /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/ and a DCR-portal XML export (tests/test_process_export.py); (2) /Users/seriouscoderone/Downloads/workflow-architecture.md section 6 (l.236-262), a DCR YAML format with events id/label/role and relations `type: condition|response|include|exclude|milestone, from, to`, which spec section 2 mirrors; (3) /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md l.3 and l.19-21, MAD's own assessment of that reference. The reviewer's DCR grep covered only mad/src, README and HANDOFF, so it skipped mad/docs.

### backlog-02: A second digest: CIDv1 sha2-256 over JCS against the workspace's SAID (Blake3-256 CESR)

*blocker · conflict · spec section Section 3 l.61-68 · skeptic's verdict: **confirmed***

**Claim.** The spec's identity is a CIDv1 (raw, sha2-256, base32) over a JCS normal form that drops unknown keys. The workspace's recorded identity for the same definitions is a SAID: Blake3-256 CESR, byte-compatible with bpm-core's saidify, with unknown keys refused. The normalization profile is itself an unmade ruling (bpm-nq3.1).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.64-67
  > Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed). 4. Serialize with JCS (RFC 8785) via the `canonicalize` npm package. **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md l.59
  > **SAID** is Blake3-256 CESR matching KERI Saider (dummy `d` is 44 `#`). Do not invent another digest. ... a key the shape does not declare is refused (`UNKNOWN_FIELD`, Ruling 132) before freeze can hash it.
- bead bpm-nq3 (epic, deferred P3, label mad)
  > In: the normalization profile (per bpm-nq3.1 (rule.property-order)) and a Blake3-256 CESR digest compatible with bpm-core's saidify
- bead bpm-nq3.1 (Rule, deferred P3)
  > the profile cannot be frozen before this call, and SAIDs computed first would all change if the ruling went the other way
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.13
  > Precise definitions receive content-derived identities, intended to use SAIDs compatible with the KERI ecosystem.
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.204
  > The locked vocabulary and the refused list live in `bpm-core/AGENTS.md`, not in memories.

**Implication.** mad-hash would mint a second, incompatible identity. 'Hash X' in the index would not be the identity MAD shows or pins, and gym-bp's frozen SAIDs could not be looked up. Every hash changes later if bpm-nq3.1 or the digest choice goes the other way. Spec l.62-64 is also ambiguous on its own terms: if the schema rejects unknown keys there is nothing to drop, and if it accepts them two different files share one hash silently.

**Reviewer's suggested resolution.** Decide whether mad-discovery indexes SAIDs. If yes, mad-hash becomes the bpm-nq3.3 profile and bpm-nq3.1 is ruled first. If no, record why a CID is carried as well, and state that it is a transport address and not the definition's identity.

**What the skeptic checked.** Spec l.61-68; /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md l.59 (quote exact, including "Do not invent another digest"); /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py l.6-21 (blake3, CESR code E); bd show bpm-nq3, bpm-nq3.1, bpm-nq3.3 (quotes exact); mad/HANDOFF.md l.13; CLAUDE.md l.204; gym-bp JSON files carry E-prefixed 44-character SAIDs. No later ruling or memory mentions CID, multihash or sha2 identity (full `bd export` search: zero hits for multiformat, JCS, IPFS). Three caveats that do not change the verdict: (a) "unknown keys refused" and "Do not invent another digest" are bpm-core rules (Ruling 132, bpm-core/AGENTS.md); for MAD they are option (a) of the still-unmade bpm-nq3.1. (b) The SAID is the recorded identity for model, authorization and RR documents; the workspace records no identity at all for a DCR graph (GOAL.md l.37: derived, never stored). (c) The "ambiguous on its own terms" aside is weak: dropping `x-` keys so that two files share one hash is the stated intent of l.64. Additional support not cited: /Users/seriouscoderone/code/bpm/mad/src/services/crypto.ts l.15-25 already has a `canonicalJson` ("not a KERI/SAID implementation"), so JCS would be the third canonical form in the workspace after it and bpm-core/src/bpm_core/normalize.py.

### backlog-03: The 'structural' hash competes with the maintainer's category-SAID design

*decision · overlap · spec section Section 3 l.69-76; section 5 l.126 · skeptic's verdict: **confirmed***

**Claim.** The spec's second hash (Weisfeiler-Lehman over the relation graph, ignoring ids, labels and roles) fills the slot that the backlog and MAD's design documents already assign to category SAIDs. These are a different construction, written up and prototyped by the maintainer: blank only the SAID references, keep names and order.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.69-70
  > `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles. Compute it with Weisfeiler–Lehman color refinement over the relation graph
- bead bpm-nq3.7 (feature, deferred P3, label mad)
  > A category SAID is the SAID of a document with every point-by-SAID reference blanked the way its own SAID field is ... It groups by exact structure, its holes are untyped, and it is a classification key, not an integrity commitment.
- bead bpm-upm.23 (task, deferred P3, label mad)
  > Design structural category and compare under a versioned comparison profile ... the basis document Category-SAIDs.md comes into the tree with bpm-uaj.4 (home.external-docs)
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.94 and l.98
  > A category SAID identifies the template obtained by normalizing designated nested SAID references under a declared profile. ... **Category equality is a structural discovery fact.**
- /Users/seriouscoderone/Downloads/Category-SAIDs.md l.51 and l.57
  > **Anyone can compute it.** It comes from the document alone. No registry, and no agreement on names. ... **Not semantic.** It groups by exact structure. An extra property, or the same properties in a different order, is a different category.

**Implication.** Two different meanings of 'same shape' would exist. The spec's `GET /definition/{cid}/similar` would not reproduce the 'same category' suggestion that MAD's Compare is designed around. The category-SAID basis document is still outside the tree (bpm-uaj.4 is open; mad/docs/references/ does not exist).

**Reviewer's suggested resolution.** Rule whether the second key is the category SAID, the WL shape hash, or both under distinct names. If category SAIDs are in, bpm-nq3.7 and bpm-upm.23 become children or blockers of the discovery epic, and Category-SAIDs.md is brought in-tree first.

**What the skeptic checked.** Spec l.69-76 and l.126; bd show bpm-nq3.7 and bpm-upm.23 (quotes exact, both deferred); /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.92-98; /Users/seriouscoderone/Downloads/Category-SAIDs.md l.25, l.50-59 and l.63 ("Tested with a Python prototype on keripy"); bpm-uaj.4 is open; /Users/seriouscoderone/code/bpm/mad/docs/references/ does not exist. Stronger evidence the reviewer did not quote: mad-ux-design.md l.96, "Categories preserve the surrounding content, including ordering under the chosen serialization profile; normalization must not blank arbitrary strings that happen to resemble identifiers", which is the direct opposite of a hash that ignores ids, labels and roles; and micro-apps-vision.md l.354, where structural search works by "explain[ing] the nested difference". One nuance: on the spec's reference-free documents (l.55) a category SAID equals the document's own SAID (Category-SAIDs.md l.52), so the two constructions only compete once the hashed artifact carries references, that is, after backlog-01 is ruled.

### backlog-04: Discovery already has a planned home and trigger under label mad; the spec starts ahead of its recorded prerequisites

*decision · overlap · spec section Whole spec; section 6 phases · skeptic's verdict: **partly***

**Claim.** Four deferred beads describe this work (bpm-nq3.7, bpm-upm.21, bpm-upm.22, bpm-upm.23), and the icebox names the trigger for a 'Discovery and endorsement' epic: bpm-nq3.5 closing. Everything on that chain is deferred, and the horizon order puts hardening, then the CLI and shared format, before identity.

**Skeptic's correction.** The four beads, the trigger and the deferred chain are as quoted. But the only `blocks` prerequisites of discovery are bpm-nq3.1 and bpm-nq3.2, then bpm-nq3.3, then bpm-nq3.5, then bpm-upm.21, then bpm-upm.22 (bpm-upm.23 needs only bpm-nq3.3). Nothing on that chain depends on bpm-vfn or on bpm-jzi.13. bpm-nq3 itself records how the work starts early: its children stay deferred "until Vibe-code closes or the maintainer pulls them forward (bd undefer the epic and the children, a status change, not a re-tree)". Ruling 5's order covers hardening, the shared format, the CLI, the live view and the docs; it does not mention identity or discovery. So mad-discovery departs from the horizon map's now/next/later labels and runs ahead of the unmade rulings bpm-nq3.1 and bpm-nq3.2 (and bpm-vfn.1 only if the shared file format is the thing hashed); it does not reverse a ruling.

**Evidence.**

- bead bpm-upm (chore 'MAD icebox', deferred P4)
  > Discovery and endorsement (bpm-upm.21 (ice.provenance-panel), bpm-upm.22 (ice.explore-introductions), bpm-upm.23 (ice.structural-compare)) ... (or a new epic when a group comes due: discovery once bpm-nq3.5 (identity.freeze-publish) closes
- bead bpm-nq3.7 (deferred P3) description and notes
  > people find RRs and assemblies by searching their own crowd-sourced tags and categories, and also by deterministic content-addressable identities that show or prove definitions are aligning and coalescing. Also decide how a person publishes MAD creations ... filed for later; needs content identities first (bpm-nq3).
- bead bpm-nq3 (epic, deferred P3)
  > Horizon: later. This epic is itself deferred ... and every child is deferred until Vibe-code closes or the maintainer pulls them forward
- bd dep tree bpm-upm.22
  > bpm-upm.21 ... (deferred) [blocks] ... bpm-nq3.5 ... (deferred) [blocks] ... bpm-nq3.3 ... (deferred) [blocks] ... bpm-nq3.1 ... (deferred) [blocks] ... bpm-nq3.2 ... (deferred) [blocks]
- bd recall mad-horizon-map
  > hardening bpm-jzi now, maintainer gate bpm-jzi.13 ... CLI-first authoring bpm-vfn deferred next ... Reproducible identity bpm-nq3 deferred; icebox bpm-upm.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.128
  > **Order.** First harden the UI and the model's conceptual contours until the maintainer is satisfied. Then choose the storage medium or file format the CLI and UI share
- bead bpm-jzi.13 (open P3) notes
  > Gate still requires maintainer model/live-view verdict; implementation did not provide that verdict.

**Implication.** Built as a fresh tree, mad-discovery duplicates four beads with different semantics and reverses the ruled order (Ruling 5). Its inputs are not settled: definition format (bpm-vfn.1), identity profile (bpm-nq3.1, bpm-nq3.3) and publish semantics (bpm-nq3.2, bpm-nq3.5).

**Reviewer's suggested resolution.** Follow CLAUDE.md l.201 ('Changing direction means un-deferring or re-parenting a few items, never rebuilding the tree'). One option is to pull the identity rulings forward as blockers of a discovery epic and re-parent bpm-nq3.7 and bpm-upm.21 to .23 under it. The other is to record that mad-discovery is an independent experiment on a provisional format and link those beads as related, stating which will be rewritten.

**What the skeptic checked.** bd show bpm-upm, bpm-upm.21, bpm-upm.22, bpm-upm.23, bpm-nq3, bpm-nq3.7, bpm-jzi.13; `bd dep tree bpm-upm.22`; `bd recall mad-horizon-map`; mad/HANDOFF.md l.128 and Ruling 5 (l.191). Every quote exists. The four beads are deferred, the icebox text names the trigger ("discovery once bpm-nq3.5 (identity.freeze-publish) closes"), and every open node on the chain is deferred. What does not hold is the implication that starting now "reverses the ruled order (Ruling 5)".

### backlog-05: Publisher identity: unsigned, domain-keyed listing against principal-signed endorsement

*decision · conflict · spec section Section 4 l.92 and l.100; section 5 l.112-115 and l.120-125 · skeptic's verdict: **confirmed***

**Claim.** The index answers 'who else publishes hash X?' with domains and URNs and has no signing. The existing design defines that answer as endorsers: principals who intentionally signed a publication. It says explicitly that a host, a mirror or an index entry is not one.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.92, l.100, l.120
  > `identifier`: the publisher-domain `urn:air:` URN form ... No signing in v0. The trust manifest is optional, and same-origin keys add no real security. ... PK `hash#<cid>`, SK `pub#<urn>`
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.66
  > Intentional publication or republication is an endorsement under MAD's publication convention. Reposting an unchanged definition adds an attributable endorsement without changing its SAID. Downloading, bookmarking, indexing or automatically mirroring it does not.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.108
  > A mirror or download is not automatically an endorsement. Principal IDs identify contributors; display names are attributed information about them. A retrieval host is not necessarily the author or signer.
- bead bpm-nq3.5 (deferred P3)
  > publish = sign and emit a shareable bundle of frozen definitions with provenance that another MAD instance can import
- bead bpm-upm.22 (deferred P4)
  > intentional republication of the same SAID endorses and a mirror does not; the endorser filter becomes real ... Acceptance: a definition introduced from another instance is findable, its endorsers listed, a mirror not counted.
- /Users/seriouscoderone/.claude/projects/-Users-seriouscoderone-code-bpm/memory/mad-is-a-wallet.md l.11
  > each person holds their own cryptographic identity and is who that identity says they are; nothing in MAD issues or verifies it.

**Implication.** `verified=true` (spec l.114) proves only that the bytes hash to the claim. The count returned is a count of hosts, so it cannot serve as the adoption signal the design relies on (bpm-nq3: 'adoption, not committee, converges definitions'), and a mirror inflates it. Identity by DNS domain also sits badly with the self-held-key model, and durable keys are still an icebox design (bpm-upm.25).

**Reviewer's suggested resolution.** Rule whether an unsigned first cut is acceptable when its rows are labelled as retrieval sources (the vocabulary of mad-ux-design.md l.61-62) and not as publishers or endorsers. Signed publications then become a named later step, blocked on bpm-nq3.5 and bpm-upm.25.

**What the skeptic checked.** Spec l.92, l.100, l.112-115, l.120-125; mad/docs/mad-ux-design.md l.55-66 (l.58 lists "Publications or endorsements, their signing principals and exact targets" separately from l.61 "Retrieval observations" and l.62 "Verification results and the accountable signer, independently of the retrieval host"); mad/HANDOFF.md l.108; bd show bpm-nq3.5, bpm-upm.22, bpm-upm.25; /Users/seriouscoderone/.claude/projects/-Users-seriouscoderone-code-bpm/memory/mad-is-a-wallet.md l.11. All quotes exact. The spec concedes the gap itself (l.100 and section 7 put signing out of scope), which the reviewer's suggested resolution already reflects. Existing code agrees with the design: /Users/seriouscoderone/code/bpm/mad/src/views.ts l.44-45 defines a `Publication` with an `endorser` and an exact `target`, and l.197 tells the reader "The mirror supplies a copy".

### backlog-06: The indexer is itself a seed-list aggregation site; design authority says no central catalog is required; the objective is not in the spec

*decision · conflict · spec section Section 5 l.104-131; section 8 Q4 l.150 · skeptic's verdict: **partly***

**Claim.** Measured against the maintainer's objective (nobody needs to build a protocol aggregation site), section 5 is the one component that is such a site. A publisher is found only if an operator puts its domain in a seed table or another registry already lists it. MAD's recorded discovery model is the opposite shape: local knowledge grown by introductions, with no required central server.

**Skeptic's correction.** The objective is absent from the spec, the seed list is operator-curated (l.107-109, question 4), there is no self-registration endpoint (l.124-128 lists two GETs and POST /search), and phase 4 tests only the project's own catalog. Three parts are overstated. (1) A publisher has three routes into the index, not two: l.111 recurses into nested `application/ai-catalog+json` entries of any already-crawled catalog to depth 3, which is a publisher-to-publisher introduction. (2) MAD's recorded model is not the opposite shape: mad-ux-design.md l.43 has MAD learn "through bootstrapped introductions to available catalogs" and HANDOFF l.106 says "no required central catalog". The spec's per-publisher `/.well-known` catalog, `Agentmap:` line and `Link rel="ai-catalog"` header (l.91-99) fit that model and work with no index at all; only an index that everyone must use would conflict. (3) Phase 4 (l.138-139) is a reviewer-checkable acceptance test; the defect is that it does not exercise the objective, not that a `done_when` is impossible.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.107-109, l.127-128, l.150
  > Seed sources (in a DynamoDB `sources` table or an S3 config file): - a list of domains; - optional ARD registry endpoints ... This makes our indexer itself a valid ARD registry. ... Initial seed domains beyond our own?
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.106
  > An RDF-style knowledge graph is useful as a query projection, with no required central catalog or database engine.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.43 and l.70
  > MAD learns definitions through bootstrapped introductions to available catalogs and retains them locally with provenance. Search operates over that local knowledge. ... This design does not prescribe a database engine or require a central MAD server.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.15
  > Content addressing alone does not discover peers, grant trust or make different definitions interchangeable.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.138-139
  > Crawl, then confirm `GET /hash/<structural>` returns both and `GET /hash/<full>` returns one each.

**Implication.** The spec gives a new publisher no way to become discoverable except through an operator's seed list, which is the curation job of the sites the objective wants to make unnecessary. Its only acceptance check (phase 4) tests the index against the project's own catalog and never tests the objective. An epic for this work would lack the reviewer-checkable `done_when` that CLAUDE.md l.198 requires.

**Reviewer's suggested resolution.** The maintainer writes the objective into the spec and states the indexer's role. It is either a replaceable commodity that anyone can run, with the per-publisher `/.well-known` catalog as the durable part, or a single canonical index. The spec should also say how a publisher enters an index without an operator edit, and add a `done_when` that exercises it.

**What the skeptic checked.** Spec l.86-131 and l.138-150; mad/HANDOFF.md l.15 and l.106; mad/docs/mad-ux-design.md l.43 and l.70. Quotes exact. Confirmed the objective is recorded nowhere: grep of the workspace and a full `bd export` (236 issues, comments included) return zero hits for openhaven, aggregation, ai-catalog, well-known, crawl. Then re-read section 5 against the claim that a publisher is found "only if an operator puts its domain in a seed table or another registry already lists it".

### backlog-07: bpm-n13 publish/pull, with its deferred S3 provider and absorbed registry, covers the same serving layer

*decision · overlap · spec section Section 4 l.86-102; section 5 l.112-115 · skeptic's verdict: **confirmed***

**Claim.** The open epic bpm-n13 already defines publishing as put and get by digest through providers, with S3 named as a later provider (bpm-n13.4, deferred P4), verification on fetch, and the original N13 'registry' story absorbed. mad-discovery's publisher and its crawler's verify step are the same layer for a different format and digest. bpm-n13 is in bpm-core's backlog, which Ruling 5 put on hold.

**Evidence.**

- bead bpm-n13 (epic, open P2, label bpm-core)
  > Provider interface is two operations, put and get by digest. First provider: a local directory. Later: S3, a KERI/OOBI-style endpoint. ... A provider is untrusted by construction: bytes either hash to their name or are rejected.
- bead bpm-n13, original N13 ticket text
  > A registry would list published packages, fetch their SAID documents, and pin them into a workspace as **locked** (non-editable).
- bead bpm-n13.4 (task, deferred P4)
  > Providers beyond disk: S3, a KERI/OOBI-style endpoint ... After the local provider proves the shape. Same two-operation interface.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.90 and l.113-114
  > `/defs/<full-cid>.json`: normalized definition, immutable ... fetch the definition and re-hash it with `mad-hash`; record `verified=true` only if the computed hashes match the claimed ones
- bead bpm-5sj.3 close reason (Ruling 5)
  > its backlog waits until then
- bead bpm-n07.6 (open P3, label gym-bp)
  > gym-bp publishes what it froze to ~/code/bpm/published/ (first publisher), then replaces the vendored attendance/ticketing/membership folders with pulled closures
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.92
  > Prefer one clean implementation over two coexisting ones.

**Implication.** Two publish layers with two identities would coexist, which is the parallel-path shape the greenfield rule treats as cruft. bpm-n13.1 still shows in `bd ready` although its repo's backlog is on hold. bpm-n13 also walks a closure of pointers between documents; the spec publishes only single self-contained documents (l.55 excludes nesting) and has no notion of references.

**Reviewer's suggested resolution.** Rule whether mad-discovery supersedes bpm-n13 (then close or re-scope bpm-n13.1 to .4 and bpm-n07.6 with that reason), or whether bpm-n13 stays the byte transport and mad-discovery is limited to the catalog and index over already-addressed bytes.

**What the skeptic checked.** bd show bpm-n13 (reframe text and original N13 ticket), bpm-n13.1, bpm-n13.4, bpm-n07.6, bpm-5sj.3 close reason; CLAUDE.md l.92; spec l.55, l.90, l.113-114. All quotes exact. `bd ready --exclude-type epic` lists bpm-n13.1 first, as claimed. The original N13 text is a discovery story, not only transport ("The gym owner starts a gym workspace and finds Attendance already in the ecosystem"), which makes the overlap wider than the title says. bpm-n13.1 also records the bpm-core rule that applied to that layer: "Brainstorm before code (BOARD rule)".

### backlog-08: A separate monorepo with its own canonicalization library and a `definitions/` source of truth, against Ruling 5 and the unruled shared format

*decision · conflict · spec section Section 1 l.25-38 · skeptic's verdict: **confirmed***

**Claim.** The spec puts the schema, normal form and hashing of MAD definitions in `packages/mad-hash` and declares `definitions/` in this repo the source of truth. Ruling 5 says the CLI and UI share one TypeScript library and one store. The file format of that store is an unmade ruling (bpm-vfn.1), gated on the open review bpm-jzi.13, and the normalization profile is assigned to bpm-nq3.3 inside mad.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.32 and l.36
  > mad-hash/      # library + CLI: canonicalize + hash DCR definitions ... definitions/     # the user's own MAD definitions (source of truth, JSON)
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.124 and l.127
  > A UI edit goes where the CLI writes; both use one store. ... **One library, shared.** The CLI and the UI share nearly everything (domain, validation, rule evaluation, rehearsal) as one TypeScript library.
- bead bpm-vfn.1 (Rule, deferred P3; depends on open bpm-jzi.13)
  > Decision for the maintainer once bpm-jzi.13 says the model is ready. ... Criteria: live view latency, AI-writability, diffability, a path to SAID-addressed freezing (bpm-nq3), browser and CLI access.
- bead bpm-nq3.3 (deferred P3, label mad)
  > a normalization profile for Model, Authorization and RR per bpm-nq3.1 (rule.property-order), with a Blake3-256 CESR digest (E prefix) that matches bpm-core's saidify byte-for-byte

**Implication.** A second definition format, a second validation schema and a second store appear before the first is ruled. Whichever lands second is rewritten, or both persist as parallel implementations.

**Reviewer's suggested resolution.** Decide whether canonicalization and hashing belong to the shared MAD library (they live in mad/ and mad-discovery consumes them), and whether `definitions/` is an export target fed by MAD and not a source of truth. Alternatively, scope mad-discovery to treat definition bytes and their identity as opaque inputs.

**What the skeptic checked.** Spec l.25-38; mad/HANDOFF.md l.124, l.127 and Ruling 5; bd show bpm-vfn.1 (deferred, depends on open bpm-jzi.13) and bpm-nq3.3 (label mad). Quotes exact. Two pieces of support the reviewer did not cite: the maintainer's 2026-10-18 comment on bpm-vfn.1, "the RRs are JSON Schemas ... the type of RR is a schema, and making an RR is like filling in the schema values", which is the only recorded statement of the intended file format and points away from section 2; and bd show bpm-buw.5, which already plans a standalone Node verifier in mad/verify/ reusing "a copied canonical-JSON routine", so a hashing library outside mad/ would be the second out-of-library consumer of canonical bytes.

### backlog-09: 'Publish' is used for unfrozen, unsigned hosting while its ruling (bpm-nq3.2) is pending

*decision · conflict · spec section Section 4 l.86-102 · skeptic's verdict: **partly***

**Claim.** The workspace reserves 'publish' for serving frozen bytes, and has an open ruling on whether MAD adopts the freeze/publish split, with an instruction to rename neither side until then. The spec names a package `publisher` and a command `npm run publish` that serve working files from a folder with no freeze step.

**Skeptic's correction.** The spec's "publish" is not a third meaning. Serving hash-named, immutable bytes at an endpoint (l.90) is the bpm-core reserved sense: GOAL.md l.12 "Serving those bytes at an endpoint — publishing" and bpm-n13 "the reserved word for serving frozen bytes at an endpoint". It also serves the normalized form, not the working files. What is missing against the record: (a) a named freeze boundary, since identity is computed inside `npm run publish` and the source folder stays mutable with nothing pinned; (b) signing, which MAD's intended publish includes (bpm-nq3.5: "publish = sign and emit a shareable bundle of frozen definitions with provenance"); (c) the fate of a superseded CID and its catalog entry, which l.90-91 and l.102 leave unstated. CLAUDE.md l.211 ("rename neither side") restricts renaming MAD's and bpm-core's existing words; it does not bar a new project from the word, though bpm-nq3.2 remains the bead that settles whether freeze is a separate verb.

**Evidence.**

- /Users/seriouscoderone/code/bpm/CLAUDE.md l.211
  > Vocabulary: *freeze*, not *publish* ... the `Rule: publish vs freeze` bead (bpm-nq3.2, deferred under Reproducible identity) settles whether MAD adopts the freeze/publish split. Until it closes, rename neither side.
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md l.45
  > **Publish** is serving frozen bytes, above freeze.
- bead bpm-nq3.2 (Rule, deferred P3)
  > freeze = the immutability/identity boundary and publish = serving or endorsing frozen bytes; MAD uses 'publish' for both, and today its Publish is a local unsigned preview.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.88-91 and l.102
  > Input: `definitions/*.json`. ... `/defs/<full-cid>.json`: normalized definition, immutable ... catalog with one entry per definition ... Command: `npm run publish` builds, diffs against S3, uploads, and invalidates the catalog path only.

**Implication.** The spec's 'publish' is a third meaning of the word. Because the input is a mutable folder, editing a definition silently produces a new CID. The spec does not say whether the superseded `/defs/<old-cid>.json` and its catalog entry remain or are removed, so 'immutable' and 'one entry per definition' are ambiguous.

**Reviewer's suggested resolution.** Rule at least the bpm-core half of bpm-nq3.2 (publish means serving frozen bytes) before the package and command are named. State in the spec what happens to superseded CIDs.

**What the skeptic checked.** CLAUDE.md l.211; bpm-core/AGENTS.md l.45; bpm-core/docs/GOAL.md l.12; bd show bpm-nq3.2, bpm-nq3.5, bpm-n13, bpm-n13.1; spec l.86-102. Quotes exact. Compared the spec's use of the word against each recorded meaning.

### backlog-10: Version markers ('v0', `"mad": "0"`) against the no-versioning rule

*note · defect · spec section Section 2 l.40 and l.46; section 7 l.141 · skeptic's verdict: **confirmed***

**Claim.** The spec labels its format 'v0' and puts a `"mad": "0"` field inside the hashed document. The workspace rule treats version names and version fields as cruft until something outside depends on them. MAD's design also says versioned normalization conventions are part of reproducible identity. The spec does not say which of the two this field is.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.40 and l.46
  > ## 2. Definition format (v0 — confirm with user) ... "mad": "0",
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.14
  > No versioning while greenfield: no release tags, no version numbers bumped for their own sake, no `v1`/`v2` names for things that coexist. A tag or a version is cruft until something outside this workspace depends on it.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.189 (Ruling 4) and l.15
  > no version fields or version predicates in stored data ... Normalization and versioned conventions are part of making this reproducible.

**Implication.** Because `mad` is a declared key, it is hashed (l.63-64 drop only unknown and `x-` keys), so changing it changes every full hash. Whether it identifies the normalization profile (defensible once third parties crawl it) or is a format version (cruft under l.14) decides whether it stays.

**Reviewer's suggested resolution.** State in section 2 what the field identifies. If it is the normalization profile, name it as that; otherwise remove it and the 'v0' labels.

**What the skeptic checked.** Spec l.40, l.46, l.100, l.141; CLAUDE.md l.14; mad/HANDOFF.md l.15 and l.189. Quotes exact. Two scope notes: Ruling 4 (HANDOFF l.189) is about browser stores ("One undated key per browser store"), so only CLAUDE.md l.14 is the general rule; and l.14's own exception ("until something outside this workspace depends on it") is met by this project by design, because third parties would crawl the hashed bytes. mad-ux-design.md l.88 and l.94 already speak of a "declared language profile" and a "declared profile", which supports naming the field as a profile identifier. The reasoning that a declared `mad` key is hashed into `full` but not `structural` follows from l.63-73.

### backlog-11: Precedent: what 'adding a project' meant for mad (rulings first, then mechanics)

*note · precedent · skeptic's verdict: **partly***

**Claim.** Onboarding mad ran in this order. (1) Rulings first: the home ruling bpm-5sj.1 (nested repo, gitignored, never gitlinked, remote named and created private, where docs, generated output and external references live); the structure ruling recorded in bpm-uaj.3's close reason (label, epic meaning, icebox); the push go-ahead bpm-m97, now a standing rule for every repo in bpm/. (2) Repo: created with gh, private, branch main, initial commit containing README.md, HANDOFF.md and docs/. (3) Root .gitignore line, added in the same commit as the CLAUDE.md pointer. (4) CLAUDE.md: Beads-shape bullets (epic meaning per label, Rule beads, labels, P1 cap and priority meaning, next-task and decisions queries, memory pointers), the Architecture bullet, the Build & Test block, the gitignore line under Operating rules, the vocabulary guard and the Working-style repo list; one line in ~/code/CLAUDE.md, which is generic today. (5) Beads: a 'Give X a home' epic (bpm-uaj) for the onboarding tasks; horizon epics; a rulings-queue epic whose `Rule:` children block the work they gate; one deferred icebox chore; a key-to-id map comment; a P1-cap check. (6) Memory: `bd remember mad-horizon-map`, plus existing memories updated in place. (7) Rulings mirrored as numbered lines under 'Rulings' in the repo's HANDOFF.md. (8) Follow-ups filed: CI, lint and Node pin (bpm-uaj.6); external documents in-tree (bpm-uaj.4).

**Skeptic's correction.** The checklist items are right; the order is not. Recorded order on 2026-10-15: (a) an accepted plan carrying the label and epic decision (bpm-uaj.3: "apply the claude_md_amendments of the accepted plan", "decision 0"); (b) the bead structure (five horizon epics, rulings queue, icebox, backfill, key-to-id map; bpm-uaj.2: "by the session that created the structure"), the CLAUDE.md conventions committed in a49c87c at 08:09 with the mad bullet "neutral on git home until bpm-5sj.1", and the mad-horizon-map memory; (c) rulings bpm-5sj.1, bpm-5sj.2 and bpm-m97 closed (407d7fb, 08:10); (d) the repository created private with gh, the first commit, and the .gitignore line plus concrete CLAUDE.md pointer in ba00eb8 at 08:46. The home ruling gated only the repository and first-commit step; beads, label and CLAUDE.md conventions came before it. Also, mad was a month of existing untracked code being given a home. gym-bp is the closer precedent for a project created from nothing: a brainstorm task (bpm-n07.1) blocking authoring, and a mechanical stand-up task (bpm-n07.2) under an ignore pattern that already existed. AGENTS.md l.7 was added later, in 5acf31c on 2026-10-20.

**Evidence.**

- bead bpm-5sj.1 close reason
  > mad/ becomes its own nested git repository under bpm/, gitignored at the bpm root like bpm-core/ and gym-bp/, never gitlinked. Remote: github.com/seriouscoderone/mad (does not exist yet; create it private).
- bead bpm-uaj.1 close reason
  > mad/ is a nested git repo, github.com/seriouscoderone/mad (private, created with gh), branch main, initial commit 5f8f142 with 57 files (src/, tests/, shell.html, build.mjs, package.json, package-lock.json, tsconfig.json, README.md, HANDOFF.md, sources/, docs/); root .gitignore now lists mad/ beside bpm-core/ and gym-bp/, never gitlinked.
- bead bpm-uaj.3 close reason
  > bpm/CLAUDE.md Beads-shape bullets (epic per label, Rule: beads, labels incl. mad, P1 cap across labels with P2 now/P3 next/deferred later for mad, next-task query + decisions queue bd list --parent bpm-5sj, three memories), Architecture mad/ bullet (neutral on git home until bpm-5sj.1), Build & Test mad block, gitignore line, publish/freeze guard; ~/code/CLAUDE.md one mad/ line; bd remember mad-horizon-map stored. ... Structure ruling recorded as applied default: five horizon epics + MAD icebox under label mad
- bead bpm-m97 close reason
  > Generic rule: while the workspace is greenfield, every repo in bpm/ (bpm, bpm-core, gym-bp, and mad once it has its repo) commits and pushes proactively, including bd dolt push, without asking
- bead bpm-uaj description
  > Order: bpm-5sj.1 (rule.home) -&gt; bpm-uaj.1 (home.commit) -&gt; cruft-sweep and ci-lint
- git -C /Users/seriouscoderone/code/bpm show --stat ba00eb8
  > chore: mad/ is a nested repo (seriouscoderone/mad); ignore it, point CLAUDE.md at mad/docs ... .gitignore | 1 + ... CLAUDE.md | 8 ++++----
- /Users/seriouscoderone/code/bpm/AGENTS.md l.7 and /Users/seriouscoderone/code/bpm/CLAUDE.md l.8
  > When working in a nested repo (`bpm-core/`, `gym-bp/`, `mad/`), also read its `AGENTS.md` and `CLAUDE.md` when present. ... sharing `main` in every repository of this workspace: this repo, `bpm-core/`, `gym-bp/` and `mad/`.

**Implication.** Registering mad-discovery touches the same named places: .gitignore l.3-6; CLAUDE.md l.8, l.174-183, l.187-193, l.198-204 and l.208; AGENTS.md l.7; the mad-horizon-map memory. CLAUDE.md already carries an uncommitted three-line diff in Architecture Overview (`git status` shows ` M CLAUDE.md`), so a registration edit will mix with it unless that diff is committed first.

**Reviewer's suggested resolution.** Reuse the order: a home `Rule:` bead, then repo creation and the .gitignore line, then the CLAUDE.md and AGENTS.md edits, then the epic, icebox and memory.

**What the skeptic checked.** bd show bpm-uaj, bpm-uaj.1, bpm-uaj.2, bpm-uaj.3, bpm-uaj.4, bpm-5sj, bpm-5sj.1, bpm-m97, bpm-n07.1, bpm-n07.2; `git show --stat` for a49c87c, 407d7fb, ba00eb8 with timestamps; /Users/seriouscoderone/code/bpm/AGENTS.md l.7; `git diff CLAUDE.md` (three changed lines, l.187, l.189, l.191). Every quoted close reason exists and each checklist item is real. The stated sequence is not what the record shows.

### backlog-12: mad-discovery/ is untracked and not ignored in the workspace repo; no home ruling, remote or visibility is on record

*decision · gap · skeptic's verdict: **confirmed***

**Claim.** The folder sits in the workspace repo's tree as an untracked path that no .gitignore pattern matches, and it holds no .git, README, HANDOFF, CLAUDE.md or AGENTS.md. The mad precedent needed a ruling for exactly this (nested repo or not, remote name, private or public) before the first commit.

**Evidence.**

- git -C /Users/seriouscoderone/code/bpm status --short; git check-ignore -v mad-discovery (exit 1, no output)
  > ?? mad-discovery/
- /Users/seriouscoderone/code/bpm/.gitignore l.3-6
  > bpm-core/
  > gym-bp/
  > *-bp/
  > mad/
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.187 and l.208
  > `~/code/bpm/` is the **workspace repo**: it tracks work and shared configuration, never code. ... **Never** gitlink a nested repo: `bpm-core/`, `gym-bp/`, `*-bp/` and `mad/` stay in `.gitignore`.
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.10
  > Proactively commit and push as work is done. You do not need to ask before committing or pushing to `origin`
- bead bpm-uaj.1 description
  > If nested: add mad/ to the bpm root .gitignore and never gitlink it; add a remote only if the maintainer names one
- bead bpm-n07.2 close reason
  > gym-bp created (seriouscoderone/gym-bp, private)

**Implication.** Under the proactive-commit policy an agent could commit the spec into the workspace repo, or run `git init` in the folder and later stage it as a gitlink. Three things are undecided. (a) Whether it is a nested repo or a package inside mad/, which Ruling 5's single-library direction would favour. (b) The remote name. (c) Visibility: mad and gym-bp were created private, while this project's output is public by design.

**Reviewer's suggested resolution.** File and rule a home bead in the style of bpm-5sj.1 before any commit. If the answer is a nested repo, add `mad-discovery/` to .gitignore before `git init`.

**What the skeptic checked.** `git status --short` (`?? mad-discovery/`); `git check-ignore -v mad-discovery` exits 1; /Users/seriouscoderone/code/bpm/.gitignore l.3-6 (the `*-bp/` pattern does not match); `ls -la` shows only MAD-DISCOVERY-SPEC.md; CLAUDE.md l.10, l.187, l.208; bd show bpm-uaj.1 and bpm-n07.2. Filled the reviewer's unchecked gap with a read-only `gh` call: `gh repo view seriouscoderone/mad-discovery` returns "Could not resolve to a Repository", and `gh repo list` shows bpm, bpm-core, gym-bp and mad all PRIVATE. A full `bd export` has zero occurrences of "mad-discovery", so no home ruling, label or bead exists.

### backlog-13: Conventions a new label's epic and children must follow, and where discovery belongs

*decision · fact · skeptic's verdict: **confirmed***

**Claim.** Conventions (CLAUDE.md l.198-204): an epic is a closable workstream with a reviewer-checkable `done_when`, and its meaning is defined per label (a frozen selection for bpm-core and gym-bp, a horizon for mad). No meaning exists for a new label, so l.198 must be extended. `Rule:` beads are decisions: the close reason is the ruling, they are mirrored as numbered lines under 'Rulings' in mad/HANDOFF.md, and they block what they gate. Everything else is a task or bug. There is one deferred chore per icebox. Labels are per repo, children inherit the label, and a bead that spans repos carries each label. P1 is capped at three across all labels, and none is open now. For mad, P2 means now, P3 next, deferred later; a new label needs its own statement. `blocks` is for real dependencies only. `--id` and `--parent` cannot be combined, and an id never gets a second hyphenated segment. The hyphen rule covers bead ids only: the labels bpm-core and gym-bp are hyphenated and in use, so a `mad-discovery` label is fine, while an explicit id such as bpm-mad-discovery is not. `--label` matches exactly, so `--label mad` will not pull in `mad-discovery`. The next-task query at l.202 lists the labels by name and needs the new one. On where discovery belongs: the existing structure files all of it under mad (bpm-nq3.7, bpm-upm.21 to .23), while the per-repo label rule gives a separate repo its own label.

**Evidence.**

- /Users/seriouscoderone/code/bpm/CLAUDE.md l.198
  > Epic = a closable workstream with a `done_when` a reviewer can check. For `bpm-core` and `gym-bp` it is one frozen connected-closed **selection** others can pin ...; for `mad` it is one horizon (ids in the `mad-horizon-map` memory).
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.199
  > Labels are `bpm-core`, `gym-bp` and `mad`, plus `cruft` on cruft chores ...; `mad` covers the Micro App Designer and its documents ... Children inherit the parent's label. A bead that spans repos carries each repo's label
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.201-203
  > Priority 1 is for what `bd ready` should surface now, three at most across all labels. ... Next-task query: `bd ready --exclude-type epic --label <gym-bp|bpm-core|mad>` ... `--id` and `--parent` cannot be combined on one command. **Never** add a second hyphenated segment (`bpm-n07-gym`): the prefix extractor misreads it and later breaks `bd doctor` and `bd rename-prefix`.
- bd label list-all (run from /Users/seriouscoderone/code/bpm)
  > bpm-core  (69 issues)  cruft     (14 issues)  gym-bp    (16 issues)  mad       (158 issues)
- bead bpm-m97 description
  > Labels: bpm-core, gym-bp (not mad: nothing of MAD is committed, and labels are per repo).
- bd list --help
  > -l, --label strings                Filter by labels (AND: must have ALL). ... --label-pattern string         Filter by label glob pattern
- bead bpm-5sj (epic, open; 7/7 children closed)
  > Only rulings that some non-deferred bead waits on are children here ... 7/7 complete (100%) — eligible for close

**Implication.** The label follows from the home ruling. A nested repo means a new label `mad-discovery`, with beads that change MAD's identity, format or publish semantics carrying `mad` as well. A build inside mad/ means label `mad`, one more horizon epic and no new label. Either way the spec's four open questions, and the rulings in the findings above, are `Rule:` beads that block the phase tasks. It is undecided where a non-mad label mirrors its rulings: l.198 names only mad/HANDOFF.md. bpm-5sj is titled for MAD work and is eligible for close.

**Reviewer's suggested resolution.** Decide the label together with the home. Extend CLAUDE.md l.198, l.199, l.201 and l.202 for it. Create the epic with a `done_when` taken from the objective and from phase 4 (spec l.138-139), and one `Rule:` bead per open question, each blocking the phase it gates.

**What the skeptic checked.** CLAUDE.md l.198-204 read in full; `bd label list-all` (bpm-core 69, cruft 14, gym-bp 16, mad 158); bd show bpm-m97 and bpm-5sj (7/7 closed, eligible for close). Tested exact label matching read-only: `bd list --all --label bpm` and `--label gym` return nothing while `--label mad` returns 158, so `--label mad` will not pull in `mad-discovery`. No open P1 exists under any label. The hyphen rule at l.203 names bead ids only. A second precedent for label-follows-repository that the reviewer did not cite: bpm-n15, "Add the repo label when a directory-bp folder exists".

### backlog-14: No 'Brainstorming:' beads have ever existed; chore type is reserved for cruft and the icebox

*note · fact · skeptic's verdict: **confirmed***

**Claim.** No. `bd search Brainstorming --status all` returns nothing. The nearest precedent is three single task beads titled 'Brainstorm &lt;topic&gt;: &lt;what to settle&gt;': bpm-0rm.1 and bpm-n07.1 (closed) and bpm-n13.1 (open). Each is a child of its epic, has no step children, and blocks the build tasks. Chores: zero are open. Two are deferred: bpm-bhb (a P0 cruft chore) and bpm-upm (the MAD icebox parent). Thirteen are closed, all cruft removal. The installed beads-superpowers brainstorming skill would create a 'Brainstorming: &lt;topic&gt;' task with step children of type chore, and would write its spec to `.internal/specs/`. This workspace has no precedent for any of that.

**Evidence.**

- bd search Brainstorming --status all (run from /Users/seriouscoderone/code/bpm)
  > No issues found matching 'Brainstorming'
- bd search Brainstorm --status all; bd list --all --parent &lt;each id&gt;
  > bpm-0rm.1 [P1] [task] closed ... bpm-n07.1 [P1] [task] closed ... bpm-n13.1 [P2] [task] open ... Issue 'bpm-n13.1' has no children
- bd list --status open -t chore; bd list --status deferred -t chore; bd list --all -t chore
  > No issues found. ... ❄ bpm-bhb P0 cruft: bpm-core keeps two normative design docs ... ❄ bpm-upm P4 MAD icebox ... Total: 15 issues (0 open, 0 in progress)
- /Users/seriouscoderone/.claude/plugins/cache/anthropic-plugin-directory/beads-superpowers/0.16.0-35fe0d121bf7/skills/brainstorming/SKILL.md l.24 and l.31
  > first `bd create "Brainstorming: <topic>" -t task` (the permanent session bead ...), then author each checklist step as JSONL (one issue per line, `"issue_type":"chore"` ... save to `.internal/specs/YYYY-MM-DD-<topic>-design.md` and commit
- /Users/seriouscoderone/code/bpm/CLAUDE.md l.198 and l.142-143
  > Everything else is a `task` or `bug`. One `chore` per icebox, deferred ... one chore per item at P0 with the `cruft` label

**Implication.** Step children created as chores would be the first chores that are neither cruft nor an icebox. Unlabeled and unparented, they would surface in plain `bd ready`, and they would blur the rule that an open chore means cruft to do first. A `.internal/specs/` file in the workspace root would land in the repo that 'never tracks code'. Existing plans live in mad/docs/plans and bpm-core/docs/superpowers. Separately, CLAUDE.md l.198 cites an 'existing' icebox chore for bpm-core and gym-bp that is not in the database: the bpm-core icebox items are standalone deferred tasks (bpm-n08 to bpm-n12).

**Reviewer's suggested resolution.** If a brainstorm bead is wanted, follow precedent: one task 'Brainstorm mad-discovery: &lt;questions&gt;' under the epic, with the label, blocking phase 1. If the skill's step beads are used, give them the label and the parent and close them when done.

**What the skeptic checked.** `bd search Brainstorming --status all` (none); `bd search Brainstorm --status all` and `bd list --all --title-contains brainstorm` (bpm-0rm.1, bpm-n07.1, bpm-n13.1, each with no children); `bd list --all -t chore` (15 total: bpm-bhb and bpm-upm deferred, 13 closed cruft chores, none open); /Users/seriouscoderone/.claude/plugins/cache/anthropic-plugin-directory/beads-superpowers/0.16.0-35fe0d121bf7/skills/brainstorming/SKILL.md l.24 and l.31; CLAUDE.md l.143 and l.198; no .internal/ directory at the workspace root or in mad/; bpm-n08 to bpm-n12 are standalone deferred tasks with no icebox parent. One correction to the implication: per SKILL.md l.24 each step chore gets a parent-child dependency on the session bead, so it is the session bead that would be unparented and unlabeled; the step chores would still show in plain `bd ready`. Where precedent brainstorms put their spec: bpm-0rm.1 says "a short spec (bpm-core docs/superpowers/specs/ or gym-bp README)".

### backlog-15: Memories: no discovery horizon exists; identity and discovery are recorded as later

*note · fact · skeptic's verdict: **confirmed***

**Claim.** Thirteen bd memories exist, and none matches 'discovery' or 'DCR'. mad-horizon-map lists the horizons with no discovery entry and with Reproducible identity deferred, so discovery work sits behind bpm-nq3 or in the icebox. mad-decentralized-runtime records that MAD has no external transport, so nothing in MAD can consume a remote catalog or index today. backlog-map still says the labels are bpm-core and gym-bp, which predates mad. package-selection-framing records that what others pin in the bpm-core lineage is a frozen selection SAID plus the cards it names, a multi-document closure that the spec's single-document catalog entries cannot express. mad-authority-proposal matches 'registry' only for grants ('no global live registry') and does not bear on definition discovery.

**Evidence.**

- bd recall mad-horizon-map
  > Home bpm-uaj; Rulings bpm-5sj; hardening bpm-jzi now, maintainer gate bpm-jzi.13 ... CLI-first authoring bpm-vfn deferred next ... Honest runtime bpm-buw; Reproducible identity bpm-nq3 deferred; icebox bpm-upm.
- bd recall mad-decentralized-runtime
  > No live global grants, no central workflow/illustrative engine. ... No KERI runtime or external transport/encryption/key rotation.
- bd recall backlog-map
  > Run bd from ~/code/bpm. Labels: bpm-core, gym-bp. Next-task query: bd ready --exclude-type epic --label &lt;repo&gt;.
- bd recall package-selection-framing
  > Package is that frozen list plus the cards it names when compose is connected-closed; not a kind, not a SAD. ... Pin = digest in a pointer
- bd memories discovery; bd memories DCR
  > No memories matching "discovery" ... No memories matching "dcr"

**Implication.** If a discovery epic is created, mad-horizon-map is the memory to update in place (CLAUDE.md l.204), and backlog-map's label list is already stale. The memories support treating discovery as mad-lineage work that follows identity, not as a free-standing start.

**What the skeptic checked.** `bd memories` (13 entries); `bd memories discovery`, `DCR`, `hash` (no match); `bd recall` of mad-horizon-map, mad-decentralized-runtime, backlog-map, package-selection-framing, mad-authority-proposal. All quotes exact. One sourcing note: the "no external transport" line in mad-decentralized-runtime is about actor messaging, not catalog retrieval. The conclusion still holds on better evidence: /Users/seriouscoderone/code/bpm/mad/README.md l.118, "No network discovery or OOBI resolution, remote transport ... is implemented"; mad/src contains no `fetch(` call; Explore reads the compiled-in `CATALOG` (mad/src/catalog.ts l.1041) plus local drafts (mad/src/ui.ts l.83).

### backlog-16: Other beads examined: verdict for each

*note · fact · skeptic's verdict: **partly***

**Claim.** bpm-n15 (epic, open P3, no label) is a business-domain directory of places, with no overlap. bpm-950 (epic, deferred P4, no label) is the 'publishing in the KERI sense' layer above bpm-core; mad-discovery lands in that layer but is not KERI-sense (no OOBI, no signing). bpm-vfn (epic, deferred P3) is a dependency through bpm-vfn.1, the shared format. bpm-5sj (rulings queue, open, all seven children closed) has no ruling about discovery, publishing targets or hosting. bpm-n11 (deferred P4) is the DCR nesting and time icebox, with no overlap. bpm-upm.25 (deferred P4, durable keys) is a prerequisite for any signed publication. bpm-upm.26 (deferred P4, KERI adapter with OOBI resolution) is the recorded later path for introductions. bpm-jzi.33 (closed) already put category and tags on drafts and keeps publication discovery metadata separate from the definition. bpm-buw.4 (open P3) uses 'publication' for runtime messages and rules out fetching from a shared store, so it does not overlap. bpm-9h5 and bpm-uaj.13 matched on words only.

**Skeptic's correction.** Each listed verdict is right, but "nothing else in the 236-bead database duplicates the spec" is not. Three overlapping items were left out. bpm-nq3.4 (deferred, "Demo criterion 1: two independent authors produce the same address definition and SAID") is the already-filed form of the spec's phase 4 and expects the opposite result on a rename. bpm-nq3.6 (deferred, "Rule: whether assemblies or selections get frozen SAIDs others can pin") decides whether a multi-role composition has an identity to publish at all. bpm-8wj and bpm-hb4 (both closed, labelled mad, created with today's work) produced /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md, the newest recorded position on DCR, RDF catalogs and content-addressed discovery.

**Evidence.**

- bead bpm-n15
  > Not N13 (package **registry**: find Attendance in the ecosystem). This is a **Directory** package: listings of places / businesses.
- bead bpm-950 title; /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md l.12
  > Layers above bpm-core: organization and occupancy, the enterprise runtime, publishing in the KERI sense ... Serving those bytes at an endpoint — *publishing*, in the KERI sense — is a runtime concern above this project.
- bead bpm-upm.25
  > Design key custody and rotation, introduction and discovery of keys between actors as messages
- bead bpm-upm.26
  > AIDs for principals, ACDC for grants and attestations, OOBI resolution, encryption, host isolation, and the signature scheme choice; MAD authoring and simulation stay KERI-agnostic. Needs the SAID profile first.
- bead bpm-jzi.33 (closed)
  > Expose the existing fields on draft metadata, preserve published read-only behavior, and keep publication discovery metadata distinct.
- bead bpm-buw.4
  > nothing is fetched from a shared store and the observer has no shortcut
- bead bpm-n11
  > Same protocol. Do not invent a second engine.

**Implication.** Beyond the beads in backlog-03, -04, -05, -07 and -08, nothing else in the 236-bead database duplicates the spec. The discovery-related design that exists is consistently introduction-based and identity-first. MAD definitions already carry `category`, `tags`, `curator` and `endorsers` fields (mad/src/domain.ts l.6) that the spec's catalog entry (l.92-98) does not use.

**What the skeptic checked.** bd show bpm-n15, bpm-950, bpm-n11, bpm-jzi.33, bpm-buw.4, bpm-upm.25, bpm-upm.26, bpm-vfn, bpm-5sj; bpm-core/docs/GOAL.md l.12; total of 236 issues confirmed. Every per-bead verdict in the list holds. Then swept the remaining bpm-nq3 children and everything created after 2026-10-20, and searched a full `bd export` including comments.

### What the skeptic added (backlog)

**Spec question 2 has a positive answer: two DCR serializations exist, and MAD's design authority already declined one as its contract language** *(blocker)*

The first reviewer reported that no DCR format exists to match. Two do. bpm-core's `bpm dcr` prints a deterministic JSON projection with committed goldens, and the maintainer's earlier reference workflow-architecture.md defines the events/role/relations(type, from, to) format with the same five relation types that spec section 2 reproduces. MAD's "Workflow assessment", a design-authority document named in HANDOFF l.144, reviewed that reference and kept DCR out of MAD's contract language. Today's comparison document repeats the position. So section 2 is not a new format awaiting confirmation; it is a format the record has already assessed and set aside for MAD.

Evidence: /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py l.91-97: "The deterministic dict form: goldens compare it, ``bpm dcr`` prints it. Events sorted by id, relations by (source, target, type, rr, origin)"; goldens in /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/ (attendance.json, sitting.json, sitting_two_providers.json, trust-root.json). /Users/seriouscoderone/Downloads/workflow-architecture.md l.14 "Express workflows as DCR Graphs (Section 4), using the textual format in Section 6" and l.257 "{ type: condition|response|include|exclude|milestone, from: &lt;event_id or [ids]&gt;, to: &lt;event_id or [ids]&gt;" (bpm-uaj.4 lists this file to bring in-tree). /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md l.3 "They do not describe the same executable language", l.19 "An event having happened is not sufficient evidence for a later act", l.21 "DCR could describe local process behavior or a derived diagnostic projection. Adopting event-history semantics as MAD's contract language would change the present design". /Users/seriouscoderone/code/bpm/mad/docs/mad-comparison.md l.68 (untracked in mad/, saved today under closed beads bpm-8wj and bpm-hb4): "DCR's execution semantics track executed, included, and pending events; MAD checks locally received and accepted facts and standing." Also mad/HANDOFF.md l.92: "A hidden global record saying that an Approve node ran earlier is insufficient."

**The spec's `full` hash must change when a label is renamed; the workspace's one sourced identity rule says a rename must not change identity** *(decision)*

Spec l.82 makes it a required test that renaming IDs or labels changes `full`. The record's single sourced rule about identity, repeated in three beads and the vision document, is that display names sit outside the committed definition and a rename leaves the identity unchanged. bpm-nq3.4, which the first reviewer did not report, is the already-filed version of the spec's phase 4 demonstration and asserts the opposite outcome. Under the spec, two publishers of the same definition who label it differently would never meet on `full`, and would meet only on the loose `structural` hash, which defeats the "who else publishes X" question for exact definitions.

Evidence: /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md l.82: "renaming IDs/labels changes `full` but not `structural`". bd show bpm-nq3.1: "The one sourced rename rule either way: different local display names do not change the SAID (micro-apps-vision.md l.352)". bd show bpm-nq3.3 acceptance: "renaming a definition keeps its SAID and a constraint change changes it". bd show bpm-nq3.4: "then rename a label (SAID unchanged) and add a constraint (SAID changes)". /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.58: "Local display names and catalog annotations can remain outside the committed definition, while its fields, constraints, and references stay inside"; l.352: "Different local display names do not change it. A meaningful constraint change does."

**Unit of publication: the spec publishes a whole multi-role process graph; the record says the RR is the unit and an assembly's identity is an unmade ruling** *(decision)*

A section 2 document carries events for several roles in one graph with one marking, which is the shape of an assembly or selection, not of a responsibility. The record states that responsibilities are what a runtime instantiates and what people find, that assemblies are only a way to present and find them, that blocks never reference one another, and that whether an assembly or selection gets an identity at all is the deferred ruling bpm-nq3.6. The first reviewer did not report bpm-nq3.6. In the maintainer's own vocabulary the "protocol" of the stated objective is the set of definitions, above all RRs, so an index keyed on whole-process graphs would not list the things a protocol reference site lists.

Evidence: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.17: "The language is a protocol language. Its units are the definitions (models, authorizations and above all responsibilities)"; l.58: "RRs are MAD's real output ... it can be published, but no runtime instantiates an assembly. Blocks link only through shared models." /Users/seriouscoderone/.claude/projects/-Users-seriouscoderone-code-bpm/memory/mad-assemblies-link-by-models.md l.11: "as far as the protocol is concerned an assembly is a transient/less important thing... its the RRs that are being instantiated". bd show bpm-nq3.6 (deferred): "Options: definitions only; assemblies freeze as pinnable packages; a selection inside an assembly freezes while placements stay local." /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md l.25: "A pinned selection is not a mandatory global workflow definition ... MAD pins independently addressable models and RRs." Spec l.48: one `events` array with a `role` per event.

**Deploying, spending and going public have no rule or precedent here; the two facts the first reviewer left unchecked are now checked** *(decision)*

The standing go-ahead bpm-m97 covers commit, push and `bd dolt push` only. Nothing in the workspace authorizes or describes creating cloud resources, incurring cost or making output public, and the spec's own gates ("Never deploy ... without asking first", stop after each phase) differ from the workspace's "do not need to ask" profile, so an agent would hold two opposite defaults in one project. Every repository in the workspace is private and MAD's README states there is no backend; this would be the first public surface and first deployed service. Adding the project also meets the scope-check rule (directory structure, more than three files), which requires a short plan and the maintainer's go before implementation; the first reviewer did not cite that rule.

Evidence: bd show bpm-m97 close reason: "every repo in bpm/ ... commits and pushes proactively, including bd dolt push, without asking"; CLAUDE.md l.10-12 says the same and names nothing else. Spec l.14: "Never deploy, destroy, or create paid resources without asking first"; l.21: "Stop at the end of each phase, summarize, and wait for go-ahead." CLAUDE.md l.148-161: "Stop and describe the plan first, then wait for my confirmation, if the change would: touch more than about three files ... alter the project's directory structure". /Users/seriouscoderone/code/bpm/mad/README.md l.3: "There is no MAD backend or platform account." Read-only `gh` calls: `gh repo view seriouscoderone/mad-discovery` returns "Could not resolve to a Repository"; `gh repo list seriouscoderone` shows bpm, bpm-core, gym-bp and mad all PRIVATE. ~/.aws/config has a `[profile personal]` entry whose configured region is us-east-1, while spec l.27 proposes us-west-2; which account it resolves to was not checked (no AWS calls).

**CLAUDE.md's own rule makes most of the cited conflicts 'flag and propose', and two recorded preferences govern how the resulting rulings reach the maintainer** *(note)*

The first reviewer treats lines of CLAUDE.md as constraints the spec violates and rates two of them blockers. CLAUDE.md says its notes are context unless marked locked, and that a conflict with a better design is to be flagged with a proposal to replace the note. The only locked material it points to is bpm-core's vocabulary and refused list; l.14 (versioning), l.191 (do not fold DCR into MAD) and l.211 (publish wording) carry no such mark, and HANDOFF is read newest-wins. The maintainer's objective is the newest statement, so these are decisions to put to the maintainer, not violations. Two auto-memories and the rulings-queue convention also bear on the suggestion of one `Rule:` bead per open question: rulings lead with options and a recommendation, are re-checked for whether they still matter, and are queued only when a live bead waits on them. Spec questions 3 (region) and 4 (seed domains) are configuration answers, not rulings.

Evidence: /Users/seriouscoderone/code/bpm/CLAUDE.md l.163-168: "Design notes and past decisions recorded here are context, not constraints. Unless a note says \"locked,\" treat it as a description of what we did last, not a commitment. If a note conflicts with a better design, flag the conflict and propose replacing the note."; l.204: "The locked vocabulary and the refused list live in `bpm-core/AGENTS.md`"; l.191: "`mad/HANDOFF.md` (vision-first, newest wins)". /Users/seriouscoderone/.claude/projects/-Users-seriouscoderone-code-bpm/memory/rulings-lead-with-the-decision.md l.15: "Message = current state in two or three sentences, an options table, a one-line recommendation, the ask." /Users/seriouscoderone/.claude/projects/-Users-seriouscoderone-code-bpm/memory/mad-rulings-scope.md l.15: "before presenting any queued `Rule:` bead, re-check it against the latest rulings and direction; if it is moot, say so". bd show bpm-5sj: "Only rulings that some non-deferred bead waits on are children here ... sized by how long the maintainer needs to think."

### Looked for and not found (backlog)

- No bead in any status whose title or description contains: AWS, CDK, well-known, cloudfront, crawl, openhaven, ai-catalog, multiformat, JCS, Weisfeiler, or 'reference site' (bd search for titles; bd list --all --desc-contains for bodies).
- No bead title containing 'index' or 'protocol'. Description hits for those words, and for 'aggregat', 'domain', 'directory' and 'serve', were all unrelated (sim aggregates, the MAD domain model, runtime protocol contracts, a local preview server).
- No bead titled 'Brainstorming' in any status, and no bead of any title with brainstorm step children.
- No bd memory matching 'discovery' or 'DCR'.
- No open bead of type chore; no open P1 bead under any label.
- No icebox chore for bpm-core or gym-bp, although /Users/seriouscoderone/code/bpm/CLAUDE.md l.198 refers to 'the existing one'. The only icebox chore is bpm-upm.
- No ruling under bpm-5sj or in mad/HANDOFF.md 'Rulings' (1 to 8) about discovery, hosting, AWS, a public endpoint, a custom domain or a second project.
- No occurrence of openhaven, ai-catalog, agenticresourcediscovery, urn:air, Agentmap or 'protocol aggregation' in the workspace's .md, .ts, .json or .py files outside the spec itself (grep excluding node_modules, .venv, .git, .playwright-mcp). The maintainer's objective is recorded nowhere in the workspace.
- No stored DCR JSON definition format in mad: a whole-word grep for 'DCR' over mad/src, mad/README.md and mad/HANDOFF.md matches only the HANDOFF l.161 warning not to fold DCR into the prototype.
- Nothing in /Users/seriouscoderone/code/bpm/mad-discovery/ besides MAD-DISCOVERY-SPEC.md: no .git, README, HANDOFF, CLAUDE.md, AGENTS.md or package.json.
- No .internal/ directory at the workspace root or in mad/; no mad/docs/references/ directory, so Category-SAIDs.md is still only in ~/Downloads.
- Not checked: whether a GitHub repository seriouscoderone/mad-discovery already exists, or which AWS account the 'personal' profile points to. Both need network calls outside this read-only review.
- Not checked: the three matches for 'catalog' in mad/src beyond views.ts l.197 (the hard-coded provenance modal that bpm-upm.21 names); the code lens should cover what MAD's Explore and Publish preview actually emit.

<a id="external"></a>

## The external standards

*Whether AI Catalog and ARD say what the spec claims, and what openhaven is.*

**Reviewer's summary.** No blockers from this lens, but spec sections 4 and 5 were written against a superseded ARD draft and need correcting before Phases 2 and 3; Phase 1 (mad-hash) is unaffected. ARD v0.91 (Status: Proposal, 26 Aug 2026) moved the manifest to /.well-known/ard.json and rel="ard"; the spec publishes and crawls only the predecessor /.well-known/ai-catalog.json, which conformant ARD consumers are not required to read. The "mediaType versus type" divergence no longer exists: both specs use `type`, so emitting both is cruft. AI Catalog already has a core entry member `digest` (sha256 over the served bytes) that carries the same 32 bytes as `mad:hashes.full`, and the workspace already rules "Do not invent another digest" (SAID, Blake3-256), so the spec's CIDv1 would be a third encoding. The bare `"mad:hashes"` key is not the sanctioned extension form in either spec, and the `mad:hash` filter name does not match it. ARD `POST /search` requires `text` and an integer `score` plus `source` per result, so a hash-only lookup is not a valid ARD Search and the spec has no text-ranking design. OpenHaven is identified with confidence as openhaven.net: a hand-curated navigator of 264 protocol and tool entries with editorial attributes, including KERI, ACDC, MCP and A2A. That is a different kind of record from a DCR graph, and the spec has no browse surface, descriptive attributes or UI, so nothing in it yet tests the maintainer's objective. ARD's own position is that directories "become ARD discovery services" rather than disappear. Neither external spec has a tag or release; pin commit SHAs, since ARD manifests carry no `specVersion` at all.

### external-01: Spec targets ARD's predecessor well-known path and link relation; ARD v0.91 moved to ard.json and rel="ard"

*decision · defect · spec section 4 Publishing, 5 Indexer (lines 91, 99, 110) · skeptic's verdict: **partly***

**Claim.** The spec publishes only /.well-known/ai-catalog.json with rel="ai-catalog" and crawls only that path. That matches ARD v0.9 (28 May 2026). ARD v0.91 (26 Aug 2026) defines /.well-known/ard.json and rel="ard" and demotes the old names to optional. AI Catalog itself still defines ai-catalog.json as its own (optional) well-known URI, so the two paths now belong to two separate live specs. Live sites are mixed: huggingface.co serves only ai-catalog.json (ard.json returns 401), ai-catalog.outshift.io only ai-catalog.json, ora.ai and desvela.dev serve both.

**Skeptic's correction.** The spec-level facts hold: ARD v0.91 makes ard.json and rel="ard" the only names a consumer must resolve, and the spec targets only the predecessor names. The implication does not hold as written. No ard.json-only consumer was identified, and the two services it names (GitHub Agent Finder, Hugging Face Discover) belong to operators that themselves publish only ai-catalog.json; Hugging Face's own client resolves ai-catalog.json. The predecessor path is the more widely served one today, and the risk of staying on it is forward-looking (ARD's conformance tool flags an ai-catalog-only publisher as one that "may not be discovered"). Publishing and crawling both paths is still the right resolution.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:91,99,110
  > `/.well-known/ai-catalog.json`: catalog with one entry per definition: ... `robots.txt` with an `Agentmap:` directive, and a `Link: <...>; rel="ai-catalog"` header on `/`. ... For each domain, fetch `/.well-known/ai-catalog.json` (timeout 5s, max 1 MB, respect robots.txt).
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L216 (main @ f073b1ea9b, 2026-10-25)
  > A consumer resolving a domain's entries MUST fetch `/.well-known/ard.json`, and MUST honour a `rel="ard"` link. ARD's predecessor specified the path `/.well-known/ai-catalog.json` and the link relation `ai-catalog`; a consumer MAY additionally consult these
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L218
  > A resource that remains only at `/.well-known/ai-catalog.json` may not be found, since consulting that path is optional for consumers — a publisher on the predecessor path SHOULD move to `ard.json`.
- https://github.com/ards-project/ard-spec/commit/a305a5285e (2026-08-26T18:01:54Z)
  > spec: publish v0.91 — promote the draft, single well-known path
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L1489-L1492 (main @ 6e26a18afc, 2026-11-05)
  > To support automated discovery, hosts MAY serve an AI Catalog at the following well-known URI [[RFC8615]]: /.well-known/ai-catalog.json
- https://agenticresourcediscovery.org/interoperability/
  > An ARD discovery service may also ingest an AI Catalog document directly; when a publisher serves both ard.json and ai-catalog.json with entries that share an identifier, the ard.json entry takes precedence for ARD discovery.

**Implication.** Built as written, the publisher is invisible to any ARD registry that resolves only ard.json (GitHub Agent Finder, Hugging Face Discover and others), and the crawler misses ard.json-only publishers. The maintainer's own index would then be the only place MAD definitions are findable, which is the aggregation-site outcome the objective is meant to avoid.

**Reviewer's suggested resolution.** Publish one document at both /.well-known/ard.json and /.well-known/ai-catalog.json (it can satisfy both specs' core requirements), emit both rel="ard" and rel="ai-catalog", and have the crawler fetch ard.json first, then ai-catalog.json, with ard.json winning on a shared identifier. This is conformance to two live specs, not a compatibility shim.

**What the skeptic checked.** Re-opened ards-project/ard-spec main (f073b1ea9b, 2026-10-25) spec/ard.md: L216 and L218 read as quoted. Commit a305a5285e is dated 2026-08-26T18:01:54Z with the quoted subject. spec/ard-v0.9.md (28 May 2026) uses /.well-known/ai-catalog.json, Agentmap and &lt;link rel="ai-catalog"&gt;, so the spec does match v0.9. Agent-Card/ai-catalog main (6e26a18afc) L1489-1492 and the interoperability-page sentence read as quoted. Live GETs on 2026-11-08: huggingface.co ard.json 401, ai-catalog.json 200; ai-catalog.outshift.io 404 and 200; ora.ai and desvela.dev 200 and 200. Counter-evidence to the implication: github.com/.well-known/ai-catalog.json returns 200 while ard.json returns 404; the hf-discover README says "It fetches the site's `/.well-known/ai-catalog.json`"; Desvela's API says "(the older /.well-known/ai-catalog.json is still read)"; ARD's reference-implementations page says the MCP Gateway Registry "currently serves the pre-v0.91 /.well-known/ai-catalog.json path".

### external-02: The mediaType/type divergence is historic; both specs now use `type`

*note · defect · spec section 4 Publishing (lines 94-95) · skeptic's verdict: **partly***

**Claim.** AI Catalog renamed `mediaType` to `type` (ADR-0014, first dated 2026-04-30) and ARD aligned on 2026-06-16. Neither current spec text nor the rendered ai-catalog.io spec contains an entry field `mediaType`; live catalogs at huggingface.co and ora.ai use `type` only. In ARD's JSON-LD base context `type` maps to the IRI `ard:mediaType`, so a second bare `mediaType` key would expand through @vocab to the same property. The field-name divergence that does exist today is `trustManifests` (AI Catalog, array) versus `trustManifest` (ARD, object).

**Skeptic's correction.** ARD did not align on 2026-06-16. Its entries used `type` from the repository's first commit (2026-05-19), which postdates AI Catalog's rename decision (2026-04-30). The divergence was within AI Catalog's own history, so emitting both keys has even less basis than the finding says. The `trustManifest` versus `trustManifests` divergence is real but dates only from 2026-10-28, when PR #117 merged; until then AI Catalog main used the singular. One live catalog (ai-catalog.outshift.io) still emits `mediaType`, inside the removed `collections` member, not in entries. The resolution (emit `type` only) stands.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:94-95
  > media type `application/vnd.mad.dcr+json`, emitted under **both** `mediaType` and `type` (the base and ARD specs diverged on the field name);
- https://github.com/Agent-Card/ai-catalog/blob/main/adr/0014-media-type-to-type.md?plain=1#L21-L22
  > We will rename the `mediaType` field to `type` in the `CatalogEntry` schema.
- https://github.com/ards-project/ard-spec/commit/9ea89ed58d (2026-06-16T19:19:15Z)
  > docs: clarify artifact typing, remove mediaType from attestation schemas, and standardize type field naming
- https://github.com/ards-project/ard-spec/blob/main/spec/schemas/ard.context.jsonld#L9
  > "type": "ard:mediaType",
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L347-L348
  > `trustManifests` : An array of [Trust Manifest](#trust-manifest) objects.

**Implication.** Emitting both keys preserves compatibility with a state that no longer exists; under the workspace's greenfield rules that is cruft from day one.

**Reviewer's suggested resolution.** Emit `type` only and delete the parenthetical from the spec.

**What the skeptic checked.** ADR-0014 L21-22 reads as quoted, dated 2026-04-30 through 2026-06-25. ARD commit 9ea89ed58d has the quoted date and subject. ard.context.jsonld L9 is `"type": "ard:mediaType"` and L4 sets @vocab to the ARD namespace, so a bare `mediaType` key does expand to the same IRI. AI Catalog L347-348 defines `trustManifests`. Neither current spec has an entry-level `mediaType`; five live catalogs (huggingface.co, github.com, ora.ai, desvela.dev, api.live.nevermined.app; 178 entries) use `type` only. However, the diff of 9ea89ed58d removes `mediaType` only from attestation objects and one referral example, and ARD's first public spec (commit 9519b49e8f, 2026-05-19, spec/agentfinder.md) already used `"type"` for entries (24 occurrences; `mediaType` 7 times, all in attestations and that one referral).

### external-03: `mad:hashes.full` duplicates AI Catalog's core `digest` member, and CIDv1 would be a third digest encoding in this workspace

*decision · overlap · spec section 3 Hashing (line 67), 4 Publishing (line 98) · skeptic's verdict: **partly***

**Claim.** AI Catalog defines an optional entry member `digest`: for a `url` entry it is the hash of the exact retrieved bytes, format `sha256:<hex>`, and it uses JCS (RFC 8785) for inline data. If /defs/&lt;cid&gt;.json serves exactly the JCS normal form, `digest` and the spec's `full` CID encode the same 32-byte SHA-256. Separately, bpm-core rules that the workspace digest is the KERI SAID (Blake3-256 CESR) and MAD's handoff says definitions are intended to use SAIDs.

**Skeptic's correction.** `digest` is an optional AI Catalog member (ARD defines none at entry level) and duplicates the spec's `full` hash in another encoding; that holds. The implication is narrower: publishers do not emit `digest` in practice (0 of 178 sampled entries), so a cross-catalog reverse index would have to compute it by fetching each entry's `url`. The identity encoding is also not an open three-way choice. Recorded workspace direction already names the SAID for MAD definitions (bpm-nq3) and an S3 publish provider keyed by SAID (bpm-n13). "Do not invent another digest" is bpm-core's own invariant, not a workspace-wide ruling. CIDv1 conflicts with that direction unless the maintainer rules otherwise.

**Evidence.**

- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L339-L342
  > `digest` : A string containing the artifact content digest in [Digest Format](#digest-format). For `url`, hash the exact retrieved artifact bytes. For `data`, hash the UTF-8 JCS-canonicalized [[RFC8785]] JSON value.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L859-L866
  > Digests in this specification use the format `algorithm:hex-value` ... Producers SHOULD use SHA-256 [[RFC6234]] or stronger. Consumers MUST reject digest values using algorithms shorter than SHA-256.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:67
  > **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59
  > **SAID** is Blake3-256 CESR matching KERI Saider (dummy `d` is 44 `#`). Do not invent another digest.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13
  > Precise definitions receive content-derived identities, intended to use SAIDs compatible with the KERI ecosystem.

**Implication.** A reverse index keyed on the standard `digest` would answer "who else publishes these bytes" for every artifact type in every catalog, not only MAD entries, and any AI Catalog consumer could verify it without knowing MAD. Keyed on a MAD-only CID field, only MAD-aware publishers participate. The maintainer must also choose between SAID, CIDv1 and sha256-hex as the identity.

**Reviewer's suggested resolution.** Decide the identity encoding first. Whatever is chosen, also emit the standard `digest` on each entry, and consider indexing `digest` for all entry types with `structural` as the only MAD-specific term.

**What the skeptic checked.** AI Catalog L339-342 and L859-866 read as quoted. /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md L65-68 and L90 confirm the served file is the JCS normal form and `full` is its SHA-256, so `digest` and the `full` CID carry the same 32 bytes. /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59 and /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13 read as quoted. Counter-evidence: ARD's entry schema has no `digest` term (it appears only on attestation items); none of 178 entries in five live catalogs carries `digest`. In beads, deferred epic bpm-nq3 ("Reproducible identity: SAIDs for definitions and records") specifies "a Blake3-256 CESR digest compatible with bpm-core's saidify" and lists "structural compare" as Out; open epic bpm-n13 plans `bpm publish <SAID|selection> --to <provider>` with "Later: S3, a KERI/OOBI-style endpoint"; bpm-nq3.7 defines a "category SAID" for grouping by structure.

### external-04: A bare `"mad:hashes"` key is not the sanctioned extension form in either spec, and the `mad:hash` filter does not match it

*decision · defect · spec section 4 Publishing (line 98), 5 Indexer (lines 112, 128) · skeptic's verdict: **partly***

**Claim.** Unknown members are tolerated by both specs, so the field would not fail validation. But AI Catalog's extension point is an `extensions` map whose keys MUST be a URL or reverse-DNS string, and it explicitly declined `@context`. ARD's extension point is a prefix declared in the entry's `@context`, with flat prefixed terms that become filter dimensions; filter keys are matched by resolved IRI. The spec declares no `@context`, nests an object under the term (ARD defines dot-paths only into trustManifest, metadata and data), and names the filter `mad:hash` while the entry term is `mad:hashes`.

**Skeptic's correction.** The finding holds on three points: the spec declares no `@context`, AI Catalog's `extensions` keys must be a URL or reverse-DNS string, and the filter `mad:hash` does not match the term `mad:hashes`. It is narrower on two. A nested object under a prefixed term is in live ARD use (Nevermined `nvm:catalog`), so nesting is not itself out of form; what ARD leaves undefined is a filter path into such an object. And under JSON-LD an undeclared `mad:hashes` is kept as the literal IRI `mad:hashes` rather than having no IRI, so it is tolerated but bound to no namespace anyone controls. None of the three suggested shapes makes the hash filterable at other registries by itself, because ARD leaves extension-term filter support to each registry.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:98,128
  > custom field `"mad:hashes": { "full": "...", "structural": "..." }`. ... our indexer itself a valid ARD registry. Support a `mad:hash` filter.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L1339-L1340
  > To avoid collisions between independent publishers, the keys MUST be a valid URL or a reverse-DNS string:
- https://github.com/Agent-Card/ai-catalog/blob/main/adr/0017-ard-loose-coupling.md?plain=1#L23
  > AI-Catalog will proceed without native `@context` support and will instead rely on simpler mechanisms (such as an `extensions` map) for minimal extensions.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L258
  > A filter key that names a term is resolved to its IRI through the query's effective context — the ARD base context plus the query's `@context` — and matched against entries by that IRI, not by the literal key string.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L260
  > ARD does not expand `trustManifest`, `metadata`, or inline `data` into the JSON-LD graph (§4.1); dot-paths *into* them (e.g. `trustManifest.attestations.type`, `metadata.location`) are literal JSON paths on the raw member, not IRI-resolved.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L558
  > Note that the schema sets `additionalProperties: true` by design. Terms drawn from namespaces declared in an entry's `@context` (§4.1) are valid and become filter dimensions

**Implication.** Other ARD registries cannot filter on the hash as written, and the `mad` prefix has no IRI. A namespace IRI needs a stable domain, which ties this to open question 8.1.

**Reviewer's suggested resolution.** Pick one shape and use the same term for entry and filter. Options: (a) ARD-native: `"@context": {"mad": "https://<domain>/ns#"}` with flat terms `mad:fullHash` and `mad:structuralHash`; (b) AI Catalog-native: `extensions: {"<url-or-reverse-dns>": {full, structural}}`; (c) ARD `metadata` scalars, filterable as `metadata.*`. One document can carry (a) and (b) together.

**What the skeptic checked.** MAD spec L98, L112, L128. AI Catalog L1339-1340 and ADR-0017 L23 read as quoted. ard.md L258, L260 and L558 read as quoted; L268 adds "support for `metadata.*` and other extension terms is registry-defined". Live precedent: Nevermined's ard.json (listed on ARD's reference-implementations page) declares entry-level `"@context": {"nvm": "https://nevermined.app/ns/ard#"}` and carries a nested object under `nvm:catalog`. W3C JSON-LD 1.1 API, IRI Expansion: a value with a colon is "either an IRI, a compact IRI, or a blank node identifier", and one with an undeclared prefix is returned as is.

### external-05: "Minimal ARD-conformant" `/search` has requirements the spec does not design for

*decision · gap · spec section 5 Indexer, Query API (lines 109, 127-128) · skeptic's verdict: **confirmed***

**Claim.** ARD Search requires `query.text`; a filter-only request such as a pure hash lookup is not a valid Search. Results must carry `identifier`, an integer `score` 0-100 and `source`. A registry is discovered through an entry of type `application/ai-registry+json` whose `url` is the base URL; the spec adds no such entry to its own catalog. The spec's storage is DynamoDB keyed by hash, with no text index or ranking. The same `text` requirement applies when the crawler queries other registries "for the MAD media type". ARD ships an official conformance tool with manifest, publisher-resolution and registry modes; `GET /agents` and `POST /explore` are optional.

**Evidence.**

- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L272
  > Accepts a `query` (§5.3.1) and returns entries ranked by relevance. For Search, `text` is required; `filter` is optional.
- https://github.com/ards-project/ard-spec/blob/main/spec/schemas/ard.openapi.yaml#L288-L296
  > required: - identifier - score - source properties: score: type: integer minimum: 0 maximum: 100
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L229
  > The operational base URL for these endpoints is discovered dynamically by identifying entries whose `type` is `application/ai-registry+json`. The `url` of such a well-known entry is the registry's **base URL**, and a client appends the endpoint path (for example `/search`).
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L581
  > this repository provides an official, zero-dependency **Conformance Testing CLI Tool**. It allows publishers to test their entries and registry developers to validate their REST API servers.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:127-128
  > `POST /search`: minimal ARD-conformant registry endpoint (text query plus optional filters). This makes our indexer itself a valid ARD registry.

**Implication.** Without a text scorer the endpoint cannot be ARD-conformant, and without the ai-registry entry no ARD client will find it. Hash lookup belongs on the custom GET routes, not on ARD Search.

**Reviewer's suggested resolution.** Decide whether ARD registry conformance is in v0. If yes: specify a simple keyword scorer over displayName, description and representativeQueries, add an `application/ai-registry+json` entry to the published manifest, and make passing `conformance-test` (manifest and registry modes) the acceptance check for Phases 2 and 3.

**What the skeptic checked.** ard.md L272, L229 and L581 read as quoted. ard.openapi.yaml L288-296 reads as quoted and SearchQueryModel has `required: - text`. The conformance tool has manifest, publisher and registry modes. The headings of sections 5.3.3 and 5.3.4 say Optional. Live POSTs without `text` on 2026-11-08: GitHub Agent Finder 400 `"query.text is required"`, Hugging Face Discover 422, Desvela 400; Ora accepts a filter-only query. Two nuances: the official registry-mode test checks only response structure (results array, integer score 0-100, source, identifier) for one fixed query, so a trivial scorer passes the tool, though the normative text asks for ranking by relevance. The spec's own L127 ("text query plus optional filters") already matches ARD's request shape.

### external-06: `urn:air:` identifiers are meant to be permanent; minting them under the CloudFront default domain, with no rule for the name segment, creates a later migration

*decision · defect · spec section 4 Publishing (lines 92, 101), 8 question 1 · skeptic's verdict: **confirmed***

**Claim.** Both specs treat the urn:air identifier as a stable handle anchored on the publisher's own domain, and AI Catalog defines no migration mechanism. The spec says to use the CloudFront default domain until the domain question is answered, and does not say what the namespace and name segments are (a CID, a file stem, something else). If the name is the CID the identifier changes on every edit, against "SHOULD be stable across versions". The index sort key is the URN.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:101
  > Domain: **open question** (see §8). Until answered, use the CloudFront default domain.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L511-L512
  > Adopting a different primary identifier after publication requires an explicit migration mechanism, which this specification does not define.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L446-L448
  > When `version` is present, the combination of `identifier` and `version` MUST be unique within the catalog. When `version` is absent, `identifier` alone MUST be unique. The `identifier` SHOULD be stable across versions.
- https://github.com/ards-project/ard-spec/blob/main/spec/urn-naming-guide.md?plain=1#L16
  > The URN represents the permanent, abstract logical identity of the agent, establishing a stable primary key for search indexes and clients. It does *not* change based on where the agent is running or deployed.
- https://github.com/ards-project/ard-spec/blob/main/spec/schemas/ard-entry.schema.json#L26
  > "pattern": "^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$",

**Implication.** Anything published before the domain is chosen carries identifiers that must later change, in the publisher's catalog, in the index keys, and in any other registry that ingested them.

**Reviewer's suggested resolution.** Answer question 8.1 before the first public publish (Phase 2 can still write to ./dist with a reserved placeholder such as example.com). State the URN shape in the spec, for example urn:air:&lt;domain&gt;:mad:&lt;stable-name&gt;, with the hash carried in `digest`/hash terms and `version`, not in the name.

**What the skeptic checked.** MAD spec L92, L101, L120 and question 8.1. AI Catalog L446-448 and L511-512, urn-naming-guide.md L16 and schema L26 read as quoted. Nuance from ARD's URN guide: Scenario B accepts free hosting subdomains as the publisher (`your-app.vercel.app`), so a CloudFront default domain is syntactically acceptable; Scenario C says to use the real FQDN in the URN even while serving from elsewhere, so the URN can carry the intended domain before DNS exists. The guide describes example.com placeholders only for artifacts that are never published. None of this weakens the finding: an identifier minted under a cloudfront.net name is permanent.

### external-07: With signing out of scope, the index keys on a self-asserted URN; ARD's only squatting defence is the trust manifest

*decision · defect · spec section 5 Indexer (lines 112-121) · skeptic's verdict: **confirmed***

**Claim.** The index sort key is `pub#<urn>` taken from the crawled entry. Nothing in the spec requires the URN's publisher segment to equal the domain the catalog was crawled from. ARD's protection against one domain claiming another's namespace is the trustManifest binding, which the spec excludes for v0; AI Catalog tells operators not to infer publisher authorization from a URL.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-121
  > PK `hash#<cid>`, SK `pub#<urn>`; attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L189
  > This is ARD's defense against namespace squatting: an entry claiming `urn:air:google.com:...` is rejected by a verifying registry unless it can produce a verifiable attestation issued by `google.com`.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L507-L509
  > Operating a catalog or aggregating an entry does not make its operator the artifact publisher. A catalog operator MUST NOT infer publisher authorization from the artifact's URL or an unsigned `publisher` field.

**Implication.** Any crawled domain can write or overwrite an index row under another publisher's URN for a given hash, and `verified=true` (hash matches) would still be set. "Who else publishes hash X" then reports a publisher that never published it.

**Reviewer's suggested resolution.** Without signatures, the only verified fact is the crawled host. Key rows on the crawled domain (or domain plus URN) and record whether the URN's publisher segment equals that domain; do not present a URN from a mismatched domain as a publisher.

**What the skeptic checked.** MAD spec L112-121 contains no rule tying the URN's publisher segment to the crawled host. ard.md L189 and AI Catalog L507-509 read as quoted. I built the counter-example: domain B lists `urn:air:A:...` with a definition it serves; the row keyed (hash, pub#urn:air:A...) is written or overwritten with B's defUrl and `verified=true`. Nuance: a mismatch is also the legitimate case. AI Catalog's Catalog Projection rule 1 requires an aggregating catalog to preserve a publisher's `urn:air` identifier exactly, and ARD's URN guide shows manifests hosted off the publisher's domain. The index should record the crawled host separately rather than reject mismatches.

### external-08: Custom entry type `application/vnd.mad.dcr+json` is permitted by both specs; three small consequences

*note · fact · spec section 4 Publishing (line 94) · skeptic's verdict: **partly***

**Claim.** ARD accepts any syntactically valid media type and its conformance tool classifies unregistered application/ types as valid extensions. AI Catalog's `type` is open text, with handling of unlisted types left to clients, and says the artifact SHOULD be served with that media type, so /defs/*.json needs that Content-Type (the spec sets only Cache-Control). The name is not IANA-registered; a registered vendor-tree workflow type exists as precedent (`application/vnd.oai.workflows+json`). In the MCP ecosystem "DCR" commonly reads as OAuth Dynamic Client Registration (RFC 7591), which will collide in text search.

**Skeptic's correction.** Everything holds except the sourcing of the acronym collision. The cited MCP page spells out "Dynamic Client Registration" and never uses "DCR". The collision is real in MCP authorization writing, for example WorkOS, "CIMD vs DCR: The new default for MCP Client Registration in 2025": "you've dealt with Dynamic Client Registration (DCR)" (https://workos.com/blog/mcp-client-registration-cimd-vs-dcr). Further live precedent for vendor-tree entry types: `application/vnd.huggingface.space+json` (hf-discover README), `text/vnd.okf+markdown` (AI Catalog's own extensions example, L1358), `application/vnd.oai.openapi+json;version=3.1` (ora.ai).

**Evidence.**

- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L47
  > The `type` term is an open media-type string: any syntactically valid media type is accepted.
- https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test#L175-L176
  > is a valid application extension media type. " "ARD permits extension types without core registration.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L247,L253-L255
  > For any new or custom types not listed here, it is up to the specific client implementation to handle them correctly. ... The document served at this URL SHOULD be served with the media type declared in the `type` field.
- https://www.iana.org/assignments/media-types/application.csv
  > vnd.oai.workflows+json,application/vnd.oai.workflows+json,[Frank_Kilcommins]
- https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
  > Authorization servers and MCP clients SHOULD support the OAuth 2.0 Dynamic Client Registration Protocol (RFC7591).

**Implication.** No obstacle to the custom type. Generic registries will list MAD entries but not interpret them.

**Reviewer's suggested resolution.** Add the Content-Type to the publisher's upload rule, and avoid the bare acronym "DCR" in displayName and representativeQueries.

**What the skeptic checked.** ard.md L47 reads as quoted. conformance-test L175-176 reads as quoted (reported at level "info"). AI Catalog L247 and L253-255 read as quoted. IANA application.csv has `vnd.oai.workflows+json` and no `vnd.mad.*`. The MCP sentence is on the cited page, but that page contains the string "DCR" zero times.

### external-09: Status of the two specs, and why "pin the specVersion" cannot be followed for ARD

*note · fact · spec section 0 Ground rules (lines 17-20) · skeptic's verdict: **partly***

**Claim.** AI Catalog: maintained by the Agent Card Working Group under the Linux Foundation; TSC seats Google, Microsoft, Anthropic, PulseMCP; repo Agent-Card/ai-catalog created 2025-10-29; examples carry specVersion "1.0"; rendered spec config says specStatus "Official"; last spec-text commit 2026-10-07, last main commit 2026-11-05; no tags or releases. ARD: authors Junjie Bu (Google), R.V. Guha, Shaun Smith (Hugging Face); v0.91, Status Proposal, dated 26 Aug 2026; repo ards-project/ard-spec created 2026-05-19, last commit 2026-10-25; Apache-2.0; no tags or releases; neutral host undecided. An ARD manifest requires only `entries` and has no specVersion member. ARD's site calls the catalog version it tracks "AI Catalog v0.9-RC", a label that does not appear in the AI Catalog spec text.

**Skeptic's correction.** The facts hold except the maturity reading and one date. The rendered AI Catalog spec's visible status is "This is a draft document and may be updated at any time." (https://ai-catalog.io/spec/, emitted by tools/build_spec.py L222-223 next to the "Official" ReSpec flag), so AI Catalog describes itself as a draft. The latest normative change reached main on 2026-10-28 (merge 9aac2c1bfa of PR #117), not 2026-10-07. It replaced the entry member `trustManifest` with the array `trustManifests` while every example kept specVersion "1.0", which directly supports the point that specVersion does not identify what was implemented. Live ard.json documents (ora.ai, desvela.dev, Nevermined) do carry a top-level specVersion "1.0", the AI Catalog value.

**Evidence.**

- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L5-L7
  > **Version**: v0.91 **Status**: Proposal **Date**: August 26, 2026
- https://github.com/ards-project/ard-spec/blob/main/spec/schemas/ard-entry.schema.json#L105-L106
  > ARD requires only an `entries` array of ARD entries; any other top-level members are transport-defined and ignored by ARD, so additionalProperties is open.", "required": ["entries"],
- https://ai-catalog.io/
  > Maintained by the Agent Card Working Group under the Linux Foundation
- https://ai-catalog.io/spec/ (page source, respecConfig)
  > "specStatus": "Official",
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L106-L108
  > `specVersion` : A string indicating the version of this specification that the catalog conforms to, in "Major.Minor" format (e.g., "1.0").
- https://agenticresourcediscovery.org/interoperability/
  > As of AI Catalog v0.9-RC, an ARD entry carries every member a catalog entry requires — identifier, type, and url or data — so a single document can satisfy both formats' core requirements.
- https://agenticresourcediscovery.org/governance/
  > Whether to sit ARD under a neutral host — W3C, an AI foundation, or similar — is a decision for roughly twelve months out, not now.

**Implication.** Both specs change monthly without version bumps: AI Catalog's specVersion has stayed "1.0" through breaking renames. A specVersion string does not identify what was implemented.

**Reviewer's suggested resolution.** In docs/SPEC_VERSIONS.md record the commit SHA and date of each spec repo read (today: ard-spec f073b1ea9b, ai-catalog 6e26a18afc) alongside specVersion "1.0" and ARD "v0.91".

**What the skeptic checked.** ard.md L5-7, schema L105-106, the ai-catalog.io footer, respecConfig `"specStatus": "Official"`, AI Catalog L106-108 and the interoperability and governance quotes all read as quoted. GitHub API: repositories created 2025-10-29 and 2026-05-19; heads 6e26a18afc (2026-11-05) and f073b1ea9b (2026-10-25); tags and releases empty for both. GOVERNANCE.md lists TSC seats for Google, Microsoft, Anthropic and PulseMCP. ARD's OpenAPI has info.version 0.5.0. ARD authors are Junjie Bu, R.V. Guha and Shaun Smith.

### external-10: OpenHaven is openhaven.net, a curated protocol navigator; what it aggregates is not what the spec indexes

*decision · gap · spec section Header (lines 3-4), 6 Phases (line 139), 7 Out of scope (line 143) · skeptic's verdict: **confirmed***

**Claim.** OpenHaven (openhaven.net) is identified with confidence. It is a research-led directory of 264 entries (protocols, platforms, applications, infrastructure) with editorial attributes written by its own researchers: description, devStatus, owner, governingBody, license, funding, governanceModel, captureRisk, lastInvestigated. Entries include `keri`, `acdc-authentic-chained-data-containers`, `model-context-protocol` and `a2a-agent2agent`. It offers a Navigator, a Convergence Matrix, a Graph Explorer and a static JSON API; it serves neither ard.json nor ai-catalog.json (both 404). The spec indexes DCR graph definitions by hash, tests only hash lookups, drops descriptive `x-` keys from the published definition, implements no list or facet endpoint, and puts UI out of scope. ARD states the same goal as the maintainer but concludes that directories become discovery services rather than disappear.

**Evidence.**

- https://openhaven.net/brief/
  > OpenHaven is a community-led, data-driven convergence navigator for the peer-to-peer (P2P) and decentralized protocol landscape that makes it visible, navigable, and directly actionable — including for AI-assisted development workflows.
- https://openhaven.net/
  > Our technology Navigator lets you start from what you need, understand the capabilities required, and discover the protocols and tech tools that provide them — governance model and capture risk included.
- https://openhaven.net/developers/
  > The same data that powers the Navigator and Matrix, exposed at stable, directly-fetchable JSON URLs — no key, no rate limit, no scraping required.
- https://openhaven.net/api/protocols/keri.json
  > {"id":"keri","name":"KERI","domainIds":["identity-trust"],"entityType":"identity-protocol","description":"Key Event Receipt Infrastructure — a decentralized identity protocol built on cryptographically self-certifying identifiers (AIDs)
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:139,143
  > then confirm `GET /hash/<structural>` returns both and `GET /hash/<full>` returns one each. ... Signing/trust manifests, IPFS pinning, nested DCR sub-graphs, auth on the query API, UI.
- https://agenticresourcediscovery.org/interoperability/
  > ARD inverts the relationship. Instead of publishing into each collection, a publisher describes a resource once on its own domain (yourdomain.com/.well-known/ard.json), and any discovery service can index it organically — no central gatekeeper, no per-collection re-registration. ... These collections don't disappear in this model — they become ARD discovery services.

**Implication.** As written the project delivers a hash lookup service for DCR graphs. It does not yet say what a protocol owner publishes so that a site like OpenHaven has nothing left to hand-curate, nor how a person or agent browses what exists. An epic `done_when` reflecting the objective cannot be written from the spec.

**Reviewer's suggested resolution.** Before registering the epic, the maintainer should state which of these the objective means: (a) protocol owners self-publish machine-readable definitions and any ARD registry can index them, so the measure is "a third-party ARD client finds a MAD definition without our index"; (b) the index also serves browse and facet queries (ARD `GET /agents`, `POST /explore`) so a reference site becomes a thin view over it; or (c) both. Also decide whether descriptive attributes belong in the catalog entry, since the normalized definition carries none.

**What the skeptic checked.** openhaven.net home, /brief/, /developers/ and /api/protocols/keri.json read as quoted. /api/protocols.json holds 264 entries, including keri, acdc-authentic-chained-data-containers, model-context-protocol and a2a-agent2agent. Entry keys include captureRisk, captureRiskReasoning, lastInvestigated and references. Both well-known paths return 404. Two web searches found no other project of that name; one result (a HackMD report) describes OpenHaven as cataloging 200+ technologies. Nothing in the workspace, beads or bd memories mentions it. MAD spec L64, L90, L124-128, L139 and L143 support the description of what the spec delivers. The ARD interoperability quote is verbatim. One nuance: the spec does define a text search endpoint (L127), so "no way to browse" is true only of list and facet.

### external-11: Concrete list of existing registry and aggregation sites in the agent ecosystem

*note · precedent · skeptic's verdict: **partly***

**Claim.** Sites that today hold the canonical list for their artifact kind, each with its own submission path: the official MCP Registry (MCP servers), Smithery, Glama and mcp.so (MCP server directories), A2A Registry (A2A agents, with live probes), ACP Registry (ACP agents), SchemaStore (JSON Schemas for editors), plus OpenHaven for decentralized protocols. ARD discovery services already running: Hugging Face Discover, GitHub Agent Finder, Cisco AI Catalog, Ora Directory.

**Skeptic's correction.** The list holds. Two parts of the implication are narrower. "Found without a submission step" is not how the running services treat a new domain: Desvela asks for a crawl request, and Hugging Face Discover indexes Hugging Face Skills and Spaces. "None indexes process or protocol definitions": OpenHaven indexes protocols as editorial records, and SchemaStore's catalog (1,583 schemas) includes schemas for process formats (Xstate Machine, Serverless Workflow, arazzo.json, CWL), which are schemas of formats rather than definitions. As crawl seeds the suggested endpoints return nothing for the MAD type today, and GitHub's and Hugging Face's reject a query with no text.

**Evidence.**

- https://github.com/modelcontextprotocol/registry/blob/main/README.md (site: https://registry.modelcontextprotocol.io/)
  > The MCP registry provides MCP clients with a list of MCP servers, like an app store for MCP servers.
- https://smithery.ai/
  > Discover MCP servers that connect agents to thousands of tools and services.
- https://glama.ai/mcp/servers
  > Open-Source MCP Servers – 117,892 in the Glama Registry | Glama
- https://mcp.so/
  > Discover MCP servers for coding, browsers, databases and more.
- https://a2aregistry.org/
  > Inspect 660 A2A agents by card conformance, reachability, uptime, and real message/send probes.
- https://agentclientprotocol.com/get-started/registry
  > The easiest way to find and install ACP-compatible agents.
- https://www.schemastore.org/
  > The open-source catalog of JSON schemas for editors and tools, with support for JSON, YAML, and TOML files.
- https://agenticresourcediscovery.org/ref_implementations/
  > GitHub's Agent Finder is a discovery service for agentic resources — Skills, tools, and MCP servers — reachable over HTTPS at https://agentfinder.github.com/api/v1.

**Implication.** "Nobody needs to make one" can be stated as: a definition published once on its owner's domain is found by these services' successors without a submission step. None of the listed sites indexes process or protocol definitions today.

**Reviewer's suggested resolution.** Use the ARD discovery services as initial registry seeds (answers part of question 8.4): POST https://agentfinder.github.com/api/v1/search, https://huggingface-hf-discover.hf.space/search, and the registry entry in https://ora.ai/.well-known/ard.json.

**What the skeptic checked.** All eight quotes are present on the cited pages (Glama's count now reads 117,949; mcp.so's line is in its meta description). ARD's reference-implementations page also lists Desvela, ANS Finder, MCP Gateway Registry, Nevermined and Agentic Resource Registry. I sent one search to each of four registries with filter type `application/vnd.mad.dcr+json`: all returned 200 with empty results.

### external-12: Prior art for "who else publishes hash X": IPFS provider lookup uses the spec's exact key format; KERI has OOBI for SAIDs

*note · precedent · spec section 3 Hashing (line 67), 5 Query API (line 125), 7 Out of scope · skeptic's verdict: **confirmed***

**Claim.** The IPFS Delegated Routing V1 HTTP API defines `GET /routing/v1/providers/{cid}`, returning the providers of a CID and preferring CIDv1 base32, the encoding the spec chose. KERI's OOBI associates a URL with a SAID and has a well-known form. The spec picks CIDv1 but excludes IPFS, and does not mention OOBI. Neither precedent offers the structural (shape-only) match.

**Evidence.**

- https://specs.ipfs.tech/routing/http-routing-v1/
  > This specification describes a vendor-agnostic HTTP API for delegated content routing. ... cid is the CID to fetch provider records for (preferably normalized to a CIDv1 in Base32, to maximize HTTP cache hits).
- https://trustoverip.github.io/kswg-keri-specification/
  > An Out-Of-Band Introduction (OOBI) provides a discovery mechanism that associates a given URI or URL with a given AID or SAID.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:125
  > `GET /hash/{cid}` → list of publishers (verified first) for a full or structural hash.

**Implication.** The exact-match half of the reverse index has two existing interface shapes to copy or interoperate with; the structural half is the project's own contribution.

**Reviewer's suggested resolution.** If CIDv1 stays, consider making `GET /hash/{cid}` response-compatible with `/routing/v1/providers/{cid}`. If SAID is chosen (see external-03), consider answering with OOBI-style URLs.

**What the skeptic checked.** The IPFS routing spec quotes are verbatim and `GET /routing/v1/providers/{cid}` is defined there. A live GET to https://cid.contact/routing/v1/providers/{cid} returned 200 with a Providers list, so IPNI (which the first reviewer could not check) serves this API. The KERI specification's OOBI sentence is verbatim and its Well-Known OOBI section gives `/.well-known/keri/oobi/{AID}`. MAD spec L125 reads as quoted. Two nuances: OOBI is a forward introduction (a URL offered for an AID or SAID), not an enumeration of who holds it. And the workspace already has both ideas on record: epic bpm-n13 names "a KERI/OOBI-style endpoint" as a later publish provider, and bpm-nq3.7 describes a "category SAID" that "groups by exact structure" and is "a classification key, not an integrity commitment", so the structural half is not new to this project.

### external-13: No existing media type or catalog convention for publishing DCR, BPMN or state-machine definitions was found

*note · precedent · spec section 2 Definition format, 8 question 2 · skeptic's verdict: **partly***

**Claim.** IANA's application registry has no entry for BPMN, SCXML, DMN or DCR; the nearest registered type is OpenAPI's Arazzo workflow format. Neither AI Catalog nor ARD lists a workflow or process type among its recognized types, though ARD's site names "workflow" as an agentic resource. The only DCR interchange format found is XML for the DCR Solutions portal, written by pm4py's DCR exporters; bpm-core already wraps that library.

**Skeptic's correction.** No media type or catalog convention specific to process definitions exists, so the conclusion stands. General conventions for publishing definitions through a well-known URL do exist and were not reported: xRegistry (IANA well-known `xregistry`, provisional, registered 2026-08-19; "you can define your own registries for other types of metadata"; AI Catalog ships a mapping at docs/mappings/xregistry.md), RFC 9727 `api-catalog`, and SchemaStore for the schemas of process formats. The pm4py page documents three DCR XML exporters (for the dcr-js editor, the DCR portal and the DCR Solutions portal), not one.

**Evidence.**

- https://www.iana.org/assignments/media-types/application.csv
  > vnd.oai.workflows+json,application/vnd.oai.workflows+json,[Frank_Kilcommins]
- https://agenticresourcediscovery.org/
  > An agentic resource is any external capability an AI client can call on to do a task — an agent, MCP server, Skill, Canvas, Plugin, API, or workflow — anything that can be described as an ARD entry.
- https://paul-cvp.github.io/dcr4pydocs/pm4py.objects.dcr.exporter.variants.html
  > Writes a DCR graph object to disk in the .xml file format (exported as .xml file). The file can be imported and visualised in the DCR solutions portal (https://dcrgraphs.net/)
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:33
  > Do not import `keri`, `pm4py`, or DCR4Py except inside `src/bpm_core/process/dcr4py.py`. `[dcr]` is optional and GPL.
- https://www.iana.org/assignments/well-known-uris/well-known-uris-1.csv
  > api-catalog,[RFC 9727],permanent,IETF,,2024-12-23,

**Implication.** The project would be defining the first catalog type for process definitions, so there is no external convention to conform to and none to conflict with. The JSON shape in section 2 is new; the established DCR exchange format is XML.

**Reviewer's suggested resolution.** When answering question 8.2, also decide whether import from the DCR Solutions XML format matters; it does not need to shape the hashed form.

**What the skeptic checked.** IANA application.csv has no entry for bpmn, scxml, dmn or dcr, and does list vnd.oai.workflows, +json and +yaml. The ARD home-page quote, the pm4py quote, /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:33 and the IANA `api-catalog` row read as quoted. A web search for a published DCR JSON interchange format found none.

### external-14: `representativeQueries` and `Agentmap` are ARD-only; the spec's source for queries and displayName is underspecified

*decision · defect · spec section 4 Publishing (lines 93, 97, 99) · skeptic's verdict: **confirmed***

**Claim.** `representativeQueries` (SHOULD, 2-5) exists only in ARD; AI Catalog does not define it. ARD says an entry without it cannot be found by search. The spec derives 2-5 queries from a single optional `x-description` string without saying how, or what happens when it is absent. ARD makes `displayName` a MUST; the definition format has no title field and the spec names no source for it. The `Agentmap:` robots.txt directive is likewise defined only by ARD.

**Evidence.**

- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L111
  > An entry without it cannot be found by search, which is what distinguishes an ARD entry from a bare catalog entry. SHOULD contain 2–5 examples.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L103
  > | displayName | MUST | Human-readable name. |
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L212
  > **Agentmap Directive**: Adding an entry-source directive in `robots.txt` (e.g. `Agentmap: https://example.com/entries.json`).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:93,97
  > `displayName`; ... `representativeQueries` (2–5, from the definition's `x-description` if present);
- https://agenticresourcediscovery.org/interoperability/
  > ARD additionally expects representative queries, the signal a search service ranks on, which the catalog format does not define.

**Implication.** Definitions without `x-description` would be published but unfindable through any ARD registry, and one description sentence does not yield two to five distinct queries without a rule.

**Reviewer's suggested resolution.** Have the author supply them explicitly as non-hashed metadata (for example `x-title` and `x-queries`), and make the publisher fail or warn when fewer than two queries are present.

**What the skeptic checked.** ard.md L111, L103 and L212 and the interoperability quote read as quoted. `representativeQueries` and `Agentmap` occur zero times in ai-catalog.md. MAD spec L93 and L97 read as quoted, and the definition format in section 2 has no title field. Nuances: ARD keeps the queries requirement soft (a missing or short list is a conformance warning), AI Catalog makes displayName optional (ADR-0016), and the spec never emits the entry `description` term, which is the obvious home for `x-description`.

### external-15: Trust manifest claims check out as optional; the "same-origin keys add no real security" reasoning does not cover the project's own index

*note · fact · spec section 4 Publishing (line 100), 7 Out of scope · skeptic's verdict: **confirmed***

**Claim.** Confirmed: trust manifests are optional in both specs, and ARD defines no signing procedure of its own. AI Catalog's publisher profile is did:web on the publisher's domain, and its threat model's primary attacker is one who can alter the catalog (CDN edge, object store, or a malicious mirror) but not the signer's domain key. If the did:web document sits in the same S3 bucket as the catalog the spec's point holds; it does not hold for entries re-served by a third party, which is what the indexer is.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:100
  > No signing in v0. The trust manifest is optional, and same-origin keys add no real security.
- https://github.com/ards-project/ard-spec/blob/main/spec/ard.md?plain=1#L193
  > ARD does not define a signing or verification procedure of its own.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/trust-manifest-threat-model.md?plain=1#L142
  > Can modify the catalog document (compromised hosting account, CDN edge, object-store credentials, compromise of the catalog origin, or a malicious mirror). **Cannot** control the expected signer's `did:web` domain or obtain that signer's authorized key.
- https://github.com/Agent-Card/ai-catalog/blob/main/specification/ai-catalog.md?plain=1#L1162-L1163
  > For `urn:air:example.com:agent:billing`, the publisher signer is therefore `did:web:example.com`.

**Implication.** Deferring signing is consistent with both specs. Clients of the index must then trust the indexer's `verified` flag, because nothing in an index answer is checkable back to the publisher except by re-fetching and re-hashing.

**Reviewer's suggested resolution.** Keep signing out of v0, but reword line 100 to say why (cost and scope), and have index responses always include `defUrl` so a client can re-verify the hash itself.

**What the skeptic checked.** MAD spec L100. ard.md L185 (optional `trustManifest`) and L193, the threat model L142 and AI Catalog L1162-1163 read as quoted. AI Catalog L1150-1155 requires the publisher signer to be exactly `did:web:` plus the URN's publisher segment. The reasoning holds: with did.json on the same origin as the catalog, an attacker who can write the catalog can also write the key document, while a signature would still let a client check an entry re-served by a third-party index. The spec's index attributes already include `defUrl` (L121).

### What the skeptic added (external)

**No running ARD registry was shown to pick up an unlisted domain without a request** *(decision)*

The objective depends on a definition being found once it is published on its owner's domain. Among the running services, the one open-web registry crawls a fixed list (Tranco top-100K) and otherwise needs a per-domain crawl request; Hugging Face Discover indexes Hugging Face's own Skills and Spaces. For a new small domain the choices today are a crawl request per registry (a lighter submission step) or the maintainer's own index, which is then the aggregation site. The epic's done_when should say which of these counts as success.

Evidence: Desvela POST https://registry.desvela.dev/search (2026-11-08), response field listing.steps: "Request a crawl: GET https://registry.desvela.dev/check?domain=&lt;your-domain&gt; ... The domain is fetched live and its valid catalog entries become searchable immediately." https://agenticresourcediscovery.org/ref_implementations/: "it crawls the Tranco top-100K for the surfaces a visiting agent can actually read". hf-discover README: "The primary HTTP `POST /search` endpoint combines the Meilisearch-backed `huggingface/skills` index with Hugging Face Spaces search." Live searches with filter type application/vnd.mad.dcr+json returned 200 and empty results at agentfinder.github.com/api/v1/search, huggingface-hf-discover.hf.space/search, registry.desvela.dev/search and ora.ai/api/ard/search. How GitHub Agent Finder ingests was not determined.

**A "valid ARD registry" has ingestion duties the crawler does not meet, and the crawler ignores the hints the publisher emits** *(decision)*

ARD requires every implementation to crawl hosted manifests and in-page markup, and requires a consumer to fetch ard.json and honour rel="ard". The spec's crawler fetches only /.well-known/ai-catalog.json. It never reads the Agentmap directive or the Link relation that the spec's own publisher emits, and it caps nesting at 3 where AI Catalog recommends 4.

Evidence: https://github.com/ards-project/ard-spec/blob/main/spec/ard.md L224: "**Web Ingestion (Required)**: Crawling entry sources — hosted manifests and in-page markup — from discovered URIs. All ARD implementations MUST support this." L216: "A consumer resolving a domain's entries MUST fetch `/.well-known/ard.json`, and MUST honour a `rel="ard"` link." AI Catalog ai-catalog.md: "A depth limit of 4 is RECOMMENDED." and its discovery procedure checks the Link header first, then the HTML link element, then the well-known URI. /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md L99 (publisher emits Agentmap and Link) against L110-111 (crawler: well-known path only, depth ≤ 3).

**Independent assessment, the part of OpenHaven a publisher cannot self-assert, has a mechanism in AI Catalog that the spec scopes out** *(decision)*

OpenHaven's value is largely third-party judgement (capture risk, governance, date last investigated). AI Catalog's current trust model lets an assessor attach its own signed Trust Manifest to another publisher's entry, which is how such judgement can travel with the definition instead of living on a reference site. The spec excludes trust manifests entirely, so v0 can replace the listing half of an aggregation site but not the assessment half.

Evidence: AI Catalog ai-catalog.md L347-350: "`trustManifests` : An array of Trust Manifest objects. Each manifest groups one contributor's claims about this artifact and can carry its own signature." L1162-1164: "A valid signature by an assessor can endorse claims about that same release, but does not satisfy publisher authorization." ADR-0028 Context: "A publisher, an assessor, and a catalog operator may each have claims to contribute about the same artifact." (on main since merge 9aac2c1bfa, 2026-10-28). https://openhaven.net/api/protocols/keri.json carries captureRisk, captureRiskReasoning, lastInvestigated and references. MAD spec L143: "Signing/trust manifests ... UI." out of scope.

**Two hash-lookup precedents not reported: RFC 6920 well-known hash URLs and the live IPNI provider index** *(note)*

A standards-track, IANA-permanent well-known scheme already maps a hash to a URL on any domain, which answers "does this domain publish hash X" with one GET and no catalog or index; it is also a fourth identity encoding to weigh beside CIDv1, SAID and sha256-hex. Separately, a public index already answers "who provides CID X" for exact matches. The first reviewer listed IPNI as not checked.

Evidence: https://www.iana.org/assignments/well-known-uris/well-known-uris-1.csv: "ni,[RFC 6920],permanent,IETF,,,". RFC 6920 section 4: "For an ni name of the form "ni://n-authority/alg;val?query-string" the corresponding HTTP(S) URL produced by this mapping is "http://h-authority/.well-known/ni/alg/val?query-string"" and "in the case that any data is returned, the retriever can determine whether or not it is content that matches the ni URI." Live GET https://cid.contact/routing/v1/providers/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi returned 200 with a JSON `Providers` array.

**AI Catalog publishes itself as a draft, and its normative text last changed on main eleven days ago** *(note)*

The first reviewer reported the status as "Official" and could not find a draft marker. The rendered specification states it is a draft, and the most recent normative change (a breaking rename of the entry's trust member) landed on main on 2026-10-28 with no specVersion change. Recording a commit SHA, as the reviewer suggests, is the only workable pin.

Evidence: https://ai-catalog.io/spec/ : "Status of This Document This is a draft document and may be updated at any time." Agent-Card/ai-catalog tools/build_spec.py L222-223 emits that text; L22 sets specStatus "Official". Merge 9aac2c1bfa (2026-10-28T17:46:58Z, PR #117) brought commit b9a4885b03 "Support independent Trust Manifest contributions" to main: specification/ai-catalog.md at the prior head 9316f00de2 has `trustManifests` 0 times and `trustManifest` 7 times; main has 13 and 0; both contain `"specVersion": "1.0"` 8 times. ADR-0028 is marked "Status: Proposed". The hf-discover README refers to "The AI Catalog draft reference".

### Looked for and not found (external)

- Any tag or release in either spec repository: the GitHub tags API returned an empty list for both Agent-Card/ai-catalog and ards-project/ard-spec.
- A `specVersion` member in the ARD manifest or entry schema (ArdManifest requires only `entries`). ARD's OpenAPI file carries its own `info.version: 0.5.0`, unrelated to v0.91.
- An entry field named `mediaType` in either current spec text, or in the rendered https://ai-catalog.io/spec/ (0 occurrences). It survives only as the IRI local name `ard:mediaType` in ARD's JSON-LD context and inside ARD's attestation schema.
- `representativeQueries`, `Agentmap` or any robots.txt directive in the AI Catalog spec, guides or README (0 occurrences). Both exist only in ARD.
- An HTTP `Link` header form for ARD. ARD section 5.1 names only the HTML `<link rel="ard">` tag; the HTTP header form is defined by AI Catalog for rel="ai-catalog".
- IANA registration of `ai-catalog.json` or `ard.json` in the Well-Known URIs registry, of `ai-catalog` or `ard` in the Link Relations registry, or of `application/ai-catalog+json`, `application/a2a-agent-card+json` or `application/mcp-server-card+json` as media types (checked 2026-11-08; the AI Catalog spec contains registration templates only).
- The label "v0.9-RC" or any draft or release-candidate marker inside the AI Catalog spec text; that label appears only on the ARD site.
- Any IANA media type for BPMN, SCXML, DMN or DCR graphs, and any published JSON interchange format for DCR graphs. The DCR search was shallow (two queries plus the pm4py docs); dcrgraphs.net itself was not examined.
- Any existing media type, AI Catalog or ARD entry type, or well-known-URL convention for publishing process or protocol definitions.
- Any mention of openhaven in the workspace files under /Users/seriouscoderone/code (md, json, txt), in beads (`bd search openhaven`) or in bd memories.
- An ARD or AI Catalog manifest on openhaven.net (both well-known paths return 404), and on ai-catalog.io and agenticresourcediscovery.org themselves (404).
- Other candidates for "openhaven": of fifteen plausible domains probed, only openhaven.net resolved; web searches returned no other project of that name in the protocol, agent, registry, MCP, KERI, credential or DCR space.
- Not checked: PulseMCP (blocked by a Cloudflare challenge), IPNI at cid.contact (page renders client-side only), Sigstore Rekor and Software Heritage hash-lookup APIs as further reverse-lookup precedents, and whether GitHub Agent Finder or Hugging Face Discover would actually ingest an entry of an unrecognized vendor type.
- Not checked: the live behaviour of any ARD registry's `/search` against a `type` filter for `application/vnd.mad.dcr+json`; no requests were sent to registry search endpoints.

<a id="soundness"></a>

## Technical soundness

*The spec on its own terms: hashing, index, crawler, API.*

**Reviewer's summary.** The spec is not yet tight enough for its core promise (a deterministic hash two parties can compute independently), and the indexer as written is unsafe and can be made to lie. Five things block: (1) the normal form validates and then "drops unknown keys", which either is dead text or makes different documents share one `full` hash and still earn verified=true; (2) the Weisfeiler-Lehman recipe leaves the initial colour, refinement step, colour hash and final serialisation undefined, so three reasonable readings gave three different values for one graph in my test; (3) the section 2 format is marked "confirm with user" but phase 1 freezes golden hashes on it, and it matches neither MAD's definitions (model/authorization/rr) nor bpm-core's DCR payload; (4) the crawler fetches attacker-chosen URLs with no redirect, address, scheme, size or fan-out rules for definitions; (5) index rows are keyed on the publisher's claimed URN and claimed hash, so any catalog can overwrite another publisher's row or attach itself to any hash. WL also collides on tiny, common DCR shapes regardless of iteration count (two self-excluding events vs two mutually excluding events; one 4-cycle vs two 2-cycles), and the "confirm by comparing definitions" step that is supposed to absorb collisions has no algorithm, no storage and no test. The index schema cannot answer /definition/{cid}/similar, "verified first" under pagination, or POST /search text queries, and nothing ever removes a publisher that disappears. "Public, rate-limited" on an HTTP API can only mean one global throttle (no per-client limits, API keys or WAF), and the default is the account-wide 10,000 rps. Several catalog details hard-coded in section 4 disagree with the specs section 0 says to follow (ARD v0.91 uses /.well-known/ard.json and rel="ard"; neither spec has a `mediaType` field). Web quotes below came through a fetch tool that summarises pages, so re-open the URLs to confirm exact wording; the WL results came from a throwaway inline Node script (no file written) and each pair can be re-derived by hand from the stated construction.

### soundness-01: Normal form: validate-then-drop makes different documents share one full hash

*blocker · defect · spec section 3 Normal form, steps 1 and 3 · skeptic's verdict: **confirmed***

**Claim.** Step 1 validates against a JSON Schema and step 3 then drops 'unknown/non-semantic keys'. The two steps only make sense under one of two schema policies, and the spec picks neither. If the schema is closed (additionalProperties: false), an unknown key never survives step 1, so step 3 is dead text except for x- keys, which then need an explicit patternProperties allowance. If the schema is open, a document carrying e.g. a relation `guard`, a `deadline`, or a future `children` sub-graph is silently reduced to its v0 subset: two semantically different documents get the same `full` CID, and the crawler (which re-hashes after normalising) records verified=true for content the hash does not cover. The depth at which x- keys are stripped (top level only, or inside events, relations and marking) is also unstated. bpm-core already ruled on exactly this for its own digests and chose refusal.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:62-64
  > 1. Validate against a JSON Schema (store in `packages/mad-hash/schema/`).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:64
  > 3. Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:113-114
  > 1. fetch the definition and re-hash it with `mad-hash`;
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:86-95
  > **A document carries no key its shape does not declare (Ruling 132).**
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:94-95
  > reason is the digest: a key the model does not read

**Implication.** Every golden fixture in phase 1 depends on this choice, and under the open reading the index's one guarantee (same full hash means same definition) is false.

**Reviewer's suggested resolution.** Replace steps 1-3 with: (1) parse, rejecting duplicate object keys; (2) validate against a schema that is closed at every object level (additionalProperties: false) with patternProperties {"^x-": {}} at every level; any other undeclared key is a rejection, never a drop; (3) remove every x- key at every depth; (4) sort; (5) JCS. Delete the words 'unknown/non-semantic'.

**What the skeptic checked.** Re-read /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md lines 62-64 and 113-115: quotes exact. /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md line 86 (Ruling 132, closed shapes, UNKNOWN_FIELD refusal) and line 94 ('reason is the digest') are exact. Reasoning holds: step 3 only does anything if the schema is open, so two documents differing in a non-x key share `full` and the crawler's re-hash gives verified=true. One nuance: the text leans to 'open and drop' rather than truly 'picking neither', but it never says so and gives no stripping depth. The proposed fix (additionalProperties:false plus patternProperties ^x-) is valid JSON Schema.

### soundness-02: Normal form is silent on duplicates, dangling references and absent fields; the spec's own example is dangling

*decision · defect · spec section 2 and 3 Normal form step 2 · skeptic's verdict: **confirmed***

**Claim.** Four cases force a guess. (a) Duplicate event ids: JSON Schema uniqueItems compares whole objects, so two events with one id and different labels pass, and 'sort events by id' is then order-dependent, which breaks the required test that reordering changes neither hash. (b) Duplicate relations (same type, from, to) and duplicate ids inside a marking array: DCR relations and markings are sets, so the same graph hashes differently with and without the repeat unless the normal form dedupes or rejects. (c) Dangling references: a relation or marking entry naming an id that is not in `events`. The spec's own example does this: `events` lists only `approve`, while the relation and the marking both name `submit`. (d) Absent versus empty: nothing says whether `marking`, its three arrays, `label` and `role` are required, so `"pending": []` and no `pending` key hash differently for one meaning. bpm-core's digest profile states the equivalent rule explicitly.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:48-50
  > "events":    [{ "id": "approve", "label": "Approve invoice", "role": "manager" }],
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:49
  > "relations": [{ "type": "condition", "from": "submit", "to": "approve" }],
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:63
  > 2. Sort `events` by `id`, sort `relations` by `(type, from, to)`, and sort marking arrays.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:81
  > - reordering events/relations doesn't change either hash;
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:213-216
  > optional template-declared array field is dropped, so `hold: []` and no `hold` are one meaning

**Implication.** Two implementers (or one implementer on two days) produce different hashes for the same graph, and a fixture copied from the spec's example is either invalid or silently accepted.

**Reviewer's suggested resolution.** Add to section 3: reject duplicate event ids; reject a relation or marking id that names no event; reject (not dedupe) duplicate relations and duplicate marking entries; require `marking` with all three arrays and require `label`; make `role` optional and never materialise a default. State whether a self-relation (from = to) is valid (it should be: self-exclude is the standard one-shot idiom). Fix the section 2 example so `submit` is an event.

**What the skeptic checked.** Spec lines 48-50: `events` lists only `approve`, the relation is from `submit`, and marking.included names `submit`; the example is dangling as written. Ran a stable sort by id on two events sharing one id in both input orders on Node v24.19.0: the outputs differ, so the line-81 reorder test fails for such input. Nothing in sections 2-3 states required versus optional fields. documents.md line 214 quote ('`hold: []` and no `hold` are one meaning') is exact.

### soundness-03: Which keys are hashed is never listed; `mad` and `kind` are undecided and the structural value carries no algorithm tag

*decision · gap · spec section 2 and 3 · skeptic's verdict: **partly***

**Claim.** The spec says what `structural` ignores but never lists what `full` covers. `label` and `role` are implied to be in `full` only by the test line; `mad` and `kind` are not mentioned at all. If `mad` is hashed, the format marker is identity-bearing (acceptable, but then say so); if it is not, two format versions can collide. The structural value has no equivalent marker: when the recipe changes (iteration count, colour definition) old and new values become incomparable with nothing in the value or the index key to tell them apart. Separately, the workspace rule against version markers while greenfield applies to the `"mad": "0"` key and the 'v0' naming.

**Skeptic's correction.** The spec gives no schema and no key list, so the hashed key set is whatever schema the implementer writes; `mad` and `kind` are hashed under the plain reading of line 68 and in doubt only through the undefined word 'non-semantic'. The structural value carries no recipe identifier (holds as stated). The greenfield no-versioning rule does not clearly apply to a format marker that outside crawlers will depend on.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:46-47
  > "mad": "0",
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:68-69
  > - `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:82
  > - renaming IDs/labels changes `full` but not `structural`;
- /Users/seriouscoderone/code/bpm/CLAUDE.md:14
  > No versioning while greenfield: no release tags, no version numbers bumped for their own sake, no `v1`/`v2` names for things that coexist.

**Implication.** The implementer chooses the hashed key set, and a later change to the structural recipe silently splits the index.

**Reviewer's suggested resolution.** State: `full` = JCS of exactly {mad, kind, events[{id, label, role?}], relations[{type, from, to}], marking{executed, included, pending}}. Give the structural value a recipe tag inside the hashed bytes and in its encoding (see soundness-11). Decide whether a `mad` key is wanted at all given CLAUDE.md line 14; if kept, say it is a format discriminator, not a release version.

**What the skeptic checked.** Spec lines 46-47, 68-69, 82 and /Users/seriouscoderone/code/bpm/CLAUDE.md line 14: quotes exact. Line 68 does define `full` as the hash of the whole normal form, so every schema-known, non-x key (including `mad`, `kind`, `label`, `role`) is covered unless 'non-semantic' in step 3 is read broadly. CLAUDE.md line 14 carries its own exception ('until something outside this workspace depends on it'), and the workspace plans versioned profiles itself: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md line 15 ('Normalization and versioned conventions are part of making this reproducible') and bead bpm-upm.23 ('under a versioned comparison profile').

### soundness-04: Sort comparator and Unicode handling are unspecified; JCS will not paper over them

*decision · defect · spec section 3 Normal form steps 2 and 4 · skeptic's verdict: **partly***

**Claim.** Step 2 sorts ids and relation tuples without naming a comparator. On Node 24, U+1F600 sorts before U+FF5E by UTF-16 code units and after it by UTF-8 bytes or code points, and `localeCompare` orders ["a","B"] opposite to the default sort; an implementer in another language, or one who reaches for localeCompare, gets a different array order and so a different hash. JCS does not normalise strings: an id written as U+00E9 and as U+0065 U+0301 are different bytes (c3a9 vs 65cc81) and different hashes. JCS also requires erroring on lone surrogates and forbids duplicate property names, but JSON.parse keeps the last duplicate silently and JSON.stringify emits a lone surrogate as an escape without throwing, so those checks must be explicit. v0 hashed content has no numbers, which should be stated so JCS number rules never apply.

**Skeptic's correction.** Comparator, Unicode normalisation and duplicate-key rejection are unspecified and must be added. Lone surrogates are already rejected by the current `canonicalize` package, so that check is needed only if an older version is used; the spec should pin the package version instead.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:63-65
  > 4. Serialize with JCS (RFC 8785) via the `canonicalize` npm package.
- https://www.rfc-editor.org/rfc/rfc8785.txt (section 3.1)
  > all components involved in a scheme depending on JCS MUST preserve Unicode string data "as is".
- https://www.rfc-editor.org/rfc/rfc8785.txt (section 3.2.3)
  > Property name strings to be sorted are formatted as arrays of UTF-16 [UNICODE] code units.
- https://www.rfc-editor.org/rfc/rfc8785.txt (section 3.2.2.2)
  > occurrences of such data MUST cause a compliant JCS implementation to terminate with an appropriate error.
- https://www.rfc-editor.org/rfc/rfc8785.txt (section 3.1)
  > JSON objects MUST NOT exhibit duplicate property names.

**Implication.** Hashes are only reproducible for ASCII ids written by the one implementation; the first non-ASCII label or a port to another language breaks agreement.

**Reviewer's suggested resolution.** Add: 'all string comparison in step 2 is by UTF-16 code unit, the same order RFC 8785 uses for property names; never locale-aware'. Restrict `id` and `role` by schema pattern to an ASCII token (e.g. ^[A-Za-z0-9._-]{1,64}$). For `label`, choose one: reject input that is not NFC (do not silently normalise), or state that labels are hashed as authored. Reject duplicate object keys and lone surrogates before canonicalising. State that hashed content contains no JSON numbers.

**What the skeptic checked.** Fetched RFC 8785: all four quotes found in sections 3.1, 3.2.3 and 3.2.2.2 (via a summarising fetch tool). Reproduced on Node v24.19.0: default sort puts U+1F600 before U+FF5E, code-point and UTF-8 byte order put it after; ['a','B'] sorts to ['B','a'] by default and ['a','B'] with localeCompare; JSON.parse keeps the last duplicate key; U+00E9 is c3a9 and e+U+0301 is 65cc81. Counter-evidence: the `canonicalize` repository source (github.com/erdtman/canonicalize, lib/canonicalize.js on master; npm latest is 5.1.0, published 2026-09-18) checks `value.isWellFormed()` and throws 'Lone surrogate is not allowed'. I did not inspect older releases.

### soundness-05: The WL recipe is not tight enough for two implementations to agree

*blocker · defect · spec section 3 structural hash · skeptic's verdict: **confirmed***

**Claim.** Four lines define the algorithm and each leaves a choice open. 'Relation-type signature' could be a set or a multiset, directed or undirected, and may or may not flag self-loops. The refinement step is not given at all: whether a neighbour contributes (direction, relation type, neighbour colour) or only its colour decides the result. The colour compression function (hash of what serialisation, or integer relabelling) is unstated. 'Sorted relation list in color space' presumably means sorted (type, colour(from), colour(to)) triples, but its serialisation and how it is joined to the colour multiset ('plus') are unstated. The colour of an event with no relations is implied to be its marking flags alone. I ran one small graph (3 events, 3 relations) under three defensible readings of the initial colour only (directed multiset, undirected multiset, directed set) and got three different final values.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:70-73
  > - initial color = relation-type signature + marking flags;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:72-73
  > - hash the sorted multiset of final colors plus the sorted relation list in color space.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:59
  > The core of the project. It must be deterministic and well-tested.

**Implication.** The value is only stable inside one codebase at one commit. A second implementation (the planned shared TypeScript library, a Python publisher, a rewrite) will not match, and golden fixtures frozen in phase 1 will enshrine whatever the first implementer guessed.

**Reviewer's suggested resolution.** Replace lines 70-73 with normative pseudo-code: c0(e) = SHA-256(JCS([tag, flags(e), sorted multiset of [dir, type] over incident relations, with a self-relation contributing a distinct dir value "self"])); c(k+1)(e) = SHA-256(JCS([c(k)(e), sorted multiset of [dir, type, c(k)(neighbour)]])); final = SHA-256(JCS({alg: tag, colours: sorted list, relations: sorted list of [type, c(from), c(to)]})), colours as lowercase hex. Publish three or four graph/value test vectors in the spec itself, not only as fixtures.

**What the skeptic checked.** Spec lines 59 and 70-73: quotes exact; the refinement step, the colour function and the final serialisation are not given. I implemented the recipe under four readings (directed multiset, undirected multiset, directed set, self-loops flagged). On a 3-event, 3-relation graph the first three readings gave three different values at 3 rounds; a second graph with a self-relation split the self-flagged reading from the others.

### soundness-06: WL collides on tiny, common DCR shapes whatever the iteration count; 3 rounds adds collisions from 18 events up

*note · fact · spec section 3 structural hash · skeptic's verdict: **partly***

**Claim.** Colour refinement cannot separate graphs in which every event sees the same typed in/out neighbourhood. Pairs that collide for any number of iterations (confirmed at 3 and 50): (A) two events each excluding itself (two independent one-shot events) versus two events excluding each other; every event has one outgoing and one incoming exclude in both graphs, so all colours are equal forever. This pair separates only if self-loops are flagged in the initial colour, which the spec does not say. (B) four events in one response 4-cycle versus two response 2-cycles. (C) six events in one condition 6-cycle versus two 3-cycles. B and C collide even with self-loops flagged. Pairs specific to the 3-round limit (collide at 3, separate at 4 or at stability): (D) an 18-step condition chain whose single initially-pending step is at index 8 versus index 9; (E) two chains of 9 and 11 steps versus two chains of 10 and 10. So three rounds is adequate below roughly 18 events; the real weakness is regular structure, which no round count fixes. Whether this matters depends entirely on the confirmation step (soundness-07): as specified, nothing removes these false matches.

**Skeptic's correction.** Pairs A-E behave as stated. Collisions caused only by the 3-round cap start at about 9 to 11 events, not 18, so a fixed 3 rounds is not adequate even for small processes; refine to stability.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:70-76
  > - 3 iterations;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:75-76
  > Document that collisions are possible. The structural hash is a *candidate* match only, and the indexer

**Implication.** `GET /hash/<structural>` and `/similar` will report a mutual-exclusion choice as the same shape as two unrelated one-shot events unless confirmation actually runs.

**Reviewer's suggested resolution.** Flag self-relations in the initial colour (removes pair A). Refine until the number of distinct colours stops growing, capped at the event count, instead of a fixed 3 (removes D and E). Accept that B and C remain and make confirmation real (soundness-07). Use pairs A-E as required negative fixtures.

**What the skeptic checked.** Rebuilt pairs A-E and ran them at 3, 4 and 50 rounds under four readings. A collides at every round count unless self-loops are flagged; B and C collide always; D and E collide at 3 rounds and separate at 4. All as reported. Exhaustive check of every single-relation-type graph up to 4 events (3,044 isomorphism classes at 4): without a self-loop flag there are colliding groups from 2 events up (145 groups at 4 events); with the flag, none up to 3 events and 10 groups at 4. The '18 events' bound is wrong: a chain of 11 versus a chain of 9 plus a 2-cycle (11 events), and a 10-cycle with one pending event versus an 8-cycle with one pending event plus a 2-cycle (10 events), collide at 3 rounds and separate at 4 under every reading. With self-loops unflagged, a 9-event pair does the same.

### soundness-07: 'Confirms matches by comparing the fetched definitions' has no algorithm, no place in the pipeline, no storage and no test

*decision · gap · spec section 3 (lines 75-76), 5, 6 phase 4 · skeptic's verdict: **confirmed***

**Claim.** Deciding that two definitions have the same shape with ids ignored is typed directed-graph isomorphism, which is the problem the hash only approximates; the spec gives no method. It also does not say when confirmation runs. At query time the public API Lambda would fetch N remote definitions per request (latency, cost, and the SSRF surface of soundness-23 on a public endpoint). At crawl time the result needs somewhere to live, and the index schema has no attribute for it. The index stores only `defUrl`, so comparing against an earlier publisher means re-fetching a URL that may be gone. The phase 4 exit check passes with no confirmation at all, so the step is untested.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:75-76
  > confirms matches by comparing the fetched definitions.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:121
  > - attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:138-139
  > then confirm `GET /hash/<structural>` returns both and `GET /hash/<full>` returns one each.

**Implication.** The implementer either skips confirmation (the API returns WL false positives as matches) or invents an isomorphism check and a storage shape the spec never reviewed.

**Reviewer's suggested resolution.** Choose one. (A) Keep WL as the bucket key and confirm at crawl time: for each newly verified definition, run a backtracking isomorphism check (candidate pairs restricted to equal WL colours; relation type, direction and marking flags must match) against one representative per existing class in that bucket, under an event cap (e.g. 256) and a step budget; store `shapeClass` (the representative's full CID) on the row; the API returns only same-class rows and labels budget-exceeded rows 'unconfirmed'. Keep a copy of each verified normal form in the indexer's own bucket keyed by full CID so no refetch is needed. (B) Make the structural value exact: hash a canonical labelling (colour refinement plus individualisation with backtracking, same caps) and drop the confirmation sentence. Either way add a phase 3 fixture test using a colliding pair from soundness-06.

**What the skeptic checked.** Spec lines 75-76, 121 and 138-139: quotes exact. No algorithm, no pipeline step, no attribute to store a result, and the phase 4 check passes without any confirmation. 'Fetched definitions' suggests crawl time, but that is not stated and the table keeps only `defUrl`. Reasoning holds.

### soundness-08: Whether roles and marking belong to 'shape' needs a ruling; role structure is discarded entirely

*decision · decision · spec section 3 structural hash · skeptic's verdict: **confirmed***

**Claim.** The structural hash ignores roles completely but includes marking flags. Ignoring role names is right; ignoring which events share a role is a different thing. `submit(employee) -> approve(manager)` and `submit(employee) -> approve(employee)` (self-approval) get the same structural value although separation of duties is the structural fact that distinguishes them, and the project's subject is Role x Responsibility. Conversely, including marking means the same process published with a different initial pending set is a different shape. Labels are fully identity-bearing in `full`, so a capitalisation change splits `full` and there is no key between 'byte-identical' and 'same shape'.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:69
  > - `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:71
  > - initial color = relation-type signature + marking flags;
- /Users/seriouscoderone/code/bpm/CLAUDE.md:191
  > Micro App Designer: the browser prototype for authoring Role x Responsibility contracts

**Implication.** 'Who else publishes this shape' will group processes that differ in who may act, which is the property this workspace models.

**Reviewer's suggested resolution.** Rule on three points before phase 1: (1) include the role partition (events grouped by equal role, names discarded) by adding role nodes or a per-event role-class colour; (2) keep or drop marking flags; (3) whether a third key is wanted (ids, roles and relations hashed, labels ignored). Record the answers in section 3.

**What the skeptic checked.** Spec lines 69 and 71 and CLAUDE.md line 191: quotes exact. By line 69 the two role assignments in the example get one structural value, and marking flags are in the initial colour. This is a design ruling, correctly framed as one. The workspace's own structural notion is different again: /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md line 98 ('Category equality is a structural discovery fact').

### soundness-09: Required test 'changing any relation changes both' cannot hold for the structural hash

*note · defect · spec section 3 Tests · skeptic's verdict: **confirmed***

**Claim.** The test contradicts the design twice. Rewiring a relation to an automorphic position yields an isomorphic graph, whose structural hash must stay the same: with events e0, e1, e2 and one relation condition e0-&gt;e1, changing it to e0-&gt;e2 gives the same shape (confirmed: identical value). And the spec itself says collisions exist, so some non-isomorphic changes also leave the value unchanged (soundness-06 pairs B and C are relation rewirings).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:83
  > - changing any relation changes both;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:75
  > Document that collisions are possible.

**Implication.** A literal property test fails on a correct implementation; a weakened one silently encodes the implementer's reading.

**Reviewer's suggested resolution.** Reword: 'changing a relation's type, or adding or removing a relation, changes both hashes for every fixture; rewiring a relation to an automorphic position changes `full` and leaves `structural` unchanged; listed colliding pairs are asserted to collide'. Also specify that 'renaming IDs' means a consistent bijective rename across events, relations and marking.

**What the skeptic checked.** Spec lines 75 and 83: quotes exact. Ran the counter-example (3 events, condition e0-&gt;e1 changed to e0-&gt;e2): identical structural value under all four readings and at 3, 4 and 50 rounds, because the graphs are isomorphic. A literal property test of line 83 fails on a correct implementation.

### soundness-10: A raw-codec CID is only honest if the served bytes are the normal form, and the spec never requires that of other publishers

*decision · defect · spec section 3 (line 67), 4 (line 90), 5 crawler step 3 · skeptic's verdict: **confirmed***

**Claim.** CIDv1 with the raw codec means 'SHA-256 of exactly these bytes'. That holds for our own /defs/&lt;full-cid&gt;.json, which is the normalised definition, provided 'normalised' is pinned to the exact JCS output (no trailing newline, no BOM). The crawler, however, re-hashes after normalising, so a foreign publisher serving pretty-printed JSON or JSON with x- keys earns verified=true for a CID that does not address the bytes at `defUrl`. The base AI Catalog spec already defines a standard `digest` entry member over the exact retrieved bytes, which the custom `mad:hashes.full` duplicates when bytes are exact. The multicodec table also has a `json` codec, so raw is a choice, not the only fit; raw is defensible because it is the one any verifier can check with a plain SHA-256.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:67
  > **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:90
  > - `/defs/<full-cid>.json`: normalized definition, immutable, `Cache-Control: max-age=31536000, immutable`.
- https://ai-catalog.io/spec/ (Catalog Entry, digest)
  > For `url`, hash the exact retrieved artifact bytes.
- https://raw.githubusercontent.com/multiformats/multicodec/master/table.csv
  > json, ipld, 0x0200, permanent, JSON (UTF-8-encoded)

**Implication.** Without a byte-exactness rule the `full` CID is a semantic fingerprint dressed as a content address: tools that fetch `defUrl` and check the CID will fail on publishers the index calls verified.

**Reviewer's suggested resolution.** Add to section 3: 'the normal form is the exact JCS byte string, UTF-8, no BOM, no trailing newline; `full` is the CID of those bytes'. Add to section 5: a row is verified only if SHA-256(response body) equals the CID's digest and normalize(body) equals body; a definition that hashes correctly only after normalisation is recorded separately (e.g. `byteExact=false`) or rejected. Emit the standard `digest: "sha256:<hex>"` on each entry alongside `mad:hashes`.

**What the skeptic checked.** Spec lines 67, 90 and 113: quotes exact. Fetched ai-catalog.io/spec: the entry member is `digest`, defined with 'For `url`, hash the exact retrieved artifact bytes.' and the format `algorithm:hex-value`. Fetched the multicodec table: 'json, ipld, 0x0200, permanent, JSON (UTF-8-encoded)' and 'raw, ipld, 0x55'. Because step 5.3.1 re-hashes with mad-hash (which normalises first), a pretty-printed foreign definition earns verified=true for a CID that does not address its served bytes.

### soundness-11: The structural value should not be a CID, and kind should be in the key

*decision · defect · spec section 3 (line 67), 5 (lines 120-121, 125) · skeptic's verdict: **confirmed***

**Claim.** A CID addresses retrievable content. The structural value hashes an internal serialisation of colours that is never published, so there is nothing to retrieve or pin (IPFS pinning is listed as later work). Encoded as CIDv1-raw it is textually indistinguishable from a full CID: both come out as `bafkrei...` (checked by encoding two arbitrary SHA-256 digests with prefix 0x01 0x55 0x12 0x20). The index then puts both under one key shape, `hash#<cid>`, with kind only as an attribute, and `GET /hash/{cid}` accepts either in one path parameter. Because rows are stored under claimed hashes (soundness-25), a catalog can claim a `structural` value equal to someone else's full CID and land in that partition. The encoding also has nowhere to carry the recipe identifier.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:67-69
  > - `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-121
  > - PK `hash#<cid>`, SK `pub#<urn>`;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:125
  > - `GET /hash/{cid}` → list of publishers (verified first) for a full or structural hash.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:143
  > Signing/trust manifests, IPFS pinning, nested DCR sub-graphs, auth on the query API, UI.

**Implication.** Clients cannot tell the two kinds apart, the two kinds share partitions, and a recipe change cannot be detected.

**Reviewer's suggested resolution.** Encode structural as a tagged digest that is visibly not a CID, e.g. `mad-shape-1:<base32 sha256>`, with the tag also inside the hashed bytes. Key the table by kind: PK `full#<cid>` and PK `shape#<value>`. Split the route (`/hash/full/{cid}`, `/hash/shape/{value}`) or dispatch on the prefix.

**What the skeptic checked.** Spec lines 67-69, 120-121, 125 and 143: quotes exact. Encoded three unrelated SHA-256 digests as CIDv1 raw base32: all begin `bafkrei`, so full and structural values are textually indistinguishable. `kind` is an attribute only and one route takes both. The sub-claim that a catalog can land in another hash's partition by claiming it depends on mismatch rows being keyed by the claimed hash, which the spec does not state (see soundness-25).

### soundness-12: The spec introduces a second content-identity scheme beside the workspace's SAIDs and pre-empts an open ruling on canonical order

*decision · conflict · spec section 3 · skeptic's verdict: **partly***

**Claim.** The workspace already has a content digest for definitions (Blake3-256 CESR SAID in bpm-core) and a deferred plan to give MAD definitions the same digest. A separate deferred ruling decides whether authored property order is identity-bearing; JCS sorts keys and section 3 sorts arrays, which answers that question by implementation. The workspace also has an existing notion of structural grouping (category SAIDs) and a deferred design bead for structural compare. Section 3's sha2-256 CIDv1 over JCS is compatible with none of these, and bpm-core's profile sorts only declared sets and never reorders authored sequences.

**Skeptic's correction.** The spec adds a second, incompatible content-identity scheme (sha2-256 CID over JCS) beside the workspace's Blake3 SAID, against bpm-core's locked rule. It pre-empts the property-order ruling bpm-nq3.1 only if mad-discovery is changed to hash MAD's real definitions; for the DCR format as written that ruling is untouched.

**Evidence.**

- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:14
  > """Return a shallow copy with d set to Blake3-256 CESR SAID. Requires key d."""
- bead bpm-nq3.3
  > with a Blake3-256 CESR digest (E prefix) that matches bpm-core's saidify byte-for-byte
- bead bpm-nq3.1
  > SAIDs computed first would all change if the ruling went the other way
- bead bpm-nq3.7
  > A category SAID is the SAID of a document with every point-by-SAID reference blanked the way its own SAID field is
- /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:219-220
  > `rules`, `see` entries — and is never reordered.

**Implication.** If both land, one definition has two unrelated identifiers and two normal forms, which the workspace's own rules treat as parallel implementations.

**Reviewer's suggested resolution.** Before phase 1, rule whether mad-discovery's identity is (a) a CID by design, because the audience is the ARD/AI Catalog ecosystem and SAIDs stay internal, (b) the SAID, with the CID dropped, or (c) both, with the SAID as identity and `digest`/CID as transport integrity. Record the ruling next to bpm-nq3.1 and bpm-nq3.3.

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py line 14, beads bpm-nq3.1, bpm-nq3.3 and bpm-nq3.7 (all still deferred, none closed or superseded), and documents.md line 220: quotes exact. Stronger evidence the reviewer did not cite: /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md line 59 ('Do not invent another digest') and mad-ux-design.md line 49 ('Results with the same exact SAID share one definition'). Overstatement: bpm-nq3.1 concerns authored JSON Schema property order in MAD Model, Authorization and RR documents; section 2's DCR graphs are not those documents.

### soundness-13: Section 2 is 'confirm with user' but phase 1 freezes golden hashes on it, and it matches neither existing format

*blocker · conflict · spec section 2, 6 phase 1, 8 question 2 · skeptic's verdict: **partly***

**Claim.** The format is explicitly provisional and open question 2 asks whether an existing DCR format should replace it, yet phase 1 builds the schema, normal form and golden fixtures with no step that waits for the answer; only AWS questions can safely wait until later phases. The answer is discoverable today and it is 'no match either way'. MAD's definitions are not DCR graphs: a Definition is a model, an authorization or an rr. bpm-core's DCR payload has a different shape: relations use source/target plus rr and origin, events carry kind/doc/group/owners, and the relation type set has a sixth member, `no-response`, that section 2 omits. The workspace also instructs agents not to fold DCR into MAD.

**Skeptic's correction.** The spec asks question 2 at the start but never says phase 1 is blocked on the answer. The answer is already knowable: neither MAD (model, authorization, rr documents) nor bpm-core (source/target relations, six types) has the section 2 format, and MAD's own review declined DCR as its contract language.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:40-42
  > ## 2. Definition format (v0 — confirm with user)
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:148
  > 2. Is there an existing DCR JSON format from earlier MAD work that §2 should match instead?
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:135
  > 1. **mad-hash** library + CLI + tests. No AWS. *Stop for review.*
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:6
  > export interface BaseDefinition { id: string; kind: 'model' | 'authorization' | 'rr'; name: string;
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py:67
  > type: str  # condition | response | include | exclude | milestone | no-response
- /Users/seriouscoderone/code/bpm/CLAUDE.md:191
  > Do not fold DCR or shared-run behavior into MAD.

**Implication.** Every hash, fixture and index row is a function of section 2. Starting phase 1 before the format is ruled guarantees a rewrite, and publishing 'MAD definitions' that MAD cannot produce undercuts the project's purpose.

**Reviewer's suggested resolution.** Split section 8: question 2 gates phase 1 and must be answered first; questions 1, 3 and 4 gate phase 2. State in section 2 what a 'MAD definition' is for this project: MAD's own model/authorization/rr documents, bpm-core's DCR projection, or a new DCR format. If DCR stays, decide on `no-response` and on source/target versus from/to.

**What the skeptic checked.** Spec lines 40-42, 135, 145 and 148: quotes exact. /Users/seriouscoderone/code/bpm/mad/src/domain.ts line 6 (kind is model, authorization or rr) and /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/process/model.py line 67 (six relation types including no-response) are exact; model.py lines 104-121 confirm the payload uses source, target, rr and origin. `grep -i dcr` over /Users/seriouscoderone/code/bpm/mad/src finds no DCR format. Uncited support: /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md line 21 ('Adopting event-history semantics as MAD's contract language would change the present design'). Overstatement: the section 8 heading says 'ask the user at the start' and the section 2 heading says 'confirm with user', so a step that asks does exist.

### soundness-14: displayName, representativeQueries and the URN name have no defined source

*decision · gap · spec section 4 · skeptic's verdict: **confirmed***

**Claim.** The definition format has no name field, and x- keys are stripped from the published normal form, so the catalog entry's required `displayName` has no stated source (file name, first event label, an x- key). `representativeQueries` is '2-5, from the definition's x-description if present': the spec does not say whether x-description is a string or a list, how one description becomes two to five queries, or what to emit when it is absent. The name segment of the urn:air: identifier is likewise unspecified; if it comes from the file name a rename changes the URN and, because the index sort key is the URN, orphans the old rows; if it comes from the CID, every edit mints a new identifier.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:92-93
  > - `identifier`: the publisher-domain `urn:air:` URN form, per the current spec;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:97
  > - `representativeQueries` (2–5, from the definition's `x-description` if present);
- https://agenticresourcediscovery.org/spec/ (section 4.2)
  > SHOULD contain 2–5 examples.
- https://agenticresourcediscovery.org/spec/ (Appendix C)
  > The discovery identifier uses a domain-anchored URN form, `urn:air:<publisher>:[<namespace>:]<agent-name>`,

**Implication.** The publisher cannot be written without inventing three conventions, one of which (URN name) fixes index keys.

**Reviewer's suggested resolution.** Declare in the schema: `x-name` (string, required by the publisher, becomes displayName), `x-description` (string), `x-queries` (array of 2-5 strings, copied verbatim; omit the field when absent, never synthesise), and `x-id` or 'the file stem' as the URN name with namespace `mad`. State that these live only in the source file and the catalog, never in /defs/.

**What the skeptic checked.** Spec lines 92-93 and 97: quotes exact; section 2 has no name field and line 64 strips x- keys from the published form. Fetched the ARD spec: section 4.2 lists `displayName` as MUST and says representativeQueries 'SHOULD contain 2-5 examples'; Appendix C gives the `urn:air:<publisher>:[<namespace>:]<agent-name>` form. One cost of the suggested fix: the same section says an entry without representativeQueries 'cannot be found by search', so omitting the field when absent makes the entry invisible to ARD search.

### soundness-15: Catalog details hard-coded in sections 4 and 5 disagree with the specs section 0 says to follow

*decision · conflict · spec section 0 (lines 17-20), 4 (lines 91-99), 5 (lines 110, 127-128) · skeptic's verdict: **confirmed***

**Claim.** As fetched on 2026-11-08: (1) ARD v0.91 makes /.well-known/ard.json the well-known path and calls ai-catalog.json a predecessor that publishers should leave; the spec publishes and crawls only ai-catalog.json, so it neither reaches ARD-first consumers nor indexes ARD-first publishers. (2) ARD's link relation is an HTML link element with rel="ard"; the HTTP Link header with rel="ai-catalog" exists only in the base AI Catalog spec. (3) Both specs name the media-type member `type`; the fetch found no occurrence of `mediaType` in either, so 'emit under both' rests on a stale premise. (4) The base spec puts vendor data under an `extensions` object keyed by URL or reverse-DNS string, and ARD resolves prefixed terms through a declared @context; a bare `mad:hashes` member satisfies neither without a context declaration. (5) ARD search requires `text` and filter keys are term paths, so a `mad:hash` filter does not name the published `mad:hashes` member. (6) Entries may carry inline `data` instead of `url`; the crawler and the `defUrl` attribute assume `url`. Section 0 says to read the current specs but only the identifier line says 'per the current spec', so precedence for the rest is a guess.

**Evidence.**

- https://agenticresourcediscovery.org/spec/ (header)
  > **Version**: v0.91 **Status**: Proposal **Date**: August 26, 2026
- https://agenticresourcediscovery.org/spec/ (section 5.1)
  > a publisher on the predecessor path SHOULD move to `ard.json`.
- https://agenticresourcediscovery.org/spec/ (section 5.1)
  > Including `<link rel="ard" href="...">` in the `<head>` of a document.
- https://agenticresourcediscovery.org/spec/ (section 4.2)
  > Artifact type as an IANA Media Type (§3.3).
- https://ai-catalog.io/spec/ (Extensions)
  > the keys MUST be a valid URL or a reverse-DNS string
- https://agenticresourcediscovery.org/spec/ (section 5.3.2)
  > For Search, `text` is required; `filter` is optional.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:94-95
  > (the base and ARD specs diverged on the field name);

**Implication.** An implementer who follows section 4 literally ships a catalog that the current ARD revision treats as legacy, and one who follows section 0 contradicts section 4.

**Reviewer's suggested resolution.** Add one sentence to section 0: 'where sections 4-5 name a path, member or relation that the pinned external spec names differently, the pinned spec wins and this file is corrected'. Then update section 4: serve the same document at both /.well-known/ard.json and /.well-known/ai-catalog.json (or rule that only one is wanted), crawl both, emit `type` only, declare the `mad` prefix in @context (and/or mirror the hashes under `extensions`), name the search filter after the real term path, and say what the crawler does with inline `data` entries.

**What the skeptic checked.** Fetched both specs (through a summarising fetch tool, twice each). ARD header reads v0.91, Proposal, August 26, 2026. Section 5.1: consumers 'MUST fetch `/.well-known/ard.json`', the ai-catalog.json path is the 'predecessor' that publishers 'SHOULD move' from, and the link relation is `<link rel="ard">`; no HTTP Link header in ARD. Both specs name the member `type`; neither contains `mediaType`. Base spec Extensions: keys 'MUST be a valid URL or a reverse-DNS string'. ARD 5.3.2: '`text` is required'. Entries carry exactly one of `url` or `data`. Spec line 98 says `mad:hashes` and line 128 says `mad:hash`.

### soundness-16: `npm run publish` collides with npm's own publish lifecycle and with a pending vocabulary ruling

*note · defect · spec section 4 (line 102) · skeptic's verdict: **partly***

**Claim.** `publish` is an npm lifecycle script name: `npm publish` runs a package's `publish` script after uploading the package to the registry. With a script of that name, a one-word slip (`npm publish` for `npm run publish`) publishes the package to npm and then runs the S3 deploy. Separately, the workspace is still deciding whether 'publish' or 'freeze' is the word for this act.

**Skeptic's correction.** A script named `publish` runs as part of `npm publish`, so a slip would publish the package and then deploy; rename it and set "private": true. The pending publish-versus-freeze ruling does not threaten the word 'publish' for serving frozen bytes.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:102
  > - Command: `npm run publish` builds, diffs against S3, uploads, and invalidates the catalog path only.
- https://docs.npmjs.com/cli/v10/using-npm/scripts
  > Runs BEFORE the package is prepared and packed, ONLY on `npm publish`.
- /Users/seriouscoderone/code/bpm/CLAUDE.md:211
  > Vocabulary: *freeze*, not *publish*; using a package **pins SAIDs**

**Implication.** A typo away from an accidental registry publish, and a command name the open ruling bpm-nq3.2 may overturn.

**Reviewer's suggested resolution.** Name the script `catalog:deploy` (or similar, not a lifecycle name) and require `"private": true` in the root and every workspace package.json.

**What the skeptic checked.** Fetched docs.npmjs.com scripts page. The quoted sentence ('Runs BEFORE the package is prepared and packed, ONLY on `npm publish`') describes `prepublishOnly`, not `publish`. The same page does list `publish` and `postpublish` in the `npm publish` lifecycle order, so the hazard is real. The vocabulary half is wrong: bead bpm-nq3.2 defines 'freeze = the immutability/identity boundary and publish = serving or endorsing frozen bytes', so 'publish' is the right word for this command under both candidate vocabularies; the open ruling is only whether MAD's UI splits its single Publish.

### soundness-17: The Link header on '/', the root object, Content-Type and CORS are unspecified, and S3 cannot emit a Link header

*decision · gap · spec section 4 (lines 89-99) · skeptic's verdict: **confirmed***

**Claim.** S3 object metadata cannot carry a `Link` response header (the user-settable system headers are Cache-Control, Content-Disposition, Content-Encoding, Content-Type and a few x-amz-* values; anything else must be x-amz-meta-*), so the header needs a CloudFront response headers policy or function, which the spec does not mention. The output list contains no object for '/', so with a private S3 origin the root request has nothing to return and the header would ride on an error response. The base spec permits the header on any HTTP response, so '/ only' is a narrowing with no stated reason. Content-Type is unspecified for the catalog and for /defs/ (S3 will infer application/json, not application/vnd.mad.dcr+json). Nothing mentions CORS, yet MAD is a browser application with no backend, so it cannot read the catalog, the definitions or the query API cross-origin without it.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:99
  > - `robots.txt` with an `Agentmap:` directive, and a `Link: <...>; rel="ai-catalog"` header on `/`.
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html
  > the optional user-defined metadata names must begin with `x-amz-meta-` to distinguish them from other HTTP headers
- https://ai-catalog.io/spec/ (Link Relation Discovery)
  > A server MAY include a `Link` header
- /Users/seriouscoderone/code/bpm/CLAUDE.md:191
  > (TypeScript + esbuild, no backend)

**Implication.** The CDK stack cannot be written to spec, and the first browser client (MAD itself) would be blocked by the same-origin policy.

**Reviewer's suggested resolution.** Specify: a CloudFront response headers policy on the default behaviour adds the Link header and `Access-Control-Allow-Origin: *` to all responses; publish an `index.html` and set it as the default root object; set Content-Type explicitly (`application/ai-catalog+json` or the pinned spec's type for the catalog, `application/vnd.mad.dcr+json` for /defs/); enable CORS for GET and POST on the HTTP API.

**What the skeptic checked.** Spec line 99: quote exact; the output list has no root object. Fetched the S3 metadata page: user-defined names 'must begin with `x-amz-meta-`', and the system-defined table has no Link entry. Base spec: 'A server MAY include a `Link` header [RFC8288] in HTTP responses' and the catalog 'SHOULD be served with the media type `application/ai-catalog+json`'. One correction: S3 does not infer a content type; the upload tool does, and a bare PutObject stores a generic binary type, which makes the missing Content-Type rule more pressing. Neither spec mentions CORS.

### soundness-18: 'Diffs against S3' is undefined for immutable objects, and invalidating only the catalog leaves other mutable files stale

*note · defect · spec section 4 (lines 90, 102) · skeptic's verdict: **confirmed***

**Claim.** /defs/ objects are content-addressed and served as immutable for a year, so a diff can only mean 'upload if absent'. The spec does not say what happens to a definition removed or edited locally: a sync-style diff deletes the old object, which breaks the immutability promise made to caches and to every index row holding that `defUrl`. Upload order is unstated; uploading the catalog before its definitions exposes a catalog that points at missing objects. Only the catalog path is invalidated, but robots.txt (whose Agentmap URL is absolute and changes with the domain) and the root document are also mutable. No Cache-Control is given for the catalog.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:90
  > - `/defs/<full-cid>.json`: normalized definition, immutable, `Cache-Control: max-age=31536000, immutable`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:102
  > builds, diffs against S3, uploads, and invalidates the catalog path only.

**Implication.** An implementer who reaches for `s3 sync --delete` silently unpublishes content the index and third parties still reference.

**Reviewer's suggested resolution.** State: /defs/ is append-only; an object is written only if absent (conditional put) and is never overwritten or deleted by the command; a definition dropped from `definitions/` leaves the catalog but stays in /defs/. Order: definitions, then catalog, then robots.txt and index, then invalidate the catalog path(s), /robots.txt and /. Give the catalog `Cache-Control: max-age=300`.

**What the skeptic checked.** Spec lines 90 and 102: quotes exact. Nothing states append-only behaviour for /defs/, upload order, what happens to a definition removed locally, or a Cache-Control for the catalog. Only the catalog path is invalidated although robots.txt is also mutable. Reasoning holds.

### soundness-19: Using the CloudFront default domain makes identifiers unknowable before deploy and throwaway after

*decision · defect · spec section 1 (line 27), 4 (lines 92, 101), 8 question 1 · skeptic's verdict: **confirmed***

**Claim.** The URN's publisher segment is a fully qualified domain name, the Agentmap directive takes an absolute URL, and the catalog is built before upload. With the CloudFront default domain none of these exist until the distribution has been deployed, so phase 2's 'working locally' build cannot produce the final catalog without a domain parameter the spec does not define. When a custom domain arrives every identifier changes, and because index rows are keyed by URN with no removal rule (soundness-21), the old rows stay. A custom domain also needs an ACM certificate in us-east-1 while the stack region is us-west-2, which means a second stack or cross-region references.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:101
  > - Domain: **open question** (see §8). Until answered, use the CloudFront default domain.
- https://agenticresourcediscovery.org/spec/ (Appendix C)
  > where `<publisher>` is a fully qualified domain name.
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
  > make sure you request (or import) the certificate in the US East (N. Virginia) Region (`us-east-1`).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:27
  > - Region: `us-west-2` unless the user says otherwise.

**Implication.** Anything published before the domain is settled is identified by a name that will be abandoned, and the index will keep it.

**Reviewer's suggested resolution.** Either answer question 1 before the first real publish, or state that pre-domain identifiers are disposable and that the indexer's seed entry and rows for the default domain are deleted at cut-over. Add a required `--domain` (or env) input to the publisher, used for the URN, absolute `url` values and the Agentmap line. Note the us-east-1 certificate stack in section 1.

**What the skeptic checked.** Spec lines 27, 92, 101 and 147: quotes exact. ARD Appendix C: '`<publisher>` is a fully qualified domain name'. CloudFront certificate page: 'make sure you request (or import) the certificate in the US East (N. Virginia) Region (`us-east-1`)'. No domain input to the publisher is defined. Small caveat: ARD only shows an absolute URL as an example for the Agentmap line; it gives no syntax rule.

### soundness-20: The index as specified cannot answer /definition/{cid}/similar or 'verified first'

*decision · gap · spec section 5 tables and Query API · skeptic's verdict: **confirmed***

**Claim.** `/definition/{cid}/similar` takes a full CID and must find its structural value, then other definitions with that value, excluding the same full CID. Rows under `hash#<full>` carry no structural value, and rows under `hash#<structural>` carry no full CID, so neither the lookup nor the exclusion can be done from the table; the only fallback is fetching and re-hashing `defUrl` inside the public API Lambda. 'Verified first' cannot come from the key either: items in a partition are ordered by the sort key, which is the URN, so the Lambda must read the whole partition and sort, which fails once a response is paginated. Trivial shapes (a single event with no relations) all share one structural value, so large partitions are expected. Unverified rows are stored under the hash the publisher claimed, which is by definition not the hash of their content.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-121
  > - attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:125-126
  > - `GET /definition/{cid}/similar` → by structural hash, excluding exact full match.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:114-115
  > 3. mismatches are stored with `verified=false` and a reason.

**Implication.** One of the three routes cannot be implemented from the stated schema, and a second is only correct for small partitions.

**Reviewer's suggested resolution.** Add attribute `full` to every shape row and `shape` to every full row (or one item `def#<fullcid>` holding shape, counts and a stored copy location). Index only under hashes the crawler computed; record claim mismatches on the source record, not in mad-index, which makes 'verified first' unnecessary. If unverified rows are kept, put the flag in the sort key (`v1#pub#...` before `v0#pub#...`). Put kind in the partition key (soundness-11). Define the response for an unknown CID (404) and a page size limit.

**What the skeptic checked.** Spec lines 120-121 and 125-126: quotes exact. With attributes limited to kind, defUrl, domain, verified, firstSeen and lastSeen, a full-hash row has no structural value and a structural row has no full CID, so /similar cannot be answered from the table. Items in a partition come back in sort-key (URN) order, so 'verified first' needs a full read. One sentence is an inference: the spec does not say whether mismatch rows are keyed by the claimed or the computed hash.

### soundness-21: Nothing removes a publisher that disappears, and the table has no access path to do it

*decision · gap · spec section 5 tables · skeptic's verdict: **confirmed***

**Claim.** The crawler only writes: rows gain `lastSeen` but are never deleted. Three ordinary events leave permanent false answers to 'who publishes hash X': an entry removed from a catalog, an entry whose content changed (the URN moves to a new hash partition and the row under the old hash remains), and a domain that goes away. Cleaning up by publisher or domain needs a query by those values, but the only key is hash then URN, so the only option is a full table Scan.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-122
  > - `mad-sources`: crawl targets and last crawl status.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:121
  > `verified`, `firstSeen`, `lastSeen`.

**Implication.** The index's answers degrade monotonically; after any edit a publisher is listed under hashes it no longer serves.

**Reviewer's suggested resolution.** Add a DynamoDB TTL attribute `expiresAt` = lastSeen + N days (N to be chosen, e.g. 14), refreshed on every successful crawl, and have the API filter out rows whose lastSeen is older than N days (TTL deletion lags). Add a GSI with partition key `domain#<host>` and sort key `<urn>#<kind>` so a crawl can delete a publisher's rows that were not re-seen in that run.

**What the skeptic checked.** Spec lines 106-122: the crawler only writes; no delete, expiry or TTL appears anywhere, and the only key is hash then URN. `mad-sources` (line 122) has no stated key or contents that could hold a per-domain row list. Reasoning holds.

### soundness-22: POST /search cannot be answered from the stored data and 'minimal ARD-conformant' is not a testable target

*decision · gap · spec section 5 Query API (lines 127-128) · skeptic's verdict: **confirmed***

**Claim.** ARD search requires a text query and returns scored results. The index stores no text (no displayName, no representativeQueries) and DynamoDB has no text search, so the only implementation from this schema is a full Scan per request on a public endpoint. ARD also places registry obligations beyond the search route (web ingestion of hosted manifests and in-page markup is a MUST for all implementations), so 'this makes our indexer itself a valid ARD registry' is a larger claim than one endpoint. The filter name does not match the published field (soundness-15).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:127-128
  > our indexer itself a valid ARD registry. Support a `mad:hash` filter.
- https://agenticresourcediscovery.org/spec/ (section 5.3)
  > An Agent Registry **MUST** expose a standard HTTP REST search interface to guarantee universal federation.
- https://agenticresourcediscovery.org/spec/ (section 5.2)
  > All ARD implementations MUST support this.
- https://agenticresourcediscovery.org/spec/ (section 5.3.2)
  > In a response, an entry MUST carry `identifier`; every other term is at the registry's discretion.

**Implication.** The route is either an unbounded-cost Scan or an unreviewed design, and the conformance claim cannot be checked.

**Reviewer's suggested resolution.** Choose: drop POST /search from this build and keep the two hash routes; or define it narrowly: the crawler writes one snapshot object (identifier, displayName, queries, type, hashes per entry) to S3, the search Lambda loads it and does substring scoring, `text` is required, the hash filter is an exact lookup, page size is capped, and the stated claim becomes 'implements ARD section 5.3.2 Search' with the pinned version, not 'a valid ARD registry'.

**What the skeptic checked.** Spec lines 127-128: quote exact. ARD fetch: section 5.3 'An Agent Registry MUST expose a standard HTTP REST search interface'; section 5.2 web ingestion 'All ARD implementations MUST support this'; section 5.3.2 '`text` is required' and results are 'ranked by relevance' with a score. The index stores no text, so the route cannot be served from the stated tables without a Scan.

### soundness-23: The crawler fetches attacker-chosen URLs with almost no stated limits

*blocker · defect · spec section 5 Crawler (lines 107-116) · skeptic's verdict: **confirmed***

**Claim.** Every URL after the seed list comes from an untrusted document: entry `url` values, nested catalog links, and results from third-party registries. The stated limits (5 s, 1 MB, robots.txt) are attached to the catalog fetch only; the definition fetch in step 3 has none. Missing rules, each with a concrete failure: (1) scheme and port: http:, data: and odd ports are not excluded. (2) Address ranges: nothing rejects loopback, private, link-local or metadata addresses; inside Lambda the runtime API is plain HTTP on a local address and its next-invocation resource is a GET. (3) Redirects: Node's fetch follows them by default, which bypasses the robots check, the per-domain limit and any address check done on the first URL. (4) Size: a 1 MB cap must count decoded bytes while streaming; fetch transparently decompresses, so a small compressed body can exhaust memory. (5) Time: '5s' must be a total deadline including the body, or a slow-drip server holds a connection indefinitely. (6) Fan-out: a 1 MB catalog can list thousands of entries or nested catalogs on other hosts; depth 3 plus a visited set bounds repeats, not volume, so one seed can direct the crawler at a third party's site. (7) Cross-host definitions: 'per-domain concurrency' does not say whether an entry's `url` on a different host is allowed, or whether that host's robots.txt is consulted. (8) robots.txt: no product token is named, and behaviour when robots.txt is unreachable is unstated. (9) No cap on events or relations, which matters once confirmation runs an isomorphism search (soundness-07). The base AI Catalog spec lists most of these as consumer duties.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:110-113
  > 2. For each domain, fetch `/.well-known/ai-catalog.json` (timeout 5s, max 1 MB, respect robots.txt).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:111
  > Recurse into nested `application/ai-catalog+json` entries, with depth ≤ 3 and a visited-set.
- https://ai-catalog.io/spec/ (Safe Fetching)
  > Resolve and reject URLs targeting private, loopback, link-local, or cloud metadata addresses
- https://ai-catalog.io/spec/ (Safe Fetching)
  > re-check the resolved address after any redirect
- https://docs.aws.amazon.com/lambda/latest/dg/runtimes-api.html
  > curl "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next"
- https://www.rfc-editor.org/rfc/rfc9309.txt (section 2.3.1.4)
  > this means the robots.txt file is undefined and the crawler MUST assume complete disallow.
- https://www.rfc-editor.org/rfc/rfc9309.txt (section 2.2.1)
  > Crawlers set their own name, which is called a product token, to find relevant groups.

**Implication.** As written the crawler can be pointed at its own execution environment, made to run out of memory, or used to send traffic to a third party, by anyone who can get a catalog fetched.

**Reviewer's suggested resolution.** Add a 'Fetch policy' subsection applying to every request: https only, default port; resolve the host and refuse loopback, private, link-local, CGNAT, unique-local and unspecified addresses, checked at connect time; redirects handled manually, at most 3 hops, each re-validated, same host only for definitions; `Accept-Encoding: identity` or count decoded bytes and abort at 1 MB; one 5 s total deadline per request; a definition `url` must be on the host that served its catalog; per seed and per run caps (e.g. 200 entries, 20 nested catalogs, 500 requests); schema caps of 256 events and 2,048 relations; User-Agent `mad-discovery-indexer` with a contact URL, obeying its own robots group else `*`, treating an unreachable robots.txt as disallow. Make each rule a phase 3 fixture-server test.

**What the skeptic checked.** Spec lines 110-113: the 5 s, 1 MB and robots.txt limits are attached to the catalog fetch; line 113 gives the definition fetch none. Base spec Safe Fetching quotes found (scoped to 'Consumers performing verification', which includes artifact URLs). RFC 9309 sections 2.2.1 and 2.3.1.4 quotes found. Lambda runtime API page: plain-HTTP `curl "http://${AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime/invocation/next"`, method GET. Ran Node v24.19.0 fetch on loopback: default redirect mode is 'follow' and a 302 to a loopback URL with that path was followed; a 20,406-byte gzip body was delivered as 20,971,520 bytes while Content-Length reported 20,406. Scope note: section 0 forbids NAT gateways, so the function runs outside a VPC and the reachable internal target is loopback, not a private network.

### soundness-24: One daily Lambda with per-domain concurrency 1 cannot finish a large or slow domain and never resumes

*decision · defect · spec section 5 Crawler (lines 106, 116) · skeptic's verdict: **partly***

**Claim.** The crawler is a single scheduled Lambda (15 minute ceiling) that fetches each domain's entries one at a time. A domain whose responses take close to the 5 s timeout gets through about 180 entries before the invocation ends; there is no cursor or continuation, so the next daily run starts again from the first entry and the tail is never indexed. One such domain also consumes the invocation for everyone under a global concurrency cap. The design re-fetches every definition every day although a verified definition at a content-addressed URL cannot have changed.

**Skeptic's correction.** The single daily invocation has no continuation and starves later domains, and the spec sets no function timeout at all (the default is 3 seconds, below its own 5 second fetch timeout). Skipping the re-fetch is safe only for URLs known to be immutable; otherwise use a conditional request and refresh lastSeen only on a successful response.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:106
  > **Crawler Lambda** (EventBridge schedule, daily; also invocable manually):
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:116
  > 4. Politeness: per-domain concurrency of 1, and a global concurrency cap.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:16
  > - Keep it serverless and near-zero idle cost (no NAT gateways, no always-on compute, DynamoDB on-demand).

**Implication.** Coverage silently stops at whatever fits in one invocation, and a slow publisher starves the rest.

**Reviewer's suggested resolution.** Have the scheduled function enqueue one SQS message per source; a worker Lambda (reserved concurrency = the global cap) crawls one domain per message with a per-domain time budget and writes a resume cursor to mad-sources. Skip the definition fetch when the entry's (URN, url, claimed hashes) equal a row already verified, and only refresh lastSeen. SQS has no idle cost, so the ground rule holds.

**What the skeptic checked.** Spec lines 16, 106 and 116: quotes exact. Lambda timeout page: default 3 seconds, maximum 900 seconds. One scheduled invocation with per-domain concurrency 1 and no cursor cannot finish a slow or large domain; that holds. The claim that a verified definition 'cannot have changed' is true only for our own /defs/&lt;cid&gt;.json: a foreign entry's `url` is arbitrary and mutable. The proposed skip rule would also refresh lastSeen without a fetch, which defeats the expiry rule proposed in soundness-21.

### soundness-25: Index rows are keyed on what a catalog claims, so any catalog can overwrite or impersonate another publisher

*blocker · defect · spec section 5 Crawler step 3 and tables · skeptic's verdict: **confirmed***

**Claim.** The sort key is the entry's URN, which is a string the catalog author types. A catalog served from one host can list an entry whose identifier names another publisher's domain and whose `url` serves a byte-copy of that publisher's definition; the write lands on the same partition and sort key as the genuine row and replaces its `defUrl` and `domain`. The spec does not say whether `domain` is the host that was crawled or the URN's publisher segment. Rows are also written under the claimed hash even when the content does not match (verified=false), so any catalog can add itself to the publisher list of any hash it names. Finally, verified=true establishes only that the fetched bytes hash to the claimed values: it says nothing about authorship or who was first, and `firstSeen` is crawl order. With signing out of scope, the only identity evidence available is which host served the catalog over HTTPS, and the spec does not use it.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-121
  > - PK `hash#<cid>`, SK `pub#<urn>`;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:114-115
  > 2. record `verified=true` only if the computed hashes match the claimed ones;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:100
  > - No signing in v0. The trust manifest is optional, and same-origin keys add no real security.
- https://ai-catalog.io/spec/ (Security Considerations)
  > Identifier syntax alone does not verify publisher identity or establish trust.
- https://ai-catalog.io/spec/ (Digest Format)
  > A digest alone does not authenticate its source
- https://ai-catalog.io/spec/ (Security Considerations)
  > Matching the publisher domain proves namespace control, not reputation, claim accuracy, or artifact safety.

**Implication.** The index's single answer, 'who publishes hash X', can be falsified or polluted by one hostile catalog, with the victim's own row as collateral.

**Reviewer's suggested resolution.** Add to section 5: accept an entry only if the publisher segment of its URN equals the host its catalog was fetched from (no redirects); otherwise skip and log. Set `domain` to the crawled host and include it in the sort key (`pub#<host>#<urn>`). Write rows only under hashes the crawler computed; record a claim mismatch on the source record. Rename `verified` to `hashMatches` (or drop it once only computed hashes are indexed) and document in the API that a row means 'this host serves these bytes', not authorship, and that firstSeen is observation order.

**What the skeptic checked.** Spec lines 100, 114-115 and 120-121: quotes exact. The sort key is a catalog-authored URN and nothing ties it to the serving host, so a byte-copy under the same URN hits the same key. Base spec quotes all exist, though not where cited: 'Identifier syntax alone...' is in the `identifier` definition, 'Matching the publisher domain...' is in the did:web signer profile, 'A digest alone...' is in the `digest` definition. Two caveats: whether the write overwrites depends on unstated write semantics, and the leg about rows under claimed hashes depends on an unstated keying choice. The base spec does have a rule the reviewer could not find (see missed).

### soundness-26: 'Public, rate-limited' on an HTTP API means one global throttle, and the default is the account maximum

*decision · defect · spec section 5 Query API (line 124), 7 · skeptic's verdict: **confirmed***

**Claim.** API Gateway HTTP APIs have no API keys, no per-client rate limiting, no per-client usage throttling and no AWS WAF integration; the only control is a stage or route throttle shared by all callers, applied on a best-effort basis. If no number is set the limit is the account-level default of 10,000 requests per second. So 'rate-limited' can only mean a global ceiling that one client can exhaust for everyone, and the spec gives no number. Cost exposure: every request is billed by API Gateway and Lambda and performs at least one DynamoDB read; an eventually consistent Query costs half a read unit per 4 KB, so a request that reads a full 1 MB page of a large partition costs 128 read units. At the unthrottled default, a sustained flood is 864 million requests a day; with 1 MB pages that is about 110 billion read units, roughly $13,800 a day at the page's $0.125 per million example price, before API Gateway and Lambda charges. With a stage throttle of 5 requests per second and a 50-item Query limit, a month-long flood is about 13 million requests and a worst case in the low tens of dollars (API Gateway and Lambda list prices not verified here).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:124
  > **Query API** (API Gateway HTTP API + Lambda, public, rate-limited):
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
  > Choose REST APIs if you need features such as API keys, per-client throttling, request validation, AWS WAF integration, or private API endpoints.
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html
  > Throttles are applied on a best-effort basis and should be thought of as targets rather than guaranteed request ceilings.
- https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
  > 10,000 requests per second (RPS) with an additional burst capacity provided by the [token bucket algorithm]
- https://aws.amazon.com/dynamodb/pricing/on-demand/
  > Eventually consistent reads require one-half RRUs per 4 KB or part thereof.

**Implication.** Left as written, the endpoint's cost ceiling is whatever the account-wide throttle allows, and its availability is whatever one abusive client leaves.

**Reviewer's suggested resolution.** Write the mechanism and numbers into section 5: default route throttle (e.g. rate 5, burst 10) set in CDK; reserved concurrency on the query Lambda (e.g. 5) so a flood cannot consume the account's Lambda concurrency; `Limit` 50 on every Query and no Scan on any route; a monthly AWS Budgets alarm. Decide whether per-client fairness matters: if yes, front the GET routes with CloudFront caching (content-addressed answers cache well) or move to a REST API with usage plans, accepting the extra cost; if no, say that the global throttle is the accepted design.

**What the skeptic checked.** Spec line 124: quote exact. AWS pages fetched: HTTP APIs show No for API keys, per-client rate limiting, per-client usage throttling and AWS WAF; 'Throttles are applied on a best-effort basis'; default quota '10,000 requests per second (RPS)' with burst 5,000; DynamoDB 'Eventually consistent reads require one-half RRUs per 4 KB' at $0.125 per million (US East example). Arithmetic re-derived: 864,000,000 requests a day, 128 units per 1 MB page, about 110.6 billion units, about $13,824 a day; 5 requests a second for 30 days is 12.96 million requests. A 1 MB partition is attacker-constructible from one catalog of several thousand entries naming one hash.

### soundness-27: Phase exit criteria do not exercise the project's core question or its failure paths

*note · defect · spec section 6 · skeptic's verdict: **partly***

**Claim.** Phase 4 publishes two or three definitions from one publisher and checks that the structural lookup returns both. 'Who else publishes this' is never tested across two origins; the mismatch path (verified=false), the confirmation step, URN spoofing and every fetch limit go unexercised. The check also passes or fails depending on an unstated reading: two entries from one publisher are two rows only because the sort key is per URN. Phase 2 ends 'stop before deploy' but its one command (`npm run publish`: diff, upload, invalidate) cannot run without a deployed bucket, so the phase's deliverable is untestable beyond a local dist folder and a synthesised template. Phase 3 reads 'then deploy. Stop before deploy.', which says two things. Phase 1 has no step that confirms the provisional format (soundness-13).

**Skeptic's correction.** The exit criteria never test the cross-publisher case or any failure path, and the phase 4 check depends on the per-URN sort key. Phases 2 and 3 are internally consistent; what is missing is any statement of when the two deploys and the first upload actually happen and what is checked right after each.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:136-139
  > 3. **Indexer**: crawler + DynamoDB + query API. Test against a local fixture server first, then deploy. *Stop before deploy.*
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:138-139
  > 4. **End-to-end:** publish 2–3 sample definitions, including two that differ only by labels. Crawl,
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:4
  > standard, plus a reverse index that answers: **"who else publishes a definition with hash X?"**

**Implication.** All four phases can be signed off with the cross-publisher case, the poisoning defences and the fetch limits never run.

**Reviewer's suggested resolution.** Phase 2 exit: `dist/` matches golden output for a given `--domain`, and `cdk synth` succeeds; the upload command is first run in phase 4. Phase 3 exit, against a local fixture server presenting at least two hosts: same definition on both hosts returns two publishers; a false hash claim is not indexed under the claimed hash; a URN naming the other host is rejected; redirect to loopback, oversize, slow-drip and compressed-bomb responses are refused; one colliding pair from soundness-06 is not reported as similar. Reword phase 3 to 'then stop and ask before deploying'.

**What the skeptic checked.** Spec lines 4 and 135-139: quotes exact. Phase 4 uses one publisher and never exercises a second origin, a mismatch, confirmation, URN spoofing or a fetch limit; that holds. Two sub-claims are strained: phase 2's stated deliverable is exactly a local ./dist plus stack code, and 'then deploy. Stop before deploy.' reads consistently with line 14 as 'ask before deploying'.

### soundness-28: Ground rules: 'tag every resource' and 'no paid resources without asking' are not testable as written, and the Node 20 floor is past end of support

*note · defect · spec section 0, 1 · skeptic's verdict: **confirmed***

**Claim.** (1) Not every resource a CDK stack creates is taggable (bucket policies, origin access controls, Lambda permissions, API routes and integrations), and `cdk bootstrap`, which must run before the first deploy, creates account-wide shared resources that should not carry this project's tag and are not covered by the 'ask first' rule's wording; the rule needs a checkable form. (2) 'Near-zero idle cost' is unquantified: CloudWatch log groups default to never expiring, and a new Route 53 hosted zone or a WAF web ACL (if chosen under soundness-26) are standing charges. (3) Section 1 allows Node 20; the Lambda `nodejs20.x` runtime was deprecated on Apr 30, 2026 and now sits in the deprecated table, while this machine runs Node v24.19.0.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:14-16
  > - Tag every resource: `project=mad-discovery`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:25
  > - Language: TypeScript (Node 20+) everywhere. Monorepo with npm workspaces.
- https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
  > | Node.js 20 |  nodejs20.x  | Amazon Linux 2023 |  Apr 30, 2026  |  Jul 29, 2027  |  Aug 31, 2027  |
- https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
  > | Node.js 24 | `nodejs24.x` | Amazon Linux 2023 |  Apr 30, 2028  |  Jun 1, 2028  |  Jul 1, 2028  |

**Implication.** An implementer can satisfy the letter of section 0 and still leave untagged or standing-cost resources, or pick a runtime that is already unsupported.

**Reviewer's suggested resolution.** Reword: 'apply the tag at the CDK app level; exit check: a tagging-API query for project=mad-discovery lists the bucket, distribution, tables, functions, API and queue'. Add: 'cdk bootstrap is a one-time, account-wide step and needs its own go-ahead'. Add: log retention 14 days on every function; list any accepted standing charge. Change the floor to Node 22 or 24 and name the Lambda runtime identifier.

**What the skeptic checked.** Spec lines 14-16 and 25: quotes exact. Lambda runtimes page: Node.js 20 (`nodejs20.x`) is in the Deprecated table with deprecation date Apr 30, 2026; Node.js 24 is supported until Apr 30, 2028. `node -v` here prints v24.19.0. Nuances: 'Node 20+' is a floor that permits 22 or 24, function creation on nodejs20.x is not blocked until Jul 29, 2027, and `cdk bootstrap` is arguably already covered by 'never deploy without asking'.

### What the skeptic added (soundness)

**No rule for when two hash strings are equal** *(decision)*

Section 3 fixes the encoding of our own output (CIDv1, base32) but never says how a claimed hash from a foreign catalog, an index key, or a `GET /hash/{cid}` parameter is compared. One CID has several valid text forms, so a string comparison records verified=false for a correct claim and a lookup misses rows. Amendment: parse every incoming hash, require version 1, raw codec and sha2-256, re-encode to lowercase base32, and use only that string for comparison and keys; reject anything else.

Evidence: Spec line 67 (encoding), line 114 ('computed hashes match the claimed ones'), line 120 (PK `hash#<cid>`), line 125 (`GET /hash/{cid}`). Computed on this machine: one digest encodes as `bafkreibe3yoe...` (base32), `k2cwue9khffo...` (base36) and `zb2rhZ8CJhjJ...` (base58btc). The `multiformats` source (js-multiformats src/cid.ts) parses base32, base36 and base58btc by default and `CID.equals` compares bytes, not strings.

**The crawler's per-entry outcomes are undefined beyond match and mismatch** *(decision)*

Step 3 selects entries with the MAD media type or a `mad:hashes` field, then compares computed with claimed hashes. It does not say what to record when there is no claim (media type only), a partial claim (one of the two hashes), a fetch failure, a definition that fails schema validation (no hash can be computed, so there is no key to write under), or an inline `data` entry. Mismatches are stored 'with a reason', but the table has no reason attribute and the spec does not say whether the row goes under the claimed or the computed hash. Amendment: add an outcome table and index only under computed hashes, with failures recorded per source.

Evidence: Spec lines 112-115 ('For each entry with the MAD media type or a `mad:hashes` field', 'mismatches are stored with `verified=false` and a reason') against line 121 (attributes: kind, defUrl, domain, verified, firstSeen, lastSeen).

**Registry seeds cannot be processed as written, and the base spec already says how a publisher's URN is bound to a domain** *(decision)*

'Query them for the MAD media type' is not an ARD search: `text` is required, results need carry only `identifier`, and pages are capped, so the crawler may get neither a `url` nor hashes. Registry results and nested catalogs are also served by hosts other than the publisher, which the host-equality fix in soundness-25 would reject without saying what to do instead. The base spec's answer is a signed did:web publisher manifest, which spec line 100 rules out on the ground that 'same-origin keys add no real security'; that reasoning fails once entries are read from a third-party host. Amendment: treat registry results and nested catalogs as a source of domains to crawl, and index an entry only from its publisher's own host until signing is in scope.

Evidence: Spec line 109 and line 100. ARD spec section 5.3.2 (fetched): 'For Search, `text` is required', 'an entry MUST carry `identifier`; every other term is at the registry's discretion', pageSize maximum 100. Base AI Catalog spec (fetched): 'An operator that is neither the artifact publisher nor its authorized delegate MUST use a non-`urn:air` identifier under its own control'; did:web profile: 'The authenticated signer identity MUST exactly match `did:web:` followed by that component'; 'MUST NOT infer publisher authorization from the artifact's URL or an unsigned `publisher` field'.

**The workspace's design documents already define discovery identity, and the reviewer did not cite them** *(decision)*

Soundness-12 and soundness-13 rest on beads and source files, but the design authority is more direct: MAD's discovery is specified as exact SAID plus category SAID, bpm-core forbids a second digest, and MAD's own review declined DCR as its contract language. There is no bead or ruling for mad-discovery; a session note from today records an A/B/C choice (option A: hash MAD's real definitions with SAIDs) still waiting on the maintainer. The format and digest questions should be ruled before phase 1, not asked alongside the AWS questions.

Evidence: /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md line 49 ('Results with the same exact SAID share one definition') and line 98 ('Category equality is a structural discovery fact'); /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md line 59 ('Do not invent another digest'); /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md line 21; /Users/seriouscoderone/code/bpm/.remember/today-2026-11-08.md ('recommended option A (hash MAD real defs w/ SAIDs) ... awaiting user go-ahead, A/B/C choice'). `bd search` for discovery, ARD, catalog, openhaven, aggregation, reverse index, CID and crawler returned nothing relevant.

**Facts the first reviewer left as inference, now checked** *(note)*

Three items from the could-not-find list are settled. (1) The current `canonicalize` package rejects lone surrogates itself, and it had three major releases in six weeks, so the spec should pin an exact version of this hash-critical dependency. (2) Node fetch follows redirects and inflates compressed bodies by default, and Content-Length reports the compressed size, so a header check cannot enforce the 1 MB cap. (3) The Lambda timeout defaults to 3 seconds and tops out at 900; the spec sets none, so a default-configured crawler dies before one 5 second fetch can time out. Not found: any JCS, CID, Weisfeiler-Lehman or isomorphism code in mad/src or bpm-core/src, either npm package on this machine, or a statement on whether a CloudFront path pattern can match the root alone.

Evidence: github.com/erdtman/canonicalize lib/canonicalize.js (master): `if (!value.isWellFormed())` then 'Lone surrogate is not allowed'; registry.npmjs.org/canonicalize: 4.0.0 on 2026-08-12, 5.0.0 on 2026-09-08, 5.1.0 on 2026-09-18. Loopback test on Node v24.19.0: `new Request(...).redirect` is 'follow', a 302 was followed, and 20,406 gzip bytes arrived as 20,971,520 bytes. docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html: 'The default value for this setting is 3 seconds ... up to a maximum value of 900 seconds (15 minutes).'

### Looked for and not found (soundness)

- Any existing JCS / RFC 8785, multiformats / CID, Weisfeiler-Lehman or graph-isomorphism code in /Users/seriouscoderone/code/bpm/mad/src (grep for canonicaliz|JCS|rfc 8785|multiformats|CID|SAID found only the hand-written canonicalJson in /Users/seriouscoderone/code/bpm/mad/src/services/crypto.ts:15-24, which is 'not a KERI/SAID implementation'); bpm-core/src was searched only for DCR and blake3, not for WL.
- The `canonicalize` and `multiformats` npm packages anywhere under /Users/seriouscoderone/code (not installed), so the claim that `canonicalize` does not raise on lone surrogates is inferred from JSON.stringify behaviour on Node v24.19.0, not read from the package source.
- A DCR-graph JSON definition format in MAD: /Users/seriouscoderone/code/bpm/mad/src/domain.ts defines Definition as model | authorization | rr only.
- Any bead about mad-discovery, ARD, AI Catalog or a reverse index: `bd search discovery` returned only the closed cruft chore bpm-uaj.13, `bd search catalog` returned three unrelated bpm-core beads, `bd memories discovery` returned nothing.
- In the spec: a size cap or timeout for the definition fetch; a redirect, scheme or address policy; a crawler User-Agent; CORS; Content-Type for the catalog or /defs/; a deletion or expiry rule for index rows; any secondary index; a throttle number; the source of displayName or the URN name; a statement of which keys `full` covers.
- In the ARD spec (v0.91, as summarised by the fetch tool): a Security Considerations section, any mention of SSRF, an HTTP Link header, the string `mediaType`, or a rule for two sources claiming one identifier.
- In the base AI Catalog spec (as summarised by the fetch tool): any mention of robots.txt, the string `mediaType`, a decompression rule under Safe Fetching, or a requirement that the identifier's publisher domain match the serving host.
- Verified list prices for API Gateway HTTP API and Lambda (pricing pages were not captured); the DynamoDB figure quoted is the on-demand page's US East example, not an Oregon rate.
- A documented statement of the 900-second Lambda timeout and of Node fetch's default redirect and decompression behaviour: both are stated from general knowledge, not from a page fetched in this review.
- Whether a CloudFront cache behaviour can match the root path alone; not checked, which is why soundness-17 recommends applying the header on the default behaviour.

<a id="objective-fit"></a>

## Fit to the objective

*Whether the design makes aggregation sites unnecessary.*

**Reviewer's summary.** Of the five things an aggregation site provides, the spec replaces one: the canonical reference bytes (content hash plus an immutable /defs/&lt;cid&gt;.json that any fetcher can re-hash). Lookup ("who else has X"), enumeration and search still live in §5's crawler, index, seed list and public /search endpoint, which is an aggregation site under another name; curation and trust are not addressed. The cause is on the publishing side: a catalog lists only self-authored definitions, with no adopted hashes and no links to other publishers, so the crawler's nested-catalog recursion has nothing to follow and the phase-4 test involves a single publisher. The smallest change that removes the need for a central indexer is for each catalog to list the hashes it adopts (with the kind of claim) and the peer or source catalogs it knows per hash, and for the crawl to run locally from any one introduction; MAD's existing design already describes discovery this way (local knowledge, OOBI-style introductions, "no required central catalog"). The hashed unit does not exist in this workspace: MAD definitions are models, authorizations and RRs, DCR is a derived projection in bpm-core and was declined as MAD's contract language, and the hash covers no data models although "blocks link only through shared models". Three identity choices cut across the KERI direction and are not additive later: a second digest (CIDv1 sha2-256 over JCS versus Blake3-256 CESR SAIDs), labels and local ids inside the full hash (workspace criterion: rename a label, SAID unchanged), and a DNS-anchored publisher that conflates retrieval host with author or endorser. The structural hash competes with the category SAID already designed in bpm-nq3.7 and bpm-upm.23, discards which events share a role, and is defined only by a lossy algorithm. ARD v0.91 (2026-08-26) moved publication to /.well-known/ard.json and rel="ard", neither spec has a mediaType field, and the base spec already has a per-entry digest and requires custom fields under extensions with URL or reverse-DNS keys. Five decisions are listed (D1 to D5); D1, what is discovered and how it is identified, blocks phase 1. "openhaven" could not be identified in the workspace or on the web, and web quotes came through a summarising fetch, so re-open the URLs before relying on exact wording.

### objective-fit-01: Only the canonical-bytes function of an aggregation site is replaced

*decision · gap · spec section §3, §4, §5 · skeptic's verdict: **partly***

**Claim.** An aggregation or reference site provides five things: (E) enumeration, what protocols exist; (L) lookup, who speaks protocol X; (R) reference, the canonical text of X; (C) curation and trust, which ones are real or worth using and who vouches; (S) search. Mapping to the spec: R is replaced for bytes only (§3 full hash plus §4 immutable /defs/&lt;full-cid&gt;.json, re-hashed by the fetcher in §5 step 3). L exists only as GET /hash/{cid} inside the hosted index, and it answers "which web origins serve an entry with this hash", not "who operates, issues or relies on it". E has no endpoint and is bounded by the seed list. S exists only as POST /search on the hosted index. C is absent: no signing, no endorsement, and `verified` means only that bytes match a claimed hash. So four of the five functions are either unreplaced or re-centralised in the indexer.

**Skeptic's correction.** R is replaced for bytes only, L exists only in the hosted index (a generic ARD registry answers it only if it chooses to index the custom hash term: 'support for metadata.* and other extension terms is registry-defined'), and C is absent. Two parts are overstated. S is not only on the hosted index: the publisher emits representativeQueries, which ARD calls 'the signal a registry builds its semantic index from', so any ARD registry that crawls the origin gives text search. E exists per publisher (the catalog file is an enumeration); what is missing is network-wide enumeration, for which ARD defines optional POST /explore and GET /agents that the spec leaves out. The five-function model is also too small for the site the maintainer named: OpenHaven provides comparable standard attributes, a taxonomy, a relationship graph and matrix, and independent assessment (see missed 1).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:3-4
  > plus a reverse index that answers: **"who else publishes a definition with hash X?"**
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:125
  > - `GET /hash/{cid}` → list of publishers (verified first) for a full or structural hash.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:114
  > 2. record `verified=true` only if the computed hashes match the claimed ones;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:100
  > - No signing in v0. The trust manifest is optional, and same-origin keys add no real security.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15
  > Content addressing alone does not discover peers, grant trust or make different definitions interchangeable.

**Implication.** As written the project delivers a content-addressed file host plus one small aggregator. The objective needs L, E and S to work without a place everyone must go, and C to be the consumer's own choice over attributable claims.

**Reviewer's suggested resolution.** Write the objective into the spec as an acceptance test: a party holding one introduction (one catalog URL) can answer "who else" for a hash with no hosted index. See D2 and D3.

**What the skeptic checked.** Re-read /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md lines 3-4, 100, 114, 125 and /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:15; all five quotes are verbatim. Read ARD v0.91 raw text (sections 4.2, 5.3) for what any registry offers, and identified the named site (openhaven.net) to test the five-function model.

### objective-fit-02: The §5 indexer is an aggregator by another name, and /search makes the project a registry operator

*decision · defect · spec section §5, §8 Q4 · skeptic's verdict: **partly***

**Claim.** A scheduled crawler, a seed list of domains, a DynamoDB index and a public rate-limited query API are the parts of an aggregation site. What differs from a reference site is real but narrow: the index assigns no identity, its answers can be re-verified by fetching the named origin, and anyone can run a copy. The spec then makes the indexer a conformant ARD registry, which is the role the objective wants nobody to need. The seed list is the curation, and open question 4 asks the maintainer to do that curation by hand. The only lookup result the design guarantees is the publisher itself.

**Skeptic's correction.** The index is an aggregator in the registry or search-index sense, and the reverse lookup exists only where someone operates it and feeds it seeds; that holds. Two corrections. The vision sentence the finding cites permits such catalogs ('Catalogs may search, categorize, recommend, and return introductions') and rules out only 'one global catalog or a new mandatory discovery service', so workspace text does not by itself make an optional index a defect; that reading belongs to the maintainer. And the difference from a reference site is not narrow: OpenHaven's entries are researcher-drafted assessments with 40+ attributes and it states 'Self-attestation from a developing team is not sufficient', whereas this index holds only self-published entries checked by hash. The spec builds a registry, not a reference site.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:107-109
  > 1. Seed sources (in a DynamoDB `sources` table or an S3 config file):
  >    - a list of domains;
  >    - optional ARD registry endpoints (query them for the MAD media type).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:127-128
  > This makes
  >   our indexer itself a valid ARD registry.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:130-131
  > **Self-check:** our own catalog is always in the seed list, so lookups of our own hashes return
  > at least ourselves.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:150
  > 4. Initial seed domains beyond our own?
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76
  > Catalogs may search, categorize, recommend, and return introductions; they do not assign the identity of the definitions they describe. We can adopt useful discovery conventions without requiring one global catalog or a new mandatory discovery service.

**Implication.** If phase 3 ships as written, the answer to the spec's headline question exists only where someone runs this service and maintains its seed list. That is the dependency the objective is meant to remove.

**Reviewer's suggested resolution.** Demote the hosted index to an optional cache built from the same crawler code, and make the crawler a local command that starts from any introduction. Drop POST /search from the first cut. See D2.

**What the skeptic checked.** Spec lines 107-109, 124-131, 150 and /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76, all verbatim. ARD sections 3.5 and 5.3: a registry MUST expose POST /search; Explore and List are optional, so a search-only endpoint can be a registry. Compared the index with what openhaven.net's process page says its entries are.

### objective-fit-03: Publishers emit nothing a crawler can follow, and cannot list a hash they adopted

*decision · gap · spec section §1, §4, §5, §6 · skeptic's verdict: **partly***

**Claim.** The crawler recurses into nested catalogs, but the §4 publisher emits exactly one entry per self-authored definition and no nested-catalog or peer entries. In a network made only of spec-conformant publishers the recursion never fires, and each new domain can be learned only through the seed list. The publisher's input is "the user's own MAD definitions", so a party that adopts someone else's definition has no way to say so; adoption is the workspace's stated convergence mechanism ("adoption is the vote"). Phase 4 publishes from a single publisher and expects the full-hash lookup to return "one each", so the question "who else" is never exercised with a second party.

**Skeptic's correction.** The first half holds: the publisher emits no nested-catalog or peer entries, so the crawler's recursion never fires among spec-conformant publishers, and phase 4 uses one publisher. The second half is wrong as stated. A party that adopts a definition can list it: copy the file into definitions/, the publisher computes the same full CID, and GET /hash/&lt;cid&gt; returns both origins. That is the workspace's own endorsement rule (/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66, 'Reposting an unchanged definition adds an attributable endorsement without changing its SAID'). What is missing is narrower: the entry cannot say authored versus adopted, it carries no link to the source, and the adopter's domain still has to reach the seed list or an ARD registry (spec line 109 is a second route, which 'only through the seed list' omits).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:111
  > Recurse into nested `application/ai-catalog+json` entries, with depth ≤ 3 and a visited-set.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:91
  > - `/.well-known/ai-catalog.json`: catalog with one entry per definition:
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:36
  > definitions/     # the user's own MAD definitions (source of truth, JSON)
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:138-139
  > Crawl,
  >    then confirm `GET /hash/<structural>` returns both and `GET /hash/<full>` returns one each.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:13
  > *adoption is the vote, not a committee.*
- https://ai-catalog.io/spec/
  > delegation to sub-catalogs managed by independent publishers

**Implication.** The decentralised half of the design (self-publication) is disconnected: nodes exist but no edges. Every edge has to come from a central seed list.

**Reviewer's suggested resolution.** Add two things to the catalog: entries for adopted (not authored) hashes, and per-hash links to the catalogs the publisher learned the definition from or knows also carry it. Change phase 4 to two publishers on two origins where the second is found only by following links from the first.

**What the skeptic checked.** Spec lines 36, 91, 111, 138-139 verbatim; /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:13 verbatim; the AI Catalog text reads 'supports delegation to sub-catalogs managed by independent publishers' (line-wrapped). Built a counter-example for the adoption claim against spec sections 3-5.

### objective-fit-04: Rendezvous options evaluated: forward resolution is free, reverse lookup needs backlinks

*note · fact · spec section §5 · skeptic's verdict: **partly***

**Claim.** Given an introduction, fetching and verifying X needs no index, and neither does listing what a known publisher carries. Given only X, finding who else carries it is a non-local query, so something must hold backlinks. (1) Seed list: this is the aggregator; someone curates it. (2) ARD registries: this outsources the aggregator to generic operators. ARD defines crawling "from discovered URIs" and registry-to-registry referrals, and the fetch found no submission process by which a new domain becomes known. It works as an optional accelerator if the hash sits in a standard field. (3) Nested catalogs or peer links: the base spec allows them across domains, and they give a walk from any one introduction. Adopter-to-source links cost nothing; source-to-adopter backlinks need an announce the source verifies by fetching the announcer's catalog. (4) Listing adopted, implemented or consumed hashes is the precondition for all of this; without it only authors appear. (5) DNS maps a domain to its catalog and never content to domains, so it gives no reverse lookup. (6) KERI OOBIs are introductions (a URL paired with an AID or SAID), untrusted and verified in band. KERI has no discovery network by design, and witnesses and watchers serve key state for an AID already known. OOBIs supply the verification model and the percolation pattern, not a reverse index. (7) DHT or IPFS provider records are the only option that gives a content-to-providers lookup with no operator, and the spec already chose CIDs. They need a node that keeps re-announcing (the spec forbids always-on compute), they return peer ids and not catalogs, and §7 puts IPFS out of scope. Smallest addition: (4) plus (3) plus an optional announce endpoint, with the crawler run locally. Every publisher of X then acts as a rendezvous for X. One case remains: an independent author who converged on X and knows no one. No link-based scheme can serve that case; an optional cache, a generic registry or a DHT can.

**Skeptic's correction.** The outline holds; four details do not. (a) ARD has no standard hash field: digest is a base AI Catalog member, and in ARD a namespaced term is filterable only if a registry indexes it. (b) Spec section 7 excludes 'IPFS pinning', not IPFS; the always-on-node and peer-id statements carry no source and I could not verify them. (c) The OOBI draft does describe SAID introductions, in its introduction ('A secondary use case for OOBI's is to provide service endpoints or URIs for SAD (Self-Addressed Data) items identifier by their SAID'), and keripy resolves them by fetching and comparing the SAID. (d) The announce endpoint is not optional for the stated goal: without it a walk from the source never reaches adopters, and with it each original author accepts writes and becomes the registry for its hashes. The cold-start case the finding sets aside is the workspace's first success criterion (HANDOFF.md:30, 'An independent author should be able to discover and reuse an exact definition').

**Evidence.**

- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > **referrals**: The Registry returns its results plus entries for other Registries the client may query.
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > Crawling entry sources — hosted manifests and in-page markup — from discovered URIs.
- https://www.ietf.org/archive/id/draft-ssmith-oobi-01.html
  > As such an OOBI itself is not trusted but must be verified.
- https://www.ietf.org/archive/id/draft-ssmith-oobi-01.html
  > KERI does not, therefore, need its own dedicated discovery network, OOBIs with URLs will do.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74
  > For this language, a link, catalog entry, shared file, or known peer can introduce a document SAID or principal ID together with a candidate location.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:16
  > - Keep it serverless and near-zero idle cost (no NAT gateways, no always-on compute, DynamoDB on-demand).
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:143
  > Signing/trust manifests, IPFS pinning, nested DCR sub-graphs, auth on the query API, UI.

**Implication.** The objective can honestly be stated as: any publisher is an entry point to the whole connected adoption graph, so no site is needed. It cannot be stated as: no index exists anywhere. Indexes remain as interchangeable caches.

**Reviewer's suggested resolution.** Adopt the link-walk plus announce design in D2 and state the cold-start limit in the spec.

**What the skeptic checked.** Fetched the ARD markdown and the OOBI draft as raw text and searched them: ARD lines 224 and 436, OOBI draft paragraphs containing both quotes, micro-apps-vision.md:74, spec lines 16 and 143 are all verbatim. Searched ARD for submit and register: no submission process (the only hit is IANA registration). ARD section 5.1's DNS mechanism is a domain-to-entry-source record, consistent with point (5). Read /Users/seriouscoderone/code/KERI/keripy/src/keri/app/oobiing.py:530-534.

### objective-fit-05: The hashed unit, a hand-authored DCR graph, is not a MAD definition in this workspace

*blocker · conflict · spec section §2, §8 Q2 · skeptic's verdict: **confirmed***

**Claim.** The spec defines a MAD definition as a DCR graph with events, relations and a marking. In MAD the definition kinds are model, authorization and rr. MAD's design review declined DCR event-history semantics as its contract language. The workspace instructions say not to fold DCR into MAD. In bpm-core the DCR graph is derived from a selection by convention and never stored. Answer to open question 2: MAD has no DCR JSON format; bpm-core has a derived projection (events `fact:<id>`, `authz:<id>`, `act:<rr>:<id>`) that nobody authors. The spec's format also carries no data shapes, while MAD says interoperation happens only through shared models. A full-hash match therefore says two parties have the same event graph and says nothing about whether they exchange compatible statements.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:42
  > A MAD definition is a DCR graph in JSON:
- /Users/seriouscoderone/code/bpm/mad/src/domain.ts:6
  > export interface BaseDefinition { id: string; kind: 'model' | 'authorization' | 'rr'; name: string;
- /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:21
  > Adopting event-history semantics as MAD's contract language would change the present design; a familiar diagram does not require that change.
- /Users/seriouscoderone/code/bpm/CLAUDE.md:191
  > Do not fold DCR or shared-run behavior into MAD.
- /Users/seriouscoderone/code/bpm/bpm-core/docs/GOAL.md:37
  > Derived, never stored: a role's authorization set; an aggregate's writer within a selection; the trust chain (holds → issuers → root or open seam); the DCR graph.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58
  > **Blocks link only through shared models.**
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:17
  > The language is a protocol language. Its units are the definitions (models, authorizations and above all responsibilities)

**Implication.** Phase 1 (mad-hash) would canonicalise and hash an artifact no tool in the workspace authors, and the artifacts that do carry interop meaning (models, RRs) would stay undiscoverable. Phase 1 would be discarded once this is noticed.

**Reviewer's suggested resolution.** Decide D1 before any code. Recommended: discover the documents the workspace already freezes (bpm-core kinds today, MAD model, authorization and rr when they get SAIDs) and drop the v0 DCR format.

**What the skeptic checked.** Spec line 42; /Users/seriouscoderone/code/bpm/mad/src/domain.ts:6; /Users/seriouscoderone/code/bpm/mad/docs/mad-workflow-review.md:21; /Users/seriouscoderone/code/bpm/CLAUDE.md:191; GOAL.md:37; HANDOFF.md:17 and :58, all verbatim. Looked for counter-evidence. GOAL.md:22 says 'the enterprise runtime above us is where DCR is the foundation', so DCR-as-definition has a root in bpm-core's lineage, but HANDOFF (newest wins, Ruling 5) and the workflow review supersede it for MAD. The CLAUDE.md sentence governs the mad/ repo, so for a new project it is direction, not a prohibition. bpm-core does have a concrete DCR JSON shape (bpm dcr output; hand-derived goldens in /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/) that differs from spec section 2 in every field name; that sharpens the answer to open question 2 without changing the finding. The spec itself marks section 2 'confirm with user'.

### objective-fit-06: Full hash includes labels and local ids; the workspace's convergence criterion says a rename keeps identity

*decision · conflict · spec section §3 · skeptic's verdict: **partly***

**Claim.** The spec's full hash covers event `id`, `label` and `role` strings, and its required test asserts that renaming ids or labels changes `full`. The workspace's design puts display names outside the committed definition so that incidental authoring differences do not defeat independent convergence, and the deferred acceptance test for MAD identity is "rename a label (SAID unchanged)". Under the spec, two parties who author the same graph and write "Approve invoice" and "Approve Invoice" hold different protocols, and the structural hash is the only thing that relates them. Full-hash equality is therefore sufficient for "we speak the same protocol" but far from necessary. It makes the lossy structural hash carry the common case, and the objective needs exact identity to carry it.

**Skeptic's correction.** The rename rule is MAD's deferred target, not the workspace's present behaviour, and it covers display names only. The sourced rule is 'Different local display names do not change it' (micro-apps-vision.md:352), so hashing the spec's label conflicts with it. Hashing the event id does not: id is a structural key that relations reference, like the field names the vision keeps inside identity (Address A with addr1 and Address B with addr are different SAIDs). bpm-core, the only place real SAIDs exist, hashes the name: the frozen admission document contains "alias": "admission" and the shape lists alias as required. The finding also calls full-hash equality 'sufficient' for the same protocol, which finding 05 denies (no data shapes). Needing a copy to share identity is the workspace's model ('adoption is the vote'), not a defect.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:82
  > - renaming IDs/labels changes `full` but not `structural`;
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:58
  > Local display names and catalog annotations can remain outside the committed definition, while its fields, constraints, and references stay inside.
- bpm-nq3.4
  > then rename a label (SAID unchanged) and add a constraint (SAID changes)
- bpm-nq3.3
  > renaming a definition keeps its SAID and a constraint change changes it

**Implication.** Independent authors will rarely converge on a full hash, so "who else publishes X" returns only parties who copied the file. The spec's test suite would lock in the opposite of the workspace's stated criterion.

**Reviewer's suggested resolution.** Keep names and labels as metadata outside the hash (the spec already has the `x-` mechanism), and bind meaning by reference to content-addressed things, not by free text. Settle under D1.

**What the skeptic checked.** Spec line 82, micro-apps-vision.md:58, bd show bpm-nq3.3 and bpm-nq3.4: quotes verbatim. Then checked what the workspace's real SAIDs hash: /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB.json and /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/shapes/authorization.json. Read micro-apps-vision.md:352 and bd show bpm-nq3.1.

### objective-fit-07: Structural hash: a third notion of "structural", lossy, ignores the role partition, and has no declarative definition

*decision · conflict · spec section §3, §5 · skeptic's verdict: **partly***

**Claim.** Four problems. (a) The workspace already has a designed structural key, the category SAID: blank the SAID references and keep everything else. Its design explicitly rejects stripping content indiscriminately. The spec does the reverse: it strips every local name and keeps only topology. (b) Ignoring role names is right for renames, but ignoring roles entirely discards which events share a role. A graph where submitter and approver are one role and a graph where they are two are different protocols with the same shape. (c) RR-sized graphs have few shapes. Every two-event single-condition definition collides, so /similar returns unrelated business processes; the workspace's own design reached this conclusion about category matches. (d) Equivalence is defined only by a three-round Weisfeiler-Lehman procedure with a loosely specified initial colour ("relation-type signature"), which two implementers will compute differently. The "confirm by comparing the fetched definitions" step names no equivalence to compare under. For graphs this small an exact canonical labelling is cheap and has no false positives, which would make WL and the confirm step unnecessary.

**Skeptic's correction.** Points (b), (c) and (d) hold: the role partition is dropped, tiny graphs collide by construction, and the initial colour and the confirm step are underspecified. Point (a) is overstated twice. The category SAID is not a designed workspace feature: the vision calls it 'an exploratory discovery feature, with its algorithms and profiles left for later design', both beads are deferred, and the write-up and prototype live outside the workspace. And it does not answer the same question: it blanks SAID references in a document that has them, and 'A document with no SAID references has a category equal to its own SAID', so for the spec's flat event graph it yields nothing. The WL hash is a different key for a different object, not a rival answer to bpm-nq3.7 or bpm-upm.23. The quoted vision sentence is about not blanking digest-like strings, not about keeping names.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:69-73
  > - `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
  >   Compute it with Weisfeiler–Lehman color refinement over the relation graph:
  >   - initial color = relation-type signature + marking flags;
  >   - 3 iterations;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:75-76
  > The structural hash is a *candidate* match only, and the indexer
  >   confirms matches by comparing the fetched definitions.
- bpm-nq3.7
  > A category SAID is the SAID of a document with every point-by-SAID reference blanked the way its own SAID field is
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:64
  > it does not strip every digest-looking string indiscriminately.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:98
  > **Category equality is a structural discovery fact.** Its reference holes do not establish the meaning or compatibility of their contents.
- bpm-upm.23
  > Design structural category and compare under a versioned comparison profile

**Implication.** Building the WL hash now creates a second, incompatible answer to a question two deferred beads already own. Its matches would be too coarse to help a person find the same protocol.

**Reviewer's suggested resolution.** See D4. Recommended: leave structural matching out of the first cut and take it up as the category SAID design once exact identities exist.

**What the skeptic checked.** Spec lines 69-76; bd show bpm-nq3.7 and bpm-upm.23; micro-apps-vision.md:64 and :68; mad-ux-design.md:96-98: quotes verbatim. Read /Users/seriouscoderone/Downloads/Category-SAIDs.md in full and found its prototype at /Users/seriouscoderone/code/KERI/said-test. Built the role-partition counter-example (two events, one condition, one role versus two roles: same structural hash).

### objective-fit-08: CIDv1 sha2-256 over JCS is a second digest; moving to SAIDs later changes bytes, keys and URLs

*decision · conflict · spec section §3, §4 · skeptic's verdict: **partly***

**Claim.** The workspace's one digest is Blake3-256 CESR, with an instruction not to add another, and MAD's deferred identity epic commits to matching it byte for byte. The spec introduces CIDv1 with sha2-256 over JCS. The difference is more than an encoding. A SAID is embedded in the document (`d` field, hashed with a placeholder), and bpm-core serialises in shape-template order where JCS sorts keys lexicographically. So the document bytes, the normal form and the digest all differ. A later move to SAIDs would change every index partition key, every /defs/&lt;cid&gt;.json URL and every `mad:hashes` value, which is a migration and not an addition. The only reason to prefer CIDs is IPFS provider lookup, and §7 excludes IPFS. A SAID's digest is taken over placeholder bytes, so a CID of the served bytes can only be a second retrieval key beside it, never the same identifier.

**Skeptic's correction.** The two-digest conflict and the byte differences hold. Three statements do not. 'The only reason to prefer CIDs is IPFS': sha2-256 over the exact served bytes is also what the base AI Catalog digest member requires ('hash the exact retrieved artifact bytes', format algorithm:hex), so the spec's full hash is checkable by any catalog consumer and a SAID is not. 'mad-discovery then needs no hash package': the crawler must re-verify, and a bpm-core SAID is not a hash of the served file (store files are pretty-printed; the digest is Blake3 over compact insertion-order JSON with a placeholder), so a TypeScript SAID verifier is needed, which is the deferred bpm-nq3.3. 'Use SAIDs from the first cut': the SAID profile for MAD definitions waits on the unruled bpm-nq3.1, whose text says 'SAIDs computed first would all change if the ruling went the other way'. Also, 'Do not invent another digest' is a bpm-core rule; MAD's prototype has its own sorted-key canonical JSON.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:67
  > **Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59
  > **SAID** is Blake3-256 CESR matching KERI Saider (dummy `d` is 44 `#`). Do not invent another digest.
- bpm-nq3.3
  > a Blake3-256 CESR digest (E prefix) that matches bpm-core's saidify byte-for-byte
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13
  > Precise definitions receive content-derived identities, intended to use SAIDs compatible with the KERI ecosystem.
- /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:18-22
  > copy["d"] = "#" * 44
- /Users/seriouscoderone/code/bpm/gym-bp/README.md:35
  > | authorization `admission` | `EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB` |

**Implication.** Two identifier families for the same kind of thing would coexist in one workspace whose rules forbid parallel paths, and the frozen SAID documents in gym-bp could not be discovered by the new project.

**Reviewer's suggested resolution.** Treat the definition identifier as an opaque self-describing digest string in every key, path and field (/defs/&lt;digest&gt;.json, PK hash#&lt;digest&gt;), and use SAIDs for workspace documents from the first cut. mad-discovery then needs no hash package of its own; it consumes identities from the tool that froze the document. If IPFS lookup is wanted later, add a CID as a second retrieval key.

**What the skeptic checked.** Spec line 67; /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59; bd show bpm-nq3.3; HANDOFF.md:13; /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:18-22; /Users/seriouscoderone/code/bpm/gym-bp/README.md:35: all verbatim. Opened a frozen store file, read bd show bpm-nq3.1, read the AI Catalog digest rules, and checked /Users/seriouscoderone/code/bpm/mad/src/services/crypto.ts:15-23.

### objective-fit-09: Publisher identity is a DNS name and the index conflates retrieval host, author and endorser

*decision · conflict · spec section §4, §5 · skeptic's verdict: **partly***

**Claim.** The spec identifies a publisher by a domain-anchored urn:air: identifier and stores `domain` and `pub#<urn>` as the answer to "who". The workspace design keeps three things apart: the principal (keyed by its own id), the retrieval host, and the act of endorsing. It says mirroring or indexing is not endorsement. ARD makes the publisher an FQDN by rule and requires any trust identity to align with that domain, and the base spec's signer profile is a root did:web. An AID therefore can never be the ARD publisher; under ARD the domain stays the root of authority. What would change if identity moved to AIDs: the index sort key and the meaning of "publisher"; the meaning of `verified` (hash match today, signature against key state later); and the catalog entry, which would need a signed statement and an OOBI for the signer. This can be made additive now by recording four separate fields per index row: the definition digest; the locator (URL the bytes came from); the claimant as an opaque string (today the domain or URN, later an AID); and the claim kind (authored, endorses, operates, relies on, mirrors). `verified` becomes a list of checks performed. The catalog is then an introduction in the vision's sense, and AIDs add a column and a check without changing a key. The spec's own reason for skipping signing (same-origin keys add nothing) is the argument for self-certifying identifiers.

**Skeptic's correction.** The conflation is real and sharper than stated: SK pub#&lt;urn&gt; keys on an entry identifier (urn:air:&lt;publisher&gt;:&lt;namespace&gt;:&lt;name&gt; names one artifact), so one publisher with two names for the same bytes gets two rows, and a mirror that preserves the URN, as the base spec requires of catalog operators, overwrites the author's row. Two statements overreach. The did:web sentence is a rule of one profile; the same section says 'Other signer profiles can use the same data model'. And ARD does not fix the cryptographic root: 'a trust manifest defined by any framework — SPIFFE, a DID method, an enterprise PKI — is structurally valid' and 'The discovery identifier and the security principal are otherwise decoupled', so a domain-aligned DID method over an AID fits; only the name segment must be a domain. The four proposed fields already exist in the base spec as host, publisher and trustManifests[].contributor (missed 3).

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:92
  > - `identifier`: the publisher-domain `urn:air:` URN form, per the current spec;
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:120-121
  > - PK `hash#<cid>`, SK `pub#<urn>`;
  >   - attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:108
  > A mirror or download is not automatically an endorsement. Principal IDs identify contributors; display names are attributed information about them. A retrieval host is not necessarily the author or signer.
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66
  > Reposting an unchanged definition adds an attributable endorsement without changing its SAID. Downloading, bookmarking, indexing or automatically mirroring it does not.
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > Mandating that `<publisher>` be a valid FQDN establishes a verifiable authority anchor.
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > The cryptographic trust domain asserted in `trustManifest.identity` MUST align with the `<publisher>` domain
- https://ai-catalog.io/spec/
  > The Signature object's `signer` MUST be a root `did:web` DID.

**Implication.** Without the separation, the index answers "which hostnames serve these bytes". Anyone with several domains can inflate that count, and it cannot later become "which principals vouch for or operate this" without a rewrite.

**Reviewer's suggested resolution.** See D3. Use the ARD catalog as a locator and transport only. Keep claimant and claim kind as explicit fields from the first cut, unsigned for now.

**What the skeptic checked.** Spec lines 92 and 120-121; HANDOFF.md:108; mad-ux-design.md:66; ARD lines 189 and 540; AI Catalog signer-profile sentence: all verbatim. Read ARD section 4.5 and Appendix C, and the AI Catalog trust, publisher and host sections around the quotes.

### objective-fit-10: Normal form silently drops unknown keys and does not dedupe, so different definitions can share a hash and equal ones can differ

*note · defect · spec section §3 · skeptic's verdict: **partly***

**Claim.** Step 3 drops unknown keys before hashing. A definition written against a later format (for example a relation carrying a guard or a delay) would hash the same as one without it, so two parties with different rules would hold the same identifier. bpm-core hit this problem and ruled the other way: an undeclared key is refused before it can be hashed. The order of steps 1 and 3 is also ambiguous, because a closed JSON Schema in step 1 would reject the unknown keys step 3 is meant to drop. Step 2 sorts events, relations and marking arrays without removing duplicates, so a graph with a repeated relation hashes differently from the same graph without the repeat.

**Skeptic's correction.** The defect is conditional on a schema the spec has not written. A later format would carry a different mad version value, which is hashed, and a v0 schema would refuse it at step 1, so the cross-version collision in the claim does not arise. A stray key on a "mad": "0" document is dropped silently only if the schema is open; a duplicate relation survives only if the schema lacks uniqueItems. What holds: step 3 says drop where bpm-core's ruling says refuse, and the order of steps 1 and 3 is ambiguous.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:62-64
  > 1. Validate against a JSON Schema (store in `packages/mad-hash/schema/`).
  > 2. Sort `events` by `id`, sort `relations` by `(type, from, to)`, and sort marking arrays.
  > 3. Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed).
- /Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md:59
  > and a key the shape does not declare is refused (`UNKNOWN_FIELD`, Ruling 132) before freeze can hash it.
- bpm-h0e
  > rely_on / act / follow items accept unknown keys; an `issued_by` key is silently frozen into the SAID

**Implication.** A content identifier that can stand for two meanings breaks the one function the spec does replace, the canonical reference.

**Reviewer's suggested resolution.** If any hashing stays in this project: refuse undeclared keys, strip only the `x-` prefix, and give sets set semantics (sort and dedupe). This is moot if D1 chooses existing SAID documents.

**What the skeptic checked.** Spec lines 62-64; bpm-core/AGENTS.md:59; bd show bpm-h0e (closed bug, fixed under Ruling 132): quotes verbatim. Built the counter-example against the spec's own format, which hashes a "mad": "0" version key.

### objective-fit-11: The human-readable reference text has no home in what is published

*note · gap · spec section §3, §4 · skeptic's verdict: **confirmed***

**Claim.** A reference site's main content is prose that says what a protocol means. The spec strips `x-` keys in the normal form and serves the normalised file, so the description never reaches a reader. It survives only as two to five `representativeQueries` and a `displayName` in the publisher's catalog. The workspace design expects descriptions to live as attributable publication metadata beside the definition, contributed by several publishers and not carried in its identity.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:90
  > - `/defs/<full-cid>.json`: normalized definition, immutable, `Cache-Control: max-age=31536000, immutable`.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:97
  > - `representativeQueries` (2–5, from the definition's `x-description` if present);
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:49
  > Results with the same exact SAID share one definition. Multiple publications contribute descriptions, categories and endorsements.

**Implication.** People would still want a site that explains each hash, which is the reference site the objective wants to make unnecessary.

**Reviewer's suggested resolution.** Publish the description, tags and source link as catalog-entry metadata attributed to the publisher, kept out of the hash, so anyone who has the hash and one catalog can read what it is for.

**What the skeptic checked.** Spec lines 90 and 97; mad-ux-design.md:49: verbatim. The served file keeps event labels and role names but no prose, so the claim stands. Extra support the finding did not cite: mad-ux-design.md:248 ('The user supplies a name, description, tags and a collection placement. Discovery metadata belongs to the publication'), and ARD section 4.2 already lists description and tags as optional entry terms that the spec does not emit, so the fix needs no custom field.

### objective-fit-12: The spec's catalog details lag the two standards it names

*note · fact · spec section §0, §4 · skeptic's verdict: **partly***

**Claim.** Fetched 2026-11-08. (a) ARD v0.91, dated 2026-08-26, publishes at /.well-known/ard.json with rel="ard" and calls ai-catalog.json and rel="ai-catalog" the predecessor that consumers may skip; the spec emits only the predecessor forms. (b) Neither the base AI Catalog spec nor ARD v0.91 has a `mediaType` field; both use `type`. The spec's stated reason for emitting both was not found. (c) The base spec already has a per-entry `digest` (algorithm:hex over the exact retrieved bytes) and requires custom data under an `extensions` object keyed by a URL or reverse-DNS string. A top-level "mad:hashes" key does not conform, and the full hash could sit in the standard field, where generic registries could index it. (d) The base spec lets an entry's `identifier` be any URI, so a content-derived identifier is permitted there; ARD is the layer that forces a domain.

**Skeptic's correction.** Points (a), (b) and (d) hold, with one qualifier on (a): the base AI Catalog spec still registers /.well-known/ai-catalog.json and rel="ai-catalog", so the spec's path lags ARD only. Point (c) is right for the base spec and wrong for ARD. ARD defines no extensions member and no digest member on an entry; its extension form is a namespaced term ('Terms from any additional namespace declared in the entry's `@context` MAY also appear and become available as filter dimensions'), so mad:hashes is the ARD form once the entry declares a mad prefix in @context, which the spec omits. The two documents now differ in substance (ARD: 'An ARD entry is not the same object as a catalog entry, and the two should not be conflated'), so conforming to both needs a choice. The base digest is algorithm:hex over exact bytes: it can carry the spec's sha2-256 value and cannot carry a SAID.

**Evidence.**

- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > Publishers publish entries at `/.well-known/ard.json` and emit `rel="ard"`.
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > A resource that remains only at `/.well-known/ai-catalog.json` may not be found, since consulting that path is optional
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > **Version**: v0.91
  > **Status**: Proposal
  > **Date**: August 26, 2026
- https://ai-catalog.io/spec/
  > To avoid collisions between independent publishers, the keys MUST be a valid URL or a reverse-DNS string.
- https://ai-catalog.io/spec/
  > hash the exact retrieved artifact bytes.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:94-95
  > emitted under **both** `mediaType` and `type`
  >       (the base and ARD specs diverged on the field name);
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:99
  > - `robots.txt` with an `Agentmap:` directive, and a `Link: <...>; rel="ai-catalog"` header on `/`.

**Implication.** A catalog built to the spec's letter could be skipped by ARD consumers, and its hash would be invisible to any registry that indexes only standard fields. The churn also supports treating ARD as one transport and not as the identity layer.

**Reviewer's suggested resolution.** Carry the exact hash in the standard `digest` field, put anything else under `extensions` with a reverse-DNS key, and decide ARD's role in D5 before pinning a version. Re-read both specs directly; these quotes came through a summarising fetch.

**What the skeptic checked.** Read the ARD markdown (raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md) and the AI Catalog page text (ai-catalog.io/spec/) directly as raw text, not through a summariser. All quotes are verbatim (the reverse-DNS sentence ends in a colon). Neither text contains mediaType. ARD header reads v0.91, Proposal, August 26, 2026. agenticresourcediscovery.org links to github.com/ards-project/ard-spec, so the fetched file is the named standard.

### objective-fit-13: The workspace already designed this discovery model and has beads that own its parts

*decision · overlap · spec section §3, §4, §5 · skeptic's verdict: **partly***

**Claim.** MAD's design documents already say how definitions are found: the local app learns through introductions, keeps what it learned with provenance, searches that local knowledge, and requires no central catalog or server. Existing beads cover the parts. bpm-n13 (open, P2) is publish and pull through providers with put and get by digest, with S3 and a KERI/OOBI-style endpoint as the deferred later providers (bpm-n13.4); the spec's §4 is an S3 provider with a different digest. bpm-nq3.7 is search and publish by category SAIDs. bpm-upm.21 and bpm-upm.22 are retained introductions and Explore with endorsement semantics. bpm-upm.23 is structural compare. All the MAD ones are deferred behind real SAIDs (bpm-nq3.3), and Ruling 5 sets the order: harden the model first. The spec starts from a server-side index, which is the reverse of the documented local-first model, and it implicitly pulls the identity decisions forward with different answers.

**Skeptic's correction.** The workspace has set the direction and reserved beads; it has not designed the network layer. The vision says 'Network discovery can grow later' and '“OOBI-inspired” describes the proposal until an actual wire profile is chosen'; bpm-n13.1 is still a brainstorm; mad-ux-design.md:259 lists 'network discovery and distribution' as work beyond the prototype. The spec does not start from a server-side index: phases 1 and 2 are the hash library and a static self-publisher, and the index is phase 3. The accurate statement is that its only lookup path is server-side. Ruling 5 also parks bpm-core's backlog, bpm-n13 included ('Its backlog waits until the MAD UI and model are hardened'), so tying the project to bpm-n13.4 ties it to work that is on hold and may be rewritten in TypeScript.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43
  > MAD learns definitions through bootstrapped introductions to available catalogs and retains them locally with provenance. Search operates over that local knowledge.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:106
  > An RDF-style knowledge graph is useful as a query projection, with no required central catalog or database engine.
- bpm-n13
  > Provider interface is two operations, put and get by digest. First provider: a local directory. Later: S3, a KERI/OOBI-style endpoint.
- bpm-n13
  > A provider is untrusted by construction: bytes either hash to their name or are rejected.
- bpm-nq3
  > Out: Explore over introductions, provenance panel, structural compare, KERI adapter (icebox, blocked on this epic).
- bpm-upm.21
  > Would seed a 'Discovery and endorsement' epic once bpm-nq3.5 (identity.freeze-publish) closes.
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:128
  > **Order.** First harden the UI and the model's conceptual contours until the maintainer is satisfied.

**Implication.** Registering mad-discovery as a free-standing project would create parallel paths for publish, identity and structural matching, which the workspace rules treat as cruft. It also needs a statement of how it relates to the deferred identity epic.

**Reviewer's suggested resolution.** Register it as the network provider and discovery layer that bpm-n13.4, bpm-nq3.7, bpm-upm.21 and bpm-upm.22 describe. Link those beads, and state in the spec that it implements the introductions model over existing identities and defines neither a format nor a digest.

**What the skeptic checked.** mad-ux-design.md:43; HANDOFF.md:106 and :128; bd show bpm-n13, bpm-n13.4, bpm-nq3, bpm-upm.21: quotes verbatim, statuses as stated (bpm-n13 open P2 with n13.1-3 open and n13.4 deferred P4; the MAD beads all deferred). Checked the spec's phase order and the vision's wording on network discovery. No later ruling on discovery exists (Rulings end at 8, 2026-10-18).

### objective-fit-14: The mechanism is format-agnostic; the spec ties it to one media type without need

*note · gap · spec section §4, §5 · skeptic's verdict: **confirmed***

**Claim.** Self-publication at a well-known location, lookup by digest and link-walking work for any content-addressed definition: a JSON Schema, an ACDC schema, an agent card, a bpm-core document. Only two things are specific to a type: the canonicalisation that produces the digest, and any similarity key. The spec fixes the media type application/vnd.mad.dcr+json, filters the crawl to that type or a `mad:hashes` field, and names the table mad-index. The objective is about protocol reference sites in general. If the index were keyed on digest with media type as an attribute, the same deployment would serve every such format, with MAD as one profile.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:112
  > 3. For each entry with the MAD media type or a `mad:hashes` field:
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:94
  > - media type `application/vnd.mad.dcr+json`, emitted under **both** `mediaType` and `type`
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:74
  > The recipient retrieves the material and checks it: exact SAID verification for a definition, or the expected principal's signature for an attributable statement.

**Implication.** A MAD-only index answers the objective for one format and leaves every other protocol family needing its own aggregator.

**Reviewer's suggested resolution.** Key the publisher and the walk on digest and locator, record media type as data, and make canonicalisation a per-type profile that lives with the tool that owns the format.

**What the skeptic checked.** Spec lines 94, 112 and 119 (table name mad-index); micro-apps-vision.md:74: verbatim. Both standards are already artifact-agnostic (ARD section 3.3: 'any syntactically valid media type is accepted'), which supports the finding. One limit to add, now that the named site is known: its entries (DIDs, did:peer, Nostr) are prose protocols written by other bodies, not content-addressed definitions, so generalising the digest index does not reach them.

### objective-fit-D1: Decision: what is being discovered, and what identifies it?

*blocker · decision · spec section §2, §3, §8 Q2 · skeptic's verdict: **partly***

**Claim.** Question: what is the unit of discovery and its identifier? Option A, as the spec has it: a new hand-authored DCR graph format, identified by a CIDv1 sha2-256 over JCS that includes labels and local ids. Option B: the documents the workspace already freezes, identified by their SAIDs. Today that is bpm-core's kinds (gym-bp has real pinned SAIDs to publish); later it is MAD model, authorization and rr once bpm-nq3.3 lands. Option C: any artifact by digest, with media type as data and SAID documents as the first profile. Options B and C remove the mad-hash package from this project.

**Skeptic's correction.** The question and the options are sound, and option A conflicts with the workspace as findings 05 and 08 say. The recommendation has three unstated costs. (1) Options B and C do not remove hashing: the crawler and any puller must verify, and verifying a bpm-core SAID in TypeScript is the deferred bpm-nq3.3. (2) The SAID profile for MAD definitions waits on the unruled bpm-nq3.1 ('SAIDs computed first would all change if the ruling went the other way'), so D1 cannot close without it. (3) The proposed first corpus hashes names: gym-bp's frozen documents carry alias inside the SAID, the property finding 06 objects to in the spec. bpm-core is also parked for evaluation or rewrite under Ruling 5.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:40
  > ## 2. Definition format (v0 — confirm with user)
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:148
  > 2. Is there an existing DCR JSON format from earlier MAD work that §2 should match instead?
- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:177
  > **No borrowed identity guarantees.** Prototype IDs are not SAIDs, and the prototype has no KERI runtime dependency; do not describe either as present.
- /Users/seriouscoderone/code/bpm/gym-bp/README.md:36
  > | rr `attended` | `EPpa3kIljRZ4bp1xvmbgqMxLulVq-LICBv0Z4Daz8U_i` |

**Implication.** Phase 1 is the hash library. Under option A it builds a format and a digest the rest of the workspace contradicts (objective-fit-05, -06, -08); under B or C phase 1 disappears and the project starts at publishing.

**Reviewer's suggested resolution.** Choose C in structure and B in content: identifiers are opaque self-describing digests everywhere, the first corpus is gym-bp's frozen SAID documents, and this project defines no format or hash. MAD definitions join when bpm-nq3.3 gives them SAIDs. Rename the project if it is no longer MAD-specific.

**What the skeptic checked.** Spec lines 40 and 148; HANDOFF.md:177; gym-bp/README.md:36: verbatim. Checked the proposed first corpus on disk (/Users/seriouscoderone/code/bpm/gym-bp/.bpm/store, 36 files, not tracked by git), how its SAIDs are computed (said.py:19), and the beads that gate SAIDs for MAD (bpm-nq3.1, bpm-nq3.3).

### objective-fit-D2: Decision: how do parties find each other, and what counts as meeting the objective?

*decision · decision · spec section §5, §6 · skeptic's verdict: **partly***

**Claim.** Question: where do backlinks live? Option A, as the spec has it: one hosted crawler and index with a curated seed list and a registry endpoint; anyone may run another. Option B: link-walk. Each catalog lists adopted hashes and per-hash peer and source catalogs; a publisher may expose a small announce endpoint that verifies by fetching the announcer; the crawler is a local command that starts from any one introduction; a hosted index is an optional cache of the same walk. Option C: no index of our own. Rely on generic ARD registries, or on IPFS provider records for the CID.

**Skeptic's correction.** The option texts are accurate. The recommendation's test contradicts finding 04: given only the first (source) catalog, the second is reachable only if it announced to the first, so the endpoint 04 calls optional is required, and a static S3 publisher cannot accept it. Option B moves the registry to each original author (a write endpoint, spam, and backlinks that vanish with that origin) and cannot serve two independent authors who converge, which is the workspace's first success criterion. Whether option A is 'the thing the objective says nobody should need' is the maintainer's reading to make, since the vision allows plural, non-authoritative catalogs. The options omit a fourth: a rendezvous keyed on the hash and run by no one in particular, which the spec's CID choice was the hook for.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:106
  > **Crawler Lambda** (EventBridge schedule, daily; also invocable manually):
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:43
  > Following another introduction enlarges it; a remote outage does not erase retained definitions.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:76
  > The first simulator can use a small introduction record and a local resolver. Network discovery can grow later.

**Implication.** Option A is the thing the objective says nobody should need. Option C moves the dependency to other operators, and for IPFS it needs always-on compute, which the spec forbids. Option B is the only one where a newcomer with one introduction needs no third party.

**Reviewer's suggested resolution.** Choose B. Acceptance test for the end-to-end phase: two publishers on two origins, the client is given only the first catalog URL, and it lists the second as also carrying the hash with no hosted index running. Keep the Lambda index as an optional cache and drop POST /search from the first cut. State the cold-start limit (an author who knows no one) in the spec.

**What the skeptic checked.** Spec line 106; mad-ux-design.md:43; micro-apps-vision.md:76: verbatim. Walked the proposed acceptance test against finding 04's own design, and against HANDOFF.md:13 and :30.

### objective-fit-D3: Decision: what does a catalog entry assert, and who is the publisher?

*decision · decision · spec section §4, §5 · skeptic's verdict: **partly***

**Claim.** Question: when an origin lists hash X, what is it claiming and who is the claimant? Option A, as the spec has it: listing means publishing; the publisher is the domain; unsigned. Option B: each entry carries an explicit claim kind (authored, endorses, operates, relies on, mirrors) and a claimant field separate from the retrieval URL. Both are unsigned for now, and shaped so that a signature by an AID and an OOBI for it can be added later without changing keys. Option C: require AID-signed statements from the first cut.

**Skeptic's correction.** The question is right. Option B's fields need not be invented: the base AI Catalog spec separates the catalog operator ('The catalog operator and artifact publisher are distinct roles'), the artifact publisher (with an identityType hint such as "did" or "dns") and per-party trustManifests[] whose contributor is 'attribution, not proof of authorship' and which 'MAY endorse only the artifact release identified by that subject'. ARD v0.91 carries none of this (one trustManifest, bound to the publisher domain), so D3 depends on D5. Option C is overstated: a statement signed by a self-certifying key identifier verifies with one signature check and no KERI runtime; only rotation needs key event logs. Unsigned, a claimant other than the serving origin cannot be checked, so in a first cut claimant equals origin.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:116
  > Publishing is intended to share exact definitions with attributable discovery metadata.
- bpm-upm.22
  > intentional republication of the same SAID endorses and a mirror does not
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:62
  > - Verification results and the accountable signer, independently of the retrieval host.
- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:147
  > 1. Custom domain for the publisher (needed for a meaningful `urn:air:` identifier)? Is it in Route 53 on `personal`?

**Implication.** Option A cannot tell an implementer from a mirror and bakes DNS in as the identity root. Option C needs a KERI runtime that the workspace has deliberately not built. Option B costs two fields now and keeps the later move additive (objective-fit-09).

**Reviewer's suggested resolution.** Choose B. Record digest, locator, claimant and claim kind as four separate fields; let `verified` name the checks performed; treat the domain as a locator. This also answers the spec's custom-domain question: a domain is useful for reachability and is not the identity.

**What the skeptic checked.** HANDOFF.md:116; bd show bpm-upm.22; mad-ux-design.md:62; spec line 147: verbatim. Read the AI Catalog sections on Host Info, Publisher Object, Trust Manifest and signer profiles, and ARD section 4.5.

### objective-fit-D4: Decision: is structural similarity in the first cut, and under which definition?

*decision · decision · spec section §3, §5 · skeptic's verdict: **partly***

**Claim.** Question: what does "similar" mean and when is it built? Option A, as the spec has it: a Weisfeiler-Lehman shape hash that ignores ids, labels and roles, with a candidate-then-confirm step. Option B: the workspace's category SAID (blank the SAID references, keep the rest) under a versioned comparison profile, built when exact identities exist. Option C: leave similarity out of the first cut; ship exact identity and reverse lookup only.

**Skeptic's correction.** Options A and C are stated fairly. Option B is empty for the spec's own format: a document with no SAID references has a category equal to its own SAID. The implication 'The objective depends on exact identity and reverse lookup, not on similarity' is contradicted by both sources of the objective: the named site is described as a convergence navigator with a Convergence Matrix, and bpm-nq3.7 records the maintainer wanting 'deterministic content-addressable identities that show or prove definitions are aligning and coalescing'. Deferral is still defensible; similarity is a later requirement, not a non-requirement. 'Mostly noise' is asserted, not measured.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:126
  > - `GET /definition/{cid}/similar` → by structural hash, excluding exact full match.
- bpm-nq3.7
  > It groups by exact structure, its holes are untyped, and it is a classification key, not an integrity commitment.
- /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:68
  > This is an exploratory discovery feature, with its algorithms and profiles left for later design.

**Implication.** Option A adds a second, incompatible notion of structure, and its matches on RR-sized graphs are mostly noise (objective-fit-07). The objective depends on exact identity and reverse lookup, not on similarity.

**Reviewer's suggested resolution.** Choose C now and B later, tracked on bpm-nq3.7 and bpm-upm.23. If a shape key is kept anyway, define the equivalence in words (isomorphism preserving relation types and marking, up to renaming ids and a bijection of roles), compute an exact canonical form, and publish test vectors.

**What the skeptic checked.** Spec line 126; bd show bpm-nq3.7; micro-apps-vision.md:68: verbatim. Read /Users/seriouscoderone/Downloads/Category-SAIDs.md and compared the implication with what the named site and bpm-nq3.7 say discovery is for.

### objective-fit-D5: Decision: is ARD the identity and trust framework, or one transport among several?

*decision · decision · spec section §0, §4, §5 · skeptic's verdict: **partly***

**Claim.** Question: what role do AI Catalog and ARD play? Option A, as the spec has it: conform to ARD for identifiers (domain-anchored urn:air:), publication paths and a registry endpoint, and let its trust model (did:web aligned to the publisher domain) be the eventual signing story. Option B: use the catalog file as one locator format, a way to hand out introductions that existing crawlers also read. Identity comes from content digests, claimants are separate, and the same data can later be served from a KERI OOBI endpoint or a plain directory. Option C: skip ARD and publish a minimal index file of our own.

**Skeptic's correction.** The question is right and ARD's domain rule is as described. The recommended emission is not one conformant document: digest and extensions are base AI Catalog members that ARD v0.91 does not define, ARD's own extension form is a namespaced term with @context, and ARD says 'There is no need to serve the predecessor path or relation as well'. The base digest cannot hold a SAID (algorithm:hex over exact bytes), so under D1's recommendation the identity would sit in an extension that generic registries need not index, which removes the benefit claimed for option B. The maintainer has to pick base AI Catalog, ARD, or both with two entry shapes.

**Evidence.**

- /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md:17
  > - Read the current specs before implementing catalog formats. They are young and changing:
- https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md
  > ARD's predecessor specified the path `/.well-known/ai-catalog.json` and the link relation `ai-catalog`;
- /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:259
  > This design remains KERI-agnostic apart from the intended SAID compatibility.
- bpm-n13.4
  > Providers beyond disk: S3, a KERI/OOBI-style endpoint

**Implication.** Option A ties publisher identity to DNS and to a proposal that changed its well-known path within the last few months. Option C loses free indexing by generic registries. Option B keeps that benefit and leaves the identity layer free to follow the workspace's KERI direction.

**Reviewer's suggested resolution.** Choose B. Emit a conformant catalog (current ARD path plus the predecessor path, the standard `digest` field, extensions under a reverse-DNS key), treat it as a provider in bpm-n13's sense, and do not operate a registry.

**What the skeptic checked.** Spec line 17; ARD section 5.1 predecessor sentence; mad-ux-design.md:259; bd show bpm-n13.4: verbatim. Compared the recommended emission with the entry terms ARD v0.91 defines (section 4.2) and with the base spec's digest and extensions rules.

### What the skeptic added (objective-fit)

**The named site exists: OpenHaven is a researcher-curated protocol directory, and most of what it provides is third-party assessment** *(decision)*

openhaven.net ('Building Bridges in the P2P Ecosystem') runs a Navigator that catalogs protocols and tools such as DIDs, did:peer and Nostr. Each entry has 40+ standardized attributes, use-case domains, affordances, a governance and capture-risk assessment, a last-investigated date, a place in a relationship graph with provenance, and a row in a Convergence Matrix; the data is also served as static JSON. Its research team drafts entries and it refuses self-attestation. So the function model needs four more rows than the first review used: comparable attributes under a shared schema, a taxonomy, relationships and convergence between protocols, and independent sourced assessment. The spec gives none of them a home: it publishes only self-attested entries, about an event graph that carries no affordances and no references. OpenHaven's entries are also prose protocols written by other bodies, so no index of content-addressed definitions removes the need for it until (1) protocols are written as definitions whose needs, outcomes and references are in the committed content, which MAD models and RRs are and the section 2 DCR graph is not, and (2) third parties can publish attributable statements keyed on a definition's digest.

Evidence: https://openhaven.net/prototype/protocols/dids/ and https://openhaven.net/prototype/protocols/did-peer/ (page sections: Use Case Domains, Affordances, Identity Protocol Attributes, Details; fields include Based On, Governing Body, Dev Status, capture risk, Last Investigated; links 'See this tool in the graph' and 'Suggest an edit'). https://openhaven.net/process/: 'Our research team drafts each entry, and our Research Lead reviews it against published sources before publication.'; 'Self-attestation from a developing team is not sufficient.'; 'Each entry includes 40+ standardized attributes'. https://openhaven.net/developers/: 'the same data that powers the Navigator and Matrix, exposed at stable, directly-fetchable JSON URLs'. A web search result describes it as 'a taxonomy-driven directory and navigator for the decentralized protocol ecosystem, with a prototype at openhaven.net'. These quotes came through WebFetch's summarising model; the index page /prototype/protocols/ returned 403. The name appears nowhere in the workspace, beads or bd memories.

**Independent convergence is the workspace's first success criterion, and the recommended link-walk cannot serve it** *(decision)*

The workspace's headline promise is two authors who never met arriving at the same identity and then finding each other's work. That case has no link between the parties by definition, so the first review's recommended design (catalog links plus an announce endpoint) cannot serve it; the review records this as a cold-start limit and recommends the design anyway. Only a rendezvous keyed on the hash serves it: an index, a generic registry, or a hash-keyed network run by no one in particular. The announce endpoint also turns the first or most popular publisher of a definition into a write-accepting registry for that hash, with spam and availability costs, which is a per-hash aggregation site. OpenHaven's own research page states the same unsolved problem and names the precedent for the spec's architecture: Murmurations, where each node self-hosts a profile validated against shared schemas and an index plus aggregators build the directories; it reports that work as paused.

Evidence: /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13 'Two independent authors who produce the same committed definition under the same representation conventions obtain the same identity.'; HANDOFF.md:30 'An independent author should be able to discover and reuse an exact definition'; bd show bpm-nq3.4 'Demo criterion 1: two independent authors produce the same address definition and SAID'. First review, finding 04: 'No link-based scheme can serve that case'. https://openhaven.net/research/mapping-infrastructure/ (via summarising fetch): 'Whoever runs an index decides what it covers'; Murmurations node 'hosts a structured profile about itself at a URL of its choosing'; aggregators download profiles 'to build maps and directories.'; 'further development of Murmurations is paused.'; 'How instances are discovered in the first place' is listed as an open problem.

**The base AI Catalog spec already separates host, publisher and contributor, and it has diverged from ARD** *(decision)*

A direct read of the normative text shows the base spec already has the separation that finding 09 and D3 propose to invent: a top-level host for the catalog operator, a per-entry publisher object, and a trustManifests array in which each contributor makes its own claims about an artifact, optionally signed and bound to the artifact by identifier, type and digest. A catalog may also list an artifact someone else published and must keep that publisher's identifier. ARD v0.91 is a different object: one trustManifest whose identity must align with the publisher domain, no digest, no extensions member, no publisher object, and extension by namespaced JSON-LD terms. So 'ARD-conformant' and 'AI Catalog-conformant' now pull apart on exactly the fields this project cares about (hash, claimant, endorsement), and the spec's instruction to emit one catalog for both needs a ruling. The base digest must be algorithm:hex over the exact served bytes, so it can hold the spec's sha2-256 value and cannot hold a SAID.

Evidence: https://ai-catalog.io/spec/ (read as page text): 'The catalog operator and artifact publisher are distinct roles. The operator is the entity identified by the top-level host field when that field is present.'; 'Each manifest groups one contributor's claims about this artifact and can carry its own signature. A contributor's identity is attribution, not proof of authorship.'; 'A signed manifest MAY endorse only the artifact release identified by that subject, without additional trust evidence.'; 'Other signer profiles can use the same data model.'; 'A catalog operator incorporating an entry for the first time with a publisher-authorized urn:air identifier MUST preserve that identifier exactly.'; 'Digests in this specification use the format algorithm:hex-value'. https://raw.githubusercontent.com/ards-project/ard-spec/main/spec/ard.md: 'An ARD entry is not the same object as a catalog entry, and the two should not be conflated.'; section 4.2 lists identifier, displayName, type, url or data, representativeQueries, capabilities, description, tags, version, updatedAt, metadata, trustManifest; 'Terms from any additional namespace declared in the entry's `@context` MAY also appear and become available as filter dimensions (§5.3.1) with no change to this specification.'

**The workspace's real SAIDs hash the alias, are not a hash of the served file, and MAD's SAID profile is still an open ruling** *(decision)*

Three facts about the SAID route the first review recommends in D1 and finding 08. (1) bpm-core's frozen documents include their alias in the hashed content, so renaming one changes its SAID; that is the property finding 06 objects to in the spec, and it contradicts MAD's stated rule that display names do not change identity. (2) A bpm-core SAID is Blake3 over a compact, insertion-ordered serialisation with a placeholder, while the store files are pretty-printed, so no generic consumer can check a served file against it; the indexer would need a TypeScript reimplementation, which is the deferred bpm-nq3.3. (3) Whether MAD adopts bpm-core's normalisation is the unruled bpm-nq3.1, and its text warns against computing SAIDs first. The spec's JCS step (sorted keys, order not identity-bearing) silently takes option (b) of that ruling. A ruling on bpm-nq3.1 therefore belongs on the list of decisions before code; the first review's list omits it.

Evidence: /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB.json contains "alias": "admission" and is indented JSON; the store has 36 files and git tracks none of them. /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/shapes/authorization.json: "required": ["d", "kind", "alias", "schema"]. /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:19: raw_json = json.dumps(copy, separators=(",", ":"), ensure_ascii=False).encode("utf-8"). bd show bpm-nq3.1: 'the profile cannot be frozen before this call, and SAIDs computed first would all change if the ruling went the other way'; option (a) 'authored JSON Schema property order IS identity-bearing and gym-bp's frozen SAIDs reproduce unchanged'; 'The one sourced rename rule either way: different local display names do not change the SAID'. /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:352: 'Different local display names do not change it.'

**Items the first review could not find, now found or confirmed absent** *(note)*

(1) Category-SAIDs.md is at /Users/seriouscoderone/Downloads/Category-SAIDs.md and a working prototype is at /Users/seriouscoderone/code/KERI/said-test (category.py, category_test.py). It matches the bpm-nq3.7 summary and adds two limits: property order changes the category, and a document with no SAID references has a category equal to its own SAID. (2) An existing DCR JSON format does exist, in bpm-core: the output of bpm dcr, with hand-derived goldens stored in the repo. Its shape differs from spec section 2 throughout (relations use source and target, not from and to; marking is a per-event map, not three arrays; events carry kind, doc, group and owners with a role per owner), its event ids embed document SAIDs, and every relation in the four goldens is a condition. Because the graph is a function of a frozen selection, hashing it separately adds no identity the selection SAID lacks. (3) The OOBI draft covers SAID introductions in its introduction even though section 10 (Data OOBI) is a stub, and keripy implements the resolution. (4) Confirmed absent after direct reads and searches: mediaType in either standard; any submission or registration step in ARD v0.91; any mention of ARD, AI Catalog, urn:air or .well-known in the workspace outside the spec; any bead or bd memory for mad-discovery; the objective in the spec. The copy of the spec at /Users/seriouscoderone/Downloads/MAD-DISCOVERY-SPEC.md is byte-identical to the workspace copy.

Evidence: /Users/seriouscoderone/Downloads/Category-SAIDs.md: 'Not semantic. It groups by exact structure. An extra property, or the same properties in a different order, is a different category.'; 'A document with no SAID references has a category equal to its own SAID'; 'Anyone can compute it. It comes from the document alone. No registry, and no agreement on names.' /Users/seriouscoderone/code/bpm/bpm-core/tests/goldens/dcr/attendance.json: events with id 'authz:EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB', label, kind, doc, group, owners [{rr, role, job}]; relations {type: 'condition', source, target, rr, origin}; marking keyed by event id with included, executed, pending. /Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md: 'tests/goldens/dcr/ holds hand-derived projection goldens'. https://www.ietf.org/archive/id/draft-ssmith-oobi-01.html: 'A secondary use case for OOBI's is to provide service endpoints or URIs for SAD (Self-Addressed Data) items identifier by their SAID'; 'The sad URI scheme may be simply expressed as sad:said'; section '10. Data OOBI (DOOBI)' reads 'ToDo'. /Users/seriouscoderone/code/KERI/keripy/src/keri/app/oobiing.py:530-534: a response with Content-Type application/schema+json is kept only 'if schemer.said == obr.said'. The three web specifications were fetched as raw text into the session scratch folder and searched there, so the web quotes in the verdicts are verbatim, not summarised.

### Looked for and not found (objective-fit)

- "openhaven" (any spelling) in the workspace files, beads or bd memories, and on the web after three searches. The site named in the objective could not be identified, so the analysis uses a generic model of an aggregation or reference site.
- The maintainer's objective anywhere in /Users/seriouscoderone/code/bpm/mad-discovery/MAD-DISCOVERY-SPEC.md; the spec states only the reverse-index question at lines 3-4.
- Any mention of ARD, AI Catalog, urn:air or a .well-known catalog in the workspace outside the spec (grep over markdown in the workspace root, mad/, bpm-core/ and gym-bp/).
- An existing DCR JSON format in mad/ (spec §8 Q2). mad/src/domain.ts defines model, authorization and rr only; bpm-core has a derived DCR projection (/Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/dcr.md) that is never authored or stored.
- Any bead or bd memory for mad-discovery; bd search for discovery, catalog, registry and well-known returned only the beads cited in the findings.
- In the spec: any producer-side emission of nested catalogs or peer links, any way to list a hash the publisher did not author, any enumeration endpoint, and any definition of the equivalence the structural hash approximates.
- A publisher submission or registration process in ARD v0.91 (how a registry learns that a new domain exists); the fetch reported that the spec defines none.
- A `mediaType` field in the AI Catalog spec (https://ai-catalog.io/spec/) or in ARD v0.91; both were reported to use `type` only.
- Detail on SAID-keyed (data) OOBIs in draft-ssmith-oobi-01; its Data OOBI section was reported as marked ToDo.
- Category-SAIDs.md and said_cats_specification.pdf in the tree. bpm-nq3.7 and bpm-uaj.4 say they are still under ~/Downloads; I did not read them.
- A direct read of the normative AI Catalog and ARD text. Web quotes came through WebFetch's summarising model; the ARD excerpts were requested character for character, and the AI Catalog and OOBI quotes should be re-opened before being relied on.

