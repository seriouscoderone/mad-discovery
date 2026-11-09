# Review of the first design draft

This is the record of the adversarial review of the first draft of [the design](../design.md), the draft at commit `decfcf4`. Six reviewers each read the draft through one lens and were free to run tests. A second agent then rechecked each reviewer's findings as a skeptic, re-running tests and re-opening sources, and listed what the reviewer missed. The second draft of the design is the result.

Counts: 95 findings (73 confirmed, 22 partly, none refuted) and 26 further gaps found by the skeptics.

The text below is the agents' own, lightly formatted. Paths under a scratchpad folder name test scripts that were not kept. The lenses did not always agree with each other: on the exact form of the byte check, on what counts as a SAID inside a definition, on whether fetching a definition with what it refers to belongs here, and on whether a robots line may name another host. The second draft chose one answer for each and lists the choice under its "Defaults chosen here".

## Contents

- [Authority: the rulings, MAD's vocabulary and the unmade rulings](#authority)
- [The SAID check: trying to break the byte rule](#said-check)
- [Finders: measuring the robots line and the certificate label](#finders)
- [Security: fetching, injection, catalog integrity and privacy](#security)
- [Objective: does it replace a reference site](#objective)
- [Buildability: guesswork, contradictions and facts](#buildability)

<a id="authority"></a>

## Authority: the rulings, MAD's vocabulary and the unmade rulings

**Reviewer's summary.** The design conforms to the three rulings in structure: nothing dropped by Rulings 2 and 3 has come back, the quotes from MAD's documents are verbatim, and serving bytes is kept apart from publishing, which respects MAD's rule that a mirror is not an endorsement. Its main authority problem is the first-cut publication. MAD defines a publication as an endorsement by a principal and says a retrieval host is not the signer; the design's record names no principal, is attributed to an address, and is still defined as a record that 'endorses', with a catalog column for 'who publishes it'. The record's own SAID makes this worse: I ran it, and two parties who keep the Publish form's defaults get one identical `d`, so the claim that `d` satisfies MAD's 'copies do not multiply' rule is false, and MAD's vision says a record's identity must cover its issuer. The byte check's independence from bpm-nq3.1 is sound for checking, but the rule as written accepts three different byte strings under one SAID, two of which bpm-core's `verify_said` refuses (measured), and the build's re-serialization is itself an ordering profile (Node moves integer-like property names first). Assemblies, MAD's fourth publish target and the subject of the unmade ruling bpm-nq3.6, are never mentioned, although 7 of the 36 test documents are frozen selections. The design also never mentions bpm-n13, an open P2 epic that designs the same serve-and-fetch layer, and its local retention folder contradicts both the README and the comment left on bpm-upm.21. The 'What waits on other work' table cites the wrong beads for the export and for signed publications, and makes signatures wait on the KERI adapter although MAD's authoring layer is KERI-agnostic. Smaller conflicts: the AI Catalog digest is optional in the survey but called required, which contradicts 'this project adds no other digest'; 'every word on the page comes from the definition' is not true of the page as specified; and step 5 would deploy content from a private repository without saying so.

**Skeptic's overall verdict.** None of the twenty findings is refuted: every cited quote is at its line and every test reproduces. Five are narrower than stated (05, 11, 13, 16, 20), and I would change the proposed text on all twenty, mostly to shorten it. Three things must change before the maintainer sees the design. First, the byte check: as written, each of the 36 test documents has a second byte string that verifies (the same file with `d` holding 44 `#`), and the first reviewer's replacement rule still admits two files under one SAID, so the rule has to be 'the SAID exactly once, and after replacement no other run of 44 or more `#` and none touching it'. Second, the first-cut publication has to be described as what it is, an unsigned description at an address with no endorser and no identifier of its own, and the design has to stop committing MAD's signed publication (bpm-nq3.5) to its fields or promising that signatures are additive. Third, the corrections of fact and vocabulary: serve versus publish, an unresolved list, no retention folder in this tool, bpm-n13 and bpm-nq3.6 named, the right beads in the waits table, the AI Catalog digest (optional in the specification at commit 6e26a18, not required), a stated `refers` rule, and where `build` gets each SAID and its own address. Put to the maintainer as questions: whether he publishes a catalog of his own, what the first public source serves while the only content is test data from a private repository, whether a browser must be able to read a source, and whether the first-cut publication record is right. Do not ask him to rule MAD's bundle format or MAD's signed record through this design; both belong to deferred beads under the `mad` label.

**What the reviewer found sound as written.**

- Ruling 2: no DCR graph format, no CIDv1 or JCS hashing and no structural hash has returned; the dropped table matches the ruling's close reason word for word in substance.
- Ruling 3: no hosted crawler, database, query API or registry endpoint; the walk runs on the reader's machine and the catalog is static files from a repeatable command.
- The byte check's independence from bpm-nq3.1 is sound for reading: comparing served bytes with a SAID chooses no property order (the limits are in authority-03 and authority-04).
- The measurement reproduces: all 36 gym-bp store files verify once compact and none as stored (authority_check.py, part 0).
- Serving a definition and carrying a publication of it are separate lists in the source document, the walk report and the catalog, which honours MAD's rule that a mirror or download is not an endorsement.
- The three quotations from MAD's documents ('bootstrapped introductions to available catalogs', 'introducers when known', 'multiple copies of one signed publication do not multiply its endorsement') are verbatim from mad-ux-design.md l.43, l.60 and l.66.
- Retiring 'declaration' is correct: mad/src/domain.ts l.21 defines Declaration as a responsibility's state and view entries.
- Wallet, not account: the only identity the design plans is an endorsing principal with a self-held key; no sign-in, log-in or platform account appears.
- CLI-first, no wizards: the tool is a command line with a hand-written configuration file and no guided authoring.
- KERI terms stay off the authoring layer: the OOBI path, CESR SAIDs and the untargeted ACDC all sit at retrieval, which micro-apps-vision.md l.307 assigns to the runtime or deployment, and no MAD process gains a KERI step.
- The KERI mapping of a signed publication to an untargeted ACDC agrees with HANDOFF.md l.78, where records become credentials on KERI.
- 'Blocks link only through shared models' is applied correctly: looking up who refers to a model's SAID is the right way to find responsibilities that share it, since RRs never refer to one another.
- No versioning: the source document, publication and catalog carry no version field, and nothing is named v1 or v2.
- The command verb `build` and keeping 'publish' out of command names conform to the workspace vocabulary guard while bpm-nq3.2 is open.
- The comments left on bpm-nq3.3, bpm-nq3.5 and bpm-upm.22 agree with the design.

### authority-01: The first-cut publication is not MAD's publication, and the design still says it endorses

Severity: must-fix. Section: Terms; Publications; Trust: what is verified, observed and claimed. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** MAD defines a publication as an endorsement by a principal and says the host a copy came from is not the signer. The first-cut record names no principal and carries no signature, so it is a description that somebody put at an address. The design is honest in places (unsigned, not a vote) but its definitions are not: the Terms row says the record 'endorses', the Catalog row lists 'who publishes it' by address, and it borrows MAD's state 'claimed' although the record names nobody as the claimant. The spec review found this same conflict in the draft spec (mad-model-10); the design carries it forward. MAD's deferred Explore work (bpm-upm.22: 'its endorsers listed, a mirror not counted') cannot be built on a record that has no endorser.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.28`: A record that endorses one exact definition and describes it for discovery
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.127`: In this first cut a publication is unsigned, so it is attributed only to the source address it was fetched from.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.30`: for each SAID, where it is served, who publishes it and which definitions refer to it
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.58`: Publications or endorsements, their signing principals and exact targets.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.108`: Principal IDs identify contributors; display names are attributed information about them. A retrieval host is not necessarily the author or signer.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md l.311`: The spec identifies a publisher by a domain URN, keys index rows by it, and does no signing.
- `/Users/seriouscoderone/code/bpm/mad/src/ui.ts l.288`: endorser:principals()[data.localIdentity].id

**Reviewer's proposed change.** Replace the Terms row for Publication with: 'MAD's word for an attributable description and endorsement of one exact definition by a principal. In this first cut no principal has a durable identifier (bpm-upm.25), so a source carries only the description: a name, a description, tags and a collection placement that whoever controls the address attached to a SAID. It is not yet an endorsement.' In the Catalog row replace 'who publishes it' with 'which source addresses carry a description of it'. Replace the paragraph at l.127 with: 'In this first cut a publication names no principal and has no signature. MAD's endorsement belongs to a principal, and a retrieval host is not necessarily the signer, so a first-cut publication is a description observed at a source address and nothing more. No tool may list it under an endorser or count it. It becomes MAD's publication when it names an endorsing principal and that principal's signature verifies.' In the Trust table replace 'Everything a publication says, including that it endorses its target' with 'Everything a publication says. A first-cut publication claims no endorser.'

**What the skeptic checked.** Re-opened all seven sources; every quote is verbatim at the cited line (/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.28, l.30, l.127; /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.58; /Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.108; /Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md l.311, inside finding mad-model-10 at l.307; /Users/seriouscoderone/code/bpm/mad/src/ui.ts l.288). Also read /Users/seriouscoderone/code/bpm/mad/src/views.ts l.45 and l.177: MAD's Publication type has an `endorser` field and the Publish view prints 'Endorsing principal', so the design's record drops the one field that makes it an endorsement. The design is not silent (l.127, l.199-200 and l.243 already say unsigned, claimed and not a vote); the fault is confined to the Terms row, the Catalog row, l.121 and the Trust row's 'including that it endorses its target'.

**Skeptic's better change.** Keep the substance, in shorter text. Terms row: 'Publication | MAD's word for a principal's endorsement of one exact definition, with its discovery metadata: a name, a description, tags and a collection placement. In this first cut the record names no principal and is unsigned, so it is a description found at a source address, not an endorsement anyone can be held to.' Catalog row: replace 'who publishes it' with 'which sources carry a publication of it'. l.121: replace the first sentence with 'A publication describes one exact definition for discovery. In MAD it is also its principal's endorsement.' l.127: 'In this first cut a publication names no principal and has no signature, because no principal has a durable identifier yet (bpm-upm.25). MAD's endorsement belongs to a principal and a retrieval host is not necessarily the signer, so a reader treats a first-cut publication as a description observed at a source address: claimed, never listed under an endorser, never counted.' Trust row: 'Everything a publication says. A first-cut publication names no endorser.'

### authority-02: The publication's own SAID does not do what the design says, and its serialization is unstated

Severity: must-fix. Section: Publications. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Four problems with `d` on the first-cut record. (1) The claim is false: `d` is computed over the description alone, so two different parties with the same description get the same `d`. MAD's Publish form prefills name, description and tags from the target, so this is the default case. MAD's rule is about copies of one signed publication by one principal; `d` cannot tell one mirrored publication from two independent ones. (2) MAD's vision puts a record's identity over its committed contents including the issuer; a SAID over the description identifies a payload. (3) Generating `d` needs a field order, which the design does not state, and the result depends on it. That is a serialization decision of the kind the design says it avoids. (4) The record sits inside source.json, so the byte check cannot verify it, and the design says the signed record will have a different SAID anyway, so the first-cut `d` is thrown away.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.124`: Copies of one publication on several sources are then recognizably one publication, as MAD's design requires
- `Test: /Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_check.py`: 2. publication d at gym.example : EHDIE9XzoA1aRTyZyW7llAj2k901iynCjDr7P0hR76ix / publication d at city.example: EHDIE9XzoA1aRTyZyW7llAj2k901iynCjDr7P0hR76ix  same record: True
- `Same test, part 3`: 3. same publication fields, two key orders: EMm1QwJODfgbvzDJDYL9IuFM_iHHSSKDh9LE5UOkFwr1 EKmqNHNeyGQWGZcYDCNpGQfphOO7O50pfxQYavPdMeNj equal: False
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.146`: Their identities belong to the complete records, rather than to the payload or schema alone.
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts l.177`: input('name','Name',p?.name||target.name)
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.127`: a signed publication is a new record with a new SAID

**Reviewer's proposed change.** Remove `d` from the example source document and delete the bullet at l.124. Add: 'A first-cut publication has no identifier of its own. Two identical descriptions at two addresses are two observations, and nothing infers that they are one publication or two. A publication gets its own SAID when it names its endorsing principal: the SAID is computed over the record including that principal, and the signature attaches to that SAID, so signing does not change it.' Change open question 4 to ask whether the record is right 'with MAD's four description fields and the target, no identifier of its own until it names a principal'. If the maintainer keeps `d` instead: state the serialization (compact JSON, fields in the order shown, `d` first), say how a reader re-derives it from source.json, and delete the sentence that cites MAD's 'multiple copies' rule.

**What the skeptic checked.** Re-ran `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_check.py`: parts 2 and 3 print the reported values (one `d`, EHDIE9Xz..., for both parties; two key orders give EMm1Qw... and EKmqNH...). Wrote my own check (/private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_skeptic.py, part D) using the values the Publish form really prefills at views.ts l.177 (the target's name, the default description, 'My business patterns'): two parties again get one `d` (EOvAxGgK...), and reordering keys changes it. Read micro-apps-vision.md l.146 and design.md l.124, l.127. One nuance: l.124 is literally true (copies do share a `d`); what fails is its use as support for MAD's rule, because `d` cannot tell one copied publication from two independent ones. 'Computed by the same rule' is also unbuildable as written: the rule starts from 'the bytes as served' and a record inside source.json has none.

**Skeptic's better change.** Remove `d` from the example and delete the bullet at l.124, as proposed. Replace it with two sentences only: 'A first-cut publication has no identifier of its own. The same description at two addresses is two observations, and nothing infers that it is one publication or two.' Leave out the proposed sentence on how the signed record's SAID is computed and what the signature attaches to: that is the format of MAD's signed publication, which authority-13 itself says is MAD's to rule (bpm-nq3.5). Delete 'a signed publication is a new record with a new SAID' at l.127 for the same reason. Keep the 'if the maintainer keeps d' branch out of the design text and offer it as the alternative inside open question 4.

### authority-03: The byte check accepts byte strings that the workspace's SAID rule refuses, and more than one per SAID

Severity: must-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design calls the check 'the workspace's SAID rule applied to bytes' and opens with 'two parties holding the same SAID hold the same definition'. Replacing every occurrence of the SAID makes the rule looser than bpm-core's: I built three different byte strings that all pass the byte check under one SAID, and bpm-core's `verify_said` refuses two of them. The variants differ only in whether a 44-character slot holds the SAID or 44 `#`, so the damage is small, but 'verified' here would then mean something MAD's own library (bpm-nq3.3, which must match bpm-core byte for byte) rejects. The design's caveat that the two rules agree for 'every document tested' covers honest documents only, and a check exists for the other kind.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.105`: The two agree whenever a document contains its own SAID only in its SAID field, which holds for every document tested.
- `Test: /Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_check.py (part 1)`: b1: byte check=True  bpm-core verify_said REFUSES (said mismatch) / b2: byte check=True  bpm-core verify_said accepts / b3: byte check=True  bpm-core verify_said REFUSES (said mismatch) / distinct byte strings: 3
- `/Users/seriouscoderone/code/bpm/bpm-core/AGENTS.md l.59`: **SAID** is Blake3-256 CESR matching KERI Saider (dummy `d` is 44 `#`). Do not invent another digest.

**Reviewer's proposed change.** Replace the quoted rule with: 'Take the bytes as served. They must contain the expected SAID exactly once and no run of 44 `#` characters. Replace that one occurrence with 44 `#`, compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.' Replace the sentence at l.105 beginning 'The two agree' with: 'With those two conditions exactly one byte string verifies for a given SAID. The rule does not know which field holds the SAID, so it is narrower than bpm-core's in one case: a document that contains a literal run of 44 `#` is refused here.' Add to the failing test cases: the SAID in two places, and a second run of 44 `#`.

**What the skeptic checked.** Re-ran authority_check.py part 1: b1, b2 and b3 all pass the byte check under EG79YJel..., and bpm-core's verify_said refuses b1 and b3, as reported. The problem is wider than reported. authority_skeptic.py part A takes each of the 36 gym-bp documents and puts 44 `#` where the SAID was: the rule as written accepts all 36 variants ('variant with d = 44 # passes the design's rule: 36 of 36') and bpm-core refuses them. So every honest document already has a second verifying byte string; no contrived template is needed. Read /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py and bpm-core/AGENTS.md l.59.

**Skeptic's better change.** The proposed rule is still not one-to-one, and the sentence 'exactly one byte string verifies for a given SAID' would be false. authority_skeptic.py part B: the two files {'k':'<SAID>######'} and {'k':'######<SAID>'} (JSON, SAID EGFwFB4Z...) each hold the SAID once and no run of 44 `#`, and both pass the proposed rule. Use: 'Take the bytes as served. They must contain the expected SAID exactly once. Replace it with 44 `#`. The result must contain no other run of 44 or more `#`, and no `#` directly before or after the replaced one. Compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.' Part C shows this keeps all 36 gym-bp documents and the GLEIF schema and refuses both files above. Replace the 'The two agree' sentence with: 'With those conditions exactly one byte string verifies for a given SAID. The rule does not know which field holds the SAID. It accepts GLEIF's schema, whose SAID is in `$id` and which bpm-core's verify_said refuses for want of `d`; it refuses a document holding a literal run of 44 `#`, which bpm-core accepts. A tool that knows the kind also checks that the SAID is in the field it expects.' (The proposed 'narrower than bpm-core's in one case' is incomplete: I ran verify_said on the GLEIF file and it answers 'missing d'.) Failing test cases to add: the SAID absent with `d` holding 44 `#`; the SAID in two places; a second run of 44 `#`; a `#` beside the SAID.

### authority-04: Independence from bpm-nq3.1 holds for the check but not for the build's re-serialization or for what 'verified' implies

Severity: should-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The claim is sound as far as it goes: comparing served bytes with a SAID chooses no order. Two neighbouring statements are not independent of the ruling. (1) 'The build re-serializes its inputs when needed' is generation, not checking. The measured method, Node's JSON.parse then JSON.stringify, moves integer-like property names ahead of the others and rewrites number forms, so it is an ordering profile of its own; Python's compact form keeps both. The refuse-on-mismatch guard makes this fail safely, but the design presents it as neutral. (2) 'Verified' says the bytes have the SAID, not that they are the normal form of a definition. The same meaning serialized two ways is two verified SAIDs; making them one is what bpm-nq3.1 and bpm-nq3.3 decide, and bpm-core already refuses a document whose bytes hash correctly but are not normalized.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.113`: The build re-serializes its inputs when needed, then checks every file it is about to write against its SAID and refuses to write one that fails.
- `Test: node -e with JSON.stringify(JSON.parse(src)) against python json.dumps(json.loads(src), separators=(',', ':'), ensure_ascii=False), src = {"d":"x","properties":{"zip":{"minimum":0.0},"10":{},"9":{}},"multipleOf":1e2}`: node  : {"d":"x","properties":{"9":{},"10":{},"zip":{"minimum":0}},"multipleOf":100} / python: {"d":"x","properties":{"zip":{"minimum":0.0},"10":{},"9":{}},"multipleOf":100.0}
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.84`: The authored order is preserved directly in the emitted JSON Schema's `properties` object and restored when it is reopened.
- `/Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md (said.py bullet)`: A store copy whose bytes do not hash to its name through normalization is refused by file name

**Reviewer's proposed change.** Replace the last paragraph of the section with: 'The check is independent of the unmade property-order ruling (bpm-nq3.1): it compares served bytes with a SAID and never chooses an order. Two things are not independent of that ruling and stay out of this project. First, the build never normalizes or reorders. For a MAD definition it serves the bytes MAD's library wrote, unchanged, and refuses a file that fails the check. Removing whitespace is done only for bpm-core's pretty-printed store files, the test data; it is not a general canonical form, because JSON.parse then JSON.stringify moves integer-like property names first and rewrites numbers. Second, verified means these bytes have this SAID. It does not mean they are the normal form of a definition: one meaning serialized two ways is two verified SAIDs, and making them one is the job of bpm-nq3.1 and bpm-nq3.3.' In the Trust table add to the Verified row: 'Not: that the bytes are a well-formed definition of any kind.'

**What the skeptic checked.** Re-ran the Node and Python comparison on the reviewer's input (saved as /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_skeptic_reser.json; Node v24.19.0). Node moves the keys 9 and 10 ahead of zip and prints 0 and 100; Python keeps zip first and prints 0.0 and 100.0, exactly as reported. Read mad-ux-design.md l.84 and the said.py bullet of /Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md. Point (2) is true but the design never claims the opposite, so it is a clarification, not an error. I also tested what the fix needs: removing whitespace outside strings, with no parse, makes all 36 stored gym-bp files verify (`/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/authority_skeptic_ws.py` prints '36 of 36 verify'), so a build that never re-serializes can be built against the test data.

**Skeptic's better change.** Same content, about half the length, and it names the operation instead of only forbidding one: 'The check is independent of the unmade property-order ruling (bpm-nq3.1): it compares served bytes with a SAID and chooses no order. The build chooses none either. It serves a file's bytes unchanged when they verify. When they do not, it removes whitespace outside strings, without parsing, and checks again; if that fails it refuses the file. JSON.parse then JSON.stringify is not that operation: it moves integer-like property names first and rewrites 0.0 as 0. Verified means these bytes have this SAID. It does not mean they are the one normal form of a definition; making one meaning one SAID is bpm-nq3.1 and bpm-nq3.3.' Drop the proposed extra line in the Trust table; this paragraph already says it. See also the missed finding authority-s1 on what the independence claim presumes.

### authority-05: Assemblies are left out without saying so, and bpm-nq3.6 is never named

Severity: should-fix. Section: Terms; Publications; What waits on other work. Skeptic: partly; proposed change: adopt-modified.

**Problem.** MAD publishes four kinds of target and its Publication type carries `kind: ... | 'assembly'` with a `components` list. HANDOFF says an assembly is how RRs are shared and found, and that an application's protocol is models, authorizations, RRs, assemblies and scenarios, so a protocol reference for a whole protocol is an assembly-level thing. The design names three kinds and never mentions assemblies or bpm-nq3.6. Leaving them out is right for this cut: Ruling 2 names three kinds and an assembly has no SAID until bpm-nq3.6 is ruled. But the omission must be stated, because a publication's `target` is a SAID, so if bpm-nq3.6 rules 'definitions only' MAD's assembly publication has no record here. The test data already contains the bpm-core counterpart: 7 of gym-bp's 36 frozen documents are selections. Separately, the Definition row ('A frozen document identified by its SAID') and 'the project stays format-agnostic' read like option (c) of bpm-5g1.2, which the maintainer did not choose.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.247`: Publishing begins with a review of the exact model, authorization, responsibility or assembly and its dependencies.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.58`: a mechanism inside MAD for authoring, explaining, sharing and finding RRs; it can be published, but no runtime instantiates an assembly
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts l.45`: kind: Definition['kind'] | 'assembly'; components: { alias: string; definition: string; context: string; bindings: Record<string, IdentityParameter> }[]
- `bd show bpm-nq3.6`: Options: definitions only; assemblies freeze as pinnable packages; a selection inside an assembly freezes while placements stay local.
- `Test: tally of `kind` over /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/*.json`: Counter({'rr': 13, 'aggregate': 8, 'selection': 7, 'fact': 5, 'authorization': 2, '(schema: no kind)': 1})
- `bd show bpm-5g1.2 (options)`: (c) any content-addressed document, with MAD as the first profile
- `grep -n -i 'assembl\|nq3.6' /Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md`: (no matches)

**Reviewer's proposed change.** Replace the Definition row with: 'A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility (Ruling 2). The tool never reads a document's kind, which is how it defines no format; that is not a widening to any content-addressed document, which Ruling 2 declined. In the test data: gym-bp's frozen documents, which are bpm-core's kinds, including seven frozen selections.' Add to Publications: 'MAD's Publish screen has a fourth target, the assembly, which is how MAD shares and finds a set of responsibilities. It is not in this cut. A publication's target is a SAID, and whether an assembly gets one is the unmade ruling bpm-nq3.6. If it does, an assembly is served, described and looked up like any definition and nothing here changes. If it does not, assembly publication needs a record this design does not have. A document that refers to X, such as a selection that lists an RR, is never a publication of X.' Add a row to What waits on other work: 'Publishing and finding assemblies | Whether assemblies get SAIDs (bpm-nq3.6)'.

**What the skeptic checked.** `grep -n -i 'assembl\|nq3.6' /Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md` returns nothing. Quotes verified at mad-ux-design.md l.247, HANDOFF.md l.58, views.ts l.45, `bd show bpm-nq3.6` and the options of `bd show bpm-5g1.2`. Re-ran the kind tally (authority_skeptic.py part F): rr 13, aggregate 8, selection 7, fact 5, authorization 2, schema 1, total 36.

**Skeptic's better change.** Add the assembly paragraph in shorter form and the table row. Leave out the sentence arguing against option (c) and the sentence that a selection is never a publication of what it lists (the design already keeps `refers` and publications apart). Definition row: 'A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility (Ruling 2). The tool never reads a document's kind. In the test data: gym-bp's frozen documents, seven of which are selections.' In Publications: 'MAD's Publish screen has a fourth target, the assembly. It is not in this cut: a publication's target is a SAID, and whether an assembly gets one is the unmade ruling bpm-nq3.6. If it does, an assembly is served and looked up like any definition. If it does not, publishing an assembly needs a record this design does not have.' Table row: 'Publishing and finding assemblies | Whether assemblies get SAIDs (bpm-nq3.6)'.

### authority-06: 'Publish' is used for both serving and endorsing, against the workspace's own claim that the design adds no third meaning

Severity: should-fix. Section: Terms; The tool. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The workspace's locked vocabulary reserves publish for serving frozen bytes at an endpoint. The design calls that 'serve' and keeps 'publication' for the description record, which is MAD's discovery sense. That split is defensible, and matches MAD's UX document, but the design never states it, and its verbs wander: 'others they know to publish the same SAIDs' and 'a source can publish any SAID at no cost' can each be read as serve or as carry a publication, which is exactly the line MAD draws between a mirror and an endorsement. The note on bpm-nq3.2 covers command names only, though the ruling will also decide the noun. MAD also uses 'publish' and 'publication' for pub/sub delivery at runtime, the same kind of clash that the design cites as its reason for dropping 'declaration'.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/CLAUDE.md l.214`: calls making a source `build`, so it adds no third meaning of *publish*
- `/Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md l.20`: The word *publish* is **reserved for serving** frozen bytes at an endpoint for somebody else
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.135`: where they first got a definition, and others they know to publish the same SAIDs
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.243`: a source can publish any SAID at no cost, so the number of sources publishing a definition is not a vote
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.249`: Freezing a local definition and making it retrievable through a source are separate operations, with separate outcomes.
- `/Users/seriouscoderone/code/bpm/mad/src/domain.ts l.23`: delivery?: 'publish' | 'request'

**Reviewer's proposed change.** Add a Terms row: 'Serve | To make a definition's bytes fetchable at a source. bpm-core's locked vocabulary calls this publish; this design does not, because in MAD's discovery vocabulary a publication is the description and endorsement, and serving alone is what a mirror does.' Add under the table: 'MAD also says publish for delivering a statement to subscribers at runtime; that sense is not used here. Which of these words survive is the unmade ruling bpm-nq3.2; this design renames nothing on either side and will follow it.' Then use only 'serve' for bytes and 'carry a publication of' for the record: at l.135 write 'others they know to serve the same SAIDs'; at l.243 write 'a source can serve, or carry a publication of, any SAID at no cost, so the number of sources doing either is not a vote'. At l.258 replace 'stays out of the command names' with 'stays out of the command names, and the record keeps MAD's word publication only until that ruling'.

**What the skeptic checked.** Verified each quote: /Users/seriouscoderone/code/bpm/CLAUDE.md l.214, /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md l.19-20, design.md l.135 and l.243, mad-ux-design.md l.249, /Users/seriouscoderone/code/bpm/mad/src/domain.ts l.23. bpm-core/AGENTS.md l.45 agrees ('Publish is serving frozen bytes, above freeze'). The loose verb also appears at design.md l.9 ('from what parties publish about themselves') and in /Users/seriouscoderone/code/bpm/mad-discovery/README.md l.7 ('who else publishes, or refers to, this SAID'), which the finding does not list.

**Skeptic's better change.** Add the Terms row: 'Serve | To make a definition's bytes fetchable at a source. bpm-core's locked vocabulary calls this publish; here a publication is the record about a definition, and serving alone is what a mirror does.' Then use 'serve' for bytes and 'carry a publication of' for the record everywhere: l.135 'others they know to serve the same SAIDs'; l.243 'a source can serve, or carry a publication of, any SAID at no cost, so the number of sources doing either is not a vote'; l.9 'from what parties serve on addresses they control'; README.md l.7 'who else serves, describes or refers to this SAID'. At l.258 add: 'The noun publication follows that ruling too.' Drop the proposed aside about runtime pub/sub delivery: nothing in this design touches delivery, so it adds length without removing an ambiguity. Do not write 'only until that ruling', which presumes the ruling's outcome.

### authority-07: Introduction and introducer are narrowed from MAD's meaning, and what a reader checks for `for` is undefined

Severity: should-fix. Section: Terms; Introductions. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** In MAD and in KERI an introduction pairs an identifier with a candidate location, and the recipient checks the identifier. The design's introduction is a link from one source address to another with the SAIDs optional, so an introduction without `for` has nothing to check. The design then says a catalog returns introductions 'in MAD's sense', which concedes that its own Terms row is a different sense. It also records the introducing address as 'the introducer' and cites MAD's 'introducers when known'; MAD's introducer is a principal, and MAD says an unknown introducer stays unknown. Last, `for` names SAIDs the other source is 'expected to carry'. 'Carry' is defined nowhere: serve the bytes, have a publication of it, or serve something that refers to it. An implementer has to guess what makes an introduction check out.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.29`: A pointer from one source to another source's address, optionally naming the SAIDs it is expected to carry.
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.74`: a link, catalog entry, shared file, or known peer can introduce a document SAID or principal ID together with a candidate location
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.60`: OOBI-inspired introductions, expected identities, introducers when known, and candidate locators.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.64`: A mirror is not automatically its author, and an unknown introducer stays unknown.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.135`: The reader records the introducing source as the introducer, which MAD's design asks to keep

**Reviewer's proposed change.** Replace the Introduction row with: 'MAD's word: an identifier paired with a candidate location, to fetch and check. Here the identifier is a definition's SAID and the location is another source's address. An entry that names no SAID is only a link to another source. A hint, never a fact.' In Introductions replace the sentence about the introducer with: 'The reader records the address where it found each introduction. That is a retrieval observation. MAD's introducer is a principal, and until introductions are signed the introducer stays unknown.' Add: 'An introduction that names a SAID checks out when the source it points to serves that SAID, carries a publication of it, or serves a definition that refers to it. Otherwise the report lists it as unresolved.'

**What the skeptic checked.** Verified design.md l.29, l.135, l.170; micro-apps-vision.md l.74; mad-ux-design.md l.60 and l.64. I doubted 'MAD's introducer is a principal' because the vision says 'a link, catalog entry, shared file, or known peer can introduce', so I looked for how MAD shows one: the prototype's provenance panel at views.ts l.197 prints 'Introduction supplied by' followed by the curator's name and principal ID, and 'Expected source identity' followed by the definition's reference. That supports the finding better than its own citations. 'Carry' is used at l.27, l.29 and l.133 and defined nowhere; the walk uses `for` only to order its visits (step 5).

**Skeptic's better change.** Adopt the Terms row as proposed. Introducer sentence: 'The reader records the address of the source document each introduction was found in. That is a retrieval observation; MAD's introducer is a principal, and it stays unknown until introductions are signed.' For `for`, define the word and stop there: '`for` names SAIDs the other source is expected to serve, carry a publication of, or serve a definition that refers to.' Put the reporting of an unmet `for` in the unresolved list of authority-08, so it is stated once.

### authority-08: The trust table uses a different triple from MAD's provenance states and nothing is ever reported as unresolved

Severity: should-fix. Section: Trust: what is verified, observed and claimed; The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The Publications section cites MAD's three states (claimed, verified, unresolved). The Trust section then defines verified, observed and claimed. 'Observed' is not a MAD state: MAD keeps retrieval observations as a kind of relationship beside the states. 'Unresolved' has no place in the design at all: the walk's report has three lists and none for a dead source, bytes that failed the check, a `refers` claim not found in the bytes, or an introduction not followed because a limit was reached. MAD treats missing material as an unresolved condition that must stay visible, and bpm-upm.21 needs each item 'marked claimed, verified or unresolved'.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.240`: | Observed | This source address served this record at this time. |
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.64`: A provenance panel reveals these distinctions and labels claimed, verified or unresolved information.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.61`: Retrieval observations: where, when and which record was obtained.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.74`: missing proof is an unresolved condition, not permission to assume success
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.149`: The report has three lists, each entry naming the source it came from and the chain of introductions that led there:

**Reviewer's proposed change.** Replace the Trust table with MAD's three states: 'Verified | These bytes have this SAID. This definition contains that SAID.' 'Claimed | Everything a publication says. What a source document says it serves or refers to, until the reader has checked it.' 'Unresolved | A source that could not be fetched. Bytes that failed the check. A reference a source claims that is not in the bytes. An introduction whose SAIDs were not found where it points. Anything not followed because a limit was reached.' Add under it: 'Where and when each record was fetched is a retrieval observation kept beside every entry. It is not a fourth state.' In The walk change 'The report has three lists' to four and add: 'what could not be resolved, each with its reason'.

**What the skeptic checked.** Verified design.md l.127, l.149, l.240 and mad-ux-design.md l.61, l.64, HANDOFF.md l.74. `grep -n unresolved design.md` finds the word once, at l.127, and nowhere in the walk, the catalog or the Trust table. The Tests section lists a dead source, an oversized file, a redirect and a false `refers`, but no part of the report says where those show up.

**Skeptic's better change.** Adopt the three-state table, the sentence that a retrieval observation is not a fourth state, and the fourth list. Three additions the proposal misses. (1) Rename the heading to 'Trust: what is verified, claimed and unresolved' and fix the link at l.16, which points at the old anchor. (2) Add under the table: 'These are the walk's labels for what it checked on this run. What MAD's provenance panel shows is decided there (bpm-upm.21).' That keeps the design in line with the comment on bpm-upm.21. (3) In Tests, say that the dead source, the oversized file, the redirect and the false `refers` each appear in the unresolved list with their reason.

### authority-09: The walk's local retention folder contradicts the README and the comment left on bpm-upm.21

Severity: should-fix. Section: The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design has the walk keep fetched definitions in a local folder with a retrieval log 'so a remote outage does not erase what was learned'. That is MAD's retention with provenance, in MAD's own words. The README and the comment left on bpm-upm.21 both say local retention stays in mad. Built as written, the workspace would have three content-addressed local stores of the same documents: bpm-core's `.bpm/store`, this folder, and MAD's retained library, and the folder's layout would lean on the unmade ruling bpm-vfn.1, one of whose options is 'a content-addressed store close to bpm-core's frozen store'. The design also never says how a result reaches MAD, which is a browser application with no backend whose deferred plan takes introductions from imported bundles.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.159`: Fetched definitions are kept in a local folder keyed by SAID, with a log of where and when each was retrieved, so a remote outage does not erase what was learned.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.43`: retains them locally with provenance. Search operates over that local knowledge. Following another introduction enlarges it; a remote outage does not erase retained definitions.
- `bd comments bpm-upm.21`: The panel, local retention and the claimed / verified / unresolved states stay here in mad.
- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md l.31`: MAD's Explore, its provenance panel and the import of what is found stay there (bpm-upm.21, bpm-upm.22).
- `bd show bpm-upm.21`: a panel over introductions the instance actually retained from imported publish bundles

**Reviewer's proposed change.** Replace the first sentence of the paragraph at l.159 with: 'The walk keeps what it fetched in a cache folder keyed by SAID, with the address and time of each fetch, so a repeated lookup does not fetch again. It is a cache: it can be deleted at any time and nothing but this tool reads it. MAD's retained library and its provenance stay in mad (bpm-upm.21). What the walk hands on is its report, printed as JSON, and the verified bytes; how MAD takes those in is not designed here and follows the store ruling bpm-vfn.1.'

**What the skeptic checked.** Verified design.md l.159, mad-ux-design.md l.43, README.md l.31, `bd comments bpm-upm.21` ('The panel, local retention and the claimed / verified / unresolved states stay here in mad') and `bd show bpm-upm.21` ('retained from imported publish bundles'). The design's sentence reuses MAD's own words for MAD's retention ('a remote outage does not erase').

**Skeptic's better change.** A cache is still a store to design (what is stale, who clears it). Simpler, and nothing is lost: 'The walk prints its report as JSON. With `--out <folder>` it also writes the bytes of each verified definition there as `<SAID>.json`. It keeps nothing between runs. Retaining what was learned, with its provenance, is MAD's (bpm-upm.21); how MAD takes a report in follows the store ruling (bpm-vfn.1).' The output folder then has the shape `build` takes as input (see authority-s3), so there is one folder shape, not a third store.

### authority-10: The design never mentions bpm-n13, an open epic that designs the same serve-and-fetch layer, and `build`'s input is undefined against the real store

Severity: should-fix. Section: The tool; What waits on other work. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** bpm-n13 is an open P2 epic in bpm-core: `bpm publish <SAID|selection> --to <provider>` walks a closure out of the store, `bpm pull` fetches by digest, verifies and follows pointers, and its later providers are S3 and 'a KERI/OOBI-style endpoint'. A mad-discovery source is that endpoint. The only note left is on the deferred child bpm-n13.4; the open children n13.1 to n13.3 carry none and the design is silent, which sets up two layouts for served frozen bytes (`{SAID}.json` flat there, `/.well-known/oobi/<SAID>/index.json` here) and leaves unclear who fetches a definition together with what it refers to. It also leaves `build <folder>` undefined: gym-bp's store holds every version ever frozen, so 'a folder of frozen documents' pointed at it would serve superseded documents beside current ones.

**Evidence.**

- `bd show bpm-n13`: bpm publish <SAID|selection> --to <provider>: walk the closure from the store through the POINTERS table and hand each document to a provider.
- `bd show bpm-n13.1`: its on-disk shape ({SAID}.json flat, like the store)
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.253`: Makes a source from a folder of frozen documents and one configuration file holding publications, introductions and catalogs.
- `Test: tally of alias and kind over /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/*.json`: ('selection', 'EAgTudiuVuif', 'dropin-class', ...) ('selection', 'EEe_r3EZyR5R', 'dropin-class', ...) ('selection', 'EFQ6ngR2kib-', 'dropin-class', ...)
- `grep -n 'n13' /Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md`: (no matches)

**Reviewer's proposed change.** Add after the command table: '`build` serves exactly the files in its input folder and follows no references. It does not read a bpm-core store in place: gym-bp's store keeps superseded versions beside current ones, and which frozen documents to serve is the publisher's choice. bpm-core's planned `bpm publish <SAID|selection> --to dir:PATH` (bpm-n13.2) writes such a folder. A source is the HTTP provider that bpm-n13.4 deferred. Fetching a definition together with everything it refers to is `bpm pull` (bpm-n13.3); this tool does not do it. Whether those two commands stay in bpm-core is for its evaluation (mad/HANDOFF.md Ruling 5).' Add a row to What waits on other work: 'Choosing a closure to serve, and fetching one | bpm-core's publish and pull (bpm-n13.2, bpm-n13.3)'.

**What the skeptic checked.** `bd show bpm-n13`, bpm-n13.1, .2, .3, .4 and their comments: the epic and its first three children are open at P2, and only the deferred bpm-n13.4 carries a mad-discovery comment. `grep -n n13 design.md` returns nothing. Re-ran the alias tally (authority_skeptic.py part F): the store holds three frozen `dropin-class` selections, three `member-class`, three `membership` RRs, two `payment-received`, two `remittance-submitted`. bpm-n13.2 says its directory provider writes `{SAID}.json` and must 'never rewrite bytes', so its output is pretty-printed store bytes.

**Skeptic's better change.** Shorter, and without deciding bpm-core's future: 'build serves exactly the files in its input folder and follows no references. Which frozen documents go in that folder is the publisher's choice; gym-bp's store keeps superseded versions beside current ones. bpm-core has an open epic for the same layer (bpm-n13: `bpm publish --to <provider>` and `bpm pull`). A source is the HTTP provider that epic deferred (bpm-n13.4). Fetching a definition together with everything it refers to is `bpm pull` (bpm-n13.3) and is not done here. Whether bpm-core keeps those commands is for its evaluation (mad/HANDOFF.md Ruling 5).' Add the proposed table row. How `build` learns each file's SAID is the missed finding authority-s3.

### authority-11: The 'What waits on other work' table names the wrong beads for the export and for signed publications

Severity: should-fix. Section: What waits on other work; The tool. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Three rows are wrong or incomplete. (1) The export of MAD definitions is credited to bpm-nq3.1 then bpm-nq3.3. bpm-nq3.3 replaces ids inside MAD's browser store; it emits no files. Files come from bpm-nq3.5 (the bundle) or from the store ruling bpm-vfn.1 and the library bpm-vfn.3. (2) Signed publications are said to wait on durable keys and the KERI path. The signed publication itself is MAD's bpm-nq3.5, which depends on bpm-nq3.2 and bpm-nq3.3 and is not in the row. Making signatures wait on the KERI adapter (bpm-upm.26) contradicts MAD's position that authoring is KERI-agnostic: a durable key and its binding to a principal (bpm-upm.25) are what a signature needs; only the KERI form needs bpm-upm.26. (3) The tool section says the SAID check 'belongs in MAD's shared library (bpm-nq3.3)' and will be imported from it. bpm-nq3.3 does not describe a check over served bytes, and an importable library is bpm-vfn.3.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.284`: | MAD's own definitions as content | SAIDs for MAD definitions and an export of them (bpm-nq3.1, then bpm-nq3.3) |
- `bd show bpm-nq3.3`: replace prototype string ids with SAIDs and keep names as attributed aliases; hash routes still resolve
- `bd show bpm-vfn.1`: Today MAD data lives in the browser store (mad.authoring, mad.rehearsals) and in bundled seed modules
- `bd show bpm-nq3.5`: publish = sign and emit a shareable bundle of frozen definitions with provenance that another MAD instance can import
- `bd show bpm-upm.26`: MAD authoring and simulation stay KERI-agnostic
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.144`: A signature also needs a verifiable binding between the signing key and the principal.

**Reviewer's proposed change.** Replace the first and third rows and add two:
'| MAD's own definitions as content | SAIDs for MAD definitions (bpm-nq3.1, then bpm-nq3.3) and their export as files, which is the freeze and publish work (bpm-nq3.5) or the shared store (bpm-vfn.1, bpm-vfn.3) |'
'| Signed publications and third-party assessments | A durable self-held key bound to a principal (bpm-upm.25) and MAD's signed publication (bpm-nq3.5, after bpm-nq3.2) |'
'| The KERI form of a signed publication | The KERI path (bpm-upm.26) |'
'| Importing the SAID check instead of keeping a copy | MAD's shared library as an importable package (bpm-vfn.3), carrying a check over served bytes |'
In The tool replace '(bpm-nq3.3)' with '(bpm-vfn.3, once bpm-nq3.3 has given it SAIDs)'. In Trust replace 'That work waits on durable keys (bpm-upm.25) and the KERI path (bpm-upm.26) in MAD' with 'That work waits on durable keys (bpm-upm.25) and MAD's signed publication (bpm-nq3.5); its KERI form waits on bpm-upm.26'. Also add the rows proposed in authority-05 (bpm-nq3.6) and authority-10 (bpm-n13).

**What the skeptic checked.** Verified design.md l.284, l.286, l.260 and `bd show` for bpm-nq3.3, bpm-nq3.5, bpm-vfn.1, bpm-vfn.3, bpm-upm.25, bpm-upm.26, plus micro-apps-vision.md l.144. Also read the epic: `bd show bpm-5g1` lists under Out 'signatures by principals: later, after durable keys (bpm-upm.25) and the KERI path (bpm-upm.26)'.

**Skeptic's better change.** Change three rows instead of adding four: 'MAD's own definitions as content | SAIDs for MAD definitions (bpm-nq3.1, then bpm-nq3.3) and a way to write them out as files (bpm-nq3.5, or the shared store bpm-vfn.1)'. 'A renderer that knows MAD's kinds | MAD's shared library (bpm-vfn.3, after bpm-vfn.1)'. 'Signed publications and third-party assessments | A durable key bound to a principal (bpm-upm.25) and MAD's signed publication (bpm-nq3.5, after bpm-nq3.2). Their KERI form waits on bpm-upm.26.' In The tool write 'MAD's shared library (bpm-vfn.3; its SAID code arrives with bpm-nq3.3)'. In Trust write 'That work waits on durable keys (bpm-upm.25) and MAD's signed publication (bpm-nq3.5); its KERI form waits on bpm-upm.26.'

### authority-12: Comments left on the deferred beads disagree with the design or with the ruling in three places, and six named beads have none

Severity: should-fix. Section: What waits on other work. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Checked with `bd comments`. (1) bpm-upm.21's comment says local retention and the three states stay in mad; the design does both (see authority-08 and authority-09). (2) bpm-nq3.7's comment says Ruling 2 dropped the structural hash 'in favour of this bead's category SAID'. The ruling's close reason only drops it; the replacement is the commenter's inference. (3) bpm-upm.23's comment promises 'mad-discovery will index it once it exists'; the design lists structural category as waiting and the epic lists it as out. The comments on bpm-nq3.3, bpm-nq3.5 and bpm-upm.22 match the design. No comment or link was left on beads the design names as blockers (bpm-nq3.1, bpm-nq3.2, bpm-upm.25, bpm-upm.26, bpm-vfn.1) or should name (bpm-nq3.6, bpm-n13.1 to .3), so whoever undefers them will not learn that mad-discovery waits on them.

**Evidence.**

- `bd comments bpm-nq3.7`: Ruling bpm-5g1.2 dropped the draft spec's Weisfeiler-Lehman hash in favour of this bead's category SAID, when it is built.
- `bd show bpm-5g1.2 (close reason)`: Dropped from the draft spec: the DCR graph format, CIDv1 sha2-256 hashing over JCS, and the Weisfeiler-Lehman structural hash.
- `bd comments bpm-upm.23`: mad-discovery will index it once it exists.
- `bd show bpm-5g1 (RELATED)`: bpm-n13.4 ... bpm-nq3.3 ... bpm-nq3.5 ... bpm-nq3.7 ... bpm-upm.21 ... bpm-upm.22 ... bpm-upm.23
- `bd comments bpm-nq3.1; bd comments bpm-nq3.2; bd comments bpm-nq3.6; bd comments bpm-upm.26`: No comments on bpm-nq3.1

**Reviewer's proposed change.** Add one sentence under the What waits on other work table: 'Each bead in this table carries a comment that says what mad-discovery waits on it for, and is linked from the epic bpm-5g1.' When the design is revised, bring the comments into line: amend bpm-upm.21's to match the cache wording of authority-09; amend bpm-nq3.7's to 'Ruling bpm-5g1.2 dropped the draft spec's Weisfeiler-Lehman hash; structural similarity stays with this bead'; amend bpm-upm.23's 'will index it' to 'may index it; not designed'; add comments and related links on bpm-nq3.1, bpm-nq3.2, bpm-nq3.6, bpm-upm.25, bpm-upm.26, bpm-vfn.1 and bpm-n13.1.

**What the skeptic checked.** Ran `bd comments` on every bead named. The comments on bpm-upm.21, bpm-nq3.7 and bpm-upm.23 read as quoted, and the close reason of bpm-5g1.2 only says the structural hash was dropped. `bd show bpm-5g1` lists seven related beads and none of bpm-nq3.1, bpm-nq3.2, bpm-nq3.6, bpm-upm.25, bpm-upm.26, bpm-vfn.1 or bpm-n13.1 to .3. Small correction to the title: bpm-upm.25 and bpm-vfn.1 do have comments, both older and on other subjects; four beads (bpm-nq3.1, bpm-nq3.2, bpm-nq3.6, bpm-upm.26) have none at all.

**Skeptic's better change.** Do the tracker housekeeping; do not add the proposed sentence to the design. A design that asserts the state of bead comments is wrong the first time a bead is edited, and the table already names the beads. When the design is revised: amend bpm-nq3.7's comment to 'Ruling bpm-5g1.2 dropped the draft spec's Weisfeiler-Lehman hash; structural similarity stays with this bead', amend bpm-upm.23's 'will index it' to 'may index it; not designed', and add a related link from bpm-5g1 to each bead the table names that has none (bpm-nq3.2, bpm-nq3.6, bpm-upm.25, bpm-upm.26, bpm-vfn.1, bpm-n13). With the authority-09 and authority-08 changes as modified above, the comment on bpm-upm.21 becomes true and needs no edit.

### authority-13: Open question 4 changes MAD's publish semantics, so its answer is a MAD ruling, and 'MAD's existing fields' is not accurate

Severity: should-fix. Section: Open questions for the maintainer; Publications. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design says the record 'commits MAD's later signed bundle (bpm-nq3.5) to the same fields'. The workspace rule is that a decision changing MAD's identity, format or publish semantics stays under the `mad` label and is linked from the mad-discovery bead; MAD's rulings are mirrored in mad/HANDOFF.md. Approving this design inside bpm-5g1.5 would settle a MAD record format without a MAD ruling. The question also misdescribes what it asks: the record is not 'MAD's existing fields'. MAD's Publication has nine fields; the design keeps four plus the target and drops `endorser`, `kind`, `components` and `targetId`, and changes `tags` from a string to an array.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/CLAUDE.md l.202`: A bead that changes MAD's identity, format or publish semantics stays under `mad` even when mad-discovery surfaces it; link it from the mad-discovery bead.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.295`: Recommended as written: MAD's existing fields, its own SAID, unsigned for now. It commits MAD's later signed bundle (bpm-nq3.5) to the same fields.
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts l.45`: export interface Publication { name: string; description: string; tags: string; collection: string; target: string; targetId: string; endorser: string; kind: Definition['kind'] | 'assembly'; components:

**Reviewer's proposed change.** In Publications replace 'The fields are the ones MAD's Publish screen already collects' with 'The fields are the four that MAD's Publish form asks for (name, description, tags, collection) plus the target's SAID. MAD's Publication type also holds the endorser, the target's kind and an assembly's components; the endorser arrives with durable identity, the kind is read from the definition, and components wait on bpm-nq3.6. Tags are a list here and a comma-separated string in MAD's form today.' Replace 'This design takes MAD's existing fields so that they do' with 'This design takes those four fields so that they can.' Rewrite open question 4 as: 'Is the publication record right? It decides what MAD's later signed publication (bpm-nq3.5) contains, so the answer is recorded as a `Rule:` bead under the `mad` label, linked from bpm-5g1.5 and mirrored under Rulings in mad/HANDOFF.md. Recommended: the four description fields and the target.'

**What the skeptic checked.** Verified /Users/seriouscoderone/code/bpm/CLAUDE.md l.202, design.md l.121, l.129, l.295 and views.ts l.45, l.177. The form at l.177 has exactly four inputs: name, description, tags, collection.

**Skeptic's better change.** Remove the commitment instead of escalating it. bpm-nq3.5 is deferred behind bpm-nq3.2 and bpm-nq3.3; asking for a MAD ruling now pulls a deferred decision forward through this design's approval, and the objective does not need it. Replace 'The two must agree on what a publication contains. This design takes MAD's existing fields so that they do.' with: 'This record takes the four fields MAD's Publish form asks for (name, description, tags, collection) and the target's SAID, so that MAD's signed publication can start from it. It does not bind that record: what MAD signs is ruled under the `mad` label with bpm-nq3.5, and when it exists it replaces this one. Tags are a list here and a comma-separated string in MAD's form today.' Open question 4: 'Is the first-cut publication record right? Recommended: the four description fields and the target's SAID, with no endorser and no identifier of its own. This does not decide MAD's signed publication (bpm-nq3.5). The alternative, fixing MAD's record now, needs a Rule: bead under the `mad` label, mirrored in mad/HANDOFF.md.'

### authority-14: 'Every word on the page comes from the definition or from a publication' is not true of the page as specified

Severity: should-fix. Section: Readable pages. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The page as listed contains words that come from neither: the command that checks the SAID, the labels over each part, the list of referring definitions and the list of catalogs. MAD's rule does not forbid that; it allows a deterministic templated generator and forbids prose the generator invents. The design overstates the rule and then breaks its own statement two lines earlier. Separately, the names and descriptions shown come from first-cut publications, which name no principal, so the page must present them as what this source says, in line with MAD's rule that a name is an attributed assertion. And the JSON-LD block names no vocabulary, so an implementer must choose the first public RDF terms for a definition, which MAD's own RDF projection has not chosen.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.213`: Every word on the page comes from the definition or from a publication. The build writes no prose of its own, which is MAD's rule for shown text.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.208`: the SAID, and the command that checks it;
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.82`: generated from the definitions and the scenario's data, or from a deterministic templated generator over them. The runtime writes no prose of its own.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md l.53`: A name is an attributed assertion about that ID.

**Reviewer's proposed change.** Replace the paragraph at l.213 with: 'Everything the page says about the definition comes from the definition's bytes or from this source's publications of it, through one fixed template. The template's own words are its labels and the check command, the same on every page. The build composes no sentence, which is MAD's rule for shown text. Names and descriptions are shown as what this source says about the definition, not as the definition's name.' Replace the JSON-LD sentence with: 'The page also carries a JSON-LD block so that general search engines index it: a schema.org `CreativeWork` whose `identifier` is the SAID and whose `url` is the definition's address. It defines no MAD vocabulary.'

**What the skeptic checked.** Verified design.md l.205-213, HANDOFF.md l.82 and mad-ux-design.md l.53. The page list at l.208 includes 'the command that checks it', and labels are implied by every bullet, so l.213 contradicts the list five lines above it. The JSON-LD sentence names no context or type.

**Skeptic's better change.** Adopt the replacement paragraph without its last sentence; the page is on the source's own origin and shows that source's publications, so a label does the attributing: 'Everything the page says about the definition comes from the definition's bytes or from this source's publications of it, through one fixed template. The template's own words are its labels and the check command, the same on every page. The build composes no sentence, which is MAD's rule for shown text.' For the JSON-LD block, delete it instead of naming a vocabulary. The page's visible text already carries the SAID, which is what a search engine indexes; nothing in this design reads the block; and it would be the first public RDF terms for a definition, which MAD's own RDF projection has not chosen. If the maintainer wants it kept, use the proposed schema.org wording.

### authority-15: The AI Catalog digest is optional in the survey, yet the design calls it required and emits a second digest

Severity: should-fix. Section: AI Catalog entries; Terms. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The Terms table says 'this project adds no other digest', Ruling 2 says mad-discovery defines no digest of its own, and bpm-core's locked list says not to invent another. The AI Catalog section then emits a sha-256 of each definition and justifies it as something 'that format requires'. The design's own evidence lists `digest` among the optional entry fields, and notes that the feature has no observed use. So the adapter adds a second digest of the definition that nothing requires and nothing here reads.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.219`: the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md l.143`: exactly one of url or data, and optional displayName, description, tags, version, updatedAt, extensions, publisher, digest, trustManifests[]
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md l.165`: the digest and Trust Manifest features have no observed use
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.25`: The workspace's rule; this project adds no other digest.

**Reviewer's proposed change.** Replace 'the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key' with 'the definition's address, a media type, and the SAID in the identifier, in a tag and under an extension key. The format's optional `digest` field is left out: it is a sha-256 of the served bytes, a second digest beside the SAID, and Ruling 2 keeps this project to one.'

**What the skeptic checked.** Verified design.md l.25, l.219 and discovery-survey.md l.143, l.165; l.150 of the survey shows where the idea came from ('Practical answer: digest = sha256 of the bytes for generic consumers'). I also read the specification itself, read-only (`gh api 'repos/Agent-Card/ai-catalog/contents/specification/ai-catalog.md?ref=6e26a18afceaeabe6db179dc9252f73db1bcd7a7'`, commit of 2026-11-05, saved at /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-authority-dl/ai-catalog-spec.md). `digest` is defined at l.339 under 'The following members are OPTIONAL:' (l.262), and l.694-695 say the entry's digest 'MUST be present when an entry carries a signed Trust Manifest'. The design emits no Trust Manifest, so 'the sha-256 digest that format requires' is false.

**Skeptic's better change.** Drop the field, but do not rest it on Ruling 2: the ruling bars a digest 'of its own', and this field belongs to the adapter's format. The reasons are that it is optional, the survey found no use of it, and l.25 says this project adds no other digest. The design also never says what the entry's required `identifier` is. Text: 'one entry per served definition: the SAID as the entry's identifier and again under an extension key, the definition's address, and a media type. The format's `digest` member is optional (it is required only beside a signed Trust Manifest, which this design does not emit) and is left out, so the SAID is the only digest this project writes.'

### authority-16: The maintainer's own catalog is stated as a scheduled job he runs, and nothing says the tool ships without a built-in address

Severity: should-fix. Section: The catalog. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design states as fact that the maintainer's catalog 'is a scheduled job in continuous integration'. That is a thing for a solo maintainer to run and keep working (a search token or an archive download, depending on the finder), it appears in neither the build order nor the open questions, and a scheduled crawl is close to what the design's own table drops as 'an aggregation site by another name'. Ruling 3 requires only that the batch be repeatable and regenerable by anyone. Related gap: nothing says the tool has no default source or catalog address. A baked-in default is how one copy among many becomes the authoritative site that Ruling 3 excludes and that MAD's 'no required central catalog' excludes.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.174`: The maintainer's own catalog is one copy among any number. It is a scheduled job in continuous integration that writes files to his source.
- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md l.19 (Ruling 3)`: The objective is met as: no hand-curation, no submission step, no authoritative site.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.106`: with no required central catalog or database engine
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.304`: | The crawler Lambda, DynamoDB index and query API | An aggregation site by another name. Ruling 3. |

**Reviewer's proposed change.** Replace the paragraph at l.174 with: 'Nothing here requires the maintainer to run a catalog: the objective is met when anyone can run the command. If he publishes one it is one copy among any number, and keeping its scheduled job working is then his to do. There is no database and no query endpoint, and a reader who distrusts a catalog can run the same command. The tool ships with no source or catalog address built in. Every lookup names where it starts, so no copy becomes the default.' Add an open question: 'Does the maintainer publish a catalog of his own? Recommended: not until a finder is proven; until then a catalog covers only sources someone named.'

**What the skeptic checked.** Verified design.md l.174 and l.304, README.md l.19 (Ruling 3) and HANDOFF.md l.106. The build order (l.272-276) and the four open questions do not mention the maintainer's catalog job. No sentence in the design says whether the tool has a default address; `who` requires `--from`, and `--catalog` is optional.

**Skeptic's better change.** Replace l.174 with: 'Nothing here requires the maintainer to run a catalog; the objective is met when anyone can run the command. A catalog he publishes is one copy among any number. There is no database and no query endpoint. The tool ships with no source or catalog address built in: every lookup names where it starts, so no copy becomes the default.' Add the open question: 'Does the maintainer publish a catalog of his own, on a schedule? Recommended: not until a finder is proven; until then a catalog covers only sources someone named.'

### authority-17: `refers` has no stated extraction rule, the example contradicts the one sentence there is, and digest-shaped values are not all references

Severity: should-fix. Section: A source; The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The rule is one sentence: `refers` lists 'the SAIDs that appear inside a served definition'. It does not say whether that means whole string values, substrings or keys. The example then lists two SAIDs for a document that contains three (it omits the `track` value), so the implementer cannot tell whether the rule is 'every SAID' or 'some pointer fields'. MAD warns twice against treating every digest-looking string as a reference. The case that will bite is Ruling 8: an identity can be filled in on a model, an authorization or an RR, and a KERI identifier has the same 44-character form as a SAID, so a closed RR would be reported as referring to a definition that is really a principal. The walk also says the referring responsibilities 'are the ones that can interoperate', which MAD does not grant: a shared model is necessary, and source acceptance and standing decide the rest.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.95`: **`refers` lists the SAIDs that appear inside a served definition.**
- `/Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json`: "track": "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1",
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.64`: it does not strip every digest-looking string indiscriminately
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.58`: an identity can be filled in on a model, an authorization, an RR, an assembly or a deployment
- `Test: scan of string values in /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/*.json`: SAID-shaped whole string values: 99  inside longer strings: 0  in keys: 0
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md l.72`: standing, source acceptance, disclosure and business conditions determine what a particular actor may actually do

**Reviewer's proposed change.** Replace the `refers` rule with: '`refers` lists every JSON string value in a served definition that is, in full, a 44-character Blake3-256 SAID other than the definition's own. Keys, and SAIDs inside longer strings, are not extracted. The rule is syntactic. It also catches a value of that form that is not a reference to a definition, such as an example value or, once identities are KERI identifiers, a filled-in identity (mad/HANDOFF.md Ruling 8). A report therefore says that a definition contains this identifier at this path; whether that is issuing, relying, nesting or a filled-in identity is for tools that know the kind.' Add the third SAID, `ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1`, to the example's `refers`. In The walk replace 'are the ones that can interoperate over it' with 'are the candidates to interoperate over it'.

**What the skeptic checked.** authority_skeptic.py part G lists the SAID-shaped values in /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json: /outcome/said and /issue/0 hold EGVaGa3k..., /track holds ECru8k3C..., /rely_on/0/said holds EMSaOVmC.... The design's example lists the first and third and omits `track`. The scan over all 36 files reproduces: 99 whole string values, 0 inside longer strings, 0 keys. Verified micro-apps-vision.md l.64 and HANDOFF.md l.58, l.72; note the two 'digest-looking string' warnings are written about category comparison, so they are an analogy here, not a rule about references. `bd show bpm-nq3.7` raises the same identity-pin question for categories.

**Skeptic's better change.** Adopt, with the order and duplicates settled so that builds stay repeatable, and the caveat shortened: '`refers` lists, once each and sorted, every JSON string value in a served definition that is in full a 44-character Blake3-256 SAID other than the definition's own. Keys, and SAIDs inside longer strings, are not extracted. The rule is syntactic: it also catches a value of that form that is not a definition, such as a filled-in identity once identities are KERI identifiers (mad/HANDOFF.md Ruling 8). A report therefore says that a definition contains this identifier at this path; what the reference means is for tools that know the kind.' Add ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1 to the example. In The walk write 'are the candidates to interoperate over it'.

### authority-18: A catalog cannot be enumerated, so the promised 'list of what exists' is not delivered

Severity: should-fix. Section: The catalog. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design's opening says a reference site adds three things, including 'a list of what exists', and that the project supplies all three. The catalog build writes one file per SAID, a list of sources and a build description. A static host has no directory listing, so a reader who holds a catalog's address and no SAID cannot learn what the catalog contains except by fetching every source document again. MAD's catalogs 'search, categorize, recommend' and MAD's own search runs over what it has learned locally; both need something to enumerate. The catalog's layout is also unstated: the example names a `catalog.json`, and nothing says what it holds or how a reader gets from it to the file for a SAID, although for a source the design insists a reader 'never guesses a path'.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.9`: somewhere to read a definition, a way to learn who else uses it, and a list of what exists. This project supplies all three
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.168`: Write static files: one per SAID, one listing every source found and how it was found, and one describing the build
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.76`: Catalogs may search, categorize, recommend, and return introductions; they do not assign the identity of the definitions they describe.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.86`: "catalogs": ["https://gym.example/catalog/catalog.json"]

**Reviewer's proposed change.** Replace step 4 with: 'Write static files: one per SAID; one listing every SAID found, in fixed order, with the number of sources that serve it and the names its publications give it; one listing every source found and how it was found; and the catalog document, which is the file at the catalog's address. The catalog document describes the build (the command, the tool's commit, and the public inputs used, each with its date or snapshot name) and gives templates for the other files, as a source document does, so a reader never guesses a path.' Add after it: 'The list of SAIDs is the list of what exists. A reader downloads it and searches it locally; the catalog answers no queries.'

**What the skeptic checked.** Verified design.md l.9, l.86, l.168, l.170 and micro-apps-vision.md l.76. The only mention of a catalog's own file is the example address `https://gym.example/catalog/catalog.json`; no rule says what that file holds or how a reader gets from it to the file for a SAID, while for a source l.93 insists a reader 'never guesses a path'.

**Skeptic's better change.** Adopt, with one change so the list does not break the design's own rule that every statement is attributed to the source it came from (l.198): 'Write static files: one per SAID; one listing every SAID found, in fixed order, each with the number of source addresses that serve it and the names its publications give it, each name beside the source address it came from; one listing every source found and how it was found; and the catalog document, which is the file at the catalog's address. The catalog document describes the build (the command, the tool's commit, and the public inputs used, each with its date or snapshot name) and gives templates for the other files, as a source document does, so a reader never guesses a path.' Keep the proposed sentence that the list of SAIDs is the list of what exists and that the catalog answers no queries.

### authority-19: Step 5 deploys a public source without saying what it serves; the only content available is test data from a private repository

Severity: should-fix. Section: Build order; Open questions for the maintainer. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Ruling 2 says real MAD content waits on bpm-nq3.1 and bpm-nq3.3 and that gym-bp's frozen documents 'stand in as test data until then'. Step 5 deploys the maintainer's own source and a second origin, and open question 3 asks only where and under which domain. Before bpm-nq3.3 the only documents that exist are gym-bp's: bpm-core documents in a format the workspace plans to evaluate and possibly rewrite, from a repository that is private. The design would put them on a public address, with a robots line, AI Catalog entries and a JSON-LD block written 'so general search engines index it', as the first public example of a MAD source. That is the maintainer's call and the design does not put it to him.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.276`: 5. The maintainer's own source deployed, and a second real origin for a live check.
- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md l.18 (Ruling 2)`: gym-bp's frozen documents stand in as test data until then
- `gh repo view seriouscoderone/gym-bp --json visibility,name`: {"name":"gym-bp","visibility":"PRIVATE"}
- `/Users/seriouscoderone/code/bpm/CLAUDE.md l.192`: Its backlog waits until the MAD UI and model are hardened; then it is evaluated for its conceptual contours and updated or rewritten

**Reviewer's proposed change.** Add an open question: 'What does the first deployed source serve? Until MAD definitions have SAIDs (bpm-nq3.3) the only content is gym-bp's frozen documents. They are test data under Ruling 2, they are bpm-core documents and not MAD definitions, and gym-bp is a private repository. Recommended: run the live check of step 5 with a small set of them chosen by the maintainer, without the robots line, the AI Catalog entries or the JSON-LD block, and announce nothing until the source carries MAD definitions. The alternative is to hold step 5 until bpm-nq3.3.' Change step 5 to: 'The maintainer's own source deployed, and a second real origin for a live check, with the content settled by open question 5.'

**What the skeptic checked.** Verified design.md l.276 and l.294, README.md l.18. Re-ran `gh repo view seriouscoderone/gym-bp --json visibility,name`: {name: gym-bp, visibility: PRIVATE}. The CLAUDE.md quote is at l.191 of /Users/seriouscoderone/code/bpm/CLAUDE.md, not l.192. Nothing in the design says what the deployed source serves.

**Skeptic's better change.** Ask the question, but not with the proposed recommendation. Serving without the robots line and the AI Catalog entries means new build switches, and it removes the two things step 5 exists to prove on a live origin (the finder and the adapter). Text: 'What does the first deployed source serve? Until MAD definitions have SAIDs (bpm-nq3.3) the only content is gym-bp's frozen documents: test data under Ruling 2, bpm-core documents and not MAD definitions, from a private repository. Options: (a) a small set of them that the maintainer picks, served as built, with publications whose descriptions say they are test data; (b) hold step 5 until bpm-nq3.3. Recommended: (a), because the finder and the adapters can only be proven on a live origin.' Change step 5 as proposed.

### authority-20: A source folder and MAD's planned publish bundle are two formats for one thing

Severity: consider. Section: Publications; Open questions for the maintainer. Skeptic: partly; proposed change: reject.

**Problem.** The design says MAD's signed bundle (bpm-nq3.5) and a source 'must agree on what a publication contains' and leaves them as two formats. Both hold the same things: frozen definitions, publications of them and where they came from. MAD's vision already counts a shared file as one way an introduction arrives, and bpm-upm.21 plans to read introductions from imported bundles. The workspace rule prefers one implementation over two that must be kept in agreement. If a bundle were simply a source folder, MAD's import of a bundle and its import of what a walk found would be the same operation, which also closes the hand-off gap in authority-09.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md l.129`: MAD separately plans to publish as a signed bundle that another MAD instance imports (bpm-nq3.5). The two must agree on what a publication contains.
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md l.74`: a link, catalog entry, shared file, or known peer can introduce a document SAID or principal ID together with a candidate location
- `/Users/seriouscoderone/code/bpm/CLAUDE.md (Project status)`: Prefer one clean implementation over two coexisting ones.

**Reviewer's proposed change.** Add an open question: 'Should MAD's publish bundle (bpm-nq3.5) be a source folder? Recommended: yes. A bundle is then the output of `build`, handed over as files instead of served, and MAD imports a bundle and a fetched source the same way. The alternative is two formats that are kept in agreement by hand. Like question 4, the answer is a MAD ruling.' Replace the paragraph at l.129 with a pointer to that question.

**What the skeptic checked.** Verified design.md l.129, micro-apps-vision.md l.74, the 'Prefer one clean implementation' line in CLAUDE.md, and `bd show bpm-nq3.5` (deferred; depends on bpm-nq3.2 and bpm-nq3.3) with its comment ('the two must agree on what a publication record contains').

**Skeptic's better change.** Do not add the open question. It asks the maintainer to rule a deferred MAD bead through this design's approval, which CLAUDE.md l.202 routes to the `mad` label, and the objective does not need it settled now. One sentence does the job: after the authority-13 change, end that paragraph with 'When MAD designs its bundle, a source folder is the candidate format, so that there is one format and not two; that is decided there.' Put the same sentence in a comment on bpm-nq3.5 when the design is revised.

### What the authority reviewer missed

#### authority-s1: The independence from bpm-nq3.1 presumes MAD can serve the exact hashed bytes; under option (b) the authored property order cannot travel in them

Severity: should-fix.

**Problem.** Section: Checking bytes against a SAID. The first reviewer listed the independence claim as sound for reading. It is independent of which order is chosen, but not of the ruling's two options. The design requires that a source serve the serialization the SAID was computed over. Under option (b) of bpm-nq3.1 those bytes are in a canonical order, while MAD keeps the order an author arranged inside the emitted schema. A source then either serves canonical-order bytes, and the authored order is lost to every reader unless some other record carries it (the publication here has no field for it), or serves authored-order bytes, which fail the byte check; verifying those would need MAD's normalization profile, a format dependency Ruling 2 excludes. The design should say what it presumes of the ruling, because it narrows how option (b) can be built.

**Evidence.**

- `
- b
- d
- 
- s
- h
- o
- w
- 
- b
- p
- m
- -
- n
- q
- 3
- .
- 1
- `
- :
- 
- '
- (
- b
- )
- 
- a
- 
- M
- A
- D
- -
- s
- p
- e
- c
- i
- f
- i
- c
- 
- c
- a
- n
- o
- n
- i
- c
- a
- l
- 
- p
- r
- o
- p
- e
- r
- t
- y
- 
- o
- r
- d
- e
- r
- 
- w
- h
- e
- r
- e
- 
- o
- r
- d
- e
- r
- 
- i
- s
- 
- p
- r
- e
- s
- e
- n
- t
- a
- t
- i
- o
- n
- 
- o
- n
- l
- y
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- /
- d
- o
- c
- s
- /
- m
- a
- d
- -
- u
- x
- -
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 8
- 4
- :
- 
- '
- T
- h
- e
- 
- a
- u
- t
- h
- o
- r
- e
- d
- 
- o
- r
- d
- e
- r
- 
- i
- s
- 
- p
- r
- e
- s
- e
- r
- v
- e
- d
- 
- d
- i
- r
- e
- c
- t
- l
- y
- 
- i
- n
- 
- t
- h
- e
- 
- e
- m
- i
- t
- t
- e
- d
- 
- J
- S
- O
- N
- 
- S
- c
- h
- e
- m
- a
- '
- s
- 
- `
- p
- r
- o
- p
- e
- r
- t
- i
- e
- s
- `
- 
- o
- b
- j
- e
- c
- t
- 
- a
- n
- d
- 
- r
- e
- s
- t
- o
- r
- e
- d
- 
- w
- h
- e
- n
- 
- i
- t
- 
- i
- s
- 
- r
- e
- o
- p
- e
- n
- e
- d
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 1
- 1
- 3
- :
- 
- '
- S
- o
- 
- a
- 
- s
- o
- u
- r
- c
- e
- 
- m
- u
- s
- t
- 
- s
- e
- r
- v
- e
- 
- t
- h
- e
- 
- c
- o
- m
- p
- a
- c
- t
- 
- s
- e
- r
- i
- a
- l
- i
- z
- a
- t
- i
- o
- n
- 
- t
- h
- e
- 
- S
- A
- I
- D
- 
- w
- a
- s
- 
- c
- o
- m
- p
- u
- t
- e
- d
- 
- o
- v
- e
- r
- .
- '
- 
- a
- n
- d
- 
- l
- .
- 1
- 1
- 7
- :
- 
- '
- C
- h
- e
- c
- k
- i
- n
- g
- 
- b
- y
- t
- e
- s
- 
- s
- o
- m
- e
- o
- n
- e
- 
- a
- l
- r
- e
- a
- d
- y
- 
- s
- e
- r
- i
- a
- l
- i
- z
- e
- d
- 
- d
- o
- e
- s
- 
- n
- o
- t
- 
- d
- e
- p
- e
- n
- d
- 
- o
- n
- 
- i
- t
- .
- '

**Proposed change.** Add to the last paragraph of the section: 'It presumes one thing of that ruling: that MAD can write out the exact bytes a SAID was computed over. If property order is ruled presentation only (option b), those bytes are in the canonical order, and the order an author arranged has to travel outside the definition; this design carries no such record. Serving authored-order bytes and normalizing before the check would make this tool depend on MAD's format, which Ruling 2 excludes.' When the design is revised, add a comment on bpm-nq3.1 that points here.

#### authority-s2: A copied source document is not told apart from a source, and the `source` field's job is undefined

Severity: should-fix.

**Problem.** Section: A source; What a catalog row may say. The source document states its own address in `source`, and the rules say a source 'is identified by the address of its source document'. Nothing says which address that is when the stated one and the fetched one differ, or what a reader does then. If a reader believes the field, a document can attribute its statements to another address, against l.198. If the reader ignores it, the field does nothing. The case is MAD's mirror: a copy of a source's files at another address carries the same publications, and MAD says mirroring is not an endorsement. With unsigned publications this field is the only place the design can tell a copy from a source, and it does not use it. The first reviewer's 'sound' item on mirrors covers serving bytes only.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 6
- 2
- :
- 
- '
- "
- s
- o
- u
- r
- c
- e
- "
- :
- 
- "
- h
- t
- t
- p
- s
- :
- /
- /
- g
- y
- m
- .
- e
- x
- a
- m
- p
- l
- e
- /
- .
- w
- e
- l
- l
- -
- k
- n
- o
- w
- n
- /
- m
- a
- d
- /
- s
- o
- u
- r
- c
- e
- .
- j
- s
- o
- n
- "
- '
- ;
- 
- l
- .
- 9
- 2
- :
- 
- '
- A
- 
- s
- o
- u
- r
- c
- e
- 
- i
- s
- 
- i
- d
- e
- n
- t
- i
- f
- i
- e
- d
- 
- b
- y
- 
- t
- h
- e
- 
- a
- d
- d
- r
- e
- s
- s
- 
- o
- f
- 
- i
- t
- s
- 
- s
- o
- u
- r
- c
- e
- 
- d
- o
- c
- u
- m
- e
- n
- t
- ,
- 
- n
- o
- t
- 
- b
- y
- 
- a
- 
- d
- o
- m
- a
- i
- n
- .
- '
- ;
- 
- l
- .
- 1
- 9
- 8
- :
- 
- '
- N
- o
- t
- h
- i
- n
- g
- 
- i
- n
- 
- o
- n
- e
- 
- s
- o
- u
- r
- c
- e
- '
- s
- 
- f
- i
- l
- e
- s
- 
- c
- a
- n
- 
- c
- r
- e
- a
- t
- e
- 
- o
- r
- 
- c
- h
- a
- n
- g
- e
- 
- a
- 
- r
- o
- w
- 
- a
- t
- t
- r
- i
- b
- u
- t
- e
- d
- 
- t
- o
- 
- a
- n
- o
- t
- h
- e
- r
- 
- s
- o
- u
- r
- c
- e
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- /
- d
- o
- c
- s
- /
- m
- a
- d
- -
- u
- x
- -
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 6
- 6
- :
- 
- '
- D
- o
- w
- n
- l
- o
- a
- d
- i
- n
- g
- ,
- 
- b
- o
- o
- k
- m
- a
- r
- k
- i
- n
- g
- ,
- 
- i
- n
- d
- e
- x
- i
- n
- g
- 
- o
- r
- 
- a
- u
- t
- o
- m
- a
- t
- i
- c
- a
- l
- l
- y
- 
- m
- i
- r
- r
- o
- r
- i
- n
- g
- 
- i
- t
- 
- d
- o
- e
- s
- 
- n
- o
- t
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- /
- H
- A
- N
- D
- O
- F
- F
- .
- m
- d
- 
- l
- .
- 1
- 0
- 8
- :
- 
- '
- A
- 
- m
- i
- r
- r
- o
- r
- 
- o
- r
- 
- d
- o
- w
- n
- l
- o
- a
- d
- 
- i
- s
- 
- n
- o
- t
- 
- a
- u
- t
- o
- m
- a
- t
- i
- c
- a
- l
- l
- y
- 
- a
- n
- 
- e
- n
- d
- o
- r
- s
- e
- m
- e
- n
- t
- .
- '

**Proposed change.** Add to Rules for a source: '**`source` must equal the address the document was fetched from.** A reader identifies a source by the address it requested. A source document whose `source` names another address is a copy of someone else's files: the reader lists it as unresolved and reads none of its publications or introductions. Copying a source's files therefore does not make a second source. Rebuilding them for a new address does, and that is an intentional act.' Add a walk test: a byte-for-byte copy of one source served from a second origin.

#### authority-s3: `build` is not told each input's SAID or its own address, and reading `d` to find the SAID would be a format assumption

Severity: should-fix.

**Problem.** Section: The tool. `build` takes 'a folder of frozen documents and one configuration file holding publications, introductions and catalogs'. To check a file it needs the expected SAID. The design says the check needs no knowledge of the document's format, and its own outside test vector carries the SAID in `$id`, so the SAID cannot come from a field without the tool acquiring a format, which Ruling 2 excludes. Nothing says where it does come from. The build also writes the source's absolute address into `source`, the `definitions` template, the robots line and the AI Catalog entries, and no input holds that address, so 'Deploying means copying a folder to any static host' is true only for the one address the folder was built for.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 2
- 5
- 3
- :
- 
- '
- M
- a
- k
- e
- s
- 
- a
- 
- s
- o
- u
- r
- c
- e
- 
- f
- r
- o
- m
- 
- a
- 
- f
- o
- l
- d
- e
- r
- 
- o
- f
- 
- f
- r
- o
- z
- e
- n
- 
- d
- o
- c
- u
- m
- e
- n
- t
- s
- 
- a
- n
- d
- 
- o
- n
- e
- 
- c
- o
- n
- f
- i
- g
- u
- r
- a
- t
- i
- o
- n
- 
- f
- i
- l
- e
- 
- h
- o
- l
- d
- i
- n
- g
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- s
- ,
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- 
- a
- n
- d
- 
- c
- a
- t
- a
- l
- o
- g
- s
- .
- '
- ;
- 
- l
- .
- 1
- 0
- 1
- :
- 
- '
- T
- h
- e
- 
- c
- h
- e
- c
- k
- 
- n
- e
- e
- d
- s
- 
- n
- o
- 
- k
- n
- o
- w
- l
- e
- d
- g
- e
- 
- o
- f
- 
- t
- h
- e
- 
- d
- o
- c
- u
- m
- e
- n
- t
- '
- s
- 
- f
- o
- r
- m
- a
- t
- '
- ;
- 
- l
- .
- 1
- 0
- 9
- :
- 
- '
- c
- a
- r
- r
- i
- e
- s
- 
- i
- t
- s
- 
- S
- A
- I
- D
- 
- i
- n
- 
- `
- $
- i
- d
- `
- ,
- 
- n
- o
- t
- 
- `
- d
- `
- '
- ;
- 
- l
- .
- 4
- 4
- :
- 
- '
- D
- e
- p
- l
- o
- y
- i
- n
- g
- 
- m
- e
- a
- n
- s
- 
- c
- o
- p
- y
- i
- n
- g
- 
- a
- 
- f
- o
- l
- d
- e
- r
- 
- t
- o
- 
- a
- n
- y
- 
- s
- t
- a
- t
- i
- c
- 
- h
- o
- s
- t
- .
- '
- 
- `
- l
- s
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- g
- y
- m
- -
- b
- p
- /
- .
- b
- p
- m
- /
- s
- t
- o
- r
- e
- `
- 
- s
- h
- o
- w
- s
- 
- f
- i
- l
- e
- s
- 
- n
- a
- m
- e
- d
- 
- b
- y
- 
- S
- A
- I
- D
- ,
- 
- f
- o
- r
- 
- e
- x
- a
- m
- p
- l
- e
- 
- '
- E
- A
- 5
- 8
- N
- m
- 6
- t
- 6
- H
- o
- M
- U
- E
- B
- J
- I
- r
- P
- N
- P
- o
- Y
- c
- 8
- q
- A
- V
- v
- y
- z
- R
- g
- 5
- X
- Y
- r
- z
- B
- i
- m
- Y
- P
- 9
- .
- j
- s
- o
- n
- '
- .
- 
- b
- p
- m
- -
- c
- o
- r
- e
- '
- s
- 
- v
- e
- r
- i
- f
- y
- _
- s
- a
- i
- d
- 
- o
- n
- 
- t
- h
- e
- 
- G
- L
- E
- I
- F
- 
- f
- i
- l
- e
- 
- a
- n
- s
- w
- e
- r
- s
- 
- '
- m
- i
- s
- s
- i
- n
- g
- 
- d
- '
- 
- (
- r
- u
- n
- 
- d
- u
- r
- i
- n
- g
- 
- t
- h
- i
- s
- 
- r
- e
- v
- i
- e
- w
- )
- .

**Proposed change.** In The tool, after the command table: 'Each input file is named `<SAID>.json`, as bpm-core's store names them. The build takes the expected SAID from the file name and never from a field inside the document. The configuration file also holds the address the source will be served at; a folder is built for one address.' Change l.44 to 'Deploying means copying the folder to the static host it was built for.'

#### authority-s4: Whether a browser must be able to read a source is not decided, and the convention the design copies is not readable from a browser

Severity: should-fix.

**Problem.** Section: A source; Open questions; What waits on other work. The README calls mad-discovery 'the network side' that MAD's Explore and provenance panel consume, and MAD is a browser page with no backend. A page can read a source on another origin only if the host sends a cross-origin header, and static hosts differ: GLEIF's schema, served in the layout the design copies, comes without one, while GitHub Pages sends one. The rules for a source say nothing, and the host recommended in open question 3 (a bucket behind CloudFront) sends none unless configured. MAD's direction is that the command line writes and the page shows, from one store; under that direction the walk always runs in Node and no header is needed. The design should say which, because this is a rule for sources that is hard to add once other parties publish.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- C
- L
- A
- U
- D
- E
- .
- m
- d
- 
- l
- .
- 1
- 9
- 3
- :
- 
- '
- (
- T
- y
- p
- e
- S
- c
- r
- i
- p
- t
- 
- +
- 
- e
- s
- b
- u
- i
- l
- d
- ,
- 
- n
- o
- 
- b
- a
- c
- k
- e
- n
- d
- )
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- /
- H
- A
- N
- D
- O
- F
- F
- .
- m
- d
- 
- l
- .
- 1
- 2
- 4
- :
- 
- '
- A
- 
- U
- I
- 
- e
- d
- i
- t
- 
- g
- o
- e
- s
- 
- w
- h
- e
- r
- e
- 
- t
- h
- e
- 
- C
- L
- I
- 
- w
- r
- i
- t
- e
- s
- ;
- 
- b
- o
- t
- h
- 
- u
- s
- e
- 
- o
- n
- e
- 
- s
- t
- o
- r
- e
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- R
- E
- A
- D
- M
- E
- .
- m
- d
- 
- l
- .
- 3
- 1
- :
- 
- '
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- 
- i
- s
- 
- t
- h
- e
- 
- n
- e
- t
- w
- o
- r
- k
- 
- s
- i
- d
- e
- 
- t
- h
- e
- y
- 
- c
- o
- n
- s
- u
- m
- e
- .
- '
- 
- T
- e
- s
- t
- :
- 
- `
- c
- u
- r
- l
- 
- -
- s
- 
- -
- o
- 
- /
- d
- e
- v
- /
- n
- u
- l
- l
- 
- -
- D
- 
- -
- 
- -
- H
- 
- '
- O
- r
- i
- g
- i
- n
- :
- 
- h
- t
- t
- p
- :
- /
- /
- l
- o
- c
- a
- l
- h
- o
- s
- t
- :
- 8
- 0
- 0
- 0
- '
- 
- h
- t
- t
- p
- s
- :
- /
- /
- w
- w
- w
- .
- g
- l
- e
- i
- f
- .
- o
- r
- g
- /
- .
- w
- e
- l
- l
- -
- k
- n
- o
- w
- n
- /
- o
- o
- b
- i
- /
- E
- B
- f
- d
- l
- u
- 8
- R
- 2
- 7
- F
- b
- x
- -
- e
- h
- r
- q
- w
- I
- m
- n
- K
- -
- 8
- C
- m
- 7
- 9
- s
- q
- b
- A
- Q
- 4
- M
- m
- v
- E
- A
- Y
- q
- a
- o
- /
- i
- n
- d
- e
- x
- .
- j
- s
- o
- n
- `
- 
- r
- e
- t
- u
- r
- n
- s
- 
- '
- H
- T
- T
- P
- /
- 2
- 
- 2
- 0
- 0
- '
- ,
- 
- '
- c
- o
- n
- t
- e
- n
- t
- -
- t
- y
- p
- e
- :
- 
- a
- p
- p
- l
- i
- c
- a
- t
- i
- o
- n
- /
- j
- s
- o
- n
- '
- ,
- 
- '
- c
- o
- n
- t
- e
- n
- t
- -
- l
- e
- n
- g
- t
- h
- :
- 
- 2
- 9
- 3
- 3
- '
- 
- a
- n
- d
- 
- n
- o
- 
- a
- c
- c
- e
- s
- s
- -
- c
- o
- n
- t
- r
- o
- l
- -
- a
- l
- l
- o
- w
- -
- o
- r
- i
- g
- i
- n
- 
- l
- i
- n
- e
- .
- 
- `
- c
- u
- r
- l
- 
- -
- s
- I
- 
- h
- t
- t
- p
- s
- :
- /
- /
- w
- e
- b
- o
- f
- t
- r
- u
- s
- t
- .
- g
- i
- t
- h
- u
- b
- .
- i
- o
- /
- `
- 
- r
- e
- t
- u
- r
- n
- s
- 
- '
- a
- c
- c
- e
- s
- s
- -
- c
- o
- n
- t
- r
- o
- l
- -
- a
- l
- l
- o
- w
- -
- o
- r
- i
- g
- i
- n
- :
- 
- *
- '
- .

**Proposed change.** Add an open question: 'Must a browser be able to read a source? Recommended: no. The walk runs in Node from the command line, and what it finds reaches MAD through the store the command line and the page share (bpm-vfn.1), which is MAD's CLI-first direction. A source then needs no cross-origin header and any static host works. The alternative is a rule that a source sends Access-Control-Allow-Origin: *, which rules out hosts that cannot set headers.' State the chosen answer as one line under Rules for a source.

#### authority-s5: 'Signatures are additive' and 'no step here has to be undone' promise a compatibility the workspace rules out, and pre-set MAD's signed record

Severity: consider.

**Problem.** Section: Publications; Trust. The design says a principal and a signature 'are added later as new fields', that signatures 'are additive' and that 'no step here has to be undone'. That describes the unsigned record living on beside the signed one. The workspace is greenfield: no parallel paths, no fields kept for old readers, and a shape that is wrong is replaced. The wording also fixes the form of MAD's signed publication (new fields on this record), which is bpm-nq3.5's to define. If authority-01, -02 and -13 are adopted the first-cut record is a stopgap description, and the accurate statement is that it is replaced. The same paragraph states as fact that the KERI form 'is an untargeted ACDC'; that mapping is what bpm-upm.26 exists to specify.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- 
- l
- .
- 1
- 2
- 7
- :
- 
- '
- A
- n
- 
- e
- n
- d
- o
- r
- s
- i
- n
- g
- 
- p
- r
- i
- n
- c
- i
- p
- a
- l
- 
- a
- n
- d
- 
- a
- 
- s
- i
- g
- n
- a
- t
- u
- r
- e
- 
- a
- r
- e
- 
- a
- d
- d
- e
- d
- 
- l
- a
- t
- e
- r
- 
- a
- s
- 
- n
- e
- w
- 
- f
- i
- e
- l
- d
- s
- ;
- 
- a
- 
- s
- i
- g
- n
- e
- d
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- 
- i
- s
- 
- a
- 
- n
- e
- w
- 
- r
- e
- c
- o
- r
- d
- 
- w
- i
- t
- h
- 
- a
- 
- n
- e
- w
- 
- S
- A
- I
- D
- .
- '
- ;
- 
- l
- .
- 2
- 4
- 5
- :
- 
- '
- S
- i
- g
- n
- a
- t
- u
- r
- e
- s
- 
- c
- h
- a
- n
- g
- e
- 
- t
- h
- a
- t
- ,
- 
- a
- n
- d
- 
- t
- h
- e
- y
- 
- a
- r
- e
- 
- a
- d
- d
- i
- t
- i
- v
- e
- .
- '
- 
- a
- n
- d
- 
- '
- n
- o
- 
- s
- t
- e
- p
- 
- h
- e
- r
- e
- 
- h
- a
- s
- 
- t
- o
- 
- b
- e
- 
- u
- n
- d
- o
- n
- e
- 
- f
- o
- r
- 
- i
- t
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- C
- L
- A
- U
- D
- E
- .
- m
- d
- ,
- 
- P
- r
- o
- j
- e
- c
- t
- 
- s
- t
- a
- t
- u
- s
- :
- 
- '
- P
- r
- e
- f
- e
- r
- 
- o
- n
- e
- 
- c
- l
- e
- a
- n
- 
- i
- m
- p
- l
- e
- m
- e
- n
- t
- a
- t
- i
- o
- n
- 
- o
- v
- e
- r
- 
- t
- w
- o
- 
- c
- o
- e
- x
- i
- s
- t
- i
- n
- g
- 
- o
- n
- e
- s
- .
- '
- 
- a
- n
- d
- ,
- 
- u
- n
- d
- e
- r
- 
- c
- r
- u
- f
- t
- ,
- 
- '
- s
- c
- h
- e
- m
- a
- 
- o
- r
- 
- m
- o
- d
- e
- l
- 
- f
- i
- e
- l
- d
- s
- 
- k
- e
- p
- t
- 
- o
- n
- l
- y
- 
- t
- o
- 
- s
- a
- t
- i
- s
- f
- y
- 
- o
- l
- d
- 
- r
- e
- a
- d
- e
- r
- s
- ;
- 
- o
- p
- t
- i
- o
- n
- a
- l
- 
- f
- i
- e
- l
- d
- s
- 
- w
- i
- t
- h
- 
- n
- o
- 
- l
- i
- v
- e
- 
- w
- r
- i
- t
- e
- r
- '
- .
- 
- `
- b
- d
- 
- s
- h
- o
- w
- 
- b
- p
- m
- -
- u
- p
- m
- .
- 2
- 6
- `
- :
- 
- '
- r
- e
- s
- e
- a
- r
- c
- h
- 
- a
- n
- d
- 
- s
- p
- e
- c
- i
- f
- y
- 
- h
- o
- w
- 
- a
- 
- f
- u
- t
- u
- r
- e
- 
- a
- d
- a
- p
- t
- e
- r
- 
- s
- u
- p
- p
- l
- i
- e
- s
- 
- .
- .
- .
- 
- A
- C
- D
- C
- 
- f
- o
- r
- 
- g
- r
- a
- n
- t
- s
- 
- a
- n
- d
- 
- a
- t
- t
- e
- s
- t
- a
- t
- i
- o
- n
- s
- '
- .

**Proposed change.** l.127: replace that sentence with 'When MAD's signed publication exists (bpm-nq3.5) it replaces this record; the tool then reads one form, not two.' l.245: replace 'Signatures change that, and they are additive. A publication gains an endorsing principal and a signature by that principal's self-held key;' with 'Signatures change that. A signed publication names its endorsing principal and carries a signature by that principal's self-held key;'. Replace 'The KERI form of such a statement is an untargeted ACDC.' with 'On KERI such a statement would be an untargeted ACDC; the mapping is bpm-upm.26's to specify.' Replace 'no step here has to be undone for it' with 'serving, the walk and the catalog stay as they are; the publication record is replaced'.

<a id="said-check"></a>

## The SAID check: trying to break the byte rule

**Reviewer's summary.** The measurement reproduces exactly (GLEIF schema verifies as served; 36 of 36 gym-bp documents verify compact, 0 as stored; Node agrees), and the rule matches the CESR specification's verification step, bpm-core's encoding and keripy on every real document I could find (67 documents plus KERI events). One thing must change: as written the rule accepts several different files for one SAID, including a file that does not contain the SAID at all, because a run of 44 `#` in the hashed form can come from the SAID or from literal filler. Three refusals (SAID absent, 44 `#` present as served, `#` beside the SAID) make it one-to-one in an exhaustive test and refuse none of the real documents except the category template from KERI/said-test, which holds the filler by design; that limit needs recording against bpm-nq3.7. The build's "re-serialize" step should be whitespace removal only: Node's JSON.parse then JSON.stringify changed the bytes in 14 of 32 cases bpm-core can freeze (integer-like keys, `1.0`, `1e-05`, large integers), the build's own check refused all 14, and whitespace-only removal reproduced the hashed bytes in all 32; no current gym-bp or bpm-core fixture document triggers it. The check must be stated as running on octets, because a text-level implementation (what `fetch().text()` gives) accepted a byte-order-mark variant and four invalid-UTF-8 variants of one document. Five things an implementer would have to guess: the exact SAID syntax (bpm-core's own shape test accepts `E` followed by 43 slashes), what "SAIDs that appear inside" means for `refers` (the design's own example omits one of the three SAIDs in that document), which bytes a publication's `d` is computed over, where `build` and `verify` get the expected SAID, and which Blake3 implementation to use (Node 24 has none). The proposed test vectors never exercise "every occurrence" (each has exactly one) and are all ASCII; a keripy inception event and one non-ASCII keripy document close both gaps. Refusing digest codes other than `E` is safe for what is in the wild: all 9 schemas in GLEIF's OOBI index use `E`. The GLEIF schema fixture can be taken under Apache-2.0 from WebOfTrust/vLEI, where it is the same document; I could not retrieve GLEIF's own site terms. All test scripts are in /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/ and no repository was modified.

**Skeptic's overall verdict.** All twelve findings reproduce when re-run; two are narrower than stated (02 and 05) and none is refuted. Before the maintainer sees the design, the check section must change: make the check one-to-one (01, in the shorter form that rebuilds the served bytes from the hashed form), say it runs on octets, give the exact SAID pattern and its encoding, recover compact bytes by removing whitespace only, define `refers` as a byte scan and correct its example, say where `build` and `verify` get the expected SAID, name a pure-JavaScript Blake3, and widen the test vectors. The first reviewer missed one real gap: the catalog section contradicts itself on which SAIDs get a file, and a file named from a stranger's text replaced a real SAID's file on this Mac's case-insensitive file system. Put two things to the maintainer as questions: whether an unsigned publication carries a SAID at all (recommended: not until it is signed, which removes the only SAID this project would generate before bpm-nq3.1 is ruled), and whether he accepts that a document whose own content holds 44 consecutive `#` cannot be served. Reject said-check-11: the design never applies the byte check to signed statements, and the proposed sentence is false for version 1 ACDCs. My test scripts are in /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-said/ and nothing outside that folder was written.

**What the reviewer found sound as written.**

- The measurement reproduces exactly: GLEIF schema verifies as served (2933 bytes, one occurrence, no trailing newline); gym-bp store 36 documents, 0 verify as stored, 36 verify compact, in Python and in Node.
- The rule is the CESR specification's own verification step (cesr-specification.md:2852-2870 and 2916-2918), so applying it to bytes adds no digest and conforms to Ruling 2.
- bpm-core's CESR encoding (lead zero byte, base64url, first character replaced by E) equals keripy's Matter on 2,003 digests including all-zero and all-0xFF; 33 bytes encode to 44 characters with no padding; bpm-core's test golden EKITsBR9... equals keripy's Saider output.
- SAIDs containing '-' and '_' need no special handling: 16 of the 36 gym-bp SAIDs contain '-', 17 contain '_', 6 contain both, and all verify.
- KERI events with a version string that carries the byte length verify (keripy rotation and interaction events); a 43-character filler fails, so the 44-character filler is right for code E.
- KERI inception events where `i` equals `d` verify under 'replace every occurrence', in JSON (KERI v1 and v2) and in keripy's CESR-native serialization; replacing one occurrence fails.
- A SAID field not named `d` needs no handling: the GLEIF schema and six keripy-written schemas with `$id` verify.
- Refusing digest codes other than E is safe for KERI schemas in the wild: all 9 schemas (and 3 identifiers) in GLEIF's OOBI index are code E; documents saidified with F, H, I and 0D fail closed.
- The build's check fails closed: all 14 Node re-serializations that differed from the hashed bytes were refused and none that differed verified.
- No document in gym-bp (36 store files, 55 authored files) or bpm-core's fixtures (58 files, plus 11 frozen from a scratch copy of the sitting fixture) has a float, an integer-like key or an integer above 2^53, so none fails Node's round trip today.
- Unicode escapes, U+2028, U+2029, U+007F, control characters, escaped solidus, astral characters, duplicate keys, `__proto__` and the empty key serialize to the same bytes in Python and Node; Python cannot freeze a lone surrogate at all.
- Checking served bytes is independent of the property-order ruling bpm-nq3.1, as the design says: the check never serializes a definition.
- In gym-bp every reference is a whole string value (99 positions), every referenced SAID is in the store, no document repeats its own SAID outside `d`, and there is no SAID-shaped string that is not a reference.
- The store keeps only a pretty-printed copy (catalog.py:674, 1200) and its key order is already the normalized order for all 36 documents, so recovering the compact bytes needs no knowledge of bpm-core's normalization.

### said-check-01: The rule accepts several different files for one SAID, including one that does not contain the SAID

Severity: must-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The rule verifies any bytes whose replaced form hashes to the SAID. A run of 44 `#` in that form can come from the SAID or from literal `#` in the file, so more than one file passes for one SAID. A file with the filler where the SAID belongs passes although the SAID is nowhere in it. A file with the SAID where a filler belongs passes too. A 45-`#` run gives a third variant (SAID then `#`, or `#` then SAID). bpm-core refuses all of these because it checks that `d` holds the result. This contradicts "two parties holding the same SAID hold the same definition" and the Trust table's "These bytes have this SAID". Any author can do it to their own document. Anyone can do it to a document that honestly holds the filler, and such documents are planned: a category template (bpm-nq3.7) blanks each reference with the same 44 `#`. Three refusals close it. In an exhaustive test over 6,098 byte strings only the three together left one file per SAID. They refuse none of the 67 real documents tested except the category template.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t1_rule_vs_bpmcore.py /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/gleif/qvi.json`: doc EA58Nm6t6HoMUEBJIrPNPoYc8qAVvyzRg5XYrzBimYP9: occurrences of SAID in template bytes: 0 / byte rule accepts template: True / bpm-core verify_said accepts template: False
- `same command, section C`: b1 d=SAID, rely_on=[####]: byte rule True | b2 d=SAID, rely_on=[SAID]: byte rule True | b3 d=####, rely_on=[SAID]: byte rule True ... distinct byte strings accepted for one SAID: 3
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t14_injective.py`: as written (no guard) ... most files for one SAID: 52 | SAID occurs exactly once ... most files for one SAID: 10 | at least once + no 44-# run + SAID not next to # ... replaced forms shared by more than one file: 0 | most files for one SAID: 1
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t9_category.py /Users/seriouscoderone/code/KERI/said-test/categories/EBh_z08ssfHyQxr8J2VppI23h4r-aOqnFL5oilMs7ZmV.json`: literal 44-# runs in its content: 1 / honest compact bytes, byte rule: True / forged (one filler swapped for the category's own SAID), byte rule: True | bytes differ: True
- `bd show bpm-nq3.7 (run from /Users/seriouscoderone/code/bpm)`: A category SAID is the SAID of a document with every point-by-SAID reference blanked the way its own SAID field is
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t18_guard_corpus.py (two arguments: the scratch sitting store and qvi.json)`: gym-bp store 36 files | rule as written accepts 36 | guarded rule accepts 36 ... said-test category template 1 files | rule as written accepts 1 | guarded rule accepts 0 ... keripy icp, JSON, i == d ... guarded rule accepts 1
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:32`: if doc["d"] != expected:

**Reviewer's proposed change.** Replace the blockquote with: "Take the bytes as served. Refuse them if they do not contain the expected SAID, if they contain 44 consecutive `#` characters, or if any occurrence of the SAID has a `#` directly before or after it. Otherwise replace every occurrence of the SAID with 44 `#` characters, compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID." Add after it: "The three refusals make the check one-to-one: at most one byte string passes for a given SAID. Without them a file that holds the filler where the SAID belongs, or the SAID where the filler belongs, passes too. The cost is that a document whose own content holds 44 consecutive `#` is refused, because telling its SAID field from its content needs knowledge of its format. Category templates (bpm-nq3.7) are such documents: they blank each reference with the same filler." In "What waits on other work" replace the last row with: "| Finding similar, not identical, definitions; serving category templates | Structural category (bpm-nq3.7, bpm-upm.23), plus a check that knows the SAID field or a different filler for blanked references |". In Tests add three failing cases: the filler in place of the SAID; the SAID in place of a filler; the SAID with a `#` beside it.

**What the skeptic checked.** Re-ran the four cited scripts (t1_rule_vs_bpmcore.py, t14_injective.py, t9_category.py, t18_guard_corpus.py) with the cited arguments. Every quoted line reproduced: a file with zero occurrences of the SAID is accepted; three different files pass for one SAID; over 6,098 strings the rule as written allows up to 52 files per SAID and the three refusals allow 1; the guarded rule accepts 36 gym-bp, 11 sitting, 6 and 13 said-test documents, the GLEIF schema and the inception event, and refuses only the category template. bpm-core/src/bpm_core/said.py:32 and the bpm-nq3.7 text are as quoted. Two things the finding does not say. First, the damage is bounded: files accepted for one SAID can differ only where the hashed form has a run of 44 or more `#`, so for a document with its SAID once and no such run the only other accepted file is the one with the SAID blanked. Second, bpm-nq3.7 is deferred and calls a category SAID "a classification key, not an integrity commitment"; it does not say templates are served through a source, although /Users/seriouscoderone/code/KERI/said-test/categories/ does hold one in a file named by its SAID.

**Skeptic's better change.** Keep the fix in a shorter form that is also one-to-one, and drop the edit to "What waits on other work".

Replace the blockquote with: "Take the bytes as served. They must contain the expected SAID. Replace every occurrence of it with 44 `#` characters to get the hashed form. Compute the Blake3-256 digest of the hashed form and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID and if putting the SAID back in place of every run of 44 `#` in the hashed form, left to right, gives the served bytes exactly."

Add after it: "The last condition makes the check one-to-one: the served bytes can be rebuilt from what was hashed, so one byte string passes for a SAID. Without it a file that holds the filler where the SAID belongs passes too, and so does one that holds the SAID where its content has the filler. The cost is that a document whose own content holds 44 consecutive `#` cannot be served, because telling its SAID field from its content needs knowledge of its format. A category template (bpm-nq3.7) is such a document; it is derived from a definition, not served as one."

In Tests add failing cases: the filler in place of the SAID; a document whose content holds 44 `#`; `#` then the SAID where the hashed form has 45 `#`.

Why this form: it is one comparison instead of three refusals. Over the same 6,098 strings it leaves one file per hashed form, accepts everything the three refusals accept (0 exceptions) and also a SAID followed by `#`, which the three refusals refuse for no gain. It accepts the same real documents and refuses the category template and every forged variant. Commands: /Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-said/k1_roundtrip.py ("round trip + SAID present accepted 1123 | most files for one hashed form: 1 ... accepted by three refusals but not round trip: 0") and the same interpreter on /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-said/k3_roundtrip_corpus.py with the scratch sitting store and qvi.json ("gym-bp store 36 files | round-trip check accepts 36 ... category template 1 files | accepts 0 ... d=filler rely_on=[SAID] False ... note=#+SAID False"). The proposed new row in "What waits on other work" designs deferred work (a field-aware check or a second filler for bpm-nq3.7) inside this document; the one sentence of cost is enough.

### said-check-02: The sentence comparing the byte rule with bpm-core is wrong for one of the documents tested

Severity: should-fix. Section: Checking bytes against a SAID. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design says the byte rule and `said.py` "agree whenever a document contains its own SAID only in its SAID field, which holds for every document tested". They disagree on the GLEIF schema, which is one of the documents tested: `said.py` refuses it for having no `d`, and the byte rule accepts it. They also disagree on a KERI inception event, where keripy fills both `d` and `i`. And "the workspace's SAID rule" for a store file is not raw `said.py`: bpm-core's loader reorders fields to the kind's template first, so it accepts a store file whose keys are out of order while the byte rule refuses its bytes. None of this is unsafe. The byte rule is the CESR specification's own verification step and gives the right answer in each case. The sentence should say what is true.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B -c "...verify_said(json.load(open(qvi.json)))" over /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/gleif/qvi.json`: has top-level d: False / bpm-core verify_said on the GLEIF QVI schema: refuses: missing d
- `/Users/seriouscoderone/code/KERI/said-test/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t17_icp_json.py (keripy 2.1.0-dev0)`: SAID: EI_s3UUbwqCFZCrgFF4d-Cr6kW0bMI5ORjZtizM53rPs | occurrences: 2 | bytes: 299 ... every occurrence replaced -> verifies: True | first occurrence only -> verifies: False
- `t1_rule_vs_bpmcore.py, section G (command as in said-check-01)`: keys reversed: verify_document (normalizing) True | byte rule on compact bytes False
- `/Users/seriouscoderone/code/KERI/keri-claude/scripts/markdown/cesr-specification.md:2916-2918`: replace the SAID in the string with dummy characters of the same length, compute the [Blake3](#BLAKE3) digest as SAID of this dummied version, and then compare the SAIDs.

**Reviewer's proposed change.** Replace the paragraph that starts "This is the workspace's SAID rule" with: "This is the verification step of the CESR specification (replace the SAID with filler of the same length, hash, compare). `bpm-core/src/bpm_core/said.py` applies it to a parsed document; this project applies it to bytes. The two agree for a document that carries its SAID once, in a top-level `d`: all 36 gym-bp documents. The byte check also accepts what `said.py` refuses for want of a `d`: a KERI schema, whose SAID field is `$id`, and a KERI inception event, whose SAID fills both `d` and `i`. It is stricter than bpm-core's store loader, which puts fields in the kind's template order before checking: served bytes must already be in that order."

**What the skeptic checked.** Ran bpm-core's verify_said on /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/gleif/qvi.json ("has top-level d: False ... refuses: missing d"). Re-ran t17_icp_json.py with the KERI/said-test interpreter (two occurrences; every occurrence replaced verifies, first only does not). Re-ran t1 section G (keys reversed: verify_document True, byte rule False). Read /Users/seriouscoderone/code/KERI/keri-claude/scripts/markdown/cesr-specification.md:2854-2869 and :2916-2918.

**Skeptic's better change.** Correct the sentence in four sentences, without the inception event and the store loader, which are not about served MAD definitions: "This is the CESR specification's SAID verification (put `#` filler where the SAID is, hash, encode, compare), applied to served bytes wherever the SAID occurs. `bpm-core/src/bpm_core/said.py` applies the same step to a parsed document's `d` field. For a document that holds its SAID once, in `d`, and no run of 44 `#`, the two give the same answer: all 36 gym-bp documents. The byte check also covers what `said.py` cannot read, such as a KERI schema whose SAID field is `$id`."

### said-check-03: Re-serializing with JSON.parse and JSON.stringify cannot reproduce the hashed bytes for whole classes of documents; remove whitespace instead

Severity: should-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt.

**Problem.** The frozen store keeps only a pretty-printed copy, so the build has to recover the compact bytes. The design says it "re-serializes its inputs when needed" and reports Node's JSON.parse then JSON.stringify as working. It works for the 36 gym-bp documents and fails in general. Of 32 awkward documents that bpm-core can freeze, Node's round trip changed the bytes of 14: integer-like keys move to the front (taking `d` out of first place), and `1.0`, `100.0`, `1e-05`, `1e-07`, `1e+16`, `-0.0`, integers above 2^53 and `Infinity` are rewritten or refused. The build's own check refused all 14, so nothing wrong reaches a reader, but the publisher is left with a definition that cannot be published and no instruction. Removing the whitespace between JSON tokens, without parsing any value, reproduced the hashed bytes in all 32 cases and for every real pretty-printed file tried (36 gym-bp, 11 frozen from a scratch copy of bpm-core's sitting fixture, 19 keripy-written, and the vLEI repository's copy of the GLEIF schema). No document in gym-bp or bpm-core's fixtures triggers the failure today: none has a float, an integer-like key or a large integer. Unicode escapes, U+2028, U+007F, duplicate keys and `__proto__` came out the same in both languages.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/catalog.py:674 and :1200`: json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=False) + "\n",
- `python -I -B .../design-review/t4_cases.py .../design-review/out && node .../design-review/t4_cases.mjs .../design-review/out (full prefix /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad)`: 32 cases Python could freeze | JSON.parse+JSON.stringify differs from the hashed bytes: 14 | whitespace-only minify differs: 0
- `same run, case "int-like keys"`: python: {"d":"EOfix0im8IJini6Il_SpOrg-iG5IyJdcErO5YEew-8u1","b":1,"10":2,"2":3,"a":4} / node: {"2":3,"10":2,"d":"EOfix0im8IJini6Il_SpOrg-iG5IyJdcErO5YEew-8u1","b":1,"a":4}
- `same run, case "0.00001 (multipleOf-style)"`: python: ..."multipleOf":1e-05} / node: ..."multipleOf":0.00001}
- `python -I -B .../design-review/t4_check.py .../design-review/out`: node output differs from hashed bytes: 14 | refused by the byte check: 14 | differing output that still verified: 0
- `node .../design-review/t13_strip_thirdparty.mjs (four arguments as in the script header)`: vLEI repo QVI (pretty) -> whitespace-only minify equals bytes GLEIF serves: true / bpm-core sitting fixture, frozen copy: 11 files | verify after whitespace-only minify: 11
- `python -I -B .../design-review/t5_scan.py over gym-bp/.bpm/store, gym-bp, bpm-core/tests/fixtures`: == gym-store: 36 JSON files ... int_like_key: 0 / float: 0 / big_int: 0

**Reviewer's proposed change.** Replace the paragraph that starts "So a source must serve the compact serialization" with: "So a source must serve the compact serialization the SAID was computed over. The frozen store keeps only a pretty-printed copy, so the build recovers the compact bytes without interpreting them. An input that verifies as given is copied byte for byte. Otherwise the build removes the whitespace between JSON tokens, leaves every string and number exactly as written, and checks the result. It never parses a document and writes it out again, because that changes bytes: JavaScript moves integer-like keys to the front and rewrites numbers such as `1.0`, `1e-05` and integers above 2^53. A file that still fails is refused by name and nothing is written for it. The check runs on every file the build is about to write, so a difference is caught on the publisher's machine and never reaches a reader." In the measured list replace the second bullet with: "All 36 of gym-bp's frozen documents verify once their whitespace is removed, in Python and in Node."

**What the skeptic checked.** Re-ran t4_cases.py into my own folder, then t4_cases.mjs and t4_check.py: "32 cases Python could freeze | JSON.parse+JSON.stringify differs from the hashed bytes: 14 | whitespace-only minify differs: 0" and "refused by the byte check: 14 | differing output that still verified: 0". The integer-like-key and `1e-05` byte strings match the quotes. Re-ran t7_node_bytes.mjs ("gym-bp store in Node: 36 files | verify as stored: 0 | after whitespace-only minify: 36") and t13_strip_thirdparty.mjs (vLEI repository copy with whitespace removed equals the bytes GLEIF serves: true; 11, 6 and 13 files verify). My own scan, /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-said/k2_scan.py, found no float, integer-like key or integer above 2^53 in gym-bp's 36 store files, its 55 authored files or bpm-core's 58 fixture files. bpm-core/src/bpm_core/catalog.py:674 and :1200 are as quoted. The whitespace step is safe on UTF-8: the bytes for space, tab, line feed, carriage return, quote and backslash never occur inside a multi-byte character, and the one non-ASCII keripy document verified after it.

### said-check-04: Say the check runs on octets; a check on decoded text accepts several byte strings for one SAID

Severity: should-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** "Take the bytes as served" is right, but Node has no byte-level replace-all, so the natural implementation decodes to text, replaces, and encodes again. That is also what `fetch().text()` gives. Decoding drops a leading byte-order mark and turns each invalid UTF-8 byte into U+FFFD. A text-level check therefore accepted a byte-order-mark copy of a real gym-bp document, and accepted four different invalid-byte variants of one document, all under one SAID. The same files fail a byte-level check. The design should state the level so the one-to-one property does not depend on which API the implementer reaches for.

**Evidence.**

- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t7_node_bytes.mjs /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/gleif/qvi.json`: -- a UTF-8 byte-order mark in front of otherwise correct bytes / on bytes: false | via TextDecoder (what fetch().text() does): true | via Buffer.toString("utf8"): false
- `same run`: variant 0 (byte 0xff): on bytes false | TextDecoder true | toString true | JSON.parse of decoded text succeeds: true ... distinct byte strings a text-level check accepts for this one SAID: 5

**Reviewer's proposed change.** Add after the rule: "The check runs on octets: the response body once any content encoding is removed, or a file read as binary. It never runs on decoded text. Decoding drops a leading byte-order mark and turns each invalid UTF-8 byte into U+FFFD, so a check on text accepts several byte strings for one SAID. In Node that means reading with `arrayBuffer()`, never `text()` or `json()`, and replacing within the buffer." In Tests add two failing cases: a leading byte-order mark; an invalid UTF-8 byte where the hashed form has U+FFFD.

**What the skeptic checked.** Re-ran t7_node_bytes.mjs with the cited arguments. Byte-order mark in front of a real gym-bp document: "on bytes: false | via TextDecoder (what fetch().text() does): true". Four invalid-byte variants: "on bytes false | TextDecoder true | toString true". The byte-order-mark case applies to every document. The invalid-byte case needs a document whose hashed form already holds U+FFFD, as the test constructs.

**Skeptic's better change.** Keep the rule and both tests; leave out the sentence naming Node calls, which "never on decoded text" already rules out and which belongs in the implementation plan. Add after the rule: "The check runs on octets: a file read as binary, or a response body once any content encoding is removed. It never runs on decoded text, because decoding drops a leading byte-order mark and turns each invalid UTF-8 byte into U+FFFD, so several byte strings would pass for one SAID." In Tests add two failing cases: a leading byte-order mark; an invalid UTF-8 byte where the hashed form has U+FFFD.

### said-check-05: Define the exact SAID syntax; "44 characters starting with E" admits path separators

Severity: should-fix. Section: Terms; Checking bytes against a SAID. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design defines a SAID as "44 characters starting with `E`". bpm-core implements exactly that shape test, and it accepts `E` followed by 43 slashes. In this project a SAID read from a stranger's source document, or found inside a stranger's definition, goes into an address (the `definitions` template), into file names (the catalog writes one file per SAID, including SAIDs that are only referred to; the walk keeps a folder keyed by SAID) and into pages. A canonical Blake3-256 SAID is narrower: `E`, then one of `A` to `P` (the two pad bits are zero), then 42 base64url characters. keripy refuses anything else, and bpm-core's encoding matched keripy's on 2,003 digests. A string outside that pattern can never equal a computed SAID, so refusing it early loses nothing. The design also does not say how "another code" is told from "not a SAID".

**Evidence.**

- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/ids.py:15-16`: return isinstance(token, str) and len(token) == 44 and token.startswith("E")
- `/Users/seriouscoderone/code/KERI/said-test/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t10_cesr.py`: bpm-core ids.is_said shape (len 44, starts with E) accepts 'E' + '/'*43: True
- `same run`: second char Q (a pad bit set) EQAAAAAAAAAA... keripy refuses: ConversionError: Nonzero midpad bytes=0x01.
- `same run`: bpm-core encoding equals keripy Matter(code=E).qb64 on 2003 digests: 2003
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:197`: A row is keyed by the SAID computed from bytes the build fetched and checked, never by a SAID a document merely states.

**Reviewer's proposed change.** In Terms, replace the SAID row's meaning with: "The definition's identifier: a Blake3-256 digest of its content, CESR-encoded. Exactly 44 characters: `E`, then one of `A` to `P`, then 42 from `A-Z a-z 0-9 - _` (`^E[A-P][A-Za-z0-9_-]{42}$`). The workspace's rule; this project adds no other digest." In "Checking bytes against a SAID" replace the paragraph that starts "Only Blake3-256 SAIDs" with: "Only Blake3-256 SAIDs are accepted: strings that match the pattern in Terms. Every SAID taken from a command line, a source document, a catalog or the inside of a definition is tested against that pattern before it goes into an address, a file name or a page; a string that fails is not a SAID and is dropped. A 44-character string starting `F`, `G`, `H` or `I`, or an 88-character one starting `0D` to `0G`, is one of KERI's other digest codes and is reported as unsupported. SAIDs are compared as exact strings; there is one text form."

**What the skeptic checked.** Read bpm-core/src/bpm_core/ids.py:15-16 (as quoted). Re-ran t10_cesr.py with the KERI/said-test interpreter: encoding equal on 2003 of 2003 digests; `E` plus 43 slashes passes bpm-core's shape test; second character `Q` refused by keripy. Confirmed the digest codes in /Users/seriouscoderone/code/KERI/keripy/src/keri/core/coring.py:239-243 and :266-269 (E to I, 0D to 0G). The second character can only be A to P: all-0xFF digest encodes to `EP______...`.

**Skeptic's better change.** Adopt the pattern and the test-before-use rule; state the encoding; replace the list of other codes with one clause, which removes the unspecified difference between "another code" and "not a SAID".

Terms, SAID row: "The definition's identifier: the Blake3-256 digest of its content in CESR text form. Exactly 44 characters: `E`, then one of `A` to `P`, then 42 of `A-Z a-z 0-9 - _` (`^E[A-P][A-Za-z0-9_-]{42}$`). The workspace's rule; this project identifies definitions by no other digest."

In "Checking bytes against a SAID", after the rule: "Encoding: put one zero byte in front of the 32-byte digest, write the 33 bytes as base64url without padding, and replace the first character with `E`."

Replace the paragraph that starts "Only Blake3-256 SAIDs" with: "A string is a SAID here only if it matches the pattern in Terms. Every SAID taken from a command line, a source document, a catalog or the inside of a definition is tested against it before it goes into an address, a file name or a page. Anything else, including KERI's other digest codes, is dropped and reported as unsupported. SAIDs are compared as exact strings; there is one text form."

### said-check-06: `refers` is not defined, and the design's own example leaves out one of the three SAIDs in that document

Severity: should-fix. Section: A source; The walk; The catalog; Trust. Skeptic: confirmed; proposed change: adopt.

**Problem.** The design says `refers` lists "the SAIDs that appear inside a served definition" and the catalog build must "Extract the SAIDs that appear inside". It does not say whether that means whole string values, object keys, or SAIDs inside longer strings, or whether the definition's own SAID counts. The example cannot settle it: the real document EIjETqo6... holds three other SAIDs and the example lists two, omitting the one in `track`. In gym-bp every reading gives the same answer: 99 reference positions, all whole string values, all resolving inside the store, no SAID-shaped string that is not a reference. Elsewhere the readings differ. bpm-core's frozen RRs carry SAIDs as object keys (`see[].on`). GLEIF's OOBI index holds 12 identifiers only as object keys and inside address strings, so a whole-value reading finds none. keripy resolves a schema `$ref` by taking the text after the last colon, so a SAID can sit inside a longer `$ref`. And an appearance is not always a reference: the GLEIF schema carries the SAIDs of two of its own nested blocks. A byte-level definition is deterministic, needs no parsing, and is the same operation on the publisher's and the reader's side.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:66-67`: "refers": ["EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
- `/Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json:10`: "track": "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1",
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t19_refers.py (gym store, qvi.json, gleif/oobi_index.json)`: gym-bp store: 36 documents | both readings give the same set: 36 ... GLEIF OOBI index: whole-value reading finds 0 SAID-shaped identifiers | as object keys: 12 | token scan of the bytes: 12
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/catalog.py:370-373`: `rows_keys` (`see[].on`) is special: only the mapping's KEYS are pointers
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B .../design-review/t11_freeze_copy.py /Users/seriouscoderone/code/bpm/bpm-core/tests/fixtures/sitting .../design-review/out/sitting (freezes a scratch copy only)`: rr claim-settled EBf9vzE4Lt2K5pyXKEyhkuYSbLcoePXokwRa-5h0c3Sg: SAIDs as whole string values: 5 | SAIDs as object keys: 1
- `/Users/seriouscoderone/code/KERI/keripy/src/keri/core/scheming.py:67-68`: idx = uri.rindex(":") / key = uri[idx+1:]
- `/Users/seriouscoderone/code/KERI/said-test/.venv/bin/python -I -B .../design-review/t2_rule_vs_keripy.py .../scratchpad/gleif/qvi.json`: nested $id values in the QVI schema: [('/properties/a/oneOf/1', 'ELGgI0fkloqKWREXgqUfgS0bJybP1LChxCO3sqPSFHCj'), ('/properties/r/oneOf/1', 'ECllqarpkZrSIWCb97XlMpEZZH3q4kc--FQ9mbkFMb_5')]

**Reviewer's proposed change.** Replace the `refers` rule with: "**`refers` lists every SAID that appears in a served definition's bytes, other than its own.** A SAID appears wherever the bytes hold 44 characters that match the SAID pattern with no base64url character directly before or after them. That covers a SAID that is a whole string value, an object key (bpm-core's `see[].on` keys are SAIDs once frozen) or part of a longer string such as an address. The list holds each SAID once, sorted. It lets a reader ask 'which definitions here refer to X' without fetching every definition. It is a claim until the reader fetches the referring definition, checks its bytes and finds the SAID in them by the same scan. An appearance is not always a reference: a KERI schema carries the SAIDs of its own nested blocks, and a self-addressing KERI identifier has the same shape." In the example, make `refers` `["ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1", "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]`. In the catalog's step 3 replace "Extract the SAIDs that appear inside." with "Scan the checked bytes for SAIDs as `refers` defines." In the walk's report replace "with the path of the reference inside them (verified)" with "(verified), with the path of each appearance when the bytes parse as JSON". In the Trust table replace "This definition contains a reference to that SAID." with "This definition's bytes contain that SAID."

**What the skeptic checked.** Read /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json: line 8 holds EGVaGa3k..., line 10 `track` holds ECru8k3C..., line 13 holds EMSaOVmC...; design.md:67 lists two of the three. Re-ran t19_refers.py (both readings agree on 36 of 36 gym-bp documents; GLEIF index: whole-value 0, keys 12, byte scan 12) and t6_refs.py (99 reference positions, none dangling, own SAID repeated 0 times). Read bpm-core/src/bpm_core/catalog.py:370-373 and keripy/src/keri/core/scheming.py:67-68, both as quoted. Extra support the reviewer did not cite: the frozen sitting RR EBf9vzE4... holds SAIDs inside kind-prefixed strings such as "fact:EGGICVuamcKEF_vvxZQH-fwUeV6j2FG4sSc9Qlz1GtMH", which a whole-value reading also misses and the byte scan finds (/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-said/k4_prefixed.py with the scratch sitting store).

### said-check-07: A publication's `d` is "computed by the same rule", but that rule checks bytes and a publication has none of its own

Severity: should-fix. Section: Publications; Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The byte rule checks bytes somebody already serialized. A publication is an object inside `source.json`, written by this project's build from a configuration file, so its `d` has to be generated, and the design gives no serialization: no field order, no statement that it is compact, nothing on absent fields. Two builds that order the fields differently give one publication two SAIDs, which defeats the stated purpose ("Copies of one publication on several sources are then recognizably one publication"). A reader cannot apply the byte rule either, because the publication has no served bytes of its own; it must write the object out again. The design also does not say that a reader checks `d` at all; if it does not, any source can attach another publication's `d` to different content. The claim that the check "is independent of the unmade property-order ruling" holds for definitions and not for this one SAID that the project itself generates. The fix is small because every field is a string: Python and Node wrote identical bytes for a strings-only record over all 1,112,064 Unicode scalar values. One mismatch with MAD needs stating, since the design says the fields are MAD's: MAD's `Publication` holds `tags` as one string and the design's example holds an array.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:124`: `d` is the publication's own SAID, computed by the same rule.
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts:45`: export interface Publication { name: string; description: string; tags: string; collection: string; target: string; targetId: string; endorser: string;
- `python -I -B .../design-review/t15_strings.py .../design-review/out/allchars.json && node .../design-review/t15_strings.mjs .../design-review/out/allchars.json (prefix /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad)`: JSON.parse+JSON.stringify of a strings-only record reproduces Python's bytes for every Unicode scalar value: true | bytes 7719979
- `/Users/seriouscoderone/code/bpm/bpm-core/tests/test_said.py:27-30`: def test_key_order_changes_said():

**Reviewer's proposed change.** In Publications replace the `d` bullet with: "`d` is the publication's own SAID. It is computed over the publication written as compact JSON in UTF-8 (no whitespace, non-ASCII characters unescaped) with exactly these fields in this order: `d`, `target`, `name`, `description`, `tags`, `collection`. `tags` is an array of strings and every other value is a string; `d` holds 44 `#` while hashing. Because every value is a string, JavaScript and Python write the same bytes for the same record. A reader writes each publication it reads the same way, in the order the fields arrived, and runs the byte check against its `d`. A publication that fails is reported and is not counted as a copy of any other. The build copies a publication taken from another source unchanged. Copies of one publication on several sources are then recognizably one publication, as MAD's design requires." Add to the paragraph on bpm-nq3.5: "MAD's `Publication` holds `tags` as one string today; the bundle takes the array form." In "Checking bytes against a SAID" add to the last paragraph: "A publication's `d` is the one SAID this project generates; its field order is fixed in Publications." Add to open question 4: "and its field order".

**What the skeptic checked.** design.md:124 and mad/src/views.ts:45 are as quoted (`tags: string`; the type also has `endorser`, `kind` and `components`). bpm-core/tests/test_said.py:27-30 is the key-order test. Re-ran t15_strings.py and t15_strings.mjs into my own folder: identical bytes for all 1,112,064 scalar values, 7,719,979 bytes. Also read mad/docs/mad-ux-design.md:66: "Multiple copies of one signed publication do not multiply its endorsement." That sentence is about signed publications.

**Skeptic's better change.** Put the choice to the maintainer in open question 4 and recommend the smaller option: no `d` on a publication until it is signed.

Recommended text. In Publications delete the `d` bullet and the `"d": "E..."` line of the example, and add: "A publication has no SAID of its own yet. It is unsigned, so it is known by the source address it was fetched from and its target, and the same fields at two addresses are two claims. It gets a SAID together with its endorsing principal and signature (bpm-nq3.5), serialized by MAD's rule (bpm-nq3.1, bpm-nq3.3). 'Multiple copies of one signed publication do not multiply its endorsement' applies from then." Change "a signed publication is a new record with a new SAID" to "a signed publication carries its own SAID". Open question 4 becomes: "Recommended: MAD's existing fields, unsigned and without a SAID until signed. The alternative is a SAID now, which fixes a field order here before bpm-nq3.1 is ruled."

Reasons. The design already says an unsigned publication is attributed only to its source address and that signing makes a new record with a new SAID, so nothing relies on the unsigned `d` and it is thrown away. It is the only SAID this project would generate, which needs a field order fixed here before bpm-nq3.1 and a generator before bpm-nq3.3. Without it, "This check is independent of the unmade property-order ruling" is true with no exception.

If he wants the SAID now, the first reviewer's text is the right fallback (fixed order, all values strings, a reader re-serializes and checks).

Either way keep the note that MAD's `Publication` holds `tags` as one string while the design shows an array, and say that MAD's type also has `endorser`, `kind` and `components`, which the design leaves out.

### said-check-08: `build` and `verify` do not say where the expected SAID comes from

Severity: should-fix. Section: The tool. Skeptic: confirmed; proposed change: adopt.

**Problem.** The check takes an expected SAID and needs no knowledge of the format, so it cannot find the SAID inside the document: gym-bp documents carry it in `d`, the GLEIF schema in `$id`. `build <folder>` must learn each input's SAID from somewhere, and `verify <file or address> [SAID]` makes the SAID optional without saying what happens when it is left out. An implementer has to guess, and the obvious guess (read `d`) fails on the design's own KERI vector. bpm-core's store already names each file by its SAID.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:254`: | `verify <file or address> [SAID]` | Runs the byte check. |
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/catalog.py:1200`: _write_json(store / f"{said}.json", frozen)
- `/private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/gleif/qvi.json (first bytes)`: {"$id":"EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao","$schema":"http://json-schema.org/draft-07/schema#"

**Reviewer's proposed change.** Replace the `build` row's text with: "Makes a source from a folder of frozen documents and one configuration file holding publications, introductions and catalogs. Each input is named `<SAID>.json`, as bpm-core's store names them; the file name is the expected SAID and a file with any other name is refused. Checks every output file against its SAID." Replace the `verify` row's text with: "Runs the byte check. Without the SAID argument it takes the SAID from the file name, or from the address when exactly one path segment is a SAID, and stops otherwise. It does not look for one inside the document, which would need the name of the SAID field."

**What the skeptic checked.** design.md:253-254 give `build` no source for the expected SAID and make it optional for `verify`. bpm-core/src/bpm_core/catalog.py:1200 names store files `{said}.json`. The GLEIF schema starts {"$id":"EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao", and has no top-level `d` (checked with bpm-core's verify_said: "refuses: missing d"), so reading `d` fails on the design's own KERI vector.

### said-check-09: Node has no Blake3; name the implementation, and it must bundle into MAD's browser file

Severity: should-fix. Section: The tool. Skeptic: confirmed; proposed change: adopt.

**Problem.** The design says the package uses "the same Node, TypeScript and test runner as `mad/`". Node 24's crypto offers no Blake3, and `mad/` has no hashing dependency, so the check cannot be built from what the design names. The choice is constrained by the design's own plan: the check moves into MAD's shared library, and MAD ships as one bundled file for the browser, so a native add-on or a separate WebAssembly file does not fit. A pure-JavaScript Blake3 exists and reproduced every vector: with `@noble/hashes` 1.8.0 (MIT, already installed elsewhere on this machine; nothing was installed for this review) the 36 gym-bp documents and the GLEIF schema all verified in Node.

**Evidence.**

- `node -e "const c=require('crypto'); console.log(c.getHashes().filter(h=>/blake/i.test(h)))" (Node v24.19.0)`: [ 'blake2b512', 'blake2s256' ]
- `/Users/seriouscoderone/code/bpm/mad/package.json:15-17`: "dependencies": { "@marcbachmann/cel-js": "8.0.0" }
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t7_node_bytes.mjs (arguments as in said-check-04)`: gym-bp store in Node: 36 files | verify as stored: 0 | after whitespace-only minify: 36 ... GLEIF QVI as served, Node byte rule: true

**Reviewer's proposed change.** Add to "The tool", after the first sentence: "Node's built-in crypto has no Blake3, so the package takes one dependency for it: a pure-JavaScript implementation such as `@noble/hashes`, pinned to an exact version as `mad/` pins its dependencies. It must be pure JavaScript because the same check moves into MAD's shared library and MAD ships as one bundled file for the browser."

**What the skeptic checked.** node -e "const c=require('crypto'); console.log(c.getHashes().filter(h=>/blake/i.test(h)))" on Node v24.19.0 prints [ 'blake2b512', 'blake2s256' ]. /Users/seriouscoderone/code/bpm/mad/package.json:15-17 has one dependency, pinned exactly; a search of mad/src found no hashing code. The @noble/hashes copy the reviewer used is version 1.8.0, MIT (its package.json), and with it t7_node_bytes.mjs verified 36 of 36 gym-bp documents and the GLEIF schema.

### said-check-10: The outside vectors never test "every occurrence", non-ASCII text or the refusals

Severity: should-fix. Section: Tests. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Every proposed passing vector contains its SAID exactly once: the GLEIF schema once, and none of the 36 gym-bp documents more than once. An implementation that replaces only the first occurrence passes all of them, and that is the default in JavaScript: `String.prototype.replace` with a string pattern replaces one occurrence. All 55 gym-bp JSON files and the GLEIF schema are pure ASCII, so a mistake in UTF-8 handling or escaping passes too. The list of failing cases has nothing for the guard in said-check-01, the octet rule in said-check-04 or the syntax in said-check-05. The Tests section also does not say which bytes are committed: the store's pretty copies fail the check as stored, so something has to produce the compact form, and if the code under test produces it the whitespace step has no outside expected output. Outside vectors for each gap exist locally and none is generated by the code under test.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/said_bytes_check.py .../scratchpad/gleif/qvi.json /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store`: GLEIF QVI schema as served: True | occurrences of own SAID: 1 ... documents containing their own SAID more than once: 0
- `/Users/seriouscoderone/code/KERI/said-test/.venv/bin/python -I -B .../design-review/t17_icp_json.py`: {"v":"KERI10JSON00012b_","t":"icp","d":"EI_s3UUbwqCFZCrgFF4d-Cr6kW0bMI5ORjZtizM53rPs","i":"EI_s3UUbwqCFZCrgFF4d-Cr6kW0bMI5ORjZtizM53rPs","s":"0", ... first occurrence only -> verifies: False
- `node -e "console.log('aXbX'.replace('X','#'), 'aXbX'.replaceAll('X','#'))"`: a#bX | replaceAll = a#b#
- `python -I -B .../design-review/t5_scan.py "gym-bp-all=/Users/seriouscoderone/code/bpm/gym-bp" and "gym-store=..."`: == gym-store: 36 JSON files | files with non-ASCII bytes: 0
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B .../design-review/t8_saidtest.py /Users/seriouscoderone/code/KERI/said-test`: non-ASCII file ELjkD_vuKDX04K0TW6WRtRw2tud_irH_S4yW28r5I2h8.json: as stored False | compact True | escaped (ensure_ascii=True) False

**Reviewer's proposed change.** Replace the first Tests bullet with: "**SAID check against outside vectors.** No expected value and no passing input is generated by the code under test. Passing: gym-bp's 36 frozen documents, each committed twice, as the store's pretty copy and as the compact bytes Python hashed (`json.dumps(doc, separators=(",", ":"), ensure_ascii=False)`), so the whitespace step has an outside expected output; one KERI schema written by KERI's tooling, with its SAID in `$id`; one keripy-written document with non-ASCII text, because gym-bp's are all ASCII; one keripy-written inception event whose SAID fills both `d` and `i`, the only vector that tells replace-every from replace-first; and documents frozen by bpm-core that hold an integer-like key, `1.0`, `1e-05` and an integer above 2^53, for the whitespace step. Failing: one byte changed, a wrong SAID, pretty-printed bytes, a trailing newline, a leading byte-order mark, an invalid UTF-8 byte, the filler in place of the SAID, the SAID in place of a filler, the SAID with `#` beside it, a 44-character string containing `/`, and one SAID of each unsupported code (`F`, `H`, `I`, `0D`). A frozen document cannot drift from its SAID, so the copies stay valid."

**What the skeptic checked.** Re-ran said_bytes_check.py ("occurrences of own SAID: 1 ... documents containing their own SAID more than once: 0"). My scan k2_scan.py: 0 files with non-ASCII bytes among gym-bp's 36 store and 55 authored files and the GLEIF schema; 1 among said-test's 13 instances. Re-ran t17_icp_json.py: the inception event holds its SAID twice and "first occurrence only -> verifies: False". Node: 'aXbX'.replace('X','#') gives a#bX, replaceAll gives a#b#. `git -C /Users/seriouscoderone/code/bpm/gym-bp check-ignore -v .bpm/store` confirms the store is ignored, so the pretty copies fail as stored and something must produce compact bytes.

**Skeptic's better change.** Same vectors, aligned with the modified forms of findings 01, 05 and 12. Replace the first Tests bullet with: "**SAID check against outside vectors.** No expected value and no passing input is produced by the code under test. Passing: gym-bp's 36 frozen documents, each as the store's pretty copy and as the compact bytes Python hashed, so the whitespace step has an outside expected output; GLEIF's schema, as the vLEI repository's pretty copy and as served, with its SAID in `$id`; one keripy-written document with non-ASCII text, because the others are all ASCII; one keripy-written inception event whose SAID fills both `d` and `i`, the only vector that tells replace-every from replace-first; documents saidified by bpm-core that hold an integer-like key, `1.0`, `1e-05` and an integer above 2^53, for the whitespace step. Failing: one byte changed, a wrong SAID, pretty-printed bytes, a trailing newline, a leading byte-order mark, an invalid UTF-8 byte where the hashed form has U+FFFD, the filler in place of the SAID, a document whose content holds 44 `#`, and two strings that do not match the SAID pattern (one with `/`, one with another digest code). A frozen document cannot drift from its SAID, so the copies stay valid."

### said-check-11: The byte check does not carry over to ACDCs served expanded, which the Trust section names as the later form

Severity: consider. Section: Trust: what is verified, observed and claimed. Skeptic: confirmed; proposed change: reject.

**Problem.** The design says the check "needs no knowledge of the document's format" and later that the KERI form of a signed statement is an untargeted ACDC. For ACDC version 2 the top-level SAID is computed over the most compact variant, with each nested section replaced by its own SAID and the version string sized for that variant. An expanded ACDC therefore does not hash to its own `d`. Built with keripy 2.1.0-dev0: a version 1 ACDC (the form vLEI credentials use today) verified by the byte rule, a version 2 ACDC did not, and each one's attribute section verified alone against its own `d`. ACDCs are not MAD definitions, so nothing in the first cut is wrong. One sentence keeps a later reader from assuming the check extends to signed statements. KERI events are fine: the rule verified keripy inception, rotation and interaction events, including the byte length carried in the version string.

**Evidence.**

- `/Users/seriouscoderone/code/KERI/said-test/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t3_acdc.py`: == ACDC v1 ... byte rule: expanded bytes as serialized vs top-level d: True ... == ACDC v2 ... byte rule: expanded bytes as serialized vs top-level d: False
- `/Users/seriouscoderone/code/KERI/keripy/src/keri/core/serdering.py:3028 and :3047`: csad[l] = said  # assign said as compaction ... # use size from most compact raw so stable said as most compact
- `/Users/seriouscoderone/code/KERI/keri-claude/scripts/markdown/acdc-specification.md:740-744`: The SAID of the "most compact form" can be computed by a depth-first search.

**Reviewer's proposed change.** Add after "The KERI form of such a statement is an untargeted ACDC.": "The byte check does not extend to that form unchanged. An ACDC's SAID is computed over its most compact variant, so an ACDC served expanded does not hash to its own `d`; checking signed statements uses KERI's own verification."

**What the skeptic checked.** Re-ran t3_acdc.py with the KERI/said-test interpreter (keripy 2.1.0-dev0): ACDC version 1 expanded bytes verify against the top-level `d` (True); version 2 do not (False); the attribute section alone verifies against its own `d` in both. keripy/src/keri/core/serdering.py:3028 and :3047 and acdc-specification.md:740-744 are as quoted.

**Skeptic's better change.** Leave the Trust section as it is. The design never applies the byte check to signed statements; it defers them to bpm-upm.25 and bpm-upm.26, where their verification will be designed. The proposed sentence is also too broad: it says an expanded ACDC does not hash to its own `d`, and the same test shows a version 1 ACDC, the form vLEI credentials use today, does. If the fact should be kept, record it as a note on bpm-upm.26, limited to version 2.

### said-check-12: Fixtures: protect the exact bytes, and take the GLEIF schema from its Apache-2.0 repository

Severity: consider. Section: Tests. Skeptic: confirmed; proposed change: adopt.

**Problem.** Two practical points about "copied in as fixtures". First, a compact fixture has no final newline (the GLEIF schema is served without one), and a line-ending conversion or an editor that adds a final newline breaks the check with no change in meaning. gym-bp's store is gitignored, so the copies in this repository will be the only committed ones and cannot be re-copied from a clone. Second, licensing of the GLEIF schema. The saved copy came from `www.gleif.org`; I could not retrieve GLEIF's site terms (the address I tried returned 404), so I cannot say what they allow. The same document is in the `WebOfTrust/vLEI` repository, which GitHub reports as Apache-2.0: it carries the same SAID, and removing its whitespace gives exactly the bytes GLEIF serves. Taking the fixture from there, with attribution, settles the question without relying on the site's terms. The keripy-written vectors proposed in said-check-10 are either the maintainer's own (KERI/said-test) or produced by running Apache-2.0 keripy.

**Evidence.**

- `git -C /Users/seriouscoderone/code/bpm/gym-bp check-ignore -v .bpm/store`: .bpm/.gitignore:1:*	.bpm/store
- `gh api repos/WebOfTrust/vLEI/license --jq '{spdx: .license.spdx_id, name: .license.name, path: .path}'`: {"name":"Apache License 2.0","path":"LICENSE","spdx":"Apache-2.0"}
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/t12_qvi_repo.py .../design-review/dl-vlei/qvi-repo.json .../scratchpad/gleif/qvi.json`: repo copy $id: EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao | same SAID as served: True ... repo copy, compact re-serialization, equals served bytes: True | verifies: True
- `/private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/said_bytes_check.py output`: bytes: 2933 | trailing newline: False

**Reviewer's proposed change.** Add a Tests bullet: "**Fixture handling.** Fixtures are committed as binary (`-text` in `.gitattributes`) and kept out of any formatter, so no tool converts line endings or adds a final newline; a compact fixture has none. gym-bp's store is gitignored, so these copies are the only committed ones. The KERI schema is GLEIF's Qualified vLEI Issuer schema taken from `WebOfTrust/vLEI` (Apache-2.0, `schema/acdc/qualified-vLEI-issuer-vLEI-credential.json`), whose bytes with whitespace removed equal what `www.gleif.org` serves; the fixture folder carries that attribution."

**What the skeptic checked.** `git -C /Users/seriouscoderone/code/bpm/gym-bp check-ignore -v .bpm/store` prints ".bpm/.gitignore:1:*" and no file under .bpm is tracked. `gh api repos/WebOfTrust/vLEI/license` returns Apache-2.0, and the contents call for schema/acdc/qualified-vLEI-issuer-vLEI-credential.json returns size 4372, the size of the saved copy. Re-ran t12_qvi_repo.py: same SAID, "compact re-serialization, equals served bytes: True", and the repository copy is pretty-printed and does not verify as stored. The served file is 2933 bytes with no trailing newline. I did not check GLEIF's site terms.

### What the said-check reviewer missed

#### Which SAIDs get a catalog file is contradictory, and a file named from a stranger's text collides on case-insensitive file systems

Severity: should-fix.

**Problem.** Section "The catalog". Step 4 writes "one per SAID" and says each file lists the definitions that refer to it, which implies a file for a SAID that is only referred to. "What a catalog row may say" says a row is keyed only by a SAID computed from fetched bytes. An implementer has to guess. If referred-only SAIDs or publication targets get files, the file name is a string a stranger wrote. SAIDs are case-sensitive base64url; the default macOS and Windows file systems are not. A stranger's definition that contains a letter-case variant of a real SAID (the variant matches the strict pattern) makes the build write a second name that is the same file. The maintainer's Linux CI would not show it; a reader who runs the same command on a Mac gets a different catalog with a real SAID's row replaced, which breaks "repeatable" and "nothing in one source's files can create or change a row attributed to another source". SAIDs the build computed itself cannot be made to collide this way.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 6
- 8
- 
- "
- W
- r
- i
- t
- e
- 
- s
- t
- a
- t
- i
- c
- 
- f
- i
- l
- e
- s
- :
- 
- o
- n
- e
- 
- p
- e
- r
- 
- S
- A
- I
- D
- "
- ;
- 
- :
- 1
- 7
- 0
- 
- "
- T
- h
- e
- 
- f
- i
- l
- e
- 
- f
- o
- r
- 
- a
- 
- S
- A
- I
- D
- 
- l
- i
- s
- t
- s
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- t
- h
- r
- e
- e
- 
- t
- h
- i
- n
- g
- s
- 
- a
- s
- 
- t
- h
- e
- 
- w
- a
- l
- k
- '
- s
- 
- r
- e
- p
- o
- r
- t
- .
- "
- ;
- 
- :
- 1
- 9
- 7
- 
- "
- A
- 
- r
- o
- w
- 
- i
- s
- 
- k
- e
- y
- e
- d
- 
- b
- y
- 
- t
- h
- e
- 
- S
- A
- I
- D
- 
- c
- o
- m
- p
- u
- t
- e
- d
- 
- f
- r
- o
- m
- 
- b
- y
- t
- e
- s
- 
- t
- h
- e
- 
- b
- u
- i
- l
- d
- 
- f
- e
- t
- c
- h
- e
- d
- 
- a
- n
- d
- 
- c
- h
- e
- c
- k
- e
- d
- ,
- 
- n
- e
- v
- e
- r
- 
- b
- y
- 
- a
- 
- S
- A
- I
- D
- 
- a
- 
- d
- o
- c
- u
- m
- e
- n
- t
- 
- m
- e
- r
- e
- l
- y
- 
- s
- t
- a
- t
- e
- s
- .
- "
- 
- T
- e
- s
- t
- 
- o
- n
- 
- t
- h
- i
- s
- 
- m
- a
- c
- h
- i
- n
- e
- 
- (
- A
- P
- F
- S
- )
- ,
- 
- i
- n
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- s
- a
- i
- d
- /
- c
- a
- s
- e
- f
- s
- :
- 
- w
- r
- o
- t
- e
- 
- E
- G
- V
- a
- G
- a
- 3
- k
- b
- b
- 3
- -
- t
- g
- 3
- Z
- 7
- l
- j
- 2
- Q
- 9
- u
- r
- X
- x
- S
- 7
- 1
- H
- N
- Z
- k
- D
- 3
- s
- I
- T
- 9
- 9
- f
- -
- N
- B
- .
- j
- s
- o
- n
- ,
- 
- t
- h
- e
- n
- 
- E
- G
- V
- a
- G
- a
- 3
- k
- b
- b
- 3
- -
- t
- g
- 3
- Z
- 7
- l
- j
- 2
- Q
- 9
- u
- r
- X
- x
- S
- 7
- 1
- H
- N
- Z
- k
- D
- 3
- s
- I
- T
- 9
- 9
- f
- -
- N
- b
- .
- j
- s
- o
- n
- ;
- 
- `
- l
- s
- `
- 
- s
- h
- o
- w
- s
- 
- o
- n
- e
- 
- f
- i
- l
- e
- 
- a
- n
- d
- 
- `
- c
- a
- t
- `
- 
- o
- f
- 
- t
- h
- e
- 
- f
- i
- r
- s
- t
- 
- n
- a
- m
- e
- 
- p
- r
- i
- n
- t
- s
- 
- "
- r
- o
- w
- 
- w
- r
- i
- t
- t
- e
- n
- 
- f
- o
- r
- 
- a
- 
- c
- a
- s
- e
- 
- v
- a
- r
- i
- a
- n
- t
- 
- f
- o
- u
- n
- d
- 
- i
- n
- 
- a
- 
- s
- t
- r
- a
- n
- g
- e
- r
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- "
- .
- 
- n
- o
- d
- e
- 
- -
- e
- 
- "
- c
- o
- n
- s
- o
- l
- e
- .
- l
- o
- g
- (
- /
- ^
- E
- [
- A
- -
- P
- ]
- [
- A
- -
- Z
- a
- -
- z
- 0
- -
- 9
- _
- -
- ]
- {
- 4
- 2
- }
- $
- /
- .
- t
- e
- s
- t
- (
- '
- E
- G
- V
- a
- G
- a
- 3
- k
- b
- b
- 3
- -
- t
- g
- 3
- Z
- 7
- l
- j
- 2
- Q
- 9
- u
- r
- X
- x
- S
- 7
- 1
- H
- N
- Z
- k
- D
- 3
- s
- I
- T
- 9
- 9
- f
- -
- N
- b
- '
- )
- )
- "
- 
- p
- r
- i
- n
- t
- s
- 
- t
- r
- u
- e
- .

**Proposed change.** In "The catalog" step 4 replace "one per SAID" with "one per SAID whose bytes the build fetched and checked, and one file, keyed by SAID in sorted order, for SAIDs that are only referred to or only named as a publication target, each with the definitions that refer to it and the publications that name it". Add to "What a catalog row may say": "No file name comes from a stranger's text. File names are SAIDs the build computed, so a definition that contains a letter-case variant of another SAID cannot overwrite that SAID's file on a file system that ignores case (the macOS and Windows defaults)." In "The walk" replace "Fetched definitions are kept in a local folder keyed by SAID" with "Definitions that passed the check are kept in a local folder under the SAID they hashed to". In Tests, Catalog, add: "A definition that contains a case variant of another definition's SAID leaves that definition's file unchanged."

#### Say what the design needs from MAD's export: the exact hashed bytes of each definition

Severity: consider.

**Problem.** Sections "Checking bytes against a SAID" and "What waits on other work". The check passes only for the serialization the SAID was computed over. The test data hides a difference: a gym-bp document carries its name inside the hashed bytes, while MAD's rule keeps names outside the committed definition so that renaming does not change the SAID. If MAD's export file carries display names or other annotations beside the committed content, no MAD definition will verify at a source. The waiting row says only "an export of them", so whoever builds bpm-nq3.3 has to guess what this project needs.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- /
- d
- o
- c
- s
- /
- m
- i
- c
- r
- o
- -
- a
- p
- p
- s
- -
- v
- i
- s
- i
- o
- n
- .
- m
- d
- :
- 5
- 8
- 
- "
- L
- o
- c
- a
- l
- 
- d
- i
- s
- p
- l
- a
- y
- 
- n
- a
- m
- e
- s
- 
- a
- n
- d
- 
- c
- a
- t
- a
- l
- o
- g
- 
- a
- n
- n
- o
- t
- a
- t
- i
- o
- n
- s
- 
- c
- a
- n
- 
- r
- e
- m
- a
- i
- n
- 
- o
- u
- t
- s
- i
- d
- e
- 
- t
- h
- e
- 
- c
- o
- m
- m
- i
- t
- t
- e
- d
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- ,
- 
- w
- h
- i
- l
- e
- 
- i
- t
- s
- 
- f
- i
- e
- l
- d
- s
- ,
- 
- c
- o
- n
- s
- t
- r
- a
- i
- n
- t
- s
- ,
- 
- a
- n
- d
- 
- r
- e
- f
- e
- r
- e
- n
- c
- e
- s
- 
- s
- t
- a
- y
- 
- i
- n
- s
- i
- d
- e
- .
- "
- 
- `
- b
- d
- 
- s
- h
- o
- w
- 
- b
- p
- m
- -
- n
- q
- 3
- .
- 3
- `
- 
- (
- f
- r
- o
- m
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- )
- :
- 
- "
- r
- e
- p
- l
- a
- c
- e
- 
- p
- r
- o
- t
- o
- t
- y
- p
- e
- 
- s
- t
- r
- i
- n
- g
- 
- i
- d
- s
- 
- w
- i
- t
- h
- 
- S
- A
- I
- D
- s
- 
- a
- n
- d
- 
- k
- e
- e
- p
- 
- n
- a
- m
- e
- s
- 
- a
- s
- 
- a
- t
- t
- r
- i
- b
- u
- t
- e
- d
- 
- a
- l
- i
- a
- s
- e
- s
- "
- 
- a
- n
- d
- 
- "
- r
- e
- n
- a
- m
- i
- n
- g
- 
- a
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- 
- k
- e
- e
- p
- s
- 
- i
- t
- s
- 
- S
- A
- I
- D
- "
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- g
- y
- m
- -
- b
- p
- /
- .
- b
- p
- m
- /
- s
- t
- o
- r
- e
- /
- E
- I
- j
- E
- T
- q
- o
- 6
- C
- w
- K
- d
- j
- L
- K
- i
- U
- b
- v
- e
- 9
- 7
- 7
- o
- l
- j
- 9
- 2
- n
- u
- h
- B
- o
- y
- 4
- N
- P
- y
- w
- p
- q
- D
- 1
- U
- .
- j
- s
- o
- n
- :
- 4
- 
- "
- a
- l
- i
- a
- s
- "
- :
- 
- "
- p
- a
- i
- d
- -
- a
- d
- m
- i
- s
- s
- i
- o
- n
- "
- 
- (
- i
- n
- s
- i
- d
- e
- 
- t
- h
- e
- 
- h
- a
- s
- h
- e
- d
- 
- b
- y
- t
- e
- s
- )
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 8
- 4
- 
- "
- S
- A
- I
- D
- s
- 
- f
- o
- r
- 
- M
- A
- D
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- s
- 
- a
- n
- d
- 
- a
- n
- 
- e
- x
- p
- o
- r
- t
- 
- o
- f
- 
- t
- h
- e
- m
- 
- (
- b
- p
- m
- -
- n
- q
- 3
- .
- 1
- ,
- 
- t
- h
- e
- n
- 
- b
- p
- m
- -
- n
- q
- 3
- .
- 3
- )
- "
- .

**Proposed change.** In "What waits on other work" replace the first row's right-hand cell with: "SAIDs for MAD definitions and an export that writes, for each definition, exactly the bytes its SAID was computed over (bpm-nq3.1, then bpm-nq3.3). A file that also carries display names or other annotations MAD keeps outside the committed definition will not verify; those travel in publications."

#### "This project adds no other digest" contradicts the sha-256 the AI Catalog entries carry

Severity: consider.

**Problem.** Sections "Terms" and "AI Catalog entries". Terms says the project adds no other digest. The AI Catalog section has the build write a sha-256 digest for every served definition. Ruling 2 dropped sha2-256 hashing from the draft spec, so a reader can take line 219 as bringing it back. The sha-256 there identifies nothing in this project; the Terms sentence is wider than what is meant.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 5
- 
- "
- T
- h
- e
- 
- w
- o
- r
- k
- s
- p
- a
- c
- e
- '
- s
- 
- r
- u
- l
- e
- ;
- 
- t
- h
- i
- s
- 
- p
- r
- o
- j
- e
- c
- t
- 
- a
- d
- d
- s
- 
- n
- o
- 
- o
- t
- h
- e
- r
- 
- d
- i
- g
- e
- s
- t
- .
- "
- ;
- 
- :
- 2
- 1
- 9
- 
- "
- t
- h
- e
- 
- s
- h
- a
- -
- 2
- 5
- 6
- 
- d
- i
- g
- e
- s
- t
- 
- t
- h
- a
- t
- 
- f
- o
- r
- m
- a
- t
- 
- r
- e
- q
- u
- i
- r
- e
- s
- ,
- 
- a
- n
- d
- 
- t
- h
- e
- 
- S
- A
- I
- D
- 
- u
- n
- d
- e
- r
- 
- a
- n
- 
- e
- x
- t
- e
- n
- s
- i
- o
- n
- 
- k
- e
- y
- "
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- R
- E
- A
- D
- M
- E
- .
- m
- d
- :
- 1
- 8
- 
- "
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- 
- d
- e
- f
- i
- n
- e
- s
- 
- n
- o
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- 
- f
- o
- r
- m
- a
- t
- 
- a
- n
- d
- 
- n
- o
- 
- d
- i
- g
- e
- s
- t
- 
- o
- f
- 
- i
- t
- s
- 
- o
- w
- n
- .
- 
- D
- r
- o
- p
- p
- e
- d
- 
- f
- r
- o
- m
- 
- t
- h
- e
- 
- d
- r
- a
- f
- t
- 
- s
- p
- e
- c
- :
- 
- t
- h
- e
- 
- D
- C
- R
- 
- g
- r
- a
- p
- h
- 
- f
- o
- r
- m
- a
- t
- ,
- 
- C
- I
- D
- v
- 1
- 
- s
- h
- a
- 2
- -
- 2
- 5
- 6
- 
- h
- a
- s
- h
- i
- n
- g
- 
- o
- v
- e
- r
- 
- J
- C
- S
- "
- .

**Proposed change.** In Terms replace "this project adds no other digest" with "this project identifies definitions by no other digest" (the modified text for said-check-05 already does). In "AI Catalog entries" add after the first sentence: "The sha-256 is a field of that format, computed over the same served bytes; nothing here is identified or looked up by it."

<a id="finders"></a>

## Finders: measuring the robots line and the certificate label

**Reviewer's summary.** Both finders were measured on 2026-11-09 and both work mechanically, but neither meets the objective alone, and the design should say so. The robots line is cheap and repeatable: Common Crawl's October 2026 crawl publishes 100,000 robots.txt WARC files (0.15 TiB compressed, about 378 GB unpacked), free over HTTPS with no account. A 1% sample (1,000 files) took 42 s to download and 5 to 39 s to scan, and found 18 hosts carrying ARD's `Agentmap:` line, 14 of which still serve it; a full scan is 1 to 3 hours and fits one free CI job if streamed. Its flaw is coverage: Common Crawl only visits hosts it reached through links, so 0 of 40 GitHub Pages sites created in March 2026, 1 of 40 created in March 2024 and 0 of 39 unlinked `mta-sts.` hosts were in the crawl, against 23 of 60 custom-domain project sites. The certificate label is the only candidate that sees a host nobody linked. crt.sh's public PostgreSQL answered a leading-label query with 7,721 unexpired `openpgpkey.` names in 75 s, though its web form cannot, a large label timed out, one connection in eleven was refused, and the database was 19 days behind. A wildcard certificate hides the label (4 of 6 subdomain hosts sampled), and a publisher needs a domain. Recommendation: build the certificate label finder first and the robots finder second, and have a source emit both signals from the start (a `mad-source.<domain>` host with an exact-name certificate, and a `Mad-Source: <absolute https address>` line in any robots.txt its operator controls). The design should state coverage and delay per finder: 3 days to about 7 weeks for the robots line, about three weeks for crt.sh as measured, and nothing but introductions for a source under a path on a shared host. It should claim the stranger case only once a build that is given neither address lists two unlinked real origins. Test scripts and results are in /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/ (scan_robots.py, scan2.py, cdx_lookup.py, stream1.sh, scan1000.json).

**Skeptic's overall verdict.** Every count behind the robots finding reproduced (0 of 40, 1 of 40, 0 of 39, and 23 of 60 captures of which 18 were readable), so the design must stop saying the robots line covers parties who never linked and must state its reach: hosts Common Crawl already captures, 3 days to 7 weeks late, with about a fifth of them missing from any one crawl. The first reviewer's replacement should not be adopted: certificate label first, with a crt.sh query written into the design, rests on a database that stopped updating on 2026-10-20, held under half of the previous five weeks' names, gave two answers 17 minutes apart, and whose operator announced in May 2026 that the index the query uses will be replaced. The honest position is that no finder measured lists a new, unlinked source by a route that is free, repeatable and not one company's search. The design should keep the robots finder first because it is the only repeatable one whose analog worked end to end, add a finder contract (read all input or stop, one candidate per robots.txt, named crawls, a fixture in the real WARC shape), define "proven" as a build given neither address listing both, and leave the host label out of the source rules. Put three questions to the maintainer. First, whether that reach is enough for a first cut. Second, what covers new hosts: a `mad-source.` host name with a paid certificate search at €49 a month, GitHub repository search (one company's index, but it listed repositories under a minute old), or nothing yet. Third, whether a build that finds more candidates than its limit stops or visits a stated subset. My scripts and outputs are in /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-finders/ (myscan.py, robots_lookup.py, scan200.json, hist-3.out, san.out, p39.out, p34.out).

**What the reviewer found sound as written.**

- "The finder is a plug-in, so the choice can change without touching sources that already carry the line": holds; both emissions are independent of which finder reads them.
- Common Crawl stores robots.txt bodies whole with unknown lines intact: Agentmap, LLM-Content and Schemamap lines were recovered verbatim; only 144 of 856,437 responses were truncated, at 5 MiB.
- A host that disallows CCBot, including through Cloudflare's managed robots.txt, is still in the archive: 3,682 such hosts in the 1% sample, and 291 of 669 Cloudflare-managed files kept the site's own lines after the managed block.
- The robots scan fits a free CI job: 0.15 TiB streamed with no disk in 1 to 3 hours against a 6-hour job limit, with no account and no charge.
- The proposed names are unused today: no `Mad-Source:` line on 671,949 sampled hosts, and no certificate in crt.sh with first label `mad-source`.
- "Until a finder is proven, the catalog covers only what is reachable by introductions": the right default, and stating it in the build description is the honest position.
- Code search "Needs a token": confirmed; an unauthenticated request returns 401.
- Let's Encrypt's limits do not constrain a publisher: 50 certificates per registered domain per 7 days, and one host name needs one.

### finders-01: The robots line cannot find a host nobody linked, which is the case this section exists for

Severity: must-fix. Section: Finding sources nobody linked. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Common Crawl reaches a host only by following links from pages it already crawled, samples by rank, and takes no submissions. The robots finder therefore finds only sources whose host somebody already linked and that ranks high enough to be sampled. Measured against the October 2026 crawl: none of 40 live GitHub Pages user sites created in March 2026, 1 of 40 created in March 2024, none of 39 `mta-sts.` hosts that nothing links to, and 23 of 60 custom-domain project sites. With this finder first, the catalog would not list the maintainer's own new source or a second origin on GitHub Pages, and the live check in build step 5 could not pass. The certificate label is the only measured candidate that sees a host regardless of links, but it has its own gaps (finders-03). No single finder meets the objective, and the design's recommendation and its claim at line 40 should say that.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:189`: the robots line first. It costs a source one line, robots.txt is the most widely served file of its kind, and an open archive already collects it.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:40`: It covers the case the walk cannot: two parties who never linked to each other.
- `https://commoncrawl.org/faq`: Can I add my website to Common Crawl? Common Crawl's dataset is a sample of the web ... The bot may have found your pages by following links from other sites.
- `https://groups.google.com/g/common-crawl/c/ive_DA2HmcU (Sebastian Nagel, 2024-10-05)`: it's a stratified sample, registered domains used as strata, the domain's harmonic centrality rank defines the sample size for each domain.
- `python3 -I cdx_lookup.py cluster.idx live_2026-03-01..2026-03-07.txt (direct range requests into the CC-MAIN-2026-43 URL index; hosts from gh api search/repositories 'github.io in:name created:2026-03-01..2026-03-07', live with HTTP 200)`: hosts=40 robots_capture=0 any_capture=0 errors=0 seconds=8.8
- `same script, GitHub Pages user sites created 2024-03-01..07`: lgolowich.github.io robots=True(404) any=True / hosts=40 robots_capture=1 any_capture=1 errors=0
- `same script, 39 mta-sts.<domain> names taken from crt.sh`: hosts=39 robots_capture=0 any_capture=0 errors=0 seconds=9.6
- `same script, 60 live custom-domain homepages of repositories created 2026-03-01..07 with 5 to 200 stars`: hosts=60 robots_capture=23 any_capture=25 errors=0 seconds=19.0
- `1% sample of the robots.txt archive, platform hosts counted`: github.io 498 -> x100 ~ 49800 (GitHub search reports 20,950 repositories named *github.io* created in that one week of March 2026)

**Reviewer's proposed change.** 1. Line 40, replace the sentence with: "It covers the case the walk cannot, as far as its finders reach: two parties who never linked to each other."

2. Replace the paragraph "**Recommendation, provisional:** ..." with:

"**Recommendation.** No finder measured meets the objective by itself. A source emits both signals where it can, because each costs little and nobody else can add them for it:

- a host name whose first label is `mad-source`, with a certificate that names that host exactly;
- the line `Mad-Source: <address of the source document>` in any robots.txt its operator controls.

The certificate label finder is built first: it is the only one measured that finds a host nobody linked. The robots line finder is built second: it finds sources whose operator already has a website that Common Crawl visits, and its input is a named snapshot that never changes.

**Coverage, measured 2026-11-09.**
- Certificate label: any host with its own name and an exact-name certificate, linked or not. Not a source without a domain of its own. Not a host served under a wildcard certificate.
- Robots line: only hosts whose robots.txt Common Crawl fetched in that crawl. Common Crawl reaches a host through links from pages it has already crawled and takes no submissions. In the October 2026 crawl: 0 of 40 GitHub Pages sites created in March 2026, 1 of 40 created in March 2024, 0 of 39 hosts that nothing links to, 23 of 60 custom-domain project sites. About 5% of hosts answer its robots.txt request with 403 or 429.
- Neither: a source under a path on a shared host whose operator controls no robots.txt and no host name. It is found only through introductions.

**Delay.** Certificate label: as stale as the search service, which was 19 days behind when measured. Robots line: Common Crawl crawls for two weeks every four to five weeks and published the October 2026 crawl three days after it ended, so a line shows up 3 days to about 7 weeks after it is added, on a host visited every crawl."

3. Open question 1, replace with: "**Which finder comes first?** Recommended: the certificate label, with the robots line emitted from the start and its finder second. Neither is proven until the live check in build step 5 passes. The alternative is no finder in the first cut."

4. Open question 2, add the host label `mad-source` to the names to confirm.

**What the skeptic checked.** Re-ran the first reviewer's cdx_lookup.py against CC-MAIN-2026-43's cluster.idx (HEAD on data.commoncrawl.org confirms 104,520,381 bytes, last-modified 2026-10-18). Output: 40 GitHub Pages sites created March 2026 `robots_capture=0 any_capture=0`; 40 created March 2024 `robots_capture=1` (lgolowich.github.io, status 404); 39 mta-sts hosts `robots_capture=0 any_capture=0`; 60 custom-domain project sites `robots_capture=23 any_capture=25`. Controls behaved (joost.blog found, a made-up host not found). Re-opened commoncrawl.org/faq (both quoted sentences are there, under two different questions), Sebastian Nagel's post of 2024-10-05 (quote present), design.md lines 40 and 189, and the GitHub count (20,950). Then checked two things the finding did not: the status of the 23 captures, and whether the certificate route sees a new host today (see missed item 1). Outputs: /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-finders/cdx_2026.out, cdx_2024.out, cdx_mtasts.out, cdx_custom.out.

**Skeptic's better change.** Adopt edit 1 (line 40) as proposed. Replace edits 2 to 4 with:

"**Recommendation.** No finder measured lists a new source that nobody linked by a route that is free, repeatable and not one company's search. The first cut says so. The robots line stays first: its input is a named snapshot that never changes, it needs no account, and its real analog was found end to end (18 hosts carrying ARD's `Agentmap:` line in a 1% sample of the October 2026 crawl, 14 still serving it). It reaches parties who already have a website that Common Crawl captures, which is narrower than the stranger case.

**Coverage and delay, measured 2026-11-09.**
- Robots line: hosts whose robots.txt Common Crawl fetched with status 200 in the crawls read. Common Crawl reaches a host through links and takes no submissions. None of 40 GitHub Pages sites created in March 2026 was in the October 2026 crawl; 18 of 60 small project sites on their own domain had a readable robots.txt there. A line appears 3 days to 7 weeks after it is added, on a host captured every crawl.
- Not covered: a new host nobody linked, and an operator who controls no robots.txt on a captured host. They are found only through introductions.

The certificate label is not built in the first cut. It could see an unlinked host, but it needs a host name of its own under an exact-name certificate, and the only free search service was stalled and incomplete when measured."

Open question 1 becomes: "**Is the robots line's reach enough for a first cut, and what covers new hosts?** Recommended: build the robots finder, state its reach, and claim the stranger case only for hosts it reaches. For new, unlinked hosts choose one or none: (a) the certificate label, with a `mad-source.` host name per publisher and a paid search service (Merklemap, €49 a month); (b) GitHub repository search, free and current within a minute, but one company's index and only for publishers with a public repository; (c) nothing yet."

Do not add the host label to open question 2 unless (a) is chosen.

### finders-02: Robots line row: 'a paid query' does not exist, and the cost, size and blind spots are now measured

Severity: should-fix. Section: Finding sources nobody linked. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The row says the finder "Needs a bulk download or a paid query". No query can do it: Common Crawl's URL index and columnar index list robots.txt captures (host, status, digest, file, offset) but not their text, so Athena cannot search for a line and the only route is reading all 100,000 files. That read is affordable. The row also leaves out what was unmeasured: the full body is stored, a host that disallows CCBot is still archived, and a host that answers 403 or 429 is not. The row's last limit is also narrower than it reads: a robots.txt on one host can name a source on another, which the real analog already does.

**Evidence.**

- `https://commoncrawl.org/blog/october-2026-crawl-archive-now-available (published October 21, 2026; crawl 5 to 18 October)`: Robots.txt robotstxt.paths.gz 100000 0.15 ... Page captures are from 41.4 million hosts or 34.3 million registered domains
- `cat batch1.txt batch2.txt | xargs -P 16 -n 1 -J % ./fetch1.sh % dl/s (1,000 of the 100,000 files, every 100th, from data.commoncrawl.org)`: 300 200 elapsed=14s downloaded_MB=480.3 / 700 200 elapsed=28s downloaded_MB=1594.7
- `python3 -I scan_robots.py scan1000.json dl/s/*.warc.gz`: "seconds": 38.86, "responses": 856437, "distinct_hosts": 671949, "distinct_hosts_200": 403859, "truncated_records": 144, "max_body_bytes": 5242880 ... "agentmap": 18, "llm-content": 14, "schemamap": 47, "content-signal": 2340, "mad-source": 0
- `cat dl/s/*.warc.gz | gunzip -c | grep -a -i ... (plain tools, same 1,000 files)`: real 23.78 (one process); real 4.71 (4 processes); 3780755913 bytes unpacked
- `./stream1.sh over 320 other files with xargs -P 16 (curl | gunzip | grep, nothing written to disk)`: streamed 320 files (0.32% of crawl) in 35.1 s -> full crawl at this rate: 183 min
- `live re-check of the 18 archived Agentmap hosts with curl`: 14 of 18 still serve the line, e.g. https://joost.blog/robots.txt | live_line=[Agentmap: https://joost.blog/.well-known/ai-catalog.json] | target_http=200
- `python3 -I scan2.py dl/s/*.warc.gz`: "hosts_best_status": [["200", 403859], ["404", 95571], ["301", 85557], ["302", 23044], ["403", 22921], ["429", 13009] ... "cf_managed_total": 669, "cf_managed_with_own_lines_after": 291; scan_robots.py: "ccbot_disallow_all": 3682
- `cc-index-table.paths.gz for CC-MAIN-2026-43`: 300 subset=crawldiagnostics / 300 subset=robotstxt / 300 subset=warc (robotstxt subset about 5.7 GiB from a 10-file sample; it has no body column)
- `https://commoncrawl.org/get-started`: access to data from the Amazon cloud using the S3 API is only allowed for authenticated users.
- `https://docs.github.com/en/actions/reference/limits and .../runners/github-hosted-runners`: Each job in a workflow can run for up to 6 hours of execution time. (ubuntu-latest: public 4 cores, 16 GB, 14 GB SSD; private 2 cores, 8 GB, 14 GB SSD)
- `https://index.commoncrawl.org/CC-MAIN-2026-43-index?url=<host>/robots.txt (the hosted index server)`: err 504 on 19 of the first 40 lookups, then on every lookup; the same lookups by range request against cluster.idx (104,520,381 bytes) took 7 to 19 s per 40 to 60 hosts

**Reviewer's proposed change.** Replace the Robots line row with:

"| Robots line | The line `Mad-Source: <address>` in a robots.txt its operator controls | Common Crawl's robots.txt archive: 100,000 WARC files, 0.15 TiB compressed and about 378 GB unpacked per crawl, one crawl every four to five weeks | One scan reads every file; the indexes list robots.txt captures but not their text, so no query replaces it. Free over HTTPS with no account: 1 to 3 hours streamed through gunzip and grep on 16 connections, no disk, inside one 6-hour CI job. Inside AWS it needs an account and costs under a dollar of compute. Only hosts Common Crawl visits (see Coverage). A host that disallows CCBot is still archived; a host that answers 403 or 429 is not. A source under a path on a shared host has no robots.txt of its own, but any robots.txt may name it. |"

Add below the table: "Measured on the October 2026 crawl: a 1% sample (1,000 files, 1.6 GB) downloaded in 42 s and scanned in 5 to 39 s. It held 856,437 responses from 671,949 hosts, 64% with status 200, and found 18 hosts carrying ARD's `Agentmap:` line, 14 of which still serve it. Bodies are stored whole up to 5 MiB, unknown lines included."

**What the skeptic checked.** Re-opened the October 2026 announcement (dated October 21; crawl 5 to 18 October; `Robots.txt robotstxt.paths.gz 100000 0.15`; 41.4 million hosts). robotstxt.paths.gz has 100,000 lines. cc-index-schema-flat.json has 33 columns and none holds a body; cc-index-table.paths.gz lists 300 files per subset. Downloaded my own 200 files (every 500th, offset 37): 200 of 200 HTTP 200, 340.9 MB in 9 s on 16 connections. Scanned them with my own script (myscan.py): 6.5 s, 170,316 responses, 133,964 hosts, 80,053 hosts with best status 200 (60%), 7,285 with 403 or 429 (5.4%), 27 truncated records, 4 Agentmap hosts (matches 18 per 1%), no Mad-Source. `cat dl/*.warc.gz | gunzip -c | wc -c` gave 739,180,364 (370 GB pro rata). Streamed 400 further files through gunzip and grep in 19.0 s (79 min pro rata). Re-checked the 18 Agentmap hosts live: 14 serve the line. index.commoncrawl.org answered 504 on 5 of 5 lookups. GitHub docs: 6-hour job limit; private repositories get 2 cores and 8 GB and draw on included usage. `gh repo view seriouscoderone/mad-discovery --json visibility` says PRIVATE.

**Skeptic's better change.** Row:

"| Robots line | The line `Mad-Source: <address>` in a robots.txt its operator controls | Common Crawl's robots.txt archive: 100,000 WARC files, 0.15 TiB compressed and about 370 GB unpacked per crawl, a crawl every four to five weeks | One scan reads every file: no index holds robots.txt text, so no query replaces it. Free over HTTPS with no account. Extrapolated from samples of 200 to 1,000 files: one to three hours on 16 connections, streamed with no disk; not yet run in CI or at full volume. Only hosts Common Crawl captures (see Coverage). A host that answers Common Crawl with 403 or 429 has no readable robots.txt in the archive (about 5% of hosts); a host that only disallows CCBot does. |"

Drop the "Inside AWS" sentence. Drop the "Measured on the October 2026 crawl" paragraph from the design; the two figures that matter are already in the Recommendation text under finders-01. Put "any robots.txt may name a source on another host" in the robots line rule (finders-04), not in the table.

### finders-03: Certificate label row: measured; it works through one fragile free service and a wildcard certificate hides the label

Severity: should-fix. Section: Finding sources nobody linked. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The row says "Unmeasured" and the survey left the route rejected as unverified. Measured: crt.sh's web form does not answer a leading-label query (it returned 61 names for `mta-sts.`, a truncated list ending in 2020 for `openpgpkey.`, and 502 for `autodiscover.`). crt.sh's public PostgreSQL does answer it with a prefix query on its name index, in seconds to minutes for a small label, but a large label timed out, one connection in eleven was refused, and the replica was 19 days behind with its newest certificate issued 48 days earlier. Merklemap needs a paid key, SSLMate searches only within a named domain, and Cloudflare Radar gives aggregates only. Reading the logs directly is beyond a CI job. Four of six subdomain hosts sampled present a wildcard certificate, so their label never reaches a log. The label `mad-source.` is unused today.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:718`: I found no primary documentation, so the CT route stays unverified and should stay rejected.
- `curl 'https://crt.sh/?q=mta-sts.%25&output=json' and the openpgpkey and autodiscover equivalents`: mta-sts: rows 1436, distinct names 61, with leading label 39 (3.4 s); openpgpkey: not_before range 2015-03-08 .. 2020-06-02 (11.1 s); autodiscover: http=502
- `psql 'host=crt.sh port=5432 user=guest dbname=certwatch' -c "SELECT count(*), count(DISTINCT lower(cai.NAME_VALUE)) FROM certificate_and_identities cai WHERE '''openpgpkey.'':*'::tsquery @@ identities(cai.CERTIFICATE) AND cai.NAME_VALUE ILIKE 'openpgpkey.%' AND coalesce(x509_notAfter(cai.CERTIFICATE), 'infinity'::timestamp) >= now() AT TIME ZONE 'UTC'"`: 27952|7721 elapsed=75s
- `same query for 'mta-sts.' (with LIMIT 100000, then without)`: 100000|9569 Time: 21408.628 ms; without the limit: ERROR: canceling statement due to statement timeout
- `psql to crt.sh, second of eleven connections`: connection to server at "crt.sh" (91.199.212.73), port 5432 failed: Connection refused
- `psql -c "SELECT inet_server_addr(), pg_is_in_recovery(), now() - pg_last_xact_replay_timestamp()" -c "SELECT max(c.ID) FROM certificate c" at 2026-11-09T05:54Z`: |t|19 days 08:03:11.806156 / 30003850053 (that certificate's notBefore is 2026-09-21 16:04:34)
- `same prefix query for 'mad-source.'`: 0|0
- `curl https://api.merklemap.com/v1/search?query=mta-sts.* ; https://www.merklemap.com/pricing`: {"status":"Unauthorized","message":"Missing Authorization header"} ; "€49/month" ... "100,000 requests included per month."
- `https://sslmate.com/help/reference/ct_search_api_v1 (the domain parameter)`: This is the only mandatory parameter.
- `https://www.gstatic.com/ct/log_list/v3/log_list.json (version 96.4, 2026-11-08) and each 2026h2 shard's get-sth or checkpoint`: ('logs','usable') 21, ('tiled_logs','usable') 22, ('tiled_logs','qualified') 41, operators 11; Google_Argon2026h2 tree_size=3495145421, Let's_Encrypt_Sycamore2026h2 tree_size=1087820962; thirteen half-year shards sum to 24.5 billion entries
- `openssl s_client -connect <host>:443 | openssl x509 -noout -ext subjectAltName, six subdomain hosts from the robots sample`: doe.cal.com | server: cloudflare | SAN: DNS:cal.com, DNS:*.cal.com ; cancer.usegalaxy.eu | SAN: DNS:*.usegalaxy.eu, DNS:usegalaxy.eu (4 of 6 wildcard)
- `https://letsencrypt.org/docs/rate-limits/ (Last updated: August 5, 2026)`: Up to 50 certificates can be issued per registered domain (or IPv4 address, or IPv6 /64 range) every 7 days.

**Reviewer's proposed change.** Replace the Certificate label row with:

"| Certificate label | A host name whose first label is `mad-source`, under a certificate that names it exactly | Certificate Transparency logs, read through crt.sh's public PostgreSQL with a prefix query on its name index | Finds a host nobody linked. Free, seconds to minutes: 7,721 unexpired `openpgpkey.` names in 75 s. One service, an undocumented query form, 19 days behind when measured, one connection in eleven refused; its web form does not answer this query. The paid alternative is Merklemap at €49 a month. Reading the logs directly is out of reach for a CI job: thirteen half-year log shards held 24.5 billion entries. Needs a domain and a DNS record. A wildcard certificate hides the label, and 4 of 6 subdomain hosts sampled use one. |"

Add below the table the query the finder runs:

```sql
SELECT DISTINCT lower(cai.NAME_VALUE)
FROM certificate_and_identities cai
WHERE '''mad-source.'':*'::tsquery @@ identities(cai.CERTIFICATE)
  AND cai.NAME_VALUE ILIKE 'mad-source.%'
  AND coalesce(x509_notAfter(cai.CERTIFICATE), 'infinity'::timestamp) >= now() AT TIME ZONE 'UTC'
```

and the sentence: "For each name returned, the finder proposes `https://<name>/.well-known/mad/source.json`."

**What the skeptic checked.** crt.sh web form: `mta-sts.%` 1,436 rows, 61 names, 39 with the label; `openpgpkey.%` newest not_before 2020-06-02; `autodiscover.%` HTTP 200 this time, 5,993 rows all dated 2008 to 2013; `mad-source.%` empty. psql as guest: the `mad-source.` prefix query `0|0`; the `openpgpkey.` count `27940|7719` in 96 s and, 17 minutes later, `30530|8160`; replica state on ten connections; a histogram of names by issue week; https://crt.sh/monitored-logs. Merklemap API 401 and €49 a month; SSLMate's domain parameter "is the only mandatory parameter"; log list 96.4 (21 usable, 22 tiled usable, 41 tiled qualified, 11 operators); Argon2026h2 tree size 3,495,221,537; Let's Encrypt rate limits page (updated August 5, 2026, 50 per registered domain per 7 days). My own wildcard test on 150 random subdomain hosts from the robots sample (san.sh, san.out). Not re-checked: Cloudflare Radar, and the 24.5 billion sum.

**Skeptic's better change.** Do not put the SQL, or "read through crt.sh's public PostgreSQL", in the design. Row:

"| Certificate label | A host name whose first label is `mad-source`, under a certificate that names it exactly | Certificate Transparency logs, through a search service that accepts a leading label | Could find a host nobody linked. No dependable free search today: crt.sh's public database answers the query (about 7,700 unexpired `openpgpkey.` names in 30 to 100 s) but had stopped updating 19 days before the measurement, was weeks behind on the largest logs before that, and its operator has announced a rebuild that changes the queries. Merklemap offers the search for €49 a month. Reading the logs directly is out of reach for a CI job: one Let's Encrypt log shard adds about 20 million entries a day. Costs the publisher a domain, a DNS record and a host name. A wildcard certificate hides the label: about half of 138 subdomain hosts sampled had only a wildcard, and every `github.io` site does. |"

### finders-04: What a source emits for a finder is not specified, and the layout has the build owning /robots.txt

Severity: should-fix. Section: A source. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Three gaps an implementer would have to guess at. (1) The layout lists `/robots.txt` as part of the build's output folder. The hosts where the robots finder works are existing websites that already have a robots.txt, and copying the output folder there would replace it. (2) The line has no grammar. In the real analog, values are sometimes relative paths and sometimes addresses on another host, including one spam host pointing at an unrelated domain. The design does not say which are accepted or that the fetched document must agree with the address. (3) The host label, the emission the other finder needs, appears nowhere in the layout or rules.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:55`: /robots.txt                                 carries one line naming the source document
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:97`: **The robots.txt line** (`Mad-Source: <address of the source document>`) is the one thing a source emits for parties who have never heard of it.
- `scan1000.json, watch_hits (values of rare pointer lines found in Common Crawl's robots.txt archive)`: https://doe.cal.com/robots.txt | https://cal.com/.well-known/ai-catalog.json ; https://fileshareusiterank23.store/robots.txt | https://markstock.buzz/ai-catalog.json ; https://grails.com/robots.txt | /llms.txt
- `https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/`: Cloudflare will prepend our managed `robots.txt` before your existing `robots.txt`, combining both into a single response.

**Reviewer's proposed change.** 1. Remove the `/robots.txt` line from the layout block.

2. Replace the rule "**The robots.txt line** ..." with two rules:

"- **The robots.txt line.** `Mad-Source: <absolute https address of a source document>`, on a line of its own, the name matched without regard to case, any number of times, anywhere in the file. It may name a source document on another host, so an operator can put it in the robots.txt of their main website while the source lives elsewhere, including under a path on a shared host. A finder treats the line as an introduction made by the robots.txt's host: the build fetches the address and keeps the source only if the document's `source` field equals the address fetched. A value that is not an absolute https address is ignored. The build prints the line and never writes or edits a robots.txt, because the hosts this finder reaches already have one.
- **The host label.** A source whose operator has a domain is served from a host whose first label is `mad-source`, such as `mad-source.gym.example`, under a certificate that names that host exactly. A wildcard certificate does not show the label; a zone proxied by Cloudflare gets a wildcard certificate by default."

**What the skeptic checked.** design.md lines 48 to 56 (the layout is "the output folder of one build" and lists `/robots.txt`), lines 92 and 97. Cloudflare's managed robots.txt page: the quote is present and its managed block lists `User-agent: CCBot / Disallow: /`. Live with curl: doe.cal.com's robots.txt carries `Agentmap: https://cal.com/.well-known/ai-catalog.json`; fileshareusiterank23.store carries `Agentmap: https://markstock.buzz/ai-catalog.json` (target HTTP 200). In scan1000.json the grails.com value `/llms.txt` sits under the llms-txt line. In my own sample 46 of 80 Cloudflare-managed files kept the site's own lines after the managed block.

**Skeptic's better change.** Adopt edit 1 (remove `/robots.txt` from the layout) and the robots line rule, with two changes. Reject the host label rule as written.

(a) Replace "any number of times, anywhere in the file" with "anywhere in the file. A finder reads the first such line in a robots.txt and ignores the rest." One file must not nominate unlimited candidates (see finders-05). An operator with several sources names one, and that source introduces the others.

(b) Move "keeps the source only if the document's `source` field equals the address fetched" into the first rule for a source, because the walk and introductions need it too: "A source document whose `source` field differs from the address it was fetched from is rejected."

Host label: do not say a source "is served from" a `mad-source.` host. The address is the source's identity (line 92) and goes into other parties' introductions (open question 3), so that rule would make every publisher with a domain move for the sake of one unbuilt finder. Leave the label out of "A source" unless the certificate finder is chosen; missed item 3 gives the text for that case.

### finders-05: A finder has no contract: an input outage would empty the catalog, a live query cannot be repeated, and run limits pick candidates arbitrarily

Severity: should-fix. Section: The catalog. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Three rules in the design collide once a finder exists. (1) "every build starts from nothing" means a build that runs while crt.sh refuses connections publishes a catalog missing every source that finder found. Measured: one refused connection in eleven and 502 on two of seven web requests in forty minutes. (2) "Two parties who run it at the same time should produce the same sources list" holds for a named Common Crawl snapshot but not for a live database whose replica was 19 days behind; only a saved copy of the finder's answer makes the build comparable. (3) "Limits on sources per run" has no rule for which candidates are visited when a finder returns more than the limit, and candidates are cheap to mint: one of 18 `Agentmap:` hosts found is a spam host pointing at another domain, one directive sits on 14,266 hosts in the 1% sample, and Let's Encrypt allows 50 certificates a week per registered domain. The scan also needs its acceptance rule stated, since 36% of archived robots.txt responses are not status 200.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:201`: A source that disappears drops out at the next build, because every build starts from nothing.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:172`: Two parties who run it at the same time should produce the same sources list.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:231`: Limits on sources per run, introductions per source and depth.
- `psql to crt.sh and curl to crt.sh, 2026-11-09 05:22 to 06:00 UTC`: port 5432 failed: Connection refused ; q=community.letsencrypt.org http=502 ; q=autodiscover.%25 http=502
- `python3 -I scan_robots.py scan1000.json dl/s/*.warc.gz`: ["llm-policy", 14266] ... "status": [["200", 547204], ["404", 109789], ["301", 95381], ["403", 27228] ... of 856437 responses
- `scan1000.json, watch_hits.agentmap`: https://fileshareusiterank23.store/robots.txt | https://markstock.buzz/ai-catalog.json

**Reviewer's proposed change.** Add a subsection after "Finding sources nobody linked":

"### What a finder returns

A finder returns candidate source addresses, each with where it was seen: the robots.txt address and capture time, or the certificate name. The build then:

- writes the candidates to the output, sorted, before visiting any, so another party can compare inputs when the input is a live service with no snapshot name;
- stops without writing a catalog if a finder's input cannot be read. A missing input never produces a smaller catalog;
- drops candidates that are not absolute https addresses, removes duplicates and visits the rest in sorted order;
- stops and reports the count if more candidates remain than the limit on sources per run. It never visits an arbitrary subset.

The robots finder reads only responses with status 200 and takes the latest capture for each host. The build description names each finder's input: the crawl's name for Common Crawl, the query time and the service's reported lag for crt.sh."

**What the skeptic checked.** design.md lines 172, 201 and 231. I could not reproduce a refused connection (0 of about 27) or a web 502 (0 of 4), but saw the same class of failure: 5 of 6 grouped queries ended `ERROR: canceling statement due to statement timeout` although `SHOW statement_timeout` says 5min, and index.commoncrawl.org answered 504 on 5 of 5. Non-repeatability shown directly: the same count returned 7,719 names at about 06:16 UTC and 8,160 at about 06:33. The spam host is live. Status mix in my sample: 108,687 of 170,316 responses were 200. The 14,266 `llm-policy` hosts are in the first reviewer's scan1000.json.

**Skeptic's better change.** Keep the subsection, shorter, and close a hole the proposals open together: "any number of times" (finders-04) plus "stops ... if more candidates remain than the limit" lets one robots.txt with enough lines stop every catalog build. Text:

"### What a finder returns

A finder returns candidate source addresses, each with where it was seen. A candidate is an introduction by the place it was seen, fetched and checked like any other.

- A finder reads all of its input, or the build stops without writing a catalog. A missing or partly read input never produces a smaller catalog.
- Each place seen contributes one candidate: the first `Mad-Source` line in a robots.txt.
- Candidates that are not absolute https addresses are dropped. The rest are de-duplicated and visited in sorted order.
- If more remain than the limit on sources per run, the build stops and reports the count. The limit is set well above the count expected, since visiting a candidate is one small request.
- A finder whose input has no snapshot name saves its answer in the output, so another party can compare.

The robots finder reads responses with status 200 only and, for each host, the newest capture in the crawls it reads. The build description names those crawls."

Stopping on overflow still lets someone with many captured hosts halt a build; visiting a sorted subset instead lets them crowd honest sources out. Neither is solved before signatures. Which one the build does is a question for the maintainer.

### finders-06: 'Until a finder is proven' has no definition and no build step proves one

Severity: should-fix. Section: Build order. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Line 191 makes the catalog's reach depend on a finder being "proven", but the stranger-case test uses a fixture and build step 5 only says "a second real origin for a live check" without saying what is checked. With the measured delays, a live proof takes three to seven weeks after the signals are emitted, so when the emission starts matters. The fixture should also be the real input shape, or the test proves a parser nobody will run.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:191`: Until a finder is proven, the catalog covers only what is reachable by introductions from the sources named on its command line.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:276`: 5. The maintainer's own source deployed, and a second real origin for a live check.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:268`: Two sources that never link to each other, plus a fixture standing for the finder's public input.
- `https://index.commoncrawl.org/collinfo.json`: CC-MAIN-2026-43 from 2026-10-05 to 2026-10-18; CC-MAIN-2026-39 from 2026-09-04 to 2026-09-17; CC-MAIN-2026-34 from 2026-08-07 to 2026-08-20
- `psql to crt.sh, 2026-11-09`: |t|19 days 08:03:11.806156

**Reviewer's proposed change.** 1. Replace build step 5 with: "5. The maintainer's own source deployed at `mad-source.<domain>` under an exact-name certificate, and a second real origin on a different host and domain that neither links to the first nor is linked from it. **A finder is proven when a catalog build that is given neither address lists both.** Allow three to seven weeks for the public input to catch up."

2. Add after the build order: "The two host names and their certificates can be created as soon as the names in open question 2 are settled, ahead of step 1, so the wait runs while the rest is built. This is the one exception to steps 1 to 4 needing no domain." (The maintainer may decline this and accept the wait at step 5.)

3. In Tests, replace the stranger-case fixture clause with: "plus fixtures in the real shape of each finder's input: a small WARC file laid out like Common Crawl's robots.txt archive, and a saved crt.sh answer."

**What the skeptic checked.** design.md lines 191, 268 and 276. https://index.commoncrawl.org/collinfo.json: CC-MAIN-2026-43 from 2026-10-05 to 2026-10-18, -39 from 2026-09-04 to 2026-09-17, -34 from 2026-08-07 to 2026-08-20, so 28 to 35 days between crawl starts. crt.sh's replica state as under finders-03.

**Skeptic's better change.** Edit 1, adopt the definition and fix the wait: "5. The maintainer's own source deployed, and a second real source on a different host that neither links to the first nor is linked from it. **A finder is proven when a catalog build given neither address lists both.** For the robots finder, each `Mad-Source` line goes in a robots.txt that Common Crawl already captures with status 200, looked up in the latest crawl's index first, because it does not visit new hosts. The wait is one or two crawls: 3 days to 7 weeks each."

Drop "Allow three to seven weeks" for the certificate route. The measured service had stopped, so there is no bound to quote.

Reject edit 2 (creating host names and certificates before step 1). It presumes the certificate finder and the names in open question 2, both undecided, and adds an exception to "Steps 1 to 4 need no hosting, no domain and no cloud account". If the maintainer picks the certificate label, the timing is his to set.

Edit 3, adopt for the finder that is built: "plus a fixture in the real shape of the finder's input: a small WARC file laid out like Common Crawl's robots.txt archive, holding 200 and non-200 responses and two captures of one host." Add the saved crt.sh answer only if that finder is built.

### finders-07: Code search row: confirmed as written, and repository topic search is the cheaper form of the same idea

Severity: consider. Section: Finding sources nobody linked. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The row's limits are right: code search refuses unauthenticated requests. It can be tightened with numbers. The same company offers repository search by topic with no token, which returns in under a second and reaches exactly the publishers the other two finders miss, those on a `github.io` address with no domain. It is still one company and has no snapshot, so it belongs in the table as a third option, not as a recommendation.

**Evidence.**

- `curl 'https://api.github.com/search/code?q=filename:ai-catalog.json+path:.well-known&per_page=1'`: "message": "Requires authentication" ... http=401
- `gh api -X GET search/code -f q='filename:ai-catalog.json path:.well-known'`: "total_count":137, "incomplete_results":false (1.34 s); filename:ard.json path:.well-known gives 1244
- `curl 'https://api.github.com/search/repositories?q=topic:keri&per_page=100' (no token)`: {"total_count":40,"incomplete_results":false,"with_homepage":33,"has_pages":18}
- `curl https://api.github.com/rate_limit (no token)`: "search":{"limit":10,"remaining":10 ...

**Reviewer's proposed change.** Replace the Code search row with:

"| Repository topic | The topic `mad-source` on a public repository whose homepage field is the source document's address | GitHub repository search, which needs no token (10 requests a minute, 1,000 results per query) | One company and no snapshot. Finds only publishers who keep a repository on GitHub, which includes the `github.io` sites the other finders miss. Minutes, not weeks. Searching file paths instead needs a token: an unauthenticated code search returns 401. |"

**What the skeptic checked.** `curl 'https://api.github.com/search/code?q=filename:ai-catalog.json+path:.well-known&per_page=1'` returned 401 "Requires authentication". With `gh api`: `filename:ai-catalog.json path:.well-known` 137 in 1.1 s; `filename:ard.json path:.well-known` 1244; `filename:source.json path:.well-known/mad` 0; `topic:mad-source` 0. Without a token: `topic:keri` total 40, 33 with a homepage, 18 with Pages; rate_limit search limit 10. Added a freshness test: at 06:42:42 UTC, `gh api -X GET search/repositories -f q='topic:python created:>=<10 minutes ago>'` returned repositories created at 06:41:49, 06:41:56 and 06:42:05; a wider query returned ones created at 06:42:09 and 06:42:13.

**Skeptic's better change.** Keep one GitHub row instead of swapping code search for topics, and say what the finding left out: this is the only input measured that lists a new, unlinked source with no domain, and it does so within a minute. That makes it a question for the maintainer (option (b) in open question 1 under finders-01), not a table footnote.

"| GitHub search | Either nothing new (the source document committed at `.well-known/mad/source.json` in a public repository; the document states its own address) or the topic `mad-source` on a public repository whose homepage is the source document's address | GitHub code search (needs a token) or repository search (no token, 10 requests a minute, 1,000 results a query) | One company's index with no snapshot, so not repeatable. Only publishers with a public repository on GitHub, which includes the `github.io` sites no other finder reaches. Lists a new repository within a minute. |"

### finders-08: Existing registries row is out of date: HTTP Archive now fetches ai-catalog.json unasked, for popular origins only

Severity: consider. Section: Finding sources nobody linked. Skeptic: partly; proposed change: reject.

**Problem.** The row says the survey found no registry that picks up an unlisted domain without a request. Since 2026-09-24 HTTP Archive's monthly crawl fetches `/.well-known/ai-catalog.json` (and from 2026-09-28 `/.well-known/ard.json`) on every origin it tests and records the entry count and up to 20 distinct entry types. The source already emits that file, so an entry type that only MAD definitions use would make MAD sources listable there at no extra cost to the publisher. It does not help a new source: HTTP Archive tests only origins in the Chrome UX Report, and reading it needs BigQuery. Its separate robots.txt metric stores counts only, so it cannot find the robots line. Not queried in this review.

**Evidence.**

- `gh api 'repos/HTTPArchive/custom-metrics/commits?path=dist/well-known.js'`: 2026-09-28 well-known: add /.well-known/ard.json (ARD v0.91 canonical path) (#204) / 2026-09-24 well-known: add /.well-known/ai-catalog.json (Agentic Resource Discovery) (#201)
- `https://raw.githubusercontent.com/HTTPArchive/custom-metrics/main/dist/well-known.js`: summary.entry_types = [...new Set(data.entries.map(e => e && typeof e.type === 'string' ? e.type : null).filter(Boolean))].slice(0, 20);
- `https://raw.githubusercontent.com/HTTPArchive/custom-metrics/main/dist/robots_txt.js`: // Extracts status, size, overall record count, and record counts respective to user-agents. ... record_type: 'other',
- `https://httparchive.org/faq`: The URLs come from the Chrome User Experience Report, a dataset of real user performance data of the most popular websites.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:187`: The survey found none that picks up an unlisted domain without a request.

**Reviewer's proposed change.** Replace the Existing registries row with:

"| Existing crawls of AI Catalog files | The AI Catalog file the build already writes, with an entry type that only MAD definitions use | HTTP Archive's monthly crawl, which since September 2026 fetches `/.well-known/ai-catalog.json` and `/.well-known/ard.json` on every origin it tests and records up to 20 entry types | Only origins popular enough to be in the Chrome UX Report, so not a new source. Read through BigQuery with a Google account. No registry was found that picks up an unlisted domain. Not measured further. |"

If the row is kept, the AI Catalog entries section must name that entry type instead of "a media type".

**What the skeptic checked.** `gh api 'repos/HTTPArchive/custom-metrics/commits?path=dist/well-known.js'`: 2026-09-24 "well-known: add /.well-known/ai-catalog.json (Agentic Resource Discovery) (#201)" and 2026-09-28 "well-known: add /.well-known/ard.json (ARD v0.91 canonical path) (#204)". dist/well-known.js lines 51 to 60 record `entries_count` and `entry_types`. dist/robots_txt.js counts records by type and files unknown lines under `other`. httparchive.org/faq: "The URLs come from the Chrome User Experience Report". design.md line 187.

**Skeptic's better change.** Leave the row as it is. The replacement adds a fifth candidate that fails the section's purpose by its own description, and a new requirement on the AI Catalog entry type that nothing else needs. If the fact is wanted, one clause in "AI Catalog entries" is enough: "HTTP Archive's monthly crawl has recorded the entry count and entry types of these files since September 2026, for origins in the Chrome UX Report only."

### finders-09: Other finder inputs considered and set aside, so the question is not reopened

Severity: consider. Section: Finding sources nobody linked. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The table lists four candidates. Five more were checked for this review or by the survey, and none lists a new source without someone being asked or an account being held. Recording them saves a later reader from re-deriving it.

**Evidence.**

- `https://www.indexnow.org/faq`: your submission will be shared across all IndexNow-enabled search engines
- `https://opendata.rapid7.com/apihelp`: API access requires an Open Data account. See the About page for information on requesting access.
- `https://tranco-list.eu/`: one million domains obtained by averaging all four rankings over the past 30 days
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:1385`: Neither is guaranteed complete: for the same collection the four directory hosts returned 753, 695, 665 and
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:409`: Bing's APIs were retired in August 2025 and Google's Custom Search JSON API ends 2027-01-01 with a partner-only replacement.

**Reviewer's proposed change.** Add below the table:

"Considered and set aside:

- **A DNS TXT record.** No open dataset lists TXT records across domains without an approved account.
- **Probing a ranked list**, such as Tranco's daily top million. The build becomes a crawler, and a new source is not on the list.
- **Search-engine queries.** The programmatic routes are closing (survey).
- **IndexNow.** A source pings a search engine; submissions are shared among the participating engines and published nowhere.
- **AT Protocol's `listReposByCollection`.** It lists every repository holding a record of a collection with no request to anyone, but the publisher needs an AT Protocol account and the survey found the directory hosts disagree on the count."

**What the skeptic checked.** indexnow.org/faq (quote present). opendata.rapid7.com/apihelp: the page says "API access requires a Sonar Data account", not "an Open Data account". tranco-list.eu (quote present). discovery-survey.md lines 1385 and 409 (both quotes present), and lines 698 and 730. openintel.nl/data/forward-dns/zone-based/ and /top-lists/.

**Skeptic's better change.** One short paragraph under the table instead of five bullets, with the DNS entry corrected:

"Considered and set aside (survey and this review): a DNS TXT record (the open measurement datasets cover a few open zones and the top million domains, and only fixed names); probing a ranked list such as Tranco's (the build becomes a crawler, and a new source is not on the list); search-engine queries (the programmatic routes are closing); IndexNow (submissions go to search engines and are published nowhere); AT Protocol's `listReposByCollection` (needs an AT Protocol account, and directory hosts disagreed on the count)."

### What the finders reviewer missed

#### The certificate search proposed as the first finder was stopped, incomplete and scheduled to change

Severity: must-fix.

**Problem.** finders-01 and finders-03 would have the design build the certificate label finder first, on crt.sh's guest PostgreSQL, with its SQL written into the design. Measured again, that service cannot carry it. Its database stopped replaying on 2026-10-20, which is a stall and not a 19-day lag. Before the stall it held under half of the names issued in the previous five weeks. The same query gave two different answers 17 minutes apart, and most runs of a grouped form were cancelled. Its operator said in May 2026 that the index the proposed query uses will be replaced. A finder built on it would have listed no source certified in the last three weeks and fewer than half of those from the five weeks before.

**Evidence.**

- 1
- .
- 
- `
- p
- s
- q
- l
- 
- '
- h
- o
- s
- t
- =
- c
- r
- t
- .
- s
- h
- 
- p
- o
- r
- t
- =
- 5
- 4
- 3
- 2
- 
- u
- s
- e
- r
- =
- g
- u
- e
- s
- t
- 
- d
- b
- n
- a
- m
- e
- =
- c
- e
- r
- t
- w
- a
- t
- c
- h
- '
- 
- -
- A
- t
- 
- -
- c
- 
- "
- S
- E
- L
- E
- C
- T
- 
- p
- g
- _
- i
- s
- _
- i
- n
- _
- r
- e
- c
- o
- v
- e
- r
- y
- (
- )
- ,
- 
- p
- g
- _
- l
- a
- s
- t
- _
- x
- a
- c
- t
- _
- r
- e
- p
- l
- a
- y
- _
- t
- i
- m
- e
- s
- t
- a
- m
- p
- (
- )
- ,
- 
- n
- o
- w
- (
- )
- 
- -
- 
- p
- g
- _
- l
- a
- s
- t
- _
- x
- a
- c
- t
- _
- r
- e
- p
- l
- a
- y
- _
- t
- i
- m
- e
- s
- t
- a
- m
- p
- (
- )
- ,
- 
- (
- S
- E
- L
- E
- C
- T
- 
- m
- a
- x
- (
- I
- D
- )
- 
- F
- R
- O
- M
- 
- c
- e
- r
- t
- i
- f
- i
- c
- a
- t
- e
- )
- "
- `
- ,
- 
- t
- e
- n
- 
- c
- o
- n
- n
- e
- c
- t
- i
- o
- n
- s
- 
- b
- e
- t
- w
- e
- e
- n
- 
- 0
- 6
- :
- 1
- 4
- 
- a
- n
- d
- 
- 0
- 6
- :
- 2
- 6
- 
- U
- T
- C
- 
- o
- n
- 
- 2
- 0
- 2
- 6
- -
- 1
- 1
- -
- 0
- 9
- .
- 
- E
- v
- e
- r
- y
- 
- r
- o
- w
- :
- 
- `
- t
- |
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 2
- 0
- 
- 2
- 2
- :
- 5
- 2
- :
- 3
- 8
- .
- 3
- 0
- 5
- 4
- 9
- 4
- +
- 0
- 1
- |
- 1
- 9
- 
- d
- a
- y
- s
- 
- 0
- 8
- :
- 2
- x
- :
- x
- x
- |
- 3
- 0
- 0
- 0
- 3
- 8
- 5
- 0
- 0
- 5
- 3
- `
- .
- 
- 2
- .
- 
- S
- a
- m
- e
- 
- W
- H
- E
- R
- E
- 
- c
- l
- a
- u
- s
- e
- 
- a
- s
- 
- t
- h
- e
- 
- r
- e
- v
- i
- e
- w
- e
- r
- '
- s
- 
- `
- o
- p
- e
- n
- p
- g
- p
- k
- e
- y
- .
- `
- 
- q
- u
- e
- r
- y
- ,
- 
- w
- i
- t
- h
- 
- `
- S
- E
- L
- E
- C
- T
- 
- d
- a
- t
- e
- _
- t
- r
- u
- n
- c
- (
- '
- w
- e
- e
- k
- '
- ,
- 
- x
- 5
- 0
- 9
- _
- n
- o
- t
- B
- e
- f
- o
- r
- e
- (
- c
- a
- i
- .
- C
- E
- R
- T
- I
- F
- I
- C
- A
- T
- E
- )
- )
- :
- :
- d
- a
- t
- e
- ,
- 
- c
- o
- u
- n
- t
- (
- D
- I
- S
- T
- I
- N
- C
- T
- 
- l
- o
- w
- e
- r
- (
- c
- a
- i
- .
- N
- A
- M
- E
- _
- V
- A
- L
- U
- E
- )
- )
- 
- .
- .
- .
- 
- G
- R
- O
- U
- P
- 
- B
- Y
- 
- 1
- 
- O
- R
- D
- E
- R
- 
- B
- Y
- 
- 1
- `
- :
- 
- `
- 2
- 0
- 2
- 6
- -
- 0
- 8
- -
- 1
- 7
- 
- 1
- 5
- 2
- 1
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 8
- -
- 2
- 4
- 
- 1
- 2
- 8
- 3
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 8
- -
- 3
- 1
- 
- 1
- 2
- 9
- 1
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 9
- -
- 0
- 7
- 
- 1
- 2
- 0
- 0
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 9
- -
- 1
- 4
- 
- 5
- 7
- 6
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 9
- -
- 2
- 1
- 
- 5
- 0
- 9
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 0
- 9
- -
- 2
- 8
- 
- 4
- 6
- 8
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 0
- 5
- 
- 7
- 4
- 4
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 1
- 2
- 
- 1
- 0
- 0
- 
- /
- 
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 1
- 9
- 
- 1
- `
- .
- 
- F
- i
- v
- e
- 
- o
- f
- 
- s
- i
- x
- 
- r
- u
- n
- s
- 
- e
- n
- d
- e
- d
- 
- `
- E
- R
- R
- O
- R
- :
- 
- c
- a
- n
- c
- e
- l
- i
- n
- g
- 
- s
- t
- a
- t
- e
- m
- e
- n
- t
- 
- d
- u
- e
- 
- t
- o
- 
- s
- t
- a
- t
- e
- m
- e
- n
- t
- 
- t
- i
- m
- e
- o
- u
- t
- `
- 
- a
- f
- t
- e
- r
- 
- 4
- 5
- 
- t
- o
- 
- 7
- 4
- 
- s
- .
- 
- O
- u
- t
- p
- u
- t
- :
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- f
- i
- n
- d
- e
- r
- s
- /
- h
- i
- s
- t
- -
- 3
- .
- o
- u
- t
- 
- 3
- .
- 
- T
- h
- e
- 
- r
- e
- v
- i
- e
- w
- e
- r
- '
- s
- 
- c
- o
- u
- n
- t
- 
- q
- u
- e
- r
- y
- :
- 
- `
- 2
- 7
- 9
- 4
- 0
- |
- 7
- 7
- 1
- 9
- `
- ,
- 
- t
- h
- e
- n
- 
- w
- i
- t
- h
- 
- `
- m
- a
- x
- (
- x
- 5
- 0
- 9
- _
- n
- o
- t
- B
- e
- f
- o
- r
- e
- (
- .
- .
- .
- )
- )
- `
- 
- a
- d
- d
- e
- d
- :
- 
- `
- 3
- 0
- 5
- 3
- 0
- |
- 8
- 1
- 6
- 0
- |
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 1
- 9
- 
- 0
- 1
- :
- 5
- 0
- :
- 1
- 7
- `
- .
- 
- 4
- .
- 
- h
- t
- t
- p
- s
- :
- /
- /
- c
- r
- t
- .
- s
- h
- /
- m
- o
- n
- i
- t
- o
- r
- e
- d
- -
- l
- o
- g
- s
- 
- (
- c
- o
- l
- u
- m
- n
- s
- 
- t
- r
- e
- e
- 
- s
- i
- z
- e
- ,
- 
- b
- a
- c
- k
- l
- o
- g
- ,
- 
- l
- a
- t
- e
- s
- t
- 
- e
- n
- t
- r
- y
- 
- a
- g
- e
- ;
- 
- l
- a
- s
- t
- 
- g
- e
- t
- -
- s
- t
- h
- 
- c
- a
- l
- l
- 
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 2
- 4
- 
- 2
- 1
- :
- 3
- 4
- )
- :
- 
- `
- G
- o
- o
- g
- l
- e
- 
- |
- 
- h
- t
- t
- p
- s
- :
- /
- /
- c
- t
- .
- g
- o
- o
- g
- l
- e
- a
- p
- i
- s
- .
- c
- o
- m
- /
- l
- o
- g
- s
- /
- u
- s
- 1
- /
- a
- r
- g
- o
- n
- 2
- 0
- 2
- 6
- h
- 2
- 
- |
- 
- .
- .
- .
- 
- |
- 
- 3
- 4
- 5
- 7
- 7
- 2
- 9
- 5
- 2
- 4
- 
- |
- 
- 7
- 4
- 5
- 0
- 4
- 7
- 2
- 6
- 0
- 
- |
- 
- 7
- 5
- 
- d
- a
- y
- s
- 
- 1
- 2
- :
- 1
- 3
- :
- 3
- 2
- `
- 
- a
- n
- d
- 
- `
- L
- e
- t
- '
- s
- 
- E
- n
- c
- r
- y
- p
- t
- 
- |
- 
- h
- t
- t
- p
- s
- :
- /
- /
- m
- o
- n
- .
- s
- y
- c
- a
- m
- o
- r
- e
- .
- c
- t
- .
- l
- e
- t
- s
- e
- n
- c
- r
- y
- p
- t
- .
- o
- r
- g
- /
- 2
- 0
- 2
- 7
- h
- 1
- 
- |
- 
- .
- .
- .
- 
- |
- 
- 7
- 6
- 2
- 0
- 2
- 9
- 2
- 6
- 4
- 
- |
- 
- 4
- 4
- 4
- 2
- 2
- 5
- 7
- 2
- 2
- 
- |
- 
- 4
- 6
- 
- d
- a
- y
- s
- 
- 2
- 3
- :
- 2
- 2
- :
- 1
- 8
- `
- .
- 
- 5
- .
- 
- h
- t
- t
- p
- s
- :
- /
- /
- g
- r
- o
- u
- p
- s
- .
- g
- o
- o
- g
- l
- e
- .
- c
- o
- m
- /
- g
- /
- c
- r
- t
- s
- h
- /
- c
- /
- P
- s
- N
- h
- y
- 2
- W
- V
- X
- h
- g
- 
- (
- r
- .
- .
- .
- @
- s
- e
- c
- t
- i
- g
- o
- .
- c
- o
- m
- ,
- 
- M
- a
- y
- 
- 2
- 8
- ,
- 
- 2
- 0
- 2
- 6
- )
- :
- 
- "
- t
- h
- e
- 
- P
- o
- s
- t
- g
- r
- e
- S
- Q
- L
- 
- r
- e
- p
- l
- i
- c
- a
- s
- 
- h
- a
- v
- e
- 
- b
- e
- c
- o
- m
- e
- 
- p
- r
- o
- n
- e
- 
- t
- o
- 
- f
- r
- e
- e
- z
- [
- i
- n
- g
- ]
- "
- ;
- 
- "
- R
- e
- p
- l
- a
- c
- e
- 
- t
- h
- e
- 
- "
- c
- e
- r
- t
- i
- f
- i
- c
- a
- t
- e
- "
- 
- t
- a
- b
- l
- e
- '
- s
- 
- F
- u
- l
- l
- 
- T
- e
- x
- t
- 
- S
- e
- a
- r
- c
- h
- 
- i
- n
- d
- e
- x
- 
- w
- i
- t
- h
- 
- a
- 
- s
- e
- p
- a
- r
- a
- t
- e
- 
- "
- c
- e
- r
- t
- i
- f
- i
- c
- a
- t
- e
- _
- i
- d
- e
- n
- t
- i
- t
- y
- "
- 
- t
- a
- b
- l
- e
- .
- "
- ;
- 
- "
- T
- h
- e
- s
- e
- 
- c
- h
- a
- n
- g
- e
- s
- 
- w
- i
- l
- l
- 
- o
- f
- 
- c
- o
- u
- r
- s
- e
- 
- i
- m
- p
- a
- c
- t
- 
- l
- o
- t
- s
- 
- o
- f
- 
- q
- u
- e
- r
- i
- e
- s
- 
- t
- h
- a
- t
- 
- u
- s
- e
- r
- s
- 
- a
- r
- e
- 
- r
- u
- n
- n
- i
- n
- g
- 
- a
- g
- a
- i
- n
- s
- t
- 
- c
- r
- t
- .
- s
- h
- :
- 5
- 4
- 3
- 2
- .
- "
- 
- T
- h
- e
- 
- p
- r
- o
- p
- o
- s
- e
- d
- 
- q
- u
- e
- r
- y
- 
- i
- s
- 
- `
- '
- '
- '
- m
- a
- d
- -
- s
- o
- u
- r
- c
- e
- .
- '
- '
- :
- *
- '
- :
- :
- t
- s
- q
- u
- e
- r
- y
- 
- @
- @
- 
- i
- d
- e
- n
- t
- i
- t
- i
- e
- s
- (
- c
- a
- i
- .
- C
- E
- R
- T
- I
- F
- I
- C
- A
- T
- E
- )
- `
- ,
- 
- w
- h
- i
- c
- h
- 
- i
- s
- 
- t
- h
- a
- t
- 
- i
- n
- d
- e
- x
- .

**Proposed change.** Do not adopt "the certificate label finder is built first", the SQL block, or "Delay. Certificate label: as stale as the search service, which was 19 days behind". Use the Recommendation text given under finders-01 and the table row given under finders-03. Both say the certificate label is not built in the first cut and why.

#### The robots finder does not say which crawls it reads, and one crawl misses a fifth of the hosts

Severity: should-fix.

**Problem.** The design reads "Common Crawl's monthly archive" and says "every build starts from nothing" (line 201). Common Crawl samples hosts afresh each crawl. Of hosts with a readable robots.txt in October, a fifth had no capture in September. A finder that reads only the newest crawl would drop and re-add about that share of its sources from one build to the next, with nothing changed on the publisher's side. The first reviewer's delay figure assumes "a host visited every crawl" without saying how often that holds.

**Evidence.**

- `
- p
- y
- t
- h
- o
- n
- 3
- 
- -
- I
- 
- r
- o
- b
- o
- t
- s
- _
- l
- o
- o
- k
- u
- p
- .
- p
- y
- 
- <
- c
- r
- a
- w
- l
- >
- 
- <
- c
- l
- u
- s
- t
- e
- r
- .
- i
- d
- x
- >
- 
- p
- e
- r
- s
- i
- s
- t
- 3
- 0
- 0
- .
- t
- x
- t
- `
- 
- (
- m
- y
- 
- s
- c
- r
- i
- p
- t
- ;
- 
- r
- a
- n
- g
- e
- 
- r
- e
- q
- u
- e
- s
- t
- s
- 
- i
- n
- t
- o
- 
- e
- a
- c
- h
- 
- c
- r
- a
- w
- l
- '
- s
- 
- U
- R
- L
- 
- i
- n
- d
- e
- x
- )
- 
- o
- v
- e
- r
- 
- 3
- 0
- 0
- 
- r
- a
- n
- d
- o
- m
- 
- h
- o
- s
- t
- s
- 
- t
- h
- a
- t
- 
- h
- a
- d
- 
- a
- 
- s
- t
- a
- t
- u
- s
- -
- 2
- 0
- 0
- 
- r
- o
- b
- o
- t
- s
- .
- t
- x
- t
- 
- i
- n
- 
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 4
- 3
- :
- 
- `
- c
- r
- a
- w
- l
- =
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 4
- 3
- 
- h
- o
- s
- t
- s
- =
- 3
- 0
- 0
- 
- r
- o
- b
- o
- t
- s
- _
- c
- a
- p
- t
- u
- r
- e
- =
- 3
- 0
- 0
- 
- s
- t
- a
- t
- u
- s
- 2
- 0
- 0
- =
- 3
- 0
- 0
- `
- ;
- 
- `
- c
- r
- a
- w
- l
- =
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 3
- 9
- 
- h
- o
- s
- t
- s
- =
- 3
- 0
- 0
- 
- r
- o
- b
- o
- t
- s
- _
- c
- a
- p
- t
- u
- r
- e
- =
- 2
- 4
- 0
- 
- s
- t
- a
- t
- u
- s
- 2
- 0
- 0
- =
- 2
- 2
- 5
- `
- ;
- 
- `
- c
- r
- a
- w
- l
- =
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 3
- 4
- 
- h
- o
- s
- t
- s
- =
- 3
- 0
- 0
- 
- r
- o
- b
- o
- t
- s
- _
- c
- a
- p
- t
- u
- r
- e
- =
- 2
- 3
- 4
- 
- s
- t
- a
- t
- u
- s
- 2
- 0
- 0
- =
- 2
- 1
- 4
- `
- ;
- 
- i
- n
- 
- b
- o
- t
- h
- 
- e
- a
- r
- l
- i
- e
- r
- 
- c
- r
- a
- w
- l
- s
- 
- 2
- 1
- 8
- ,
- 
- i
- n
- 
- n
- e
- i
- t
- h
- e
- r
- 
- 4
- 4
- .
- 
- T
- h
- e
- 
- 3
- 0
- 0
- 
- w
- e
- r
- e
- 
- d
- r
- a
- w
- n
- 
- f
- r
- o
- m
- 
- h
- o
- s
- t
- s
- 
- i
- n
- 
- a
- 
- 0
- .
- 2
- %
- 
- s
- a
- m
- p
- l
- e
- 
- o
- f
- 
- f
- i
- l
- e
- s
- ,
- 
- w
- h
- i
- c
- h
- 
- f
- a
- v
- o
- u
- r
- s
- 
- h
- o
- s
- t
- s
- 
- f
- e
- t
- c
- h
- e
- d
- 
- o
- f
- t
- e
- n
- ,
- 
- s
- o
- 
- t
- h
- e
- s
- e
- 
- a
- r
- e
- 
- u
- p
- p
- e
- r
- 
- f
- i
- g
- u
- r
- e
- s
- .
- 
- S
- c
- r
- i
- p
- t
- s
- 
- a
- n
- d
- 
- o
- u
- t
- p
- u
- t
- s
- :
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- f
- i
- n
- d
- e
- r
- s
- /
- r
- o
- b
- o
- t
- s
- _
- l
- o
- o
- k
- u
- p
- .
- p
- y
- ,
- 
- p
- 4
- 3
- .
- o
- u
- t
- ,
- 
- p
- 3
- 9
- .
- o
- u
- t
- ,
- 
- p
- 3
- 4
- .
- o
- u
- t
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 0
- 1
- 
- "
- A
- 
- s
- o
- u
- r
- c
- e
- 
- t
- h
- a
- t
- 
- d
- i
- s
- a
- p
- p
- e
- a
- r
- s
- 
- d
- r
- o
- p
- s
- 
- o
- u
- t
- 
- a
- t
- 
- t
- h
- e
- 
- n
- e
- x
- t
- 
- b
- u
- i
- l
- d
- ,
- 
- b
- e
- c
- a
- u
- s
- e
- 
- e
- v
- e
- r
- y
- 
- b
- u
- i
- l
- d
- 
- s
- t
- a
- r
- t
- s
- 
- f
- r
- o
- m
- 
- n
- o
- t
- h
- i
- n
- g
- .
- "

**Proposed change.** Add to "What a finder returns" (finders-05): "The robots finder reads the three most recent crawls. Of 300 hosts with a readable robots.txt in the October 2026 crawl, 240 were captured in September, 234 in August and 44 in neither. A source found only through its robots line drops out when the newest capture of that robots.txt no longer carries the line, or after three crawls with no capture. The candidate list for one crawl depends only on that crawl's name, so a build may reuse the list it saved for a crawl already scanned. Nothing else is kept between builds." In the table row, replace "Monthly." with "A crawl every four to five weeks." The alternative is the newest crawl only, with the flicker stated; that is the maintainer's choice.

#### A host-name signal ties the finder to the source's address, so "the finder is a plug-in" does not hold for it

Severity: should-fix.

**Problem.** The first reviewer listed "The finder is a plug-in, so the choice can change without touching sources" as sound because "both emissions are independent of which finder reads them". That is true of a robots line and false of a host label. The design identifies a source by its address (line 92) and says that address goes into other parties' introductions (open question 3). If the label is part of that address, adopting or dropping the certificate finder means moving every source. The design's own second origin also cannot carry the label: GitHub Pages serves every `github.io` site under one wildcard certificate.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 9
- 2
- 
- "
- A
- 
- s
- o
- u
- r
- c
- e
- 
- i
- s
- 
- i
- d
- e
- n
- t
- i
- f
- i
- e
- d
- 
- b
- y
- 
- t
- h
- e
- 
- a
- d
- d
- r
- e
- s
- s
- 
- o
- f
- 
- i
- t
- s
- 
- s
- o
- u
- r
- c
- e
- 
- d
- o
- c
- u
- m
- e
- n
- t
- ,
- 
- n
- o
- t
- 
- b
- y
- 
- a
- 
- d
- o
- m
- a
- i
- n
- .
- "
- 
- :
- 1
- 8
- 9
- 
- "
- T
- h
- e
- 
- f
- i
- n
- d
- e
- r
- 
- i
- s
- 
- a
- 
- p
- l
- u
- g
- -
- i
- n
- ,
- 
- s
- o
- 
- t
- h
- e
- 
- c
- h
- o
- i
- c
- e
- 
- c
- a
- n
- 
- c
- h
- a
- n
- g
- e
- 
- w
- i
- t
- h
- o
- u
- t
- 
- t
- o
- u
- c
- h
- i
- n
- g
- 
- s
- o
- u
- r
- c
- e
- s
- 
- t
- h
- a
- t
- 
- a
- l
- r
- e
- a
- d
- y
- 
- c
- a
- r
- r
- y
- 
- t
- h
- e
- 
- l
- i
- n
- e
- .
- "
- 
- :
- 2
- 9
- 4
- 
- "
- b
- e
- c
- a
- u
- s
- e
- 
- t
- h
- e
- 
- a
- d
- d
- r
- e
- s
- s
- 
- g
- o
- e
- s
- 
- i
- n
- t
- o
- 
- o
- t
- h
- e
- r
- 
- p
- a
- r
- t
- i
- e
- s
- '
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- "
- 
- a
- n
- d
- 
- "
- A
- 
- s
- e
- c
- o
- n
- d
- 
- o
- r
- i
- g
- i
- n
- 
- o
- n
- 
- a
- 
- d
- i
- f
- f
- e
- r
- e
- n
- t
- 
- h
- o
- s
- t
- ,
- 
- s
- u
- c
- h
- 
- a
- s
- 
- G
- i
- t
- H
- u
- b
- 
- P
- a
- g
- e
- s
- ,
- 
- s
- e
- r
- v
- e
- s
- 
- t
- h
- e
- 
- l
- i
- v
- e
- 
- c
- h
- e
- c
- k
- .
- "
- 
- `
- e
- c
- h
- o
- 
- |
- 
- o
- p
- e
- n
- s
- s
- l
- 
- s
- _
- c
- l
- i
- e
- n
- t
- 
- -
- c
- o
- n
- n
- e
- c
- t
- 
- l
- g
- o
- l
- o
- w
- i
- c
- h
- .
- g
- i
- t
- h
- u
- b
- .
- i
- o
- :
- 4
- 4
- 3
- 
- -
- s
- e
- r
- v
- e
- r
- n
- a
- m
- e
- 
- l
- g
- o
- l
- o
- w
- i
- c
- h
- .
- g
- i
- t
- h
- u
- b
- .
- i
- o
- 
- |
- 
- o
- p
- e
- n
- s
- s
- l
- 
- x
- 5
- 0
- 9
- 
- -
- n
- o
- o
- u
- t
- 
- -
- e
- x
- t
- 
- s
- u
- b
- j
- e
- c
- t
- A
- l
- t
- N
- a
- m
- e
- `
- 
- r
- e
- t
- u
- r
- n
- e
- d
- 
- `
- D
- N
- S
- :
- *
- .
- g
- i
- t
- h
- u
- b
- .
- c
- o
- m
- ,
- 
- D
- N
- S
- :
- *
- .
- g
- i
- t
- h
- u
- b
- .
- i
- o
- ,
- 
- D
- N
- S
- :
- *
- .
- g
- i
- t
- h
- u
- b
- u
- s
- e
- r
- c
- o
- n
- t
- e
- n
- t
- .
- c
- o
- m
- ,
- 
- D
- N
- S
- :
- g
- i
- t
- h
- u
- b
- .
- c
- o
- m
- ,
- 
- D
- N
- S
- :
- g
- i
- t
- h
- u
- b
- .
- i
- o
- ,
- 
- D
- N
- S
- :
- g
- i
- t
- h
- u
- b
- u
- s
- e
- r
- c
- o
- n
- t
- e
- n
- t
- .
- c
- o
- m
- `
- .
- 
- M
- y
- 
- w
- i
- l
- d
- c
- a
- r
- d
- 
- t
- e
- s
- t
- 
- o
- n
- 
- 1
- 5
- 0
- 
- r
- a
- n
- d
- o
- m
- 
- s
- u
- b
- d
- o
- m
- a
- i
- n
- 
- h
- o
- s
- t
- s
- :
- 
- `
- {
- '
- w
- i
- l
- d
- c
- a
- r
- d
- 
- o
- n
- l
- y
- '
- :
- 
- 7
- 1
- ,
- 
- '
- e
- x
- a
- c
- t
- 
- n
- a
- m
- e
- 
- i
- n
- 
- c
- e
- r
- t
- '
- :
- 
- 6
- 6
- ,
- 
- '
- n
- o
- 
- c
- e
- r
- t
- 
- /
- 
- u
- n
- r
- e
- a
- c
- h
- a
- b
- l
- e
- '
- :
- 
- 1
- 2
- ,
- 
- '
- o
- t
- h
- e
- r
- 
- (
- n
- a
- m
- e
- 
- m
- i
- s
- m
- a
- t
- c
- h
- )
- '
- :
- 
- 1
- }
- `
- .
- 
- h
- t
- t
- p
- s
- :
- /
- /
- d
- e
- v
- e
- l
- o
- p
- e
- r
- s
- .
- c
- l
- o
- u
- d
- f
- l
- a
- r
- e
- .
- c
- o
- m
- /
- s
- s
- l
- /
- e
- d
- g
- e
- -
- c
- e
- r
- t
- i
- f
- i
- c
- a
- t
- e
- s
- /
- u
- n
- i
- v
- e
- r
- s
- a
- l
- -
- s
- s
- l
- /
- 
- "
- U
- n
- i
- v
- e
- r
- s
- a
- l
- 
- S
- S
- L
- 
- c
- e
- r
- t
- i
- f
- i
- c
- a
- t
- e
- s
- 
- c
- o
- v
- e
- r
- 
- y
- o
- u
- r
- 
- r
- o
- o
- t
- 
- d
- o
- m
- a
- i
- n
- 
- .
- .
- .
- 
- a
- n
- d
- 
- f
- i
- r
- s
- t
- -
- l
- e
- v
- e
- l
- 
- s
- u
- b
- d
- o
- m
- a
- i
- n
- s
- "
- .

**Proposed change.** Line 189, replace the last sentence with: "The finder is a plug-in, and the robots line sits outside the source, so the choice of finder can change without moving a source." If the certificate label is ever adopted, add to "A source": "An operator may also serve, at `https://mad-source.<domain>/.well-known/mad/source.json`, a source document that only introduces their source. The certificate must name that host exactly. The source itself does not move." Open question 3, add: "A `github.io` address cannot carry a certificate label and was absent from Common Crawl (0 of 40 new sites), so a second origin there proves a finder only if its operator also controls a robots.txt that Common Crawl captures."

#### Nobody has run the full scan, and the scan as scripted reports success when downloads fail

Severity: should-fix.

**Problem.** The first reviewer listed "The robots scan fits a free CI job" as sound. It rests on samples of 0.2% to 1.3% of the files from a home connection. Common Crawl rate-limits bulk clients and asks them to retry politely. The reviewer's stream script retries twice and discards errors, so a throttled run would yield fewer candidates and look clean. The repository is private, so the job is not free and unlimited: it runs on a 2-core runner against the plan's included usage. The design's line 174 says only "a scheduled job in continuous integration".

**Evidence.**

- h
- t
- t
- p
- s
- :
- /
- /
- s
- t
- a
- t
- u
- s
- .
- c
- o
- m
- m
- o
- n
- c
- r
- a
- w
- l
- .
- o
- r
- g
- /
- 
- :
- 
- "
- i
- n
- 
- N
- o
- v
- e
- m
- b
- e
- r
- 
- 2
- 0
- 2
- 3
- 
- w
- e
- 
- d
- e
- p
- l
- o
- y
- e
- d
- 
- r
- a
- t
- e
- 
- l
- i
- m
- i
- t
- i
- n
- g
- "
- ;
- 
- "
- C
- l
- o
- u
- d
- F
- r
- o
- n
- t
- :
- 
- 4
- x
- x
- 
- e
- r
- r
- o
- r
- s
- 
- a
- r
- e
- 
- m
- o
- s
- t
- l
- y
- 
- G
- r
- e
- g
- '
- s
- 
- e
- x
- p
- l
- i
- c
- i
- t
- 
- r
- a
- t
- e
- 
- l
- i
- m
- i
- t
- 
- r
- u
- l
- e
- s
- "
- ;
- 
- "
- F
- o
- r
- 
- b
- u
- l
- k
- 
- d
- o
- w
- n
- l
- o
- a
- d
- s
- ,
- 
- s
- u
- c
- h
- 
- a
- s
- 
- w
- h
- o
- l
- e
- 
- f
- i
- l
- e
- s
- ,
- 
- i
- t
- '
- s
- 
- p
- o
- s
- s
- i
- b
- l
- e
- 
- t
- o
- 
- w
- o
- r
- k
- 
- a
- r
- o
- u
- n
- d
- 
- t
- h
- e
- s
- e
- 
- 5
- 0
- 3
- s
- 
- b
- y
- 
- p
- o
- l
- i
- t
- e
- l
- y
- 
- r
- e
- t
- r
- y
- i
- n
- g
- 
- m
- a
- n
- y
- 
- t
- i
- m
- e
- s
- .
- 
- R
- e
- t
- r
- y
- i
- n
- g
- 
- n
- o
- 
- m
- o
- r
- e
- 
- t
- h
- a
- n
- 
- o
- n
- c
- e
- 
- p
- e
- r
- 
- s
- e
- c
- o
- n
- d
- 
- i
- s
- 
- p
- o
- l
- i
- t
- e
- 
- e
- n
- o
- u
- g
- h
- .
- "
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- t
- r
- e
- a
- m
- 1
- .
- s
- h
- 
- l
- i
- n
- e
- 
- 3
- :
- 
- `
- c
- u
- r
- l
- 
- -
- s
- 
- -
- m
- 
- 1
- 8
- 0
- 
- -
- -
- r
- e
- t
- r
- y
- 
- 2
- 
- "
- h
- t
- t
- p
- s
- :
- /
- /
- d
- a
- t
- a
- .
- c
- o
- m
- m
- o
- n
- c
- r
- a
- w
- l
- .
- o
- r
- g
- /
- $
- 1
- "
- 
- |
- 
- g
- u
- n
- z
- i
- p
- 
- -
- c
- 
- 2
- >
- /
- d
- e
- v
- /
- n
- u
- l
- l
- 
- |
- 
- .
- .
- .
- `
- .
- 
- M
- y
- 
- r
- u
- n
- s
- 
- s
- a
- w
- 
- n
- o
- 
- t
- h
- r
- o
- t
- t
- l
- i
- n
- g
- 
- a
- t
- 
- s
- m
- a
- l
- l
- 
- s
- c
- a
- l
- e
- :
- 
- 2
- 0
- 0
- 
- f
- i
- l
- e
- s
- ,
- 
- `
- 2
- 0
- 0
- 
- 2
- 0
- 0
- 
- /
- 
- M
- B
- =
- 3
- 4
- 0
- .
- 9
- 
- /
- 
- e
- l
- a
- p
- s
- e
- d
- =
- 9
- s
- `
- ;
- 
- 4
- 0
- 0
- 
- f
- i
- l
- e
- s
- 
- s
- t
- r
- e
- a
- m
- e
- d
- 
- i
- n
- 
- 1
- 9
- .
- 0
- 
- s
- .
- 
- `
- g
- h
- 
- r
- e
- p
- o
- 
- v
- i
- e
- w
- 
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- 
- -
- -
- j
- s
- o
- n
- 
- v
- i
- s
- i
- b
- i
- l
- i
- t
- y
- `
- 
- r
- e
- t
- u
- r
- n
- e
- d
- 
- `
- "
- v
- i
- s
- i
- b
- i
- l
- i
- t
- y
- "
- :
- "
- P
- R
- I
- V
- A
- T
- E
- "
- `
- .
- 
- G
- i
- t
- H
- u
- b
- 
- d
- o
- c
- s
- :
- 
- "
- U
- s
- e
- 
- o
- f
- 
- t
- h
- e
- 
- s
- t
- a
- n
- d
- a
- r
- d
- 
- G
- i
- t
- H
- u
- b
- -
- h
- o
- s
- t
- e
- d
- 
- r
- u
- n
- n
- e
- r
- s
- 
- i
- s
- 
- f
- r
- e
- e
- 
- a
- n
- d
- 
- u
- n
- l
- i
- m
- i
- t
- e
- d
- 
- o
- n
- 
- p
- u
- b
- l
- i
- c
- 
- r
- e
- p
- o
- s
- i
- t
- o
- r
- i
- e
- s
- "
- ;
- 
- p
- r
- i
- v
- a
- t
- e
- 
- r
- e
- p
- o
- s
- i
- t
- o
- r
- i
- e
- s
- 
- g
- e
- t
- 
- `
- L
- i
- n
- u
- x
- 
- 2
- 
- 8
- 
- G
- B
- 
- 1
- 4
- 
- G
- B
- 
- x
- 6
- 4
- 
- u
- b
- u
- n
- t
- u
- -
- l
- a
- t
- e
- s
- t
- `
- ;
- 
- G
- i
- t
- H
- u
- b
- 
- F
- r
- e
- e
- 
- i
- n
- c
- l
- u
- d
- e
- s
- 
- $
- 1
- 2
- 
- a
- 
- m
- o
- n
- t
- h
- 
- o
- f
- 
- c
- o
- m
- p
- u
- t
- e
- .

**Proposed change.** Line 174, after "It is a scheduled job in continuous integration that writes files to his source." add: "The robots scan reads each crawl's file list and every file on it, retries no more than once a second when Common Crawl answers 503, and stops the build if any file cannot be read. From samples it takes one to three hours per crawl; in a private repository that is a 2-core runner and part of the plan's included minutes. It has not yet been run in CI or at full volume, and build step 3 does that before the finder is called built." Build order step 3 becomes: "The catalog build with introductions only, then the first finder, including one full scan of a crawl from CI."

#### A publisher has no way to learn that the line will never be seen

Severity: consider.

**Problem.** Most new hosts are never captured, and a captured host waits up to seven weeks. The design gives the operator nothing to check, and Common Crawl's hosted index server, the obvious place to look, failed every lookup. The crawl's index files answer the question in under a second with range requests and no account.

**Evidence.**

- `
- c
- u
- r
- l
- 
- '
- h
- t
- t
- p
- s
- :
- /
- /
- i
- n
- d
- e
- x
- .
- c
- o
- m
- m
- o
- n
- c
- r
- a
- w
- l
- .
- o
- r
- g
- /
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 4
- 3
- -
- i
- n
- d
- e
- x
- ?
- u
- r
- l
- =
- j
- o
- o
- s
- t
- .
- b
- l
- o
- g
- /
- r
- o
- b
- o
- t
- s
- .
- t
- x
- t
- &
- o
- u
- t
- p
- u
- t
- =
- j
- s
- o
- n
- '
- `
- 
- a
- n
- d
- 
- f
- o
- u
- r
- 
- o
- t
- h
- e
- r
- 
- h
- o
- s
- t
- s
- :
- 
- `
- h
- t
- t
- p
- =
- 5
- 0
- 4
- `
- 
- o
- n
- 
- 5
- 
- o
- f
- 
- 5
- .
- 
- `
- p
- y
- t
- h
- o
- n
- 3
- 
- -
- I
- 
- r
- o
- b
- o
- t
- s
- _
- l
- o
- o
- k
- u
- p
- .
- p
- y
- 
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 4
- 3
- 
- c
- l
- u
- s
- t
- e
- r
- .
- i
- d
- x
- 
- c
- t
- l
- .
- t
- x
- t
- 
- v
- `
- 
- r
- e
- t
- u
- r
- n
- e
- d
- 
- `
- g
- i
- t
- h
- u
- b
- .
- c
- o
- m
- 
- T
- r
- u
- e
- 
- 2
- 0
- 0
- 
- /
- 
- j
- o
- o
- s
- t
- .
- b
- l
- o
- g
- 
- T
- r
- u
- e
- 
- 2
- 0
- 0
- 
- /
- 
- t
- h
- i
- s
- -
- h
- o
- s
- t
- -
- d
- o
- e
- s
- -
- n
- o
- t
- -
- e
- x
- i
- s
- t
- -
- x
- y
- z
- 1
- 2
- 3
- .
- e
- x
- a
- m
- p
- l
- e
- 
- F
- a
- l
- s
- e
- `
- 
- i
- n
- 
- 0
- .
- 6
- 
- s
- .
- 
- h
- t
- t
- p
- s
- :
- /
- /
- c
- o
- m
- m
- o
- n
- c
- r
- a
- w
- l
- .
- o
- r
- g
- /
- f
- a
- q
- 
- :
- 
- "
- O
- u
- r
- 
- C
- D
- X
- 
- A
- P
- I
- 
- e
- n
- d
- p
- o
- i
- n
- t
- 
- i
- s
- 
- f
- r
- e
- q
- u
- e
- n
- t
- l
- y
- 
- a
- b
- u
- s
- e
- d
- 
- a
- n
- d
- 
- t
- h
- e
- r
- e
- f
- o
- r
- e
- 
- h
- e
- a
- v
- i
- l
- y
- 
- r
- a
- t
- e
- 
- l
- i
- m
- i
- t
- e
- d
- .
- "

**Proposed change.** Add one sentence to the robots line rule: "When the build prints the line it also reports whether the named host's robots.txt is in the latest crawl, read from that crawl's index files; a host that is absent will not be found this way." The maintainer may decline this as outside the first cut.

<a id="security"></a>

## Security: fetching, injection, catalog integrity and privacy

**Reviewer's summary.** The design's trust model is right in outline (attribute by fetched address, key rows by computed SAID, no redirects, HTTPS only), but five things would be wrong or unsafe if built as written. (1) The byte check is not one-to-one: I ran it against bpm-core and it passes the same document with its `d` left as 44 `#`, four different byte strings for one crafted SAID, and non-JSON bytes, so "verified" and "same SAID, same definition" do not hold until two conditions are added. (2) Nothing read from a source document is validated before it becomes an address or a file name, and the `definitions` template lets a source point the reader at any host and be credited as "serving (verified)" bytes it never served; I recommend deriving the definition address and deleting the template. (3) The private-address rule is a check before the fetch: on Node 24.19 I showed fetch resolving the name a second time and connecting to loopback, 0.0.0.0 reaching a loopback service, and an environment proxy taking resolution away entirely; the rule has to run on the connection (a `lookup` hook on `node:https`), with a complete address list, port 443 only and no IP literals. (4) The limits are named but not numbered and the largest is missing: one 1 MB source document holds 18,724 `serves` entries, which the build would fetch at up to 1 MB each (19.6 GB). (5) The readable pages have no escaping rules, and `JSON.stringify` leaves `</script>` intact inside the JSON-LD block. Against the earlier review: soundness-23 is answered for redirects and streamed size limits but not for connect-time checking, ports, fan-out volume, cross-host definitions or robots.txt; soundness-24 survives as an undefined result when a slow source uses the run; soundness-25 is answered for definitions but not for publications (their `d` is never checked and `target` is a stated SAID); soundness-26 is answered by removing the query API, with a residual cost exposure in the CloudFront recommendation. Beyond those, the design gives no defined result for any failure (a runner with no network would publish an empty catalog), calls an occurrence of 44 characters a verified reference without defining it, and lets strangers' text reach a terminal, a CI log and the AI that drives the CLI without length or control-character rules. Refusing every redirect is workable, because every address the tool fetches names a file. All test scripts are in /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/.

**Skeptic's overall verdict.** I re-ran every cited test and re-opened every cited source: all seventeen findings stand, three in a narrower form (05: the run's time limit does bound total work, so the failure is one source starving the rest; 06: the design's first row rule already stops a publication creating a row; 10: a display name is optional in the AI Catalog format, and `identifier` is the required field with no stated source). Before the maintainer sees the design it must make the byte check one-to-one (03), derive the definition address and validate every SAID and address read from a stranger (02), move the address check onto the connection with certificate validation set explicitly and name resolution inside the time limit (01 and missed item 1), state the page-escaping rules (04), and define per-source limits, outcomes and a rule that an all-failed build publishes nothing (05, 07). Three of the first reviewer's proposed texts need correcting before they are adopted: the limits table contradicts itself (500 definitions at a 1 s gap inside a 60 s budget for one source), 'address order' gives a level's budget to whoever names hosts that sort first, and refusing NAT64 addresses outright would break walks on IPv6-only networks. Two overclaims the first review missed should also be fixed: 'Signatures change that ... counts principals' (a self-held key is as free as an address) and 'the sha-256 digest that format requires' (it is optional, and Ruling 2 excludes a second digest); the catalog's file layout and the local folder's rules are gaps an implementer would have to guess. Questions for the maintainer: the limit numbers as one decision; whether an unsigned publication carries `d` at all; whether a build may take a public exclusion list, given that his scheduled job will repeat strangers' text on his domain unattended; when the package becomes public, since until then nobody else can rebuild his catalog; and whether readers who can reach the web only through a proxy are out of scope for the first cut.

**What the reviewer found sound as written.**

- Refusing every redirect is workable: all three kinds of address the tool fetches name a file (source.json, index.json, robots.txt), so no static host needs a trailing-slash or directory redirect, and an apex-to-www or renamed-host redirect failing visibly is consistent with 'a source is identified by the address'. It needs only the reporting rule in security-07.
- HTTPS only plus no redirects: with certificate validation on, a hostile source that steers a connection to an internal address cannot read the answer, because the internal service would need a certificate for the stranger's own name. I could not construct a read of internal content, only connection attempts (security-01).
- Size limits 'enforced while reading, not from the stated length': a streamed counter stopped a 20 MB gzip body (Content-Length 20,406) at 1,064,960 decoded bytes in my test, so the rule is implementable as stated.
- Rows keyed by the computed SAID and attributed to the fetched address: the soundness-25 attack (overwrite another publisher's row through a claimed identifier) has no equivalent for definitions. The remaining gaps are the template (security-02) and publications (security-06).
- The catalog build never uses a source's `refers` claim: step 3 extracts SAIDs from verified bytes, so a false `refers` cannot record anything in a catalog. It only costs the walk fetches, which the limits in security-05 bound.
- Matching on the reader's machine: the source document is fetched whole and no per-SAID query is sent to a source that does not list the SAID. The structure is already the privacy-preserving one; it only needs to be stated (security-11).
- SAIDs as file names on a case-insensitive file system (macOS): two SAIDs differing only in letter case would collide, but crafting one that case-folds onto a target needs about 2^221 work, and no file is written under an unverified SAID once security-02 and security-03 hold.
- The WHATWG URL parser already neutralizes alternative IP spellings and internationalized names: 2130706433, 0x7f.1, 017700000001, 127.1 and circled digits all parse to 127.0.0.1, and a Cyrillic look-alike host parses to its xn-- form. Parsing once and using only the parsed form is enough (security-02).
- soundness-26 (the public query API with one global throttle) is answered by removal: there is no endpoint, database or per-request compute left to flood. Only the static hosting bill remains (security-16).
- Publications recorded as claimed and the count of sources described as free to inflate: the design does not overclaim for unsigned publications or for source counts.

### security-01: The private-address rule is checked before the fetch, not on the connection, and its address list is incomplete

Severity: must-fix. Section: Fetching safely. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** "The host is resolved first, and private, loopback and link-local addresses are refused" describes a check followed by a fetch. Node's fetch resolves the name again when it connects, so a name can answer the check with a public address and the connection with 127.0.0.1 (shown below). Node's global fetch has no hook for checking the address it connects to, and undici's Agent, which has one, is not importable without adding a dependency. The three classes named leave out 0.0.0.0 (which reaches loopback services on this machine), carrier-grade NAT, IPv6 unique-local (AWS's IPv6 metadata address is in it), NAT64 and 6to4 forms, and multicast. Also unstated: the port (the earlier review asked for the default port only), names that resolve to several addresses (Node tries each), IP-literal hosts (they never reach a lookup hook), environment proxies (with NODE_USE_ENV_PROXY=1 the name goes to the proxy unresolved, so no local check applies), and certificate validation. Honest size of the risk: because HTTPS with a valid certificate for the stranger's own name is required and redirects are refused, a hostile source cannot read an internal service's answer; what remains is connection attempts to internal addresses and ports from the reader's machine or the CI runner. But the rule the design states does not hold as written, and it is the unanswered half of soundness-23 ("checked at connect time", "default port"). The decompression clause ("No transparent decompression beyond the limit") is also ambiguous: fetch inflates silently, and asking for identity does not stop a server sending gzip.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:227-229`: The host is resolved first, and private, loopback and link-local addresses are refused. Tests opt in to localhost explicitly.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2593`: https only, default port; resolve the host and refuse loopback, private, link-local, CGNAT, unique-local and unspecified addresses, checked at connect time
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/fetch-probe.mjs (Node v24.19.0, loopback only)`: C1 pre-check resolution of rebind.test: 93.184.216.34 -> public, allowed
C2 fetch then resolved the name again (lookups so far: 2) and connected to loopback; body {"secret":"from-loopback-target"}
D1 http.get("localhost") with a guarded lookup option: error: refused address 127.0.0.1 | lookup calls 1
D2 http.get("127.0.0.1") with the same option: connected, status 200 | lookup calls 0 (an IP literal never reaches the lookup hook)
- `same script, section E2: a block list holding exactly RFC 1918, 127/8, 169.254/16, ::1 and fe80::/10`: 64:ff9b::7f00:1    blocked: false
2002:7f00:1::      blocked: false
fd00:ec2::254      blocked: false
100.64.0.1         blocked: false
0.0.0.0            blocked: false
::                 blocked: false
- `node -e (loopback server on 127.0.0.1, then fetch of http://0.0.0.0:<port>/ and http://0:<port>/)`: 0.0.0.0              -> loopback service
0                    -> loopback service
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/proxy-probe.mjs and proxy-agent-probe.mjs`: 2. proxy variables set, NODE_USE_ENV_PROXY=1 ... proxy saw: ["CONNECT name-that-only-the-proxy-resolves.internal:443"]
http.get, global agent: answered by PROXY
http.get, own new http.Agent(): answered by ORIGIN
- `fetch-probe.mjs sections A and B`: A1 default fetch on a 302: status 200 redirected true
A2 redirect:"manual": status 302 type basic location http://127.0.0.1:61133/internal
B1 default fetch: content-length header 20406 bytes delivered 20971520
B3 asking for identity does not stop a server that sends gzip anyway: delivered 20971520
- `node -e import('undici') / import('node:undici')`: undici importable as a builtin: no - ERR_MODULE_NOT_FOUND
node:undici: no - ERR_UNKNOWN_BUILTIN_MODULE

**Reviewer's proposed change.** In "Fetching safely", replace the first two bullets and the sentence "No transparent decompression beyond the limit." with:

- HTTPS only, port 443 only, and the host must be a DNS name: an address written as an IP literal is refused. The routine sets certificate validation on explicitly, so no environment variable turns it off.
- Redirects are not followed. A 3xx answer is the outcome `redirected`, reported with the address it named.
- The address check is made on the connection, not before it. The routine resolves the name once, refuses unless every address returned is public, and connects only to an address it checked. In Node this is a `lookup` hook on `node:https` with the routine's own agent. The global `fetch` is not used: it resolves the name again when it connects, has no such hook, and follows the environment's proxy settings when Node is told to, which moves name resolution to a proxy where no check applies.
- Refused addresses. IPv4: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24 and 224.0.0.0/3. IPv6: everything outside 2000::/3 (this covers loopback, the unspecified address, IPv4-mapped, NAT64, unique-local, link-local and multicast), and inside it 2001::/23, 2001:db8::/32 and 2002::/16.
- Requests ask for `Accept-Encoding: identity`. An answer that carries a `Content-Encoding` is refused, so the bytes counted and checked are the bytes on the wire and nothing is inflated.
- Tests opt in to plain HTTP, other ports and loopback through a parameter of the routine that only test code sets. No environment variable, configuration field or command-line flag does it.

**What the skeptic checked.** Re-ran `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/fetch-probe.mjs` (Node v24.19.0, loopback only): C2 fetch made a second lookup and connected to loopback; D2 an IP literal never reached the lookup hook; E2 gaps and B1/B3 as quoted. Re-ran /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/proxy-probe.mjs and /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/proxy-agent-probe.mjs: the proxy saw `CONNECT name-that-only-the-proxy-resolves.internal:443`; `http.get` with its own `new http.Agent()` was answered by ORIGIN. My own /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/s1.mjs: `undici` and `node:undici` are not importable; fetch to `0.0.0.0`, `0` and `[::ffff:127.0.0.1]` reached a loopback service; a `lookup` hook is called once per new connection with `all:true` and Node connects only to what it returns. My own /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/tls.mjs (self-signed HTTPS server on loopback): with NODE_TLS_REJECT_UNAUTHORIZED=0, global fetch and `https.get` without the option both connected (status 200); `https.get` with `rejectUnauthorized:true` was refused (DEPTH_ZERO_SELF_SIGNED_CERT). So the sentence about setting validation explicitly is correct and load-bearing: the 'cannot read an internal answer' property depends on it. design.md:227-229 and spec-review.md:2593 read as quoted. The stated size of the risk is right: connection attempts, not reads.

**Skeptic's better change.** Keep all six bullets. Three corrections. (1) NAT64. The list refuses 64:ff9b::/96 outright. On an IPv6-only network with DNS64 (usual on mobile carriers) the resolver answers with exactly those addresses for every IPv4-only host, so a reader there could reach no IPv4-only source. Replace 'IPv4-mapped, NAT64' in the refused list with: 'An IPv4 address carried inside an IPv4-mapped (::ffff:0:0/96) or NAT64 (64:ff9b::/96) address is checked by the IPv4 list.' This is from RFC 6147, not a test; I have no such network. (2) The lookup hook must not call `dns.lookup`, and the request's time limit must start before name resolution (missed item 1). (3) State the cost in one clause: 'A reader who can reach the web only through a proxy cannot run a walk in this first cut.' Put that to the maintainer as a question, since wide adoption is his second value.

### security-02: Nothing fetched is validated before it becomes an address or a file name; the `definitions` template and the `source` field have no rules

Severity: must-fix. Section: A source (rules for a source); The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The reader substitutes a SAID stated by the source into a template stated by the source, and keeps results in folders "keyed by SAID". The design gives no pattern a stated SAID must match before use, no constraint on the template, and no rule for a `source` field that differs from the address fetched. Tested results: a stated "said" of `../../../admin/delete?id=1&x=` turns the honest template into a request for `/admin/delete?id=1&x=/index.json`; a template may name another host, put `{said}` in the host name (a fresh host per SAID, which defeats "one request at a time per host"), or carry a query. `path.join` of an output folder with an unvalidated SAID leaves the folder. Consequences: (a) forced requests to paths and hosts of the source's choosing, the vector the survey quotes from Webmention; (b) false attribution: with a template that points at another party's host, the walk and the catalog record "source A serves X (verified)" from bytes A never served, against the design's own rule that nothing in one source's files changes what is attributed to another; (c) one file is reachable under many address strings (query, fragment, trailing dot, doubled slash, percent-encoding), each counted as a separate source and each missing the visited set. The earlier review's item (7) asked whether a definition on a different host is allowed; the design does not say.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:93`: **`definitions` is a template.** A reader builds the address of a definition's bytes from it and never guesses a path.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:198`: Every statement is attributed to the source address it was fetched from. Nothing in one source's files can create or change a row attributed to another source.
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/template-probe.mjs`: "../../../admin/delete?id=1&x=" -> https://gym.example/admin/delete?id=1&x=/index.json
"https://victim.example/search?q={said}" -> https://victim.example/search?q=EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U
"https://{said}.evil.example/x.json" -> https://eijetqo6cwkdjlkiubve977olj92nuhboy4npywpqd1u.evil.example/x.json
4 path.join of an output folder and an unvalidated SAID:
   /home/user/.ssh/authorized_keys | /etc/x
- `same script, part 3 (WHATWG URL parser output for eight spellings of one file)`: https://gym.example./.well-known/mad/source.json -> https://gym.example./.well-known/mad/source.json
https://gym.example/.well-known/mad/source.json?1 -> https://gym.example/.well-known/mad/source.json?1
https://gym.example/.well-known/mad/%73ource.json -> https://gym.example/.well-known/mad/%73ource.json
- `fetch-probe.mjs section E1`: E1 "https://gym.exаmple/" -> hostname gym.xn--exmple-4nf
E1 "https://2130706433/" -> hostname 127.0.0.1
E1 "https://①②⑦.⓪.⓪.①/" -> hostname 127.0.0.1
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2229`: "a sender can cause a receiver to make GET requests to arbitrary URLs, opening up a potential DoS vector"; Pingback was abused exactly this way in 2014.

**Reviewer's proposed change.** In "A source": delete the `definitions` line from the example source document and delete the rule "`definitions` is a template." Add these rules:

- **Everything in a fetched document is checked before use.** A SAID is accepted only if it matches `^E[A-Za-z0-9_-]{43}$`. This applies to `serves[].said`, `refers`, `publications[].d`, `publications[].target`, `introductions[].for` and the command line. An entry carrying any other value is dropped and counted. No other string from a fetched document is ever part of a file name, and the local folder and the catalog output are written only inside their own folder.
- **An address has one form.** It is accepted only if the WHATWG URL parser accepts it and the result is `https` on port 443, has a DNS host name with no trailing dot, has no user name, password, query or fragment, and has a path ending in `/.well-known/mad/source.json`. The parser's serialized result is the address: it is what is fetched, compared, stored and shown. Host names are therefore lower-case ASCII and an internationalized name appears in its `xn--` form.
- **The definition address is derived, not declared.** It is the source document's address with `/.well-known/mad/source.json` replaced by `/.well-known/oobi/<SAID>/index.json`. A source cannot place its definitions anywhere else, so bytes credited to a source always came from under its own address.
- **`source` must equal the address the document was fetched from.** If it differs, the document is rejected with the outcome `invalid` and the difference is reported. The field is never used to attribute anything.

If the maintainer keeps the template instead: it must have the same scheme, host and port as the source document, a path under the same folder, `{said}` exactly once as a whole path segment, and no query or fragment; and each row records the definition address actually fetched.

**What the skeptic checked.** Re-ran `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/template-probe.mjs`: every quoted line reproduces (hostile `said` becomes `/admin/delete?id=1&x=/index.json`; template on another host; `{said}` in the host name; eight spellings of one file; `path.join` leaves the folder). fetch-probe E1 reproduces. design.md:93, design.md:198 and discovery-survey.md:2229 read as quoted. Extra, from /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/s1.mjs: a 1,000,048-character address parses and a 300-character host label parses (hostname length 308), so the URL parser enforces neither an address length nor DNS name limits.

**Skeptic's better change.** Adopt the four rules; deriving the address removes a field and a rule and is the better design. Drop the closing fallback paragraph (one design, not two) and instead add the cost to open question 2: 'a publisher whose files already sit at another path must copy them.' Three additions. (a) In 'An address has one form' add: 'It is at most 512 characters; its host is at most 253 characters in labels of at most 63.' Without this an introduction can carry a megabyte-long address into the report and the sources file. (b) As written the rule rejects every `catalogs` entry, because those do not end in `/.well-known/mad/source.json`. Begin it 'A source address has one form' and give catalog addresses their own ending (missed item 2). (c) Say what `source` is for, or delete the field: 'It tells the publisher's build and a finder that reads the file out of a repository where the file is meant to be served, and it makes one address the only valid one when a host answers under several spellings.'

### security-03: The byte check passes several different byte strings for one SAID, and bytes that are not a document

Severity: must-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The rule replaces "every occurrence" of the expected SAID but never requires one, and never rejects bytes that already contain the placeholder. Run against bpm-core's own rule: (1) a gym-bp document with its `d` left as 44 `#` passes the byte check under the genuine SAID while `verify_said` rejects it; (2) a crafted document with two placeholder runs gives four distinct byte strings that all pass for one SAID, three of which bpm-core rejects; (3) any bytes at all, including HTML, pass against their own plain Blake3 digest; (4) JSON with a repeated key passes while bpm-core rejects it, and parsers may read different values from it. So "two parties holding the same SAID hold the same definition" does not hold for what the walk lists as verified, and whichever variant a reader meets first is what lands in the local folder keyed by that SAID. The design's sentence that the two rules agree "whenever a document contains its own SAID only in its SAID field" states a condition the check never enforces. Separately, `verify <file or address> [SAID]` does not say what is checked when the SAID is left out; any document can be made self-consistent, so a bare "verified" there means nothing.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:103-105`: Replace every occurrence of the expected SAID with 44 `#` characters. ... The two agree whenever a document contains its own SAID only in its SAID field, which holds for every document tested.
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/bytecheck.py`: 2. same document, d left as 44 '#' (never SAIDified)
   differs from genuine: True
   byte check: True | bpm-core verify_said: FAIL (said mismatch)
3. crafted document, SAID EFtsdRJT0S5FU3acXhYRgMI7nOOofElqZPc6zYEDs8pa
   distinct byte strings: 4
   d=SAID note=SAID: byte check True | bpm-core verify_said: FAIL (said mismatch)
   d=SAID note=####: byte check True | bpm-core verify_said: PASS
   d=#### note=SAID: byte check True | bpm-core verify_said: FAIL (said mismatch)
   d=#### note=####: byte check True | bpm-core verify_said: FAIL (said mismatch)
4. arbitrary non-JSON bytes, 'SAID' = plain Blake3 of them
   byte check: True
5. duplicate key
   byte check: True | python reads name = hostile | bpm-core verify_said: FAIL (said mismatch)
- `python check over /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/*.json (the tightened conditions cost the test data nothing)`: documents 36 | occurrences of own SAID per document: {1: 36} | own SAID is a whole string value exactly once in 36 | contain a 44-# run: 0 | objects with integer-like keys: 0 | float values: 0
- `fetch-probe.mjs G4 (why a re-serialization comparison cannot be the reader's check in Node)`: G4 JSON.parse/stringify round trip of {"b":1,"10":1,"2":1,"n":1.0,"e":1e-7,"big":12345678901234567890}: {"2":1,"10":1,"b":1,"n":1,"e":1e-7,"big":12345678901234567000}

**Reviewer's proposed change.** Replace the quoted rule with:

> Take the bytes as served. They are verified against the expected SAID only if all of these hold. (1) They are valid UTF-8 and parse as one JSON object. (2) The expected SAID occurs in them exactly once, as a complete string value between double quotes. (3) They contain no run of 44 `#` characters. (4) Replacing that one occurrence with 44 `#` and taking the Blake3-256 digest, CESR-encoded, gives the expected SAID.

Replace the sentence "The two agree whenever ... every document tested." with: "Conditions 2 and 3 make the check one-to-one: exactly one byte string verifies for a SAID. Without them the same document with its SAID field left as the placeholder also passes, which bpm-core rejects. All 36 gym-bp documents meet both conditions; GLEIF's schema is to be re-measured under them."

Add: "Known limit: the check covers bytes, not how they parse. JSON with a repeated key can verify, and parsers may disagree about its value. Node's `JSON.parse` cannot detect this, and comparing against a re-serialization would reject honest documents (it reorders integer-like keys and turns `1.0` into `1`). Detection belongs with MAD's shared SAID library (bpm-nq3.3)."

In "The tool", for `verify`: "With the SAID left out, the command reads the top-level `d` or `$id`, runs the check against it and reports `self-consistent as <SAID>`. It never prints a bare `verified`, because any document can be made self-consistent; the caller compares the SAID with the one they expected."

**What the skeptic checked.** Re-ran `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/bytecheck.py`: all five results as quoted. Read /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py: only top-level `d` is replaced. Wrote /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/tight.py, which implements the four proposed conditions. Output: `gym-bp, 36 documents (loose rule, tightened rule): {(True, 'verified'): 36} | integer-like keys: 0 | floats: 0`; `GLEIF QVI schema copy: True | verified` (the 2,933-byte copy another reviewer fetched, /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/fetched/qvi.bin, headers dated 2026-11-09 05:25 GMT: own SAID once as a quoted string, no placeholder run, compact); the placeholder variant, all four crafted variants and non-JSON bytes are rejected; `duplicate key: True | verified`; `record with its SAID in both d and i (KERI inception shape): True | SAID occurs 2 times`.

**Skeptic's better change.** Adopt the four conditions and the known-limit note. Corrections: (1) 'exactly one byte string verifies for a SAID' should read 'at most one byte string verifies for a SAID'; for the crafted two-placeholder SAID none does. (2) Replace 'GLEIF's schema is to be re-measured under them' with 'GLEIF's schema as served meets both.' (3) Add: 'A record that carries its own SAID in two fields, as a KERI inception event with a self-addressing identifier does in `d` and `i`, does not verify. No MAD definition has that shape, and bpm-core's rule replaces only `d`.' The design's present rule accepts that shape and the new one does not, so the maintainer should see it. (4) For `verify`, the simpler fix is to make the SAID argument required; reading `d` or `$id` gives the command format knowledge the section says it does not need. If the optional form stays, the 'self-consistent as <SAID>' wording is right.

### security-04: The page section has no escaping rules, and the JSON-LD block is where ordinary escaping fails

Severity: must-fix. Section: Readable pages. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** "Every word on the page comes from the definition or from a publication." When a source republishes a definition someone else wrote, that is a stranger's text rendered as HTML on the publisher's own origin. The design states no rule for text, attribute values, link targets or the JSON-LD block. `JSON.stringify` leaves `</script>` intact, so a name or a field value closes the JSON-LD block and opens a script. A string inside a definition that looks like an address (`javascript:`, `data:`) becomes script if it is ever made a link. The second origin the design proposes, GitHub Pages, cannot set response headers, so a header-delivered Content-Security-Policy is not available there; a `<meta>` policy is.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:209-213`: the definition's content as a readable outline ... Every word on the page comes from the definition or from a publication. ... The page also carries a JSON-LD block with the SAID as its identifier
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/fetch-probe.mjs`: G2 JSON.stringify leaves a script end tag intact: {"@id":"E...","name":"</script><script>alert(document.domain)</script>"}
- `/Users/seriouscoderone/code/bpm/mad/src/html.ts:2`: export const esc=(v:unknown):string=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
- `https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP`: You can also specify it using the http-equiv attribute of your document's <meta> element ... because you can then avoid relying on any server infrastructure.

**Reviewer's proposed change.** Add to "Readable pages", after the list:

"**Every string on a page is a stranger's.** The page writer has one way to emit text, and it escapes `& < > " '` (the rule in `mad/src/html.ts`); it has no way to emit raw markup. Attribute values are always double-quoted and escaped. No string from a definition or a publication is ever an element name, an attribute name, an `id`, a `class`, a `style` or a link target. The only links on a page go to `/definitions/<SAID>/`, built from a SAID that matched the pattern, and to the operator's own `catalogs` addresses after the address rule; an address that appears inside a definition is shown as text. The JSON-LD block holds only the SAID and this source's own publication fields, and is written with `<`, `>`, `&`, U+2028 and U+2029 as `\u` escapes. Pages contain no script. Each page carries, first in its head, `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">` and takes its styles from one stylesheet file, so the policy holds on hosts that cannot set headers and an escaping mistake cannot run. A page is the source's own rendering and is evidence of nothing: the check runs on the bytes at the definition address."

Add to "Tests": "**Pages.** A fixture definition and publication whose strings are `</script><script>`, `\"><img src=x onerror=...>`, `javascript:alert(1)` and bidirectional control characters. The test parses the page and finds no element, attribute or link other than the ones the writer emits."

**What the skeptic checked.** fetch-probe G2 re-run: `JSON.stringify` leaves `</script>` intact. /Users/seriouscoderone/code/bpm/mad/src/html.ts:2 reads as quoted. MDN page fetched: the meta-element sentence is exact and is followed by 'However, this option does not support all CSP features.' design.md:209-213 read as quoted. Not run in a browser: that `default-src 'none'` leaves an `application/ld+json` block readable (a data block is never executed) comes from the specifications, not from a test.

**Skeptic's better change.** Adopt the paragraph and the Pages test. Two edits: write links as relative to the page, because a source may sit under a path and `/definitions/<SAID>/` from the origin root is wrong there; and the `catalogs` links follow the catalog address rule, not the source one. Add one sentence, here and in open question 3: 'A source's pages are not served from an origin that also serves an application holding keys or drafts. MAD keeps its stores in the browser's localStorage, which any script on the same origin can read.' Evidence: /Users/seriouscoderone/code/bpm/mad/src/ui.ts:72 `browserStorage = localStorage`; /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:189 names the stores `mad.authoring`, `mad.rehearsals`, `mad.appearance`.

### security-05: The limits that bound work are named but not numbered, and the largest one is missing

Severity: must-fix. Section: Fetching safely; The walk; The catalog. Skeptic: partly; proposed change: adopt-modified.

**Problem.** "Stop at stated limits on sources, depth and time" and "Limits on sources per run, introductions per source and depth" give no numbers, so an implementer must invent every one. No limit covers what a single source document can make the tool do. A 1 MB source document holds 18,724 `serves` entries; the catalog build fetches "every definition a source serves" at up to 1 MB each, which is 19.6 GB and 18,724 requests for one source. In the walk, step 4 fetches every definition whose `refers` names the SAID, and `refers` is the source's own claim, so one document can name a popular SAID in all 18,724 entries. One definition can hold 22,309 SAIDs. Also missing: requests and bytes per run; a time budget per source (soundness-24's point survives: one slow source uses the run and the rest are silently absent, and what the per-run time limit does when it is hit is undefined); a gap between requests to one host (one at a time is not a rate); sizes for the other files fetched (robots.txt, the catalog files `--catalog` reads); and a JSON nesting limit. On this machine a 200 KB document of nested arrays parses, but `JSON.stringify` and any recursive walk of it overflow the stack at a depth that depends on the machine, so the same input can give different builds. "Those naming the SAID first" lets a stranger order the walk, and a wildcard domain can mint a fresh host name per introduction, which passes both the per-host rule and the visited set; only a breadth-first order and the per-source introduction limit contain that.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:147 and :231`: Stop at stated limits on sources, depth and time. ... One request at a time per host and a cap across hosts. Limits on sources per run, introductions per source and depth.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:167`: For every definition a source serves, fetch the bytes and check them. Extract the SAIDs that appear inside.
- `node -e (size arithmetic on the design's own example shapes)`: serves entries in a 1 MB source document: 18724
SAIDs in one refers list / one definition of 1 MB: 22309
introductions in a 1 MB source document: 17772
publications (minimal fields) in 1 MB: 6432
bytes one source can make a build fetch at 1 MB per definition: 19.6 GB
- `fetch-probe.mjs G1`: G1 JSON.parse nested 100000 deep ( 200000 bytes ): ok
   JSON.stringify of it: RangeError Maximum call stack size exceeded
   recursive walk of it: RangeError Maximum call stack size exceeded
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2572`: depth 3 plus a visited set bounds repeats, not volume, so one seed can direct the crawler at a third party's site.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2386`: a catalog can list fake peers or point to slow hosts, so the walker needs budgets and must verify every claim at the claimant.

**Reviewer's proposed change.** In "Fetching safely", replace the bullets on size, time and request limits with this table and the rules under it. The numbers are suggestions for the maintainer to rule on; the rows are what must exist.

| Limit | Walk | Catalog build |
|---|---|---|
| One request, from connect to last byte | 10 s | 10 s |
| Source document, definition, catalog file | 1 MB each | 1 MB each |
| robots.txt | not fetched | 500 KiB |
| JSON nesting depth (deeper is `invalid`) | 64 | 64 |
| `serves` entries read from one source | 2,000 | 2,000 |
| Definitions fetched from one source | 20 | 500 |
| SAIDs taken from one definition | 256 | 256 |
| Publications read from one source | 2,000 | 2,000 |
| Introductions followed from one source | 10 | 10 |
| Depth | 3 | 3 |
| Sources per run | 50 | 2,000 |
| Time for one source, all its requests | 30 s | 60 s |
| Gap between requests to one host | none | 1 s |
| Requests and bytes per run | 500 and 100 MB | 20,000 and 5 GB |

"A count limit cuts in a fixed order (SAIDs in SAID order, addresses in address order) and the source is recorded as `truncated` with the limit that cut it. A source that uses up its time is dropped whole with the outcome `timed-out`; a build never keeps part of a source because the clock ran out. The traversal is breadth-first: every source at one depth is handled before any source at the next, so a source cannot put its own introductions ahead of the rest. Requests in flight are counted per resolved address as well as per host name. The worst case (sources per run times time per source, divided by the number of hosts in flight) must fit inside the CI job's own time limit."

In "The walk" step 5, replace "Stop at stated limits on sources, depth and time." with "Stop at the limits in Fetching safely."

**What the skeptic checked.** /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/sizes.mjs re-derives 18,723 serves entries, 22,308 SAIDs, 17,772 introductions, 6,472 minimal publications and 19.6 GB (the reviewer's figures are within 1, publications within 40). fetch-probe G1 re-run: parse succeeds 100,000 deep, `JSON.stringify` and a recursive walk overflow. design.md:147, :167, :230-231, spec-review.md:2572 and discovery-survey.md:2386 read as quoted. Then checked the proposed table against itself: `500 definitions x 1 s gap = 500 s needed, against a 60 s budget for one source -> most definitions that fit: 60`. Under the proposal's own rule every source with more than about 60 definitions would end `timed-out` and be dropped whole. 'One request, from connect to last byte' also leaves name resolution outside every limit.

**Skeptic's better change.** Keep the table as the list of limits that must exist and the rules under it, with these changes. (1) Drop the rows the 1 MB file limit already bounds ('serves entries read', 'publications read') and fold robots.txt into 'one fetched file'. (2) First row: 'One request, from before name resolution to the last byte.' (3) Make the build column consistent: either no fixed gap for a host that answers promptly, or a time per source derived from the count. As proposed, 500 definitions at a 1 s gap cannot fit in 60 s. (4) Replace 'addresses in address order' as the cut order for introductions with 'one introduction from each introducer in turn, introducers in address order'. Plain address order gives a level's budget to whoever names hosts that sort first: in sizes.mjs, with a budget of 5, three honest introductions and ten to `0N.evil.example`, address order visits five hostile hosts; in-turn order visits gym, city, state and two hostile. (5) Put the numbers to the maintainer as one question with the suggested values, not as twenty-eight separate ones.

### security-06: Publications can still create and flood rows: `d` is never checked, `target` is a stated SAID, and nothing bounds what one source adds to a row

Severity: should-fix. Section: What a catalog row may say; Publications. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Three gaps in the answer to soundness-25. (1) Rows are "keyed by the SAID computed from bytes the build fetched", but a publication reaches a row through `target`, which the source merely states. The design does not say whether a publication of a SAID whose bytes nobody served, or a reference to one, gets a file among the "one per SAID"; 6,432 minimal publications or 22,309 references fit in 1 MB, each a candidate file. (2) `d` is "computed by the same rule", but no step of the walk or the build recomputes it, and the byte rule cannot apply to an object embedded in another file. A source can copy the `d` of someone else's publication onto different text; wherever copies are merged by `d` ("recognizably one publication") the altered text passes as a copy of the original. (3) The design warns that the count of sources is free to inflate, but one source can also attach thousands of publications, or thousands of tiny referring definitions, to one popular SAID's row.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:124`: `d` is the publication's own SAID, computed by the same rule. Copies of one publication on several sources are then recognizably one publication
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:197`: A row is keyed by the SAID computed from bytes the build fetched and checked, never by a SAID a document merely states.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:145 and :168`: Collect the source's publications whose target is the SAID. ... Write static files: one per SAID
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:18-19 (the document rule an embedded record needs)`: copy["d"] = "#" * 44
    raw_json = json.dumps(copy, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

**Reviewer's proposed change.** In "Publications", replace the `d` bullet with: "`d` is the publication's own SAID. It is computed over exactly the six fields `d`, `target`, `name`, `description`, `tags`, `collection`, serialized compactly in that order with `d` set to 44 `#` (the workspace's document rule, since a publication is a record inside another file and has no bytes of its own). A reader recomputes it. A publication with other fields, or whose `d` does not match, is dropped and counted; it is not recorded as claimed. Copies are recognized by `d` only after this check."

Add to "What a catalog row may say":

- A file is written only for a SAID whose bytes this build fetched and verified from at least one source. A publication of, or a reference to, a SAID with no verified bytes in this build creates no file; it is counted per source in the sources file.
- One source adds at most one publication per target (the first in the document; the rest are counted) and at most 50 referring definitions per row, lowest SAID first, with the full count stated.
- The output has a limit on files and on bytes. When it is reached the build stops adding sources, in traversal order, and its build description says so. An open catalog built from free addresses can be flooded; the first cut has no defence beyond these limits, and says so.

**What the skeptic checked.** design.md:124, :145, :168 and :197 read as quoted; /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:18-19 as quoted. sizes.mjs: 6,472 minimal publications fit in 1 MB. /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66: 'Multiple copies of one signed publication do not multiply its endorsement', so the requirement the design cites for `d` concerns signed publications. design.md:127: 'a signed publication is a new record with a new SAID.'

**Skeptic's better change.** Adopt the three row rules, adding to the first: 'so a SAID that definitions refer to but no source found serves has no file.' For `d`, put the choice to the maintainer under open question 4 and recommend the simpler option: leave `d` out of the unsigned publication. Nothing in the first cut reads it (an unsigned copy is only the copying source's own claim, and the signed record gets a new SAID anyway), and keeping it makes this project fix a field order for a record that MAD's bundle (bpm-nq3.5) will own. If `d` stays, the reviewer's recompute rule is the right text. Also add the sentence the limits imply but do not say: 'The maintainer's catalog repeats whatever names and descriptions strangers publish, unattended, and the first cut has no way to leave a source out.' Whether a build may take a public exclusion file named in its build description is a question for him, because it touches 'no hand-curation'.

### security-07: No failure has a defined result, and a runner with no network would publish an empty catalog

Severity: should-fix. Section: The walk; The catalog; What a catalog row may say. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design does not say what the walk reports or the build writes when a source is unreachable, redirects, is refused for its address, returns non-JSON, exceeds a limit, serves bytes that fail the check, or carries an invalid publication. The walk's report has three lists and nowhere to show a source that lists the SAID and serves something else, which is the event a reader most needs to see. "A source that disappears drops out at the next build, because every build starts from nothing" records nothing false, but a build cannot tell a source that is gone from one that was down for a minute or that blocks the CI runner's address, and it cannot tell either from its own network being down. In that last case the scheduled job writes an empty catalog over the good one. The draft spec had a self-check for this; the design dropped it. Refusing redirects is workable only if the refusal is legible: a reader who typed an apex address that redirects to `www` needs to be told where it pointed.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:201`: A source that disappears drops out at the next build, because every build starts from nothing.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:149-153`: The report has three lists ... sources that serve the definition (verified by the byte check); publications of it (claimed); definitions that refer to it
- `git -C /Users/seriouscoderone/code/bpm/mad-discovery show 713a12f:MAD-DISCOVERY-SPEC.md (section 5)`: **Self-check:** our own catalog is always in the seed list, so lookups of our own hashes return at least ourselves.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:64`: A provenance panel reveals these distinctions and labels claimed, verified or unresolved information.
- `fetch-probe.mjs A2 (a refused redirect can still be reported with its target)`: A2 redirect:"manual": status 302 type basic location http://127.0.0.1:61133/internal

**Reviewer's proposed change.** Add a subsection "Outcomes" after "Fetching safely":

"Every address the walk or the build tries ends in exactly one outcome from a fixed list: `ok`, `unreachable` (no answer, a TLS failure or a 5xx), `timed-out`, `redirected` (with the target shown as text and not followed), `refused-address`, `disallowed` (robots.txt), `invalid` (wrong content type, not JSON, too large, too deep, or a `source` that does not match) and `truncated` (with the limit). The catalog's sources file and the walk's report record it. Rows come only from `ok` and `truncated` sources. Within a source, each definition it lists ends `verified`, `unreachable` or `failed-check`. Only `verified` definitions enter a row or the local folder; bytes that fail are discarded, and the counts are recorded. Outcomes are names only: no error text and no timings enter the files.

The walk's report has a fourth list: sources that list the SAID but did not serve bytes that verify, each with its outcome. This is MAD's 'unresolved'.

`catalog build --require <address>` names a source that must end `ok` with at least one verified definition. If one does not, the build writes nothing and exits non-zero. The scheduled job requires the maintainer's own source and publishes only on exit zero, so a network fault on the runner cannot replace the catalog with an empty one."

In "What a catalog row may say", replace the last bullet with: "A source that cannot be reached adds no rows to this build and is listed as `unreachable`. Nothing is carried over from an earlier build, so a build cannot tell a source that is gone from one that was briefly down; the sources file shows which sources were tried and what happened."

**What the skeptic checked.** design.md:149-153 and :201 read as quoted. `git -C /Users/seriouscoderone/code/bpm/mad-discovery show 713a12f:MAD-DISCOVERY-SPEC.md` line 130 has the Self-check sentence. /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:64 as quoted. fetch-probe A2 re-run: with `redirect:"manual"` the 302 and its `location` are readable, so a refused redirect can be reported with its target.

**Skeptic's better change.** Adopt the Outcomes subsection and the fourth list, with two edits. (1) The list has no outcome for a 4xx answer, which is the one signal that does separate gone from down. Add `not-found` (404 or 410) and put other 4xx under `invalid`; then the replacement bullet should end 'a build cannot tell a source that is gone from one that was briefly down unless the host answers 404 or 410.' (2) The guard against an empty catalog needs no new option: 'A build in which no source ended `ok` writes nothing and exits non-zero. The scheduled job names the maintainer's own source among its starting addresses and deploys only on exit zero.' `--require` does the same with one more flag to document.

### security-08: Repeatability depends on timing and on every source answering every builder alike

Severity: should-fix. Section: The catalog ("Repeatable"). Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** "Two parties who run it at the same time should produce the same sources list" fails in three ways as written. A limit on time decides what is included, so a slower network gives a smaller catalog. With several hosts in flight, which sources fall inside "sources per run" depends on the order answers arrive unless the order is fixed. And a source can answer the maintainer's runner and another builder differently, by network address or user agent; two honest builds then differ and nothing in the output shows which source caused it. The design's claim that a reader "who distrusts it can run the same command" rests on being able to compare.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:172`: Two parties who run it at the same time should produce the same sources list. The result changes only as the public web changes.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:230-231`: A time limit per request and per run. One request at a time per host and a cap across hosts.

**Reviewer's proposed change.** Replace "Two parties who run it at the same time should produce the same sources list. The result changes only as the public web changes." with:

"Two parties who run it at the same time produce the same files if every source answered both alike. What a build includes is decided by counts and a fixed order, never by the clock or by which answer arrived first: sources are handled level by level, in address order within a level, and every limit cuts in that order. The sources file records, for each source, the Blake3 digest of the source document bytes the build read, so two builds that differ can be compared source by source. A source can answer two builders differently. A difference between two builds is information about that source and is not evidence against either builder."

**What the skeptic checked.** design.md:172 and :230-231 read as quoted. Nothing is built, so this is reasoning from the text: a time limit and arrival order both decide what is included as written, and the design has no way to compare two builds source by source.

**Skeptic's better change.** Adopt, with two edits. Replace 'in address order within a level' with the in-turn order from security-05; address order is chosen by whoever picks the host names (sizes.mjs output under security-05). Write the source document's digest in hex, so a plain digest of bytes is not mistaken for a SAID, which security-03 has just said it is not.

### security-09: "Verified" is claimed for a reference, and the design never says what a reference is

Severity: should-fix. Section: Trust: what is verified, observed and claimed; The walk; A source. Skeptic: confirmed; proposed change: adopt.

**Problem.** The walk's third list is marked "(verified)" and is said to answer "who else issues or relies on this model". What is checked is that a 44-character string occurs in some bytes. The extraction rule is not defined: a substring anywhere, a whole string value, an object key? Two implementations would produce different verified lists and different `refers`. Any definition can carry any SAID in a free-text field at no cost, and one source can serve thousands that do, so this list is as cheap to inflate as the count of sources, which the design does warn about. The Trust table also departs from the design authority it cites: the Publications section names MAD's three states as "claimed, verified, unresolved", and the table gives Verified, Observed, Claimed with no place for a claim that could not be confirmed.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:153-155`: definitions that refer to it, with the path of the reference inside them (verified). The third list is what answers "who else issues or relies on this model".
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:239`: | Verified | These bytes have this SAID. This definition contains a reference to that SAID. |
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:127`: That makes every publication *claimed*, in MAD's three provenance states (claimed, verified, unresolved).
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:95`: **`refers` lists the SAIDs that appear inside a served definition.**

**Reviewer's proposed change.** In "A source", extend the `refers` rule: "A reference is a JSON string value, at any depth, that is exactly a SAID by the pattern and is not the document's own SAID. Object keys and parts of longer strings are not references. Its path is the JSON Pointer to that value."

In the Trust table, replace the Verified row with: "| Verified | These bytes have this SAID. This definition's bytes contain that SAID as a string value at this path. |" and add a row: "| Unresolved | A source lists a SAID as served or referred to, and the bytes could not be fetched or did not verify. |"

Add under the table: "An occurrence is not a relationship. The tool does not know whether the field is a reliance, an issuance or a note, and adding one costs nothing, so the list of referring definitions is no more a vote than the count of sources."

In "The walk", change the third bullet to "definitions whose bytes contain it, with the path (the occurrence is verified; its meaning is not interpreted)" and change "The third list is what answers" to "The third list is the raw material for answering".

**What the skeptic checked.** design.md:95, :127, :153-155 and :239 read as quoted; the Trust table has no row for unresolved. Ran /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-security/refs.py over /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store: `totals by position: {'own': 36, 'value': 99}`, no SAID as an object key or inside a longer string, a regex over the bytes finds the same count, 28 distinct referenced SAIDs and all 28 are in the store. The GLEIF schema copy's two other SAIDs are also whole string values. So the proposed definition of a reference loses nothing on the test data, and two implementations would otherwise be free to differ.

### security-10: Strangers' text reaches a terminal, a CI log and the AI that drives the CLI, with no rule on length or control characters

Severity: should-fix. Section: The walk; Publications; AI Catalog entries. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The walk prints publication names, descriptions, tags, addresses and JSON paths written by whoever runs a source. No field has a length limit, so a 1 MB description is valid. Terminal escape sequences in those strings can redraw the report, for example to paint a line that reads as verified. In GitHub Actions, text written to standard output in the workflow-command form is acted on by the runner. MAD's Ruling 5 makes an AI the primary driver of the CLI, so the walk's output is model input and a publication's description is the cheapest prompt-injection channel in the system. A JSON output mode does not solve this by itself: `JSON.stringify` escapes only U+0000 to U+001F. In the AI Catalog file, entries need a display name (the survey records it as required), and the design does not say where it comes from; if it is taken from a definition's content, a stranger's text goes into the one file the design publishes for agents.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190`: A business-process-oriented CLI, driven by people or by an AI through documented commands and a Skill, is the primary author
- `https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands`: these commands are then sent to the runner over `stdout`.
- `fetch-probe.mjs G3`: G3 JSON.stringify of ESC, C1 and bidi controls: "\u001b[2J <U+009B>2J <U+202E>" (only U+0000-U+001F are escaped)
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:219`: one entry per served definition, in the Linux Foundation AI Catalog format: the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:171`: Each entry MUST carry identifier (schema pattern ^urn:air:[a-zA-Z0-9.-]+(:[a-zA-Z0-9._-]+)+$, publisher segment an FQDN), displayName, type and exactly one of url or data

**Reviewer's proposed change.** In "Publications", add: "Field limits: `name` up to 120 characters, `description` up to 1,000, at most 16 `tags` of up to 40 characters each, `collection` up to 120. A publication over a limit is dropped and counted."

In "The walk", add a paragraph: "**Text from a source is data.** Before a string from a fetched document is printed, the C0 and C1 control characters, DEL and the Unicode bidirectional controls are replaced by visible escapes, and such a string never begins an output line. With `--json`, every string a source wrote sits under a key named `claimed` beside that source's address, and the tool's own messages never embed one. The Skill that drives the CLI states that `claimed` text is a stranger's description and is never an instruction."

In "AI Catalog entries", add: "An entry's display name and description come only from this source's own publication of that definition. A served definition without one uses its SAID as the display name. Nothing in the file is copied from a definition's content."

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:190 as quoted. GitHub's workflow-commands page fetched: the stdout sentence is exact, and `::error`, `::warning`, `::notice`, `::group`, `::add-mask` and `::stop-commands` are all acted on from stdout. fetch-probe G3 re-run. design.md:219 as quoted. The design has no `--json` option and no Skill (grep of design.md). /Users/seriouscoderone/code/bpm/mad/src/views.ts has no `maxlength`, so the field limits would be new to MAD as well.

**Skeptic's better change.** Adopt the field limits, and note under open question 4 that they bind MAD's bundle too. In 'The walk' adopt the first two sentences of the paragraph and replace the rest with one: 'In the report every string a source wrote is shown as quoted text beside that source's address, and the tool's own messages never contain one.' A `--json` option, a `claimed` key and a Skill are not in this design. For AI Catalog entries: 'An entry's identifier is built from the SAID. A display name or description, when present, comes only from this source's own publication of that definition. Nothing in the file is copied from a definition's content.'

### security-11: The design does not say what a walk reveals about the reader

Severity: should-fix. Section: The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Every source a walk visits sees the reader's network address, the tool's user agent and the time. A source that lists a SAID in `serves`, or names it in a `refers`, then receives a request naming that SAID from every reader whose walk reaches it (steps 2 and 4). Listing a SAID is therefore a way to learn who is interested in it. A catalog host sees each per-SAID file a reader requests, which is the single observation point an aggregation site has. The design's structure already limits this, because a source document is fetched whole and matched on the reader's machine, but the design neither says so nor states that requests carry no Referer or cookies, so an implementer could lose the property without noticing.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:143-146`: 1. Fetch the source document at the given address. 2. If the source serves the SAID, fetch the bytes and check them. ... 4. For each served definition whose `refers` lists the SAID, fetch that definition
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2229`: Privacy: a ping tells the origin who adopted.

**Reviewer's proposed change.** Add to "The walk", before the paragraph on the local folder:

"**What a walk reveals.** Every source the walk visits sees the reader's network address, the tool's user agent and the time. A source learns which SAID the reader is asking about only when the walk requests that SAID's bytes, or a definition that refers to it, from that source. The source document is always fetched whole and matched on the reader's machine, and the walk never sends a SAID to a source that does not list it. Requests carry no cookies, no credentials and no Referer, so a source does not learn who introduced the reader. A catalog host sees each per-SAID file a reader requests. A source that wants to know who is interested in a SAID can list it; the reader cannot prevent that except by not fetching. With `--listed-only` the walk reads source documents and reports what they list without requesting any definition, so no source learns the SAID and every result is unresolved instead of verified."

**What the skeptic checked.** design.md:143-146 and discovery-survey.md:2229 read as quoted. The exposure follows from steps 2 and 4: a source learns the SAID only when it lists it or lists a definition that refers to it, and the design does not say so or state that requests carry no cookies or Referer.

**Skeptic's better change.** Adopt the paragraph up to '...the reader cannot prevent that except by not fetching.' Drop the `--listed-only` sentence. It adds a mode in which every result is unresolved; if the maintainer wants it, it is a question for him, not a correction.

### security-12: The scheduled build reads strangers' input and then writes to the maintainer's source, and the design says nothing about how the job is arranged

Severity: should-fix. Section: The catalog. Skeptic: confirmed; proposed change: adopt.

**Problem.** "It is a scheduled job in continuous integration that writes files to his source." The same job would parse JSON from any address a stranger names and then hold a credential that can write the maintainer's source document, his definitions and his pages. Two of the four finders need a credential ("a paid query", "Needs a token"), which would be present while stranger-chosen addresses are fetched. Nothing confines the catalog output to its own folder on the host, limits its size, or keeps HTML out of it. Node has no Blake3, so the package takes a hash-critical dependency the design does not name or pin; the earlier review made the same point about the draft's canonicalization package.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:174`: It is a scheduled job in continuous integration that writes files to his source.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:184-186`: Needs a bulk download or a paid query. ... One company. Needs a token.
- `fetch-probe.mjs H (Node v24.19.0)`: H  crypto.getHashes() has blake3: false | blake2: blake2b512,blake2s256
- `https://docs.github.com/en/actions/reference/security/secure-use`: Pin references to actions to a commit SHA in your workflow files. ... make sure that the `GITHUB_TOKEN` is granted the minimum required permissions.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2746`: the spec should pin an exact version of this hash-critical dependency

**Reviewer's proposed change.** Add a subsection "The scheduled build" at the end of "The catalog":

"The job has three stages that share nothing but files.

1. **Find.** Runs the finders. It may hold a finder's credential. It reads only the named public inputs and writes a list of candidate addresses. It fetches no address a stranger chose.
2. **Build.** Fetches and checks. It holds no secret and no cloud credential, and its repository token is read-only. It writes only inside `--out`.
3. **Deploy.** Holds the deploy credential, which can write only under the catalog's own folder on the host. It runs no code over fetched data; it copies. It refuses output that exceeds the limits on files and bytes or that contains any file other than `.json` files with the expected names. It runs only if the build exited zero.

The catalog output contains no HTML, so no stranger's string is ever rendered on the maintainer's origin, and the deploy credential cannot touch his source document, definitions or pages. Dependencies are installed from a committed lockfile with install scripts disabled, and CI actions are pinned to commit hashes. The Blake3 implementation is one named package at an exact version, proven by the outside vectors in Tests."

**What the skeptic checked.** design.md:174 and :184-186 read as quoted. fetch-probe H re-run: `crypto.getHashes() has blake3: false`. GitHub's secure-use page fetched: both sentences exact. spec-review.md:2746 as quoted. /Users/seriouscoderone/code/bpm/mad/package.json lists only `@marcbachmann/cel-js`, `esbuild` and `typescript`, so the Blake3 package is a new choice for the workspace that MAD's shared SAID library (bpm-nq3.3) will inherit; worth naming for the maintainer when the text is adopted.

### security-13: robots.txt handling is one clause, and a robots line can aim every builder at other hosts

Severity: should-fix. Section: Fetching safely; Finding sources nobody linked. Skeptic: confirmed; proposed change: adopt.

**Problem.** soundness-23 item (8) is not answered: the design says "A named user agent. A catalog build also honours robots.txt." It names no product token, and does not say what happens when robots.txt is unreachable or redirects. RFC 9309 requires complete disallow when the file is unreachable, allows access when it is absent, and advises following five redirects, which conflicts with "Redirects are not followed"; the design has to choose. In the robots-line finder, a robots.txt can carry any number of `Mad-Source` lines naming addresses on any host, and each becomes a candidate that every builder fetches, so one robots.txt on a crawled host directs requests at third parties.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:233`: A named user agent. A catalog build also honours robots.txt.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2572`: (8) robots.txt: no product token is named, and behaviour when robots.txt is unreachable is unstated.
- `https://www.rfc-editor.org/rfc/rfc9309.txt sections 2.3.1.2, 2.3.1.3, 2.3.1.4 and 2.5`: SHOULD follow at least five consecutive redirects, even across authorities. ... the crawler MAY access any resources on the server. ... the crawler MUST assume complete disallow. ... The parsing limit MUST be at least 500 kibibytes [KiB].
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:97`: **The robots.txt line** (`Mad-Source: <address of the source document>`) is the one thing a source emits for parties who have never heard of it.

**Reviewer's proposed change.** Replace the last bullet of "Fetching safely" with:

"- The tool identifies itself as `mad-discovery/<commit> (+<address of a page that describes it>)`. A catalog build obeys the robots.txt group for `mad-discovery`, or else the group for `*`. It fetches robots.txt once per host per build with the same routine. A 4xx answer means no restrictions. A 5xx answer, no answer or a redirect means the host is skipped with the outcome `disallowed`; this is stricter than RFC 9309's advice to follow redirects, and deliberate. The walk is one person's own lookup and does not consult robots.txt."

In "Finding sources nobody linked", add after the table: "The robots-line finder takes at most one `Mad-Source` line from a robots.txt, and only if the address it names is on the host that robots.txt came from. A line naming another host is ignored."

**What the skeptic checked.** design.md:97 and :233 read as quoted; spec-review.md:2572 item (8) as quoted. RFC 9309 fetched: section 2.3.1.2 'SHOULD follow at least five consecutive redirects', 2.3.1.3 'the crawler MAY access any resources on the server', 2.3.1.4 'the crawler MUST assume complete disallow', 2.5 'The parsing limit MUST be at least 500 kibibytes' all present.

### security-14: The tests named do not exercise the hostile cases

Severity: should-fix. Section: Tests. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The Walk tests cover a cycle, a dead source, an oversized file, a redirect and a false `refers`. None covers the cases a hostile source would actually try: a name that resolves differently at connect time, a compressed body, a slow body, a SAID that is a path, a document that is deep instead of large, a `serves` list at the limit, or a publication with a copied `d`. The earlier review asked that each fetch rule be a fixture-server test. Copying fetched keys into a plain object replaced that object's prototype in a probe here, which is the kind of mistake only a fixture catches.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:266`: Also: a cycle, a dead source, an oversized file, a redirect, a source whose `refers` names a reference that is not in the bytes.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2593`: Make each rule a phase 3 fixture-server test.
- `fetch-probe.mjs G5`: G5 copying fetched keys into a plain object: ({}).polluted = undefined | o.polluted = true (prototype of o replaced by a fetched value)

**Reviewer's proposed change.** Add to "Tests":

"- **Hostile sources.** Each of these is a fixture and each ends in a named outcome, never a crash or a hang: a lookup that answers public on the first call and loopback on the second; a host written as an IP literal, as `0`, and as an IPv4-mapped IPv6 address; a gzip-encoded answer; a body that arrives one byte per second; a source document with a `said` of `../../x`, with a `source` that names another address, with `serves` one past the limit, and nested 100,000 deep; keys named `__proto__` and `constructor` in a source document and in a definition; a definition served with its `d` left as 44 `#`; a publication whose `d` is copied from another publication with different text; a publication with a 1 MB description and with terminal escape sequences in its name.
- **SAID check, added failing cases.** The placeholder variant, a document containing its SAID twice, bytes that are not JSON."

**What the skeptic checked.** design.md:266 as quoted; the last sentence of spec-review.md:2593 as quoted; fetch-probe G5 re-run: `o.polluted = true`. None of the listed hostile cases is in the design's Tests section.

**Skeptic's better change.** Adopt both bullets and add four fixtures for what this check found: a name whose resolution never answers (ends `unreachable` inside the request limit); a source document that answers 404; ten introductions from one source whose addresses sort ahead of the honest ones (the honest ones are still visited); and a public IPv4 address returned in NAT64 form (accepted).

### security-15: An address can change hands and nothing in the first cut notices

Severity: consider. Section: Trust: what is verified, observed and claimed. Skeptic: confirmed; proposed change: adopt.

**Problem.** In the first cut a source is its address, and every publication is attributed to an address. Addresses change hands: a domain lapses and is re-registered, a GitHub Pages user name is released and taken, a DNS record keeps pointing at a deleted bucket. Other parties' introductions keep pointing there, and the new holder inherits the old one's standing with every reader and every catalog. The design says the domain is "a locator, never an identity" but, until signatures, it is the only identity there is, and the Trust section does not say what that costs.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:92`: **A source is identified by the address of its source document**, not by a domain. ... The domain is a locator, never an identity.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:127`: In this first cut a publication is unsigned, so it is attributed only to the source address it was fetched from.

**Reviewer's proposed change.** Add to "Trust", after "Nothing else is known in this first cut.": "An address can change hands: a domain lapses, a host account is released, a DNS record outlives the bucket it pointed to. Whoever holds the address then inherits every introduction that names it. A statement attributed to an address says who controlled that address when it was fetched and nothing about who controlled it before. Signatures by a self-held key are what end this."

**What the skeptic checked.** design.md:92 and :127 read as quoted. The Trust section (design.md:235-245) says nothing about an address changing hands.

### security-16: soundness-26's cost exposure survives in the hosting recommendation

Severity: consider. Section: Open questions for the maintainer (question 3). Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Removing the query API answers soundness-26. The recommended home for the maintainer's source is still a public CloudFront distribution in his own account, and on pay-as-you-go pricing anyone can request the definitions and catalog files in a loop and the transfer is billed. AWS's pricing page now lists a flat-rate plan at $0 a month with no overage charges, which bounds the bill at zero.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:294`: Recommended: a static bucket behind CloudFront in the `personal` AWS account, under a domain he controls
- `https://aws.amazon.com/cloudfront/pricing/ (fetched 2026-11-08)`: There are no additional overage charges or usage calculations, even during traffic spikes or attacks.

**Reviewer's proposed change.** In open question 3, after "under a domain he controls", add: "on CloudFront's flat-rate Free plan, which has no overage charges, so a flood of requests cannot become a bill (the plan's allowances, 1M requests and 100 GB a month when checked, are to be confirmed before the deploy step)".

**What the skeptic checked.** design.md:294 as quoted. Fetched https://aws.amazon.com/cloudfront/pricing/ on 2026-11-08: Free plan '$0/month', requests '1M', data transfer '100GB', and 'There are no additional overage charges or usage calculations, even during traffic spikes or attacks.' The page does not say what happens once a plan's allowance is used up.

**Skeptic's better change.** '...on CloudFront's flat-rate Free plan, which has no overage charges, so a flood of requests cannot become a bill. What the plan does once its allowance is used up (1M requests and 100 GB a month when checked) is not stated on the pricing page and is to be confirmed before the deploy step, because a source that stops answering drops out of every walk and every catalog.'

### security-17: "A reader who distrusts it can run the same command" is not true while the repository is private

Severity: consider. Section: The catalog. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The catalog's only claim to being non-authoritative is that anyone can rebuild it, and its build description records "the tool's commit". Ruling 1 makes the repository private. Until the package is public nobody else can run the command or resolve that commit, and a deployed catalog would be exactly the single trusted site the objective rules out. This does not reopen Ruling 1; the design should say when its claim starts to hold.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md:17`: Remote: `github.com/seriouscoderone/mad-discovery`, private.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:174`: There is no database and no query endpoint, and a reader who distrusts it can run the same command.

**Reviewer's proposed change.** After that sentence add: "That holds from the day the package is public. The maintainer's catalog is not deployed before then (build order, step 5), because a catalog nobody else can rebuild is an authoritative site."

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad-discovery/README.md:17 and design.md:174 read as quoted. With the repository private nobody else can run the command or resolve the commit a build description records.

**Skeptic's better change.** Do not write it as a rule in the catalog section: when the package becomes public is the maintainer's decision and Ruling 1 says private. Add it as open question 5: 'When does the package become public? Until then "a reader who distrusts it can run the same command" is not true, the commit in a build description resolves for nobody else, and a deployed catalog is the one authoritative copy. Recommended: step 5 deploys the source; the catalog is deployed once the package is public.'

### What the security reviewer missed

#### Name resolution sits outside every time limit, and the system resolver can stall the whole run

Severity: should-fix.

**Problem.** Section 'Fetching safely'. The design's 'A time limit per request' does not say it covers name resolution, and the first reviewer's table starts the clock 'from connect'. In Node, `dns.lookup` (what fetch, `node:https` and the proposed lookup hook use unless told otherwise) runs the system resolver on four worker threads shared with file reads and writes, and a call in progress cannot be cancelled. A hostile source that introduces fresh host names under a DNS zone that answers slowly holds one thread per name for the system resolver's own timeout. With four held, every other lookup queues behind them, so healthy sources end `timed-out` and the walk or build is steered into reporting them absent. This is the 'fresh host names, slow responses' case, and neither the design nor the first review bounds it.

**Evidence.**

- `
- n
- o
- d
- e
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- s
- e
- c
- u
- r
- i
- t
- y
- /
- d
- n
- s
- 2
- .
- m
- j
- s
- `
- 
- (
- l
- o
- o
- p
- b
- a
- c
- k
- 
- o
- n
- l
- y
- ;
- 
- f
- o
- u
- r
- 
- b
- u
- s
- y
- 
- p
- o
- o
- l
- 
- t
- h
- r
- e
- a
- d
- s
- 
- s
- t
- a
- n
- d
- 
- i
- n
- 
- f
- o
- r
- 
- f
- o
- u
- r
- 
- s
- t
- a
- l
- l
- e
- d
- 
- l
- o
- o
- k
- u
- p
- s
- )
- :
- 
- `
- c
- -
- a
- r
- e
- s
- 
- R
- e
- s
- o
- l
- v
- e
- r
- 
- a
- g
- a
- i
- n
- s
- t
- 
- a
- 
- s
- i
- l
- e
- n
- t
- 
- s
- e
- r
- v
- e
- r
- :
- 
- E
- T
- I
- M
- E
- O
- U
- T
- 
- a
- f
- t
- e
- r
- 
- 6
- 0
- 5
- 
- m
- s
- 
- (
- p
- o
- o
- l
- 
- s
- t
- i
- l
- l
- 
- b
- u
- s
- y
- :
- 
- t
- r
- u
- e
- )
- `
- 
- /
- 
- `
- h
- e
- a
- l
- t
- h
- y
- 
- s
- o
- u
- r
- c
- e
- 
- (
- n
- a
- m
- e
- 
- "
- l
- o
- c
- a
- l
- h
- o
- s
- t
- "
- ,
- 
- d
- e
- f
- a
- u
- l
- t
- 
- l
- o
- o
- k
- u
- p
- ,
- 
- 1
- 
- s
- 
- l
- i
- m
- i
- t
- )
- :
- 
- T
- I
- M
- E
- D
- 
- O
- U
- T
- 
- a
- f
- t
- e
- r
- 
- 1
- 0
- 0
- 3
- 
- m
- s
- `
- 
- /
- 
- `
- a
- l
- l
- 
- 4
- 
- p
- o
- o
- l
- 
- t
- h
- r
- e
- a
- d
- s
- 
- r
- e
- l
- e
- a
- s
- e
- d
- 
- a
- f
- t
- e
- r
- 
- 4
- 2
- 8
- 5
- 
- m
- s
- `
- .
- 
- `
- n
- o
- d
- e
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- s
- e
- c
- u
- r
- i
- t
- y
- /
- d
- n
- s
- .
- m
- j
- s
- `
- :
- 
- w
- i
- t
- h
- 
- a
- 
- p
- o
- o
- l
- 
- o
- f
- 
- o
- n
- e
- 
- b
- u
- s
- y
- 
- t
- h
- r
- e
- a
- d
- ,
- 
- `
- d
- n
- s
- .
- l
- o
- o
- k
- u
- p
- (
- "
- l
- o
- c
- a
- l
- h
- o
- s
- t
- "
- )
- 
- a
- n
- s
- w
- e
- r
- e
- d
- 
- a
- f
- t
- e
- r
- 
- 4
- 3
- 1
- 
- m
- s
- `
- 
- a
- n
- d
- 
- `
- f
- s
- .
- r
- e
- a
- d
- F
- i
- l
- e
- 
- a
- n
- s
- w
- e
- r
- e
- d
- 
- a
- f
- t
- e
- r
- 
- 4
- 3
- 1
- 
- m
- s
- `
- ,
- 
- b
- o
- t
- h
- 
- o
- n
- l
- y
- 
- w
- h
- e
- n
- 
- t
- h
- e
- 
- t
- h
- r
- e
- a
- d
- 
- w
- a
- s
- 
- r
- e
- l
- e
- a
- s
- e
- d
- 
- a
- t
- 
- 4
- 3
- 0
- 
- m
- s
- ;
- 
- a
- 
- l
- o
- o
- k
- u
- p
- 
- h
- o
- o
- k
- 
- t
- h
- a
- t
- 
- n
- e
- v
- e
- r
- 
- a
- n
- s
- w
- e
- r
- s
- 
- i
- s
- 
- e
- n
- d
- e
- d
- 
- b
- y
- 
- `
- t
- i
- m
- e
- o
- u
- t
- :
- 
- 5
- 0
- 0
- `
- 
- a
- n
- d
- 
- b
- y
- 
- `
- A
- b
- o
- r
- t
- S
- i
- g
- n
- a
- l
- .
- t
- i
- m
- e
- o
- u
- t
- (
- 5
- 0
- 0
- )
- `
- 
- a
- f
- t
- e
- r
- 
- 5
- 0
- 5
- 
- m
- s
- 
- a
- n
- d
- 
- i
- s
- 
- `
- S
- T
- I
- L
- L
- 
- P
- E
- N
- D
- I
- N
- G
- 
- a
- f
- t
- e
- r
- 
- 2
- 5
- 0
- 2
- 
- m
- s
- `
- 
- w
- i
- t
- h
- 
- n
- o
- 
- l
- i
- m
- i
- t
- .
- 
- h
- t
- t
- p
- s
- :
- /
- /
- n
- o
- d
- e
- j
- s
- .
- o
- r
- g
- /
- a
- p
- i
- /
- d
- n
- s
- .
- h
- t
- m
- l
- :
- 
- '
- i
- t
- 
- i
- s
- 
- i
- m
- p
- l
- e
- m
- e
- n
- t
- e
- d
- 
- a
- s
- 
- a
- 
- s
- y
- n
- c
- h
- r
- o
- n
- o
- u
- s
- 
- c
- a
- l
- l
- 
- t
- o
- 
- g
- e
- t
- a
- d
- d
- r
- i
- n
- f
- o
- (
- 3
- )
- 
- t
- h
- a
- t
- 
- r
- u
- n
- s
- 
- o
- n
- 
- l
- i
- b
- u
- v
- '
- s
- 
- t
- h
- r
- e
- a
- d
- p
- o
- o
- l
- .
- 
- T
- h
- i
- s
- 
- c
- a
- n
- 
- h
- a
- v
- e
- 
- s
- u
- r
- p
- r
- i
- s
- i
- n
- g
- 
- n
- e
- g
- a
- t
- i
- v
- e
- 
- p
- e
- r
- f
- o
- r
- m
- a
- n
- c
- e
- 
- i
- m
- p
- l
- i
- c
- a
- t
- i
- o
- n
- s
- 
- f
- o
- r
- 
- s
- o
- m
- e
- 
- a
- p
- p
- l
- i
- c
- a
- t
- i
- o
- n
- s
- '
- .

**Proposed change.** Add to 'Fetching safely': 'A request's time limit starts before name resolution. Names are resolved with a resolver whose queries the routine can time out and abandon (`node:dns` `Resolver` with a timeout and a fixed number of tries), never with `dns.lookup`: that call runs the system resolver on four worker threads shared with file access, cannot be cancelled, and while four slow names hold them every other source waits. A name that does not resolve in time ends `unreachable`.'

#### Catalog addresses, the catalog's file layout and when the walk reads a catalog are undefined

Severity: should-fix.

**Problem.** Sections 'A source', 'The walk' and 'The catalog'. The build writes 'one per SAID, one listing every source found..., and one describing the build' with no names or paths, yet the walk with `--catalog <address>` must find the file for a SAID. An implementer has to invent the path, which is the same declared-versus-derived question security-02 settles for definitions, with the same risks if the catalog's content names its own file addresses. The design also does not say whether a walk reads the catalogs that a visited source names in `catalogs` ('A reader who knows one source thereby learns of catalogs'). If it does, a hostile source can hand the reader a hostile catalog. And a catalog's file for a SAID can list any number of addresses; nothing says the limit on introductions per source applies to it, or in what order a capped list is taken from a row that is open to flooding.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 6
- 8
- 
- '
- W
- r
- i
- t
- e
- 
- s
- t
- a
- t
- i
- c
- 
- f
- i
- l
- e
- s
- :
- 
- o
- n
- e
- 
- p
- e
- r
- 
- S
- A
- I
- D
- ,
- 
- o
- n
- e
- 
- l
- i
- s
- t
- i
- n
- g
- 
- e
- v
- e
- r
- y
- 
- s
- o
- u
- r
- c
- e
- 
- f
- o
- u
- n
- d
- 
- a
- n
- d
- 
- h
- o
- w
- 
- i
- t
- 
- w
- a
- s
- 
- f
- o
- u
- n
- d
- ,
- 
- a
- n
- d
- 
- o
- n
- e
- 
- d
- e
- s
- c
- r
- i
- b
- i
- n
- g
- 
- t
- h
- e
- 
- b
- u
- i
- l
- d
- '
- ;
- 
- :
- 1
- 5
- 9
- 
- '
- W
- i
- t
- h
- 
- `
- -
- -
- c
- a
- t
- a
- l
- o
- g
- 
- <
- a
- d
- d
- r
- e
- s
- s
- >
- `
- ,
- 
- t
- h
- e
- 
- w
- a
- l
- k
- 
- a
- l
- s
- o
- 
- t
- a
- k
- e
- s
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- 
- f
- r
- o
- m
- 
- a
- 
- c
- a
- t
- a
- l
- o
- g
- ,
- 
- c
- h
- e
- c
- k
- i
- n
- g
- 
- e
- a
- c
- h
- 
- o
- n
- e
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- w
- a
- y
- .
- '
- ;
- 
- :
- 8
- 6
- 
- `
- "
- c
- a
- t
- a
- l
- o
- g
- s
- "
- :
- 
- [
- "
- h
- t
- t
- p
- s
- :
- /
- /
- g
- y
- m
- .
- e
- x
- a
- m
- p
- l
- e
- /
- c
- a
- t
- a
- l
- o
- g
- /
- c
- a
- t
- a
- l
- o
- g
- .
- j
- s
- o
- n
- "
- ]
- `
- ;
- 
- :
- 9
- 6
- 
- '
- A
- 
- r
- e
- a
- d
- e
- r
- 
- w
- h
- o
- 
- k
- n
- o
- w
- s
- 
- o
- n
- e
- 
- s
- o
- u
- r
- c
- e
- 
- t
- h
- e
- r
- e
- b
- y
- 
- l
- e
- a
- r
- n
- s
- 
- o
- f
- 
- c
- a
- t
- a
- l
- o
- g
- s
- '
- .
- 
- T
- h
- e
- 
- d
- e
- s
- i
- g
- n
- 
- g
- i
- v
- e
- s
- 
- n
- o
- 
- p
- a
- t
- h
- 
- f
- o
- r
- 
- t
- h
- e
- 
- p
- e
- r
- -
- S
- A
- I
- D
- 
- f
- i
- l
- e
- 
- a
- n
- y
- w
- h
- e
- r
- e
- 
- (
- r
- e
- a
- d
- 
- i
- n
- 
- f
- u
- l
- l
- )
- .

**Proposed change.** Add to 'The catalog': 'A catalog is three kinds of file in one folder, and its address is the address of its build description: `<folder>/catalog.json`, `<folder>/sources.json` and `<folder>/said/<SAID>.json`. A reader derives the other two from the first and never takes a file address from a catalog's content. A catalog address passes the address rule for sources except for its ending. The walk reads a catalog only when the reader names it with `--catalog`; catalogs named in a source document are listed in the report and never fetched on a source's word. From a catalog's file for a SAID the walk takes at most the number of introductions allowed from one source, chosen at random and reported as a sample, because a row is open to flooding and any fixed order can be occupied.' The three names are suggestions; add them to open question 2.

#### 'Signatures change that' implies that counting principals is a vote; a self-held key is as free as an address

Severity: should-fix.

**Problem.** Section 'Trust'. The design says a source can publish any SAID at no cost, 'so the number of sources publishing a definition is not a vote. Signatures change that', and that a reader then 'counts principals, not addresses'. A principal in MAD is a self-held key, which anyone can create in any number at no cost. A count of signing principals is exactly as cheap to inflate as a count of addresses. What a signature adds is attribution that does not depend on the host and survives a change of address; it makes a count meaningful only over principals the reader already has a reason to believe. As written the paragraph promises the future design more than it can give, and contradicts the design's own careful line that which principals to believe stays the reader's decision.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 4
- 3
- 
- '
- s
- o
- 
- t
- h
- e
- 
- n
- u
- m
- b
- e
- r
- 
- o
- f
- 
- s
- o
- u
- r
- c
- e
- s
- 
- p
- u
- b
- l
- i
- s
- h
- i
- n
- g
- 
- a
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- 
- i
- s
- 
- n
- o
- t
- 
- a
- 
- v
- o
- t
- e
- .
- '
- ;
- 
- :
- 2
- 4
- 5
- 
- '
- S
- i
- g
- n
- a
- t
- u
- r
- e
- s
- 
- c
- h
- a
- n
- g
- e
- 
- t
- h
- a
- t
- ,
- 
- a
- n
- d
- 
- t
- h
- e
- y
- 
- a
- r
- e
- 
- a
- d
- d
- i
- t
- i
- v
- e
- .
- 
- .
- .
- .
- 
- a
- 
- r
- e
- a
- d
- e
- r
- 
- w
- h
- o
- 
- c
- a
- n
- 
- c
- h
- e
- c
- k
- 
- i
- t
- 
- m
- a
- r
- k
- s
- 
- t
- h
- e
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- 
- v
- e
- r
- i
- f
- i
- e
- d
- 
- a
- n
- d
- 
- c
- o
- u
- n
- t
- s
- 
- p
- r
- i
- n
- c
- i
- p
- a
- l
- s
- ,
- 
- n
- o
- t
- 
- a
- d
- d
- r
- e
- s
- s
- e
- s
- .
- '
- ;
- 
- :
- 2
- 0
- 0
- 
- '
- W
- h
- i
- c
- h
- 
- s
- o
- u
- r
- c
- e
- s
- 
- o
- r
- 
- p
- r
- i
- n
- c
- i
- p
- a
- l
- s
- 
- t
- o
- 
- b
- e
- l
- i
- e
- v
- e
- 
- s
- t
- a
- y
- s
- 
- t
- h
- e
- 
- r
- e
- a
- d
- e
- r
- '
- s
- 
- d
- e
- c
- i
- s
- i
- o
- n
- .
- '
- 
- B
- e
- a
- d
- 
- b
- p
- m
- -
- u
- p
- m
- .
- 2
- 5
- ,
- 
- m
- a
- i
- n
- t
- a
- i
- n
- e
- r
- '
- s
- 
- c
- o
- m
- m
- e
- n
- t
- 
- o
- f
- 
- 2
- 0
- 2
- 6
- -
- 1
- 0
- -
- 1
- 7
- :
- 
- '
- P
- e
- o
- p
- l
- e
- 
- d
- o
- 
- n
- o
- t
- 
- s
- i
- g
- n
- 
- i
- n
- ;
- 
- t
- h
- e
- y
- 
- h
- o
- l
- d
- 
- a
- 
- c
- r
- y
- p
- t
- o
- g
- r
- a
- p
- h
- i
- c
- 
- i
- d
- e
- n
- t
- i
- t
- y
- 
- a
- n
- d
- 
- a
- r
- e
- 
- w
- h
- o
- 
- t
- h
- e
- y
- 
- s
- a
- y
- 
- t
- h
- e
- y
- 
- a
- r
- e
- .
- '

**Proposed change.** Replace 'Signatures change that, and they are additive.' with: 'Signatures do not make a count meaningful either: a self-held key costs nothing to create. What they add is attribution that does not depend on the host and survives a change of address. They are additive.' Replace 'marks the publication verified and counts principals, not addresses' with 'can confirm which principal made the statement, whatever address served it, and can count the principals they already have a reason to believe'.

#### The local folder has no rule for what is written, what a later walk may say from it, or how large it grows

Severity: should-fix.

**Problem.** Section 'The walk'. 'Fetched definitions are kept in a local folder keyed by SAID, with a log of where and when each was retrieved, so a remote outage does not erase what was learned.' The design does not say whether only verified bytes are kept, whether a file is checked again when read back, or how a later walk uses the log. If a walk reports a source as serving a SAID from the log during an outage, a past observation is presented under the list the design labels 'verified by the byte check'. The folder also grows without limit across runs, at up to 1 MB per definition a stranger chooses to serve, and its location is unstated.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 5
- 9
- 
- (
- q
- u
- o
- t
- e
- d
- 
- a
- b
- o
- v
- e
- )
- 
- i
- s
- 
- t
- h
- e
- 
- o
- n
- l
- y
- 
- m
- e
- n
- t
- i
- o
- n
- 
- o
- f
- 
- t
- h
- e
- 
- f
- o
- l
- d
- e
- r
- 
- i
- n
- 
- t
- h
- e
- 
- d
- e
- s
- i
- g
- n
- 
- (
- `
- g
- r
- e
- p
- 
- -
- n
- 
- -
- i
- 
- "
- l
- o
- c
- a
- l
- 
- f
- o
- l
- d
- e
- r
- "
- `
- 
- r
- e
- t
- u
- r
- n
- s
- 
- t
- h
- a
- t
- 
- o
- n
- e
- 
- l
- i
- n
- e
- )
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 4
- 0
- 
- d
- e
- f
- i
- n
- e
- s
- 
- O
- b
- s
- e
- r
- v
- e
- d
- 
- a
- s
- 
- '
- T
- h
- i
- s
- 
- s
- o
- u
- r
- c
- e
- 
- a
- d
- d
- r
- e
- s
- s
- 
- s
- e
- r
- v
- e
- d
- 
- t
- h
- i
- s
- 
- r
- e
- c
- o
- r
- d
- 
- a
- t
- 
- t
- h
- i
- s
- 
- t
- i
- m
- e
- '
- ,
- 
- w
- h
- i
- c
- h
- 
- t
- h
- e
- 
- w
- a
- l
- k
- '
- s
- 
- t
- h
- r
- e
- e
- 
- l
- i
- s
- t
- s
- 
- h
- a
- v
- e
- 
- n
- o
- 
- p
- l
- a
- c
- e
- 
- f
- o
- r
- .

**Proposed change.** Replace that sentence with: 'Definitions that verified are kept in one local folder, a file per SAID, with a log of where and when each was retrieved. Nothing that failed the check is kept. A file is checked against its SAID again whenever it is read. What the log holds is reported in its own list as observed, with its date, and never as what a source serves now. The folder has a stated location and a size limit; when it is full the walk still reports and keeps nothing more.'

#### 'The sha-256 digest that format requires' is wrong: the member is optional, and emitting it adds the second digest Ruling 2 excludes

Severity: should-fix.

**Problem.** Section 'AI Catalog entries'. The design lists 'the sha-256 digest that format requires' among an entry's fields. The project's own research says the AI Catalog `digest` member is optional and that no sampled publisher emits it. The Terms section says 'this project adds no other digest' and Ruling 2 says mad-discovery defines 'no digest of its own'. Emitting a sha-256 the format does not require puts a second digest of the same bytes into a file the design publishes, one that nothing in this design checks. The same sentence omits `identifier`, the member the format does require, so an implementer must guess its form.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 1
- 9
- 
- '
- t
- h
- e
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- '
- s
- 
- a
- d
- d
- r
- e
- s
- s
- ,
- 
- a
- 
- m
- e
- d
- i
- a
- 
- t
- y
- p
- e
- ,
- 
- t
- h
- e
- 
- s
- h
- a
- -
- 2
- 5
- 6
- 
- d
- i
- g
- e
- s
- t
- 
- t
- h
- a
- t
- 
- f
- o
- r
- m
- a
- t
- 
- r
- e
- q
- u
- i
- r
- e
- s
- ,
- 
- a
- n
- d
- 
- t
- h
- e
- 
- S
- A
- I
- D
- 
- u
- n
- d
- e
- r
- 
- a
- n
- 
- e
- x
- t
- e
- n
- s
- i
- o
- n
- 
- k
- e
- y
- '
- ;
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 5
- 
- '
- t
- h
- i
- s
- 
- p
- r
- o
- j
- e
- c
- t
- 
- a
- d
- d
- s
- 
- n
- o
- 
- o
- t
- h
- e
- r
- 
- d
- i
- g
- e
- s
- t
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- r
- e
- s
- e
- a
- r
- c
- h
- /
- d
- i
- s
- c
- o
- v
- e
- r
- y
- -
- s
- u
- r
- v
- e
- y
- .
- m
- d
- :
- 1
- 4
- 3
- 
- '
- E
- n
- t
- r
- y
- 
- f
- i
- e
- l
- d
- s
- :
- 
- i
- d
- e
- n
- t
- i
- f
- i
- e
- r
- 
- (
- o
- p
- e
- n
- 
- t
- e
- x
- t
- ,
- 
- a
- n
- y
- 
- U
- R
- I
- 
- o
- r
- 
- U
- R
- N
- )
- ,
- 
- t
- y
- p
- e
- 
- .
- .
- .
- ,
- 
- e
- x
- a
- c
- t
- l
- y
- 
- o
- n
- e
- 
- o
- f
- 
- u
- r
- l
- 
- o
- r
- 
- d
- a
- t
- a
- ,
- 
- a
- n
- d
- 
- o
- p
- t
- i
- o
- n
- a
- l
- 
- d
- i
- s
- p
- l
- a
- y
- N
- a
- m
- e
- ,
- 
- d
- e
- s
- c
- r
- i
- p
- t
- i
- o
- n
- ,
- 
- t
- a
- g
- s
- ,
- 
- v
- e
- r
- s
- i
- o
- n
- ,
- 
- u
- p
- d
- a
- t
- e
- d
- A
- t
- ,
- 
- e
- x
- t
- e
- n
- s
- i
- o
- n
- s
- ,
- 
- p
- u
- b
- l
- i
- s
- h
- e
- r
- ,
- 
- d
- i
- g
- e
- s
- t
- ,
- 
- t
- r
- u
- s
- t
- M
- a
- n
- i
- f
- e
- s
- t
- s
- [
- ]
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- r
- e
- s
- e
- a
- r
- c
- h
- /
- s
- p
- e
- c
- -
- r
- e
- v
- i
- e
- w
- .
- m
- d
- :
- 1
- 6
- 6
- 6
- 
- '
- `
- d
- i
- g
- e
- s
- t
- `
- 
- i
- s
- 
- a
- n
- 
- o
- p
- t
- i
- o
- n
- a
- l
- 
- A
- I
- 
- C
- a
- t
- a
- l
- o
- g
- 
- m
- e
- m
- b
- e
- r
- 
- .
- .
- .
- 
- p
- u
- b
- l
- i
- s
- h
- e
- r
- s
- 
- d
- o
- 
- n
- o
- t
- 
- e
- m
- i
- t
- 
- `
- d
- i
- g
- e
- s
- t
- `
- 
- i
- n
- 
- p
- r
- a
- c
- t
- i
- c
- e
- 
- (
- 0
- 
- o
- f
- 
- 1
- 7
- 8
- 
- s
- a
- m
- p
- l
- e
- d
- 
- e
- n
- t
- r
- i
- e
- s
- )
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- R
- E
- A
- D
- M
- E
- .
- m
- d
- :
- 1
- 8
- 
- '
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- 
- d
- e
- f
- i
- n
- e
- s
- 
- n
- o
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- 
- f
- o
- r
- m
- a
- t
- 
- a
- n
- d
- 
- n
- o
- 
- d
- i
- g
- e
- s
- t
- 
- o
- f
- 
- i
- t
- s
- 
- o
- w
- n
- .
- '

**Proposed change.** Replace the field list with: 'the identifier the format requires, built from the SAID; the definition's address; a media type; and the SAID under an extension key. The format's `digest` member is optional and is left out: the SAID is the check, and this project adds no second digest.' If the maintainer wants the sha-256 for AI Catalog consumers that verify artifacts, that is his choice of an adapter field and should be asked as a question, not stated as a requirement of the format.

<a id="objective"></a>

## Objective: does it replace a reference site

**Reviewer's summary.** Built as written, the design gives a person one of a reference site's functions (reading a definition, on the publisher's own page) and gives a program two more (who else uses it, through `who` and the per-SAID catalog files; relationships, through `refers`). A list of what exists across sources is not specified at all: the catalog writes one file per SAID, a sources list and a build description, with no index and no stated layout, so `who --catalog` cannot be built without guessing and an author who does not already hold a SAID has no way in (objective-01, must-fix). Browsing by topic and searching by a business term are absent and sit behind MAD beads deferred at P3 and P4 (bpm-nq3.7, bpm-upm.22); what replaced what is absent and unmentioned, and gym-bp's store already holds 13 of 36 documents in five same-alias groups with no `supersedes`; independent assessment is honestly deferred. I recommend the catalog build also write static pages (an index and a page per SAID) from the same rows: the survey's AT Protocol precedent shows a directory gets built anyway, a generated page with no text, ranking or form of its own is the mechanical view Ruling 3 allows, and the maintainer should be asked to rule on it. HANDOFF's first criterion says "discover and reuse"; the design restates it as two authors arriving at the same SAID, and my trace with gym-bp data stops at discovery without a SAID and again at reuse, where bpm-core refused to freeze until every pinned document was in the store and the design has no command that fetches a definition with what it refers to. The stranger test proves the build joins candidates it is handed, not that a public input contains a new source, and done_when clause 1 passes on a single source; the design should carry a proposed done_when with a live clause. Introductions are hand-typed and point from adopter to origin, so a walk from an origin misses its adopters; the design is right to have no announce step under Ruling 3 but should say adopters are found only through a catalog. On scope, the AI Catalog section rests on a wrong statement (the digest is optional in that format and emitting it adds a second digest), the local cache duplicates retention the README assigns to mad, readable pages belong in step 1, and two real hosts should go up before any code because the finder's input is monthly. The four open questions leave out the decisions that most affect the objective: whether the maintainer runs and publishes a catalog (his fifth value), what happens if no finder passes (the written fallback is a seeded crawl), and whether the catalog writes pages. I did not measure any finder; web quotes from GitHub's documentation and the AI Catalog specification came through a summarising fetch.

**Skeptic's overall verdict.** All sixteen findings point at real gaps: eleven hold as written and five hold in a narrower form, mostly because their figures came from the maintainer's local gym-bp store (36 documents, 8 of them leftover freezes) and not from gym-bp as committed (28, with 61 references and 4 referrers each for `admission` and `payment-received`, not 99, 6 and 7). One sub-claim is refuted by test: Common Crawl does archive the robots.txt of hosts that disallow it, Cloudflare-managed ones included. Before the maintainer sees the design it must name the catalog's files and give it an index, correct the `refers` example and state a rule that also counts keys, correct the statement that AI Catalog requires a digest, replace "36" with the reproducible 28 and say what `build` serves, describe the configuration file including the source's address, make the `catalog build` command line match the text, drop the walk's cache, state that a walk from an origin misses its adopters, list what a walk could not resolve, move pages to the first build step, and carry a proposed done_when with a live stranger clause. I changed several of the first reviewer's remedies: a fixed catalog layout instead of a template, no `list` command, `serves` not tied to publications (that would abolish the mirror the design keeps on purpose), no record passed from `get` to `build`, and no deep links between sources' pages, which `build` cannot form without a network. The questions for the maintainer are six: whether he runs and publishes a catalog and whether it carries browsable pages (with the measured price of about 150 GB per build for the robots line); which finder comes first and what happens if none passes; the names and paths; the hosts; the publication record (its differences from MAD's, a lineage claim, and whether an unsigned publication has a SAID at all); and whether AI Catalog entries ship in this cut. Whether assemblies are published is not one of them, because the deferred ruling bpm-nq3.6 already holds it.

**What the reviewer found sound as written.**

- Serving and publishing are separate lists, so a mirror is not counted as an endorsement; this matches mad-ux-design.md:66 and I found no path by which serving alone creates a publication.
- The generic `refers` list gives a usable "who relies on this" over gym-bp without knowing kinds: 99 references, all whole string values, none dangling; `admission` has 6 referrers and `payment-received` has 7.
- A compact served copy is usable downstream: `bpm verify` accepted a compact copy of the admission document, and a second workspace froze an RR against compact copies in its store.
- Leaving out an announce or ping step is consistent with Ruling 3 (no submission step, nothing for a source to run); the gap is in what the text says about the consequence, not in the choice.
- Deferring independent assessment to signed third-party statements is honest and matches what openhaven.net itself requires (it refuses self-attestation).
- Deferring near-match discovery to the category SAID matches the bpm-nq3.7 comment that left structural category and tag search in mad.
- Catalog rows keyed by a SAID computed from fetched bytes and attributed per source address, with counts stated as counts of addresses: I found no way, as specified, for one source to create or alter a row attributed to another.
- `catalogs` in the source document matches MAD's own wording for how discovery starts (mad-ux-design.md:43, bootstrapped introductions to available catalogs).
- The design does not bring back a hosted crawler, database, query API or registry endpoint, and apart from the optional AI Catalog digest it adds no digest beside the SAID.

### objective-01: The catalog has no list of what exists and no stated layout

Severity: must-fix. Section: The catalog. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design says a reference site gives "a list of what exists" and that this project supplies it, and promises "a directory of definitions" as a mechanical view. The catalog as specified writes one file per SAID, one sources list and one build description. Nothing lists the SAIDs, and a static host does not list a folder. Per source, `serves` is a bare list of SAIDs; names exist only in `publications`. So across sources there is no "what exists", and anyone who does not already hold a SAID has no way in. The layout is also unstated. The example catalog address is `.../catalog/catalog.json`, but the design does not say which of the three files that is, or how `who --catalog <address>` gets from it to the file for one SAID. A source document gets a template for exactly this reason ("never guesses a path"); the catalog gets none. Browsing by topic and searching by a business term have no home in this cut either: publications carry `tags` and `collection` and nothing reads them. That work is owned by bpm-nq3.7 (P3, deferred) and bpm-upm.22 (P4, deferred, behind bpm-upm.21, bpm-nq3.5 and bpm-nq3.3), and the design's waiting table has no row for it.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:9`: A reference site adds three things on top of that: somewhere to read a definition, a way to learn who else uses it, and a list of what exists. This project supplies all three from what parties publish about themselves.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:168`: Write static files: one per SAID, one listing every source found and how it was found, and one describing the build
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:86`: "catalogs": ["https://gym.example/catalog/catalog.json"]
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:159`: With `--catalog <address>`, the walk also takes introductions from a catalog, checking each one the same way.
- `bpm-nq3.7 (comment, 2026-11-08)`: It leaves structural category and tag search here.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:45`: Explore combines search by business term, definition kind, curator, endorser and structural relationship with human-curated directory trees.

**Reviewer's proposed change.** In "The catalog", replace step 4 with: "4. Write static files. `catalog.json`: the catalog's own address, a `said` template for the per-SAID file (as `definitions` is for a source), the addresses of the two lists below, and the build description (the command, the tool's commit, and the public inputs used, each with its date or snapshot name). `index.json`: every SAID found, in SAID order, each with the number of source addresses serving it and the name, tags and collection that each publication claims for it, with the source address that claimed them. One file per SAID holding the three lists of the walk's report. `sources.json`: every source found and how it was found." In "The walk", replace the last sentence with: "With `--catalog <address>` the walk fetches that `catalog.json`, builds the per-SAID address from its template and takes introductions from that file, checking each one the same way." In "What waits on other work", add the row: "Searching by business term or tag across sources | Tag search (bpm-nq3.7) and Explore (bpm-upm.22). Until then `index.json` and its page are the only cross-source list, read by eye or filtered locally." The file names join open question 2.

**What the skeptic checked.** Re-read /Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md lines 9, 11, 50-56, 64-69, 86, 159, 163-170, 256 and 282-288. The catalog's outputs are "one per SAID, one listing every source found and how it was found, and one describing the build": no file lists the SAIDs, no file is named, and nothing says how `--catalog <address>` gets from `.../catalog/catalog.json` to the file for one SAID. A `serves` row holds only `said` and `refers`. `bd show bpm-nq3.7` (comment: "It leaves structural category and tag search here"), `bd show bpm-upm.22` (deferred P4, depends on bpm-upm.21, which depends on bpm-nq3.5) and /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:45 read as quoted. The waiting table has no row for search by term.

**Skeptic's better change.** Adopt the four files, the walk sentence and the waiting-table row, with two changes. (1) Fix the layout instead of adding a template: "A catalog is a folder. Its address is the address of `catalog.json`. `index.json`, `sources.json` and `said/<SAID>.json` sit beside it under those names." A source needs a template because its bytes sit under `/.well-known/oobi/`; a catalog has no such constraint, and a fixed layout lets `who --catalog` and a source's page (built with no network) form the address of a catalog's file for a SAID without fetching anything first. Walk sentence: "With `--catalog <address>` the walk reads `said/<SAID>.json` beside that `catalog.json` and takes introductions from it, checking each one the same way." (2) Add to the `index.json` text: "A SAID that no source publishes is listed by SAID alone." End the waiting-table row at "Until then `index.json` is the only cross-source list"; add "and its page" only if the catalog pages of objective-02 are approved.

### objective-02: Nothing a person can open spans more than one source; the catalog should write pages, and the maintainer should rule on whether that is "the site"

Severity: should-fix. Section: Readable pages. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** What a person can open in this cut is one page per definition per source. It shows that source's own publications, the outline, the referrers on the same source, and links to catalogs, which open JSON. There is no page listing what a source serves, no page showing which other sources serve or refer to a SAID, and no way to build the address of another source's page: the source document has a template for bytes but none for pages, while a source may sit under any path. So for a person, "who else uses it" and "what exists" do not exist; they exist for a program. Mapped against the functions the earlier review listed for openhaven.net: reading a definition is supplied (generic outline; a renderer that knows MAD's kinds waits on bpm-vfn.1). Who else uses it is supplied to a program only. What exists is unspecified across sources (objective-01). Browsing by topic and searching by a term are absent (bpm-nq3.7, bpm-upm.22). Comparable attributes are the definition's own structure with side-by-side compare deferred (bpm-upm.23). Relationships are supplied by `refers`; exact convergence by the count of source addresses; near convergence deferred (category SAID). Independent assessment is deferred to signatures and said so. What replaced what is absent (objective-06). The project's own evidence says what follows when the view is missing: AT Protocol published schemas with no registry and three directory sites were built, the first because there was no place to browse. If this build emits only JSON, somebody has to make a site over it, which is what the objective says nobody should need. A page written by the same command from the same rows, with no text, ranking or form of its own, is the mechanical view Ruling 3 allows. What would make it "the site" is hand-entered content, a submission form, or a tool that defaults to one catalog's address. The cost to state: whoever hosts a catalog shows strangers' claimed text under their own address.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:205-211`: the definitions on this source that refer to it;
- the catalogs this source introduces, for looking further.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:92-93`: A source can therefore live under a path on a shared host. [...] A reader builds the address of a definition's bytes from it and never guesses a path.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:1549`: Lexicon Garden (January 2026) says 'Until now, there hasn't been a central place to browse, search, and learn about these schemas. That's why I built Lexicon Garden.' [...] That is the realistic ceiling for the maintainer's objective: the protocol can remove hand curation and make any index replaceable, but it did not remove indexes.
- `bpm-5g1.3 (comment, the ruling's origin)`: Precedent for the form ruled here: AT Protocol publishes its schemas without a registry, and directory sites appeared anyway, generated automatically from published records.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:3078`: People would still want a site that explains each hash, which is the reference site the objective wants to make unnecessary.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2777`: OpenHaven provides comparable standard attributes, a taxonomy, a relationship graph and matrix, and independent assessment (see missed 1).

**Reviewer's proposed change.** (a) In "A source": add `"pages": "https://gym.example/definitions/{said}/"` to the source document and the rule "**`pages` is a template** for the readable page of a definition, as `definitions` is for its bytes." Add to the layout: "/definitions/index.html    a page listing what this source serves, by the names its publications give". (b) In "Readable pages": add the bullet "the sources this source introduces for this SAID, each linked to that source's page for it and labelled as an introduction, not a finding"; change the catalogs bullet to "the catalogs this source introduces, each linked to that catalog's page for this SAID". (c) In "The catalog", add: "The build also writes the same rows as pages: `index.html` and one page per SAID, where each source is linked to its own page for that SAID. The pages carry fixed labels and no other text of the build's own, no order but SAID order, no ranking and no form. Every claimed string is escaped and shown with the source address that claimed it; links out carry `rel="nofollow"`. Each page ends with the build description. The tool has no built-in catalog address." (d) Put the choice to the maintainer as an open question (text in objective-13).

**What the skeptic checked.** design.md:205-211 (what a page shows), 50-56 (no page listing what a source serves), 63 and 93 (one template, for bytes), 272 (`build` runs with "No network"). The only cross-source element on a page is "the catalogs this source introduces", which are JSON. /Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:1549 and spec-review.md:2777 and 3078 read as quoted; the `bd show bpm-5g1.3` comment reads as quoted. /Users/seriouscoderone/code/bpm/mad/HANDOFF.md:82 allows "a deterministic templated generator", so fixed labels on a generated page do not break MAD's shown-text rule.

**Skeptic's better change.** Adopt (a), (c) and (d); write (c) as the recommended answer to the question, not as settled text. Change (b): `build` cannot link to another source's page for a SAID, because that address comes from the other source's `pages` template and `build` has no network. Write instead: "the sources this source introduces for this SAID, shown by address and labelled as introductions; the catalogs this source introduces, each linked to that catalog's page for this SAID" (the catalog link can be formed offline once the catalog layout is fixed, see objective-01). The hop from one source's page to another's goes through a catalog page, which is written after every source document has been fetched. Add one rule for source pages and catalog pages alike: "Every string taken from a definition or a publication is written as escaped text. An address becomes a link only if it is an https address. The pages carry no script." design.md:232 ("Nothing fetched is executed or rendered") covers fetching only, and catalog pages put strangers' strings on the catalog host's own origin. Add: "`build` writes no catalog address the operator did not put in the configuration." Drop `rel="nofollow"`; the objective does not need it.

### objective-03: The stranger test proves the join, not the finding; done_when clause 1 passes on one source; no test covers pages

Severity: should-fix. Section: Tests. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Clause 1 of the epic's done_when sets up two sources "that have never linked to each other" and then asks the lookup to list "every source reachable through its introductions". With that setup nothing is reachable, so the clause passes on a single source and never exercises a walk. The design's three-origin walk test is the real test, but the design does not say which test answers which clause, and it does not propose the amended done_when that bpm-5g1.5 requires. Clause 2 says "from public inputs, with no hand-kept seed list". The stranger test uses "a fixture standing for the finder's public input", which is a hand-written list of both addresses in the input's format. It proves that the build joins candidates it is given. It cannot prove that a public input contains a new source. For the recommended finder the survey says a host enters the input only if Common Crawl's frontier reaches it, so a host that no ordinary web page links to is not there, and a host behind Cloudflare's managed robots.txt is hidden from it. Clause 3 (a page per definition) has no test. Build step 5's "live check" is not defined, so a reviewer cannot tell when clause 2 is met.

**Evidence.**

- `bd show bpm-5g1 (run from /Users/seriouscoderone/code/bpm)`: 1. With two sources on different origins that have never linked to each other, a lookup for a SAID run against one source's address lists that source's publication and every source reachable through its introductions [...] 2. A catalog rebuilt by one documented command from public inputs, with no hand-kept seed list and no submission step, lists both sources for that SAID.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:268`: **The stranger case.** Two sources that never link to each other, plus a fixture standing for the finder's public input. The catalog lists both for the same SAID.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:643`: A new host enters Common Crawl only if the crawl frontier reaches it; fetch lists are ranked by harmonic centrality, so an unlinked new publisher is likely absent.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:715`: Cloudflare's managed robots.txt lists CCBot among the user agents it disallows, so a publisher behind that setting is invisible to Common Crawl whatever its sitemap says.
- `bd show bpm-5g1.5`: the epic's done_when is amended to match

**Reviewer's proposed change.** Add a section "Acceptance" before "Build order", as the proposed done_when: "1. Walk. Three sources on three origins; the first introduces the second and the second the third. `who <SAID> --from <first>` lists all three as serving it, each verified by the byte check and shown with its chain of introductions, and lists what it could not resolve. 2. Stranger, by fixture. Two sources that never link to each other, and a fixture in the finder's input format that names both. `catalog build` lists both for the SAID. This proves the build joins what a finder proposes. It does not prove that a public input contains a new source. 3. Stranger, live. Two real sources on two hosts that never link to each other and are named on no command line. A catalog built by the documented command from a named public snapshot lists both for the SAID. Until this passes, the objective is not shown to be met and the epic stays open; if two snapshots in a row list neither, open question 1 is reopened. 4. Pages. Every definition a source serves has a page, and from a catalog's index page a person reaches each source's page for a SAID by links alone. 5. The maintainer has approved this design." In "Tests", reword the stranger bullet to end "...The catalog lists both for the same SAID. This tests the join, not the finder's reach (see Acceptance 3)." and add: "**Pages.** Every SAID in `serves` has a page; each page shows the SAID and this source's publications of it; every link on it resolves inside the build output or is an address from the source document."

**What the skeptic checked.** `bd show bpm-5g1` and `bd show bpm-5g1.5` (run from /Users/seriouscoderone/code/bpm) read as quoted; design.md:266-268, 276, 294. Clause 1 as written is met by one source, and "live check" is not defined. discovery-survey.md:643 as quoted. I re-tested the Cloudflare sentence: downloaded 13 files of Common Crawl's October 2026 robots.txt archive and ran `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-objective/cc_scan2.py cc/*.warc.gz`. Output: "13 files: {'resp': 11062, 'ok': 7043, 'cf': 2, 'dis': 72, 'both': 2}". 72 archived robots.txt files tell CCBot "Disallow: /"; 2 carry Cloudflare's managed block, and in both the origin's own lines follow "END Cloudflare Managed Content" intact.

**Skeptic's better change.** Adopt the Acceptance list and both Tests edits, with three changes. Clause 3: add "One of the two hosts is one whose robots.txt the previous crawl already holds, so a miss there means the line was not picked up and a miss on the other means the crawl did not visit it." Without that the clause can fail for a reason that says nothing about the design. Say beside clause 3 that it waits on a third party's monthly schedule and can hold the epic open; whether it stays in the epic or moves to a follow-up bead is for the maintainer, with the recommendation to keep it in. Clause 4's second half ("from a catalog's index page a person reaches each source's page") applies only if catalog pages are approved. Do not write into the design that Cloudflare's managed robots.txt hides a host.

### objective-04: The fallback catalog is a seeded crawl, which the ruling and the done_when exclude, and the command that takes the seeds is not in the tool table

Severity: should-fix. Section: Finding sources nobody linked. Skeptic: confirmed; proposed change: adopt.

**Problem.** The design says that until a finder is proven the catalog covers what is reachable "from the sources named on its command line". A list of sources on a command line is a hand-kept seed list. The maintainer's catalog is described as a scheduled job, so a catalog published in that state is hand-curated by him, and anyone who wants in has to ask him to add their address, which is a submission step. Ruling 3 counts neither as meeting the objective, and done_when clause 2 excludes a seed list in words. The design treats this as a limit to note in the build description; it is a decision for the maintainer (publish a seeded catalog in the meantime, or publish none). The tool table also disagrees with the text: `catalog build --out <folder>` takes no source addresses and names no finder or input.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:191`: Until a finder is proven, the catalog covers only what is reachable by introductions from the sources named on its command line. That limit is stated in the catalog's own build description.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:256`: | `catalog build --out <folder>` | The catalog build. |
- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md:19`: The objective is met as: no hand-curation, no submission step, no authoritative site.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:174`: It is a scheduled job in continuous integration that writes files to his source.

**Reviewer's proposed change.** Replace the last paragraph of "Finding sources nobody linked" with: "`catalog build` also accepts source addresses on its command line (`--from <address>`, repeatable), for tests and for a reader's own use. A catalog built from them alone is a seeded crawl: its list of sources is somebody's hand-kept list, which Ruling 3 does not count as meeting the objective, and its build description says so in those words. Whether the maintainer publishes such a catalog before a finder is proven is open question 1." In "The tool", change the row to: "`catalog build --out <folder> [--finder <name> --input <snapshot>] [--from <address>]...` | The catalog build. With no finder it is a seeded crawl and says so."

**What the skeptic checked.** design.md:163-166, 172, 174, 191, 256; /Users/seriouscoderone/code/bpm/mad-discovery/README.md:19; done_when clause 2 in `bd show bpm-5g1`. The text speaks of "the sources named on its command line" while the command in the tool table takes no source address, no finder and no input. Naming the snapshot on the command line is also what makes "the same command over the same public inputs" (design.md:172) something a second party can run.

### objective-05: "Discover and reuse an exact definition" stops twice: no way in without a SAID, and no way to bring a definition home with what it refers to

Severity: should-fix. Section: The tool. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Traced with gym-bp's data. A second author (say a yoga studio) wants the gym's `admission` authorization (EGVaGa3k..., referred to by 6 documents in the store). (1) They hold the gym's source address, not the SAID. `who` needs a SAID and no command or page lists a source, so they read `source.json` by hand: 36 bare SAIDs, with names only where the gym wrote a publication. (2) With the SAID, the page and `who` work as designed. (3) To reuse it they need the bytes on disk and every document their new one points at. The walk fetches the looked-up SAID and its referrers, not what it refers to, into a folder the design does not locate. I ran the reuse in bpm-core: a new RR that pins `admission` and the gym's `visit` aggregate would not freeze with only `admission` in the store, and froze once compact copies of the pinned documents were there. `bpm pull`, which would fetch a closure, is bpm-n13.3 and is parked under MAD's Ruling 5; MAD's import is bpm-upm.21 and .22, deferred. (4) After adopting, the studio can introduce the gym, but the gym's source never learns of the studio (objective-07). (5) The design restates HANDOFF's first criterion as two authors who "arrived at the same definition". HANDOFF says "discover and reuse". An author looking for something to reuse does not hold its SAID, and with bpm-core documents, whose `alias` is inside the SAID, two authors reaching the same SAID unaided is unlikely. Related gap: the design does not say what `build` serves. "A folder of frozen documents" for gym-bp is all 36 files, 8 of them earlier versions left by re-freezing (objective-06), and nothing requires a source to serve what its own definitions refer to. MAD's publish step reviews a target "and its dependencies".

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:30`: An independent author should be able to discover and reuse an exact definition
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:178`: A walk cannot connect two authors who never met but arrived at the same definition, and `mad/HANDOFF.md` names that case first among its success criteria.
- `test: in a scratch workspace with only a compact copy of EGVaGa3k... in .bpm/store, `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/bpm freeze yoga` (an RR with outcome.said and issue[0] = EGVaGa3k..., track = ENx3CS8U...)`: {"error": "DOCUMENT_ERROR", "message": "pointer to not-yet-saidified document: ENx3CS8UcVw_Cu_0FrI_iWzvazO_kawwVo_OBxIaCs1V"}
- `same test after adding a compact copy of ENx3CS8U... to the store; and `bpm verify compact.json` on a compact copy of the admission document`: {"aggregate": 0, "fact": 0, "authorization": 0, "rr": 1, "selections": []}  /  {"ok": true, "d": "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB"}
- `bd show bpm-n13`: bpm pull <SAID> --from <provider>: fetch by digest, verify the digest before writing anything, follow pointers transitively, land the closure in the local .bpm/store.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:247`: Publishing begins with a review of the exact model, authorization, responsibility or assembly and its dependencies.

**Reviewer's proposed change.** In "The tool", add two rows: "`list <address>` | Prints what a source or a catalog lists: each SAID with the names claimed for it and who claimed them." and "`get <SAID> --from <address> --out <folder>` | Fetches a definition and every definition it refers to, transitively, checks each, and writes each as `<SAID>.json`. Reports any it could not find and where it looked." In "A source", add the rule: "**A source serves what it publishes and what that refers to.** `build` serves each publication's target and every definition reachable from it through references. It serves nothing else from the input folder and reports what it left out. A referred SAID that is not in the folder must be named by an introduction's `for`, or `build` refuses." In "Finding sources nobody linked", replace the sentence quoted from line 178 with: "A walk cannot connect two parties who never linked to each other. `mad/HANDOFF.md` puts first among its success criteria that an independent author can discover and reuse an exact definition; that author starts without a SAID and without an introduction." In "What waits on other work", add: "Landing a fetched definition in an authoring tool | bpm-core's pull (bpm-n13.3, parked under MAD's Ruling 5) and MAD's import (bpm-upm.21, bpm-upm.22). Until then `get` writes files the author places by hand; bpm-core accepts the compact copies."

**What the skeptic checked.** Re-ran the reuse test in a fresh workspace at /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-objective/reuse with `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/bpm freeze yoga`. Empty store, and store holding only a compact admission: "pointer to not-yet-saidified document: ENx3CS8UcVw_Cu_0FrI_iWzvazO_kawwVo_OBxIaCs1V". Store holding only the visit aggregate: the same error naming EGVaGa3k.... Both present: freeze succeeds ("rr": 1). `bpm verify` on the compact admission copy: {"ok": true}. Rebuilt gym-bp from its tracked files in a scratch copy: 28 documents (see missed 1). HANDOFF.md:30, mad-ux-design.md:247, design.md:178, `bd show bpm-n13` and `bd show bpm-n13.3` read as quoted.

**Skeptic's better change.** (1) Drop `list`. The source's index page (objective-02a) is the way in for a person, and `catalog build --from <address> --out <folder>` (objective-04) already gives a reader with one introduction a local `index.json` of everything reachable. (2) Keep `get`, worded: "`get <SAID> --from <address> --out <folder>` | Fetches the definition and, transitively, every definition it refers to: from that source first, then from sources its introductions name `for` a missing SAID. Checks each and writes `<SAID>.json`. Reports each SAID it could not find and where it looked." Add: "This is the network half. Landing the files in an authoring store is bpm-core's pull (bpm-n13.3) and MAD's import (bpm-upm.21, bpm-upm.22), which call it instead of fetching for themselves." (3) Reject the rule "A source serves what it publishes and what that refers to". It ties `serves` to publications and so removes the mirror, a party that serves bytes without endorsing them, which the design keeps on purpose (design.md:64-79; mad-ux-design.md:66) and which the first reviewer lists as sound. Write instead: "**What a source serves.** The configuration names the SAIDs to serve; when it names none, every publication's target. `build` serves those and every definition they refer to, transitively, that the input folder holds, and nothing else from the folder. It reports each referred SAID that it does not serve and that no introduction names in `for`." Serving the closure stays because it lets a definition outlive its first publisher's site; refusing the build over a missing dependency is stricter than a reader needs. (4) Adopt the replacement for design.md:178 and the waiting-table row.

### objective-06: Nothing connects an edited definition to the one it replaced, and the test data already shows it

Severity: should-fix. Section: Publications. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design never mentions lineage. The generic `refers` list would show a successor among its predecessor's referrers only if the successor's bytes name the predecessor's SAID. In gym-bp's store 13 of the 36 documents fall in five groups that share a kind and an alias with different SAIDs (three `membership` RRs, two `payment-received`, two `remittance-submitted`, three `dropin-class` and three `member-class` selections), and none carries `supersedes`. A source built from that folder shows three unrelated `membership` responsibilities with nothing to say which is current. bpm-core documents that its `supersedes` can survive freeze as an alias, not a SAID, in which case `refers` misses it as well. For MAD, `derivedFrom` is authoring state on a draft; if it were part of committed content, two authors who reach the same definition by different edits would get different SAIDs, which works against HANDOFF's convergence statement. So for MAD a lineage statement most likely has to live outside the definition, as a claim. The vision already calls it a claim. Where a reference does exist, only its path tells a successor from a user, and the page specification does not show paths (the walk's report does).

**Evidence.**

- `test: `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/objective_refs.py /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store``: docs with supersedes: []  [...]  ('rr', 'membership') ['EGeDI1OSOiQJ-tz0EPVmXokZ-eIuZHenACP_X8G-uess', 'ELUMtDGlFgujsQSco9JiyjVRWKC93thEEDh3vipE0ZRG', 'ENHekenqpWskcQLYIgk_Ld4rSTJuFwKE8SSl0CipbNsh']
- `/Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:199-200`: `_apply_pointers` does not touch `supersedes`, so a draft
`supersedes: <alias>` survives freeze byte-for-byte instead of becoming a SAID
- `/Users/seriouscoderone/code/bpm/mad/src/domain.ts:6`: local?: boolean; derivedFrom?: string }
- `/Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:321`: A claim that one definition supersedes another is useful lineage, rather than automatic permission to substitute it everywhere.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:13`: Two independent authors who produce the same committed definition under the same representation conventions obtain the same identity.

**Reviewer's proposed change.** Add a subsection "Lineage" after "Publications": "An edited definition is a new SAID. This cut connects it to the old one in one case: the new definition's bytes name the old SAID (bpm-core's `supersedes`, when it was frozen as a SAID). The new one then appears among the old one's referrers, and the walk, the catalog and the page show the path of each reference (`supersedes`, `rely_on[0].said`), which is what tells a successor from a user. Nothing else connects them. gym-bp's store holds three `membership` responsibilities and no `supersedes`, so a source that served all three would show three unrelated definitions; under the rule that a source serves what it publishes, the publisher's choice of what to publish is the only signal of which is current. MAD's `derivedFrom` is authoring state and is not known to be committed content. Whether a publication carries a lineage claim is open question 6." In "Readable pages", change the fourth bullet to: "the definitions on this source that refer to it, each with the path of the reference". Add the lineage sub-question to the open question on the publication record (text in objective-13).

**What the skeptic checked.** Re-ran `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python -I /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/objective_refs.py /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store`: 36 documents, "docs with supersedes: []", five same-alias groups covering 13 documents, as reported. Ran it again on a clean rebuild (28 documents): the alias-collision list is empty. The 8 extra files in the local store are dated Sep 5 and Sep 6; the current ones Sep 6 and Sep 7. /Users/seriouscoderone/code/bpm/gym-bp/README.md: "Frozen bytes never enter git." /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:199-203, /Users/seriouscoderone/code/bpm/mad/src/domain.ts:6, /Users/seriouscoderone/code/bpm/mad/src/ui.ts:105 (a draft copy gets `derivedFrom`), /Users/seriouscoderone/code/bpm/mad/docs/micro-apps-vision.md:321 and HANDOFF.md:13 read as quoted. design.md contains no mention of lineage or supersession.

**Skeptic's better change.** Shorter subsection, without the gym-bp sentences and without the reference to a source serving only what it publishes: "### Lineage\n\nAn edited definition is a new SAID. This cut connects it to the old one only when the new definition's bytes name the old SAID, as a bpm-core document's `supersedes` does when it was frozen as a SAID. The new one then appears among the old one's referrers, and the path of the reference is what tells a successor from a user. Nothing else connects them. For MAD the predecessor is not expected to be inside the definition: `derivedFrom` is state on a draft, and MAD's vision calls supersession a claim. Whether a publication carries that claim is an open question." Adopt the page bullet change ("each with the path of the reference"). In the open question give both options and the cost: (a) an optional `supersedes` SAID on the publication, claimed like the rest (recommended); (b) nothing in this cut. State that (a) adds a field MAD's Publish screen does not collect and so commits bpm-nq3.5 to it.

### objective-07: Introductions point from adopter to origin and are typed by hand; say that a walk from an origin misses its adopters and that there is no announce step

Severity: should-fix. Section: Introductions. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design says an operator lists "where they first got a definition, and others they know to publish the same SAIDs". Only the first of those can be known as a matter of course. Nothing tells the origin who adopted, so its list of adopters is whatever its operator happened to hear and type into the configuration file. The earlier review and the survey both found this: without a ping, a walk reaches ancestors and misses every later adopter, and hand-typed peer lists stay empty in practice. The design is right not to add an announce or ping step: under Ruling 3 it would be a submission step and a service every source has to run. But it then states the weakness too mildly ("a reader reaches only what somebody linked"). The common question, asked at the source people know, is "who adopted this", and the walk answers it with nobody. The design should say so, and say that the catalog is the only route in that direction. The upward link can also be kept without hand-typing if the tool records where a definition was fetched from.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:135-137`: A source's operator lists the sources they know: where they first got a definition, and others they know to publish the same SAIDs. [...] a reader reaches only what somebody linked. The catalog exists for the rest.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2421`: Without the ping, an adopter's catalog links only upward ('from') and to whatever peers it copied on the day it adopted, so a walk reaches ancestors and misses every later adopter.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:2865`: The announce endpoint is not optional for the stated goal: without it a walk from the source never reaches adopters, and with it each original author accepts writes and becomes the registry for its hashes.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:481`: the peers walk follows only hand-typed edges
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:253`: one configuration file holding publications, introductions and catalogs

**Reviewer's proposed change.** Replace the second and third paragraphs of "Introductions" with: "Introductions are entries in the build's configuration file. They point mostly one way. An adopter knows where it got a definition and can introduce that source. The source it came from is told nothing, so it cannot introduce its adopters unless its operator hears of them and adds them by hand. A walk from an adopter therefore reaches the origin. A walk from the origin reaches only the sources its operator added, and misses later adopters. This design has no announce or ping step by which an adopter tells a source: that would be a submission step and a service for every source to run, which Ruling 3 rules out. From an origin, adopters are found through a catalog and only through a catalog. The reader records the introducing source as the introducer, which MAD's design asks to keep ('introducers when known')." Consider adding, so the upward link needs no typing: "`get` writes beside the bytes a record of the source address each definition came from. `build` reads that record and adds an introduction to that source `for` the SAID, unless the configuration says otherwise."

**What the skeptic checked.** design.md:133-137 and 253; discovery-survey.md:2421 and 481; spec-review.md:2865, all as quoted. The design states the general limit ("a reader reaches only what somebody linked") but not its direction, and does not say that an announce step was left out or why.

**Skeptic's better change.** Adopt the replacement paragraph with one wording change and without the optional addition. Wording: replace "that would be a submission step and a service for every source to run, which Ruling 3 rules out" with "that would have every source run a service that accepts writes, and would make the first publisher of a definition the registry for it; a source here is static files". That is the ground the project's own evidence gives (spec-review.md:2865); Ruling 3's words are about how the objective is met. Reject the addition in which `get` records where a definition came from and `build` turns the record into an introduction: it is a retention record kept between commands, which objective-10 removes and README.md:31 assigns to mad. Typing one address into the configuration is a cost the design can simply state.

### objective-08: The walk's report does not list what it could not resolve, and MAD's third provenance state goes unused

Severity: should-fix. Section: The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design adopts MAD's three states (claimed, verified, unresolved) and then uses two. The report has three lists and a closing count of sources reached. An introduction that could not be followed (dead host, refused redirect, oversized file, failed byte check, limit reached) appears nowhere, so the reader cannot tell "nobody else" from "three sources I could not read". The tests exercise a dead source, an oversized file and a redirect but nothing says the report names them. The survey's sketch of this lookup returned the unreachable list as part of the answer.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:127`: That makes every publication *claimed*, in MAD's three provenance states (claimed, verified, unresolved).
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:157`: The report ends by saying how many sources it reached, and that reaching none is not evidence that nobody else uses the definition.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2204`: Output: the list of (publisher, claim, verified) plus the list of catalogs that could not be reached.

**Reviewer's proposed change.** In "The walk", change "The report has three lists" to "The report has four lists" and add a fourth bullet: "what could not be resolved: each introduction that was not followed or did not check out, with its introducer and the reason (unreachable, refused by the fetch rules, failed the byte check, a limit reached), and each SAID the looked-up definition refers to that no visited source serves (unresolved)." Add the same list to the per-SAID catalog file, and add a row "Unresolved | An address or SAID that was named and could not be fetched or checked." to the table in "Trust: what is verified, observed and claimed".

**What the skeptic checked.** design.md:127, 149-157, 237-241 and 266; discovery-survey.md:2204 as quoted. "Unresolved" appears once in the design, at line 127, and in no list, table or test.

**Skeptic's better change.** For the walk, adopt the fourth list limited to introductions: "what could not be resolved: each introduction that was not followed or did not check out, with its introducer and the reason (unreachable, refused by the fetch rules, failed the byte check, a limit reached)". Leave out "each SAID the looked-up definition refers to that no visited source serves": the walk does not resolve what a definition refers to (steps 2 to 5 look at who serves, publishes and refers to it); that report belongs to `get`. In the catalog, put the list in `sources.json` as one row per address tried with its outcome, not in every per-SAID file: a source that could not be read is unresolved for every SAID. Adopt the "Unresolved" row in the trust table.

### objective-09: AI Catalog entries: the digest is not required by the format, it is a second digest, and no reader exists for the entries

Severity: should-fix. Section: AI Catalog entries. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The section says the entries carry "the sha-256 digest that format requires". The format lists `digest` among its optional entry members; it becomes required only when an entry carries a signed Trust Manifest, which this cut does not. Emitting it puts a second content digest beside the SAID in every source, against the design's own Terms row and the intent of Ruling 2. The stated reason for including the file does not hold either: MCP's Server Cards extension sends clients to this file to find server cards, entries of one specific type, and the survey found no mainstream client reading the file and no registry that picks up an unlisted domain. Ruling 3 permits such adapters and does not require one; no done_when clause depends on them; the entry's `identifier` and `type` are not specified; and the ARD sentence asks the build to test a condition the design already says is false ("the two formats have diverged"). This is work on a moving, unreleased specification for no reader.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:219`: the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:143`: optional displayName, description, tags, version, updatedAt, extensions, publisher, digest, trustManifests[]
- `https://ai-catalog.io/spec/ (read through a summarising fetch on 2026-11-08; re-open before relying on the wording)`: The following members are OPTIONAL:
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:25`: The workspace's rule; this project adds no other digest.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:165`: no mainstream client is shown to read the file, and the digest and Trust Manifest features have no observed use
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:198`: located through an AI Catalog entry of type application/mcp-server-card+json

**Reviewer's proposed change.** Recommended: take the adapter out of the first cut. Delete the `/.well-known/ai-catalog.json` line from the source layout, the sentence "and entries in the AI Catalog format so existing agent tooling can find the definitions" from "The three parts", the section "AI Catalog entries", and "and AI Catalog entries" from build-order step 4. Add to "What waits on other work": "AI Catalog entries as a generated adapter (Ruling 3 allows them) | A reader: a client or registry that picks up entries of a non-agent type from a domain nobody listed. The survey found none." If the maintainer keeps it (open question in objective-13), replace the first paragraph's field list with "the definition's address, a media type, and the SAID under an extension key. The optional `digest` member is not written: it would be a second digest beside the SAID.", name the entry's `identifier` and `type`, and delete the sentence about ARD.

**What the skeptic checked.** Read the AI Catalog specification text fetched on 2026-11-08, /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/aic/ai-catalog.md: line 262 "The following members are OPTIONAL:", line 339 `digest` in that list, lines 694-696 "the containing entry's `digest`, which MUST be present when an entry carries a signed Trust Manifest", lines 1568-1572 an entry needs "at minimum `identifier`, `type`, and exactly one of `url` or `data`". discovery-survey.md:143, 165 and 198 as quoted; design.md:25 and 219-221. One nuance: discovery-survey.md:105 names a small registry that indexes arbitrary media types after a domain is submitted, so "no reader" means no reader that finds a domain unasked, which design.md:221 already says.

**Skeptic's better change.** Correct the section now and ask, instead of deleting it. The epic lists "generated entries for the AI Catalog format" under In and bpm-5g1.5 says the design must cover the adapter, so removing it is the maintainer's call. Replace the field list in design.md:219 with "the definition's address, a media type, and the SAID under an extension key. The format's optional `digest` member is not written: it would be a second digest beside the SAID (Ruling 2)." Name the entry's `identifier` (the definition's address) and `type`. Replace "It is here because MCP's Server Cards extension points clients at this file, and because it is cheap" with "MCP's Server Cards extension reads this file for entries of its own type; no client or registry is known to read entries of another type from a domain nobody submitted." Delete the ARD sentence. Move the adapter to the last build step and ask whether it ships in this cut or waits for a reader, recommending that it wait.

### objective-10: The walk's local folder and log are the local retention the README assigns to mad, and they are unspecified

Severity: should-fix. Section: The walk. Skeptic: confirmed; proposed change: adopt.

**Problem.** The design has the walk keep fetched definitions "in a local folder keyed by SAID, with a log of where and when each was retrieved". The README and the bead that owns the provenance panel both put local retention in mad. As written there would be two retention stores once bpm-upm.21 is built, and an implementer has to guess this one's location, layout and log format. Nothing in the done_when needs it. What a reader does need from a lookup is the bytes in a place they choose (objective-05's `get`) and a report a program can keep.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:159`: Fetched definitions are kept in a local folder keyed by SAID, with a log of where and when each was retrieved, so a remote outage does not erase what was learned.
- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md:31`: MAD's Explore, its provenance panel and the import of what is found stay there (bpm-upm.21, bpm-upm.22). mad-discovery is the network side they consume.
- `bpm-upm.21 (comment, 2026-11-08)`: The panel, local retention and the claimed / verified / unresolved states stay here in mad.

**Reviewer's proposed change.** In "The walk", replace the sentence quoted from line 159 with: "The walk keeps nothing between runs. `who --json` prints the report in a form a program can keep, with the source address and fetch time of each entry; retaining it is MAD's job (bpm-upm.21). A reader who wants the bytes uses `get`, which writes them where the reader says."

**What the skeptic checked.** design.md:159; README.md:31; the `bd show bpm-upm.21` comment ("The panel, local retention and the claimed / verified / unresolved states stay here in mad."), all as quoted. The folder's location, its layout and the log's format are given nowhere in the design, and no done_when clause depends on them. The replacement relies on `get`, which objective-05 keeps.

### objective-11: JSON-LD does not get a page indexed; nothing emitted lets a crawler reach the pages

Severity: should-fix. Section: Readable pages. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design says the JSON-LD block is there "so general search engines index it". A search engine indexes a page it can reach, by a link or a sitemap; structured data does not bring a crawler. The source emits no sitemap and no page that links to the definition pages, and the survey's recommended emission, which the design otherwise follows, listed the pages in a sitemap referenced from robots.txt. The survey's tests of web search for a published SAID found nothing or a partial list. In this cut, general web search is the only route by which a person could find a definition by a business term, so the claim matters and is unsupported. The JSON-LD type and properties are also unspecified.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:213`: The page also carries a JSON-LD block with the SAID as its identifier, so general search engines index it.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:574`: List the pages in a sitemap referenced from robots.txt.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:413`: web search gave zero relevant hits for a bare SAID in one mode and a partial list in another; and programmatic search access is being withdrawn

**Reviewer's proposed change.** Replace the sentence quoted from line 213 with: "The build also writes `sitemap.xml` listing every page and adds a `Sitemap:` line to robots.txt, because a crawler indexes only pages it can reach. Whether a search engine then returns a page for a business term or for a SAID is not measured; the survey's tests of web search for a published SAID found nothing or a partial list." Add `/sitemap.xml` to the source layout and change the robots.txt line there to "carries the `Mad-Source` line and a `Sitemap` line". Either drop the JSON-LD block from this cut or name its schema.org type and properties; recommended: drop it until a search result is measured, since the page's title and visible text carry the same strings.

**What the skeptic checked.** design.md:213 and the layout at 50-56: no sitemap, and no page links to the definition pages from outside them. discovery-survey.md:574 ("List the pages in a sitemap referenced from robots.txt") and 413 as quoted. The JSON-LD type and properties are not named anywhere.

**Skeptic's better change.** Replace the sentence at design.md:213 with: "The build also writes `sitemap.xml` listing every page and, when the source is at the root of a host, a `Sitemap:` line in robots.txt, because a crawler indexes only pages it can reach. The SAID is in each page's title and visible text. Whether a search engine then returns a page for a business term or for a SAID has not been measured." Drop the JSON-LD block. Leave out the sentence about the survey's search tests; the survey is linked from the design's first paragraph. Add `/sitemap.xml` to the layout and change the robots.txt line as proposed. Say beside the robots-line limit that a source under a path has no robots.txt, so its sitemap is not announced either.

### objective-12: Build order: pages come too late, the real hosts come too late for a monthly input, and the suggested second host may be invisible to the recommended finder

Severity: should-fix. Section: Build order. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Three things. (1) Readable pages are done_when clause 3 and the one function a person gets; they need only `build` and no network, yet they sit at step 4 behind the walk and the catalog. A first slice of the SAID check, `build` and pages over gym-bp shows the maintainer a browsable folder of the gym's definitions and proves "somewhere to read a definition" before any network code. (2) The design calls the finder "the hard part" and its public input is monthly, but real hosts carrying the robots line appear only at step 5. The first real evidence about the objective then arrives at least one crawl cycle after everything else is built, if it arrives. Putting the line on two hosts needs no tool. (3) Open question 3 suggests GitHub Pages for the second origin. A project site is served under `<owner>.github.io/<repositoryname>`, which has no robots.txt of its own, so the recommended finder cannot see it and the live check would fail by construction; the design's own table notes the limit but the recommendation does not. GitHub Pages' default Jekyll build also leaves out folders whose names start with a dot, so a copied build output loses `.well-known` unless Jekyll is bypassed.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:272-278`: 4. Readable pages and AI Catalog entries.
5. The maintainer's own source deployed, and a second real origin for a live check.

Steps 1 to 4 need no hosting, no domain and no cloud account.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:184`: Monthly. Only hosts Common Crawl visits. Needs a bulk download or a paid query. Sources under a path on a shared host have no robots.txt.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:294`: A second origin on a different host, such as GitHub Pages, serves the live check. This does not block steps 1 to 4.
- `https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages and https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll (read through a summarising fetch on 2026-11-08)`: http(s)://<owner>.github.io/<repositoryname>  /  By default, Jekyll doesn't build files or folders that: Start with `_`, `.`, or `#`

**Reviewer's proposed change.** Replace the numbered list with: "0. Before any code: put a hand-written robots.txt line and a one-definition source document on two real hosts that do not link to each other, and record the date. This starts the clock on the finder's public input, which is monthly. 1. The SAID check, `build`, the readable pages and the source's index page, over gym-bp's frozen documents. No network. 2. Introductions, `list`, `get` and the walk, tested across local origins. 3. The catalog build: introductions only, then the first finder against a fixture, then its pages. 4. The live check: a catalog built from the first public snapshot taken after step 0, with no source address on the command line, lists both hosts." Replace the closing sentence with: "Steps 1 to 3 need no cloud account. Step 0 needs two hosts and no code. Each step is planned and reviewed before it starts." In open question 3, replace "This does not block steps 1 to 4." with: "For the robots line the second origin must be the root of a host: a GitHub Pages user or organization site qualifies, a project site under `<owner>.github.io/<repository>` does not. On GitHub Pages `build` must also write a `.nojekyll` file, or the `.well-known` folder is not served. This is needed for step 0."

**What the skeptic checked.** design.md:184, 272-278 and 294. Re-opened both GitHub pages (again through a summarising fetch): project sites are at "http(s)://<owner>.github.io/<repositoryname>", and "By default, Jekyll doesn't build files or folders that: ... Start with `_`, `.`, or `#`". Neither cited page mentions `.nojekyll`; the Jekyll page offers the `include` setting. Common Crawl's URL index answers for one host in one request: `curl "https://index.commoncrawl.org/CC-MAIN-2026-43-index?url=seriouscoderone.github.io/robots.txt&output=json"` returned {"message": "No Captures found for: seriouscoderone.github.io/robots.txt"}.

**Skeptic's better change.** Adopt the reordered list with three changes. Step 0 follows the rulings on names and hosts, because it puts the robots line and the source document's path on the public web: "0. Once the names and the hosts are ruled: put a hand-written robots.txt line and a one-definition source document on two hosts that do not link to each other, and record the date. One of them is a host whose robots.txt the latest crawl already holds (one request to the crawl's URL index tells), so a miss there means the line was not picked up and a miss on the other means the crawl did not visit it." In step 2 drop `list` (objective-05). In the hosting question keep the root-of-host sentence, and replace "`build` must also write a `.nojekyll` file" with "GitHub Pages' default Jekyll build leaves out folders whose names start with a dot, so `.well-known` needs Jekyll turned off or an `include` setting": that is a deployment note, not a job for a host-neutral tool.

### objective-13: The open questions leave out the decisions that most affect the objective, and two of the four cannot be answered as asked

Severity: should-fix. Section: Open questions for the maintainer. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Question 1 asks the maintainer to pick a finder whose "cost and coverage are not yet measured"; it can be answered only once the feasibility numbers are in the question, and it does not ask what happens if no finder passes. Question 4 says the record is "MAD's existing fields"; MAD's `Publication` has `tags` as one string, plus `kind`, `endorser`, `targetId` and `components`, and its target can be an assembly, so the question hides what bpm-nq3.5 is being committed to. Decisions written into the body as settled that belong to the maintainer: that he runs a scheduled catalog job and publishes its output (his fifth value is nothing for a solo maintainer to run, and the survey's skeptic put it as accepting plainly that he runs the index); that an interim catalog may be built from addresses on a command line (objective-04); whether the catalog writes pages a person can browse (objective-02); whether AI Catalog entries and their digest ship in this cut (objective-09); whether a publication carries a lineage claim (objective-06). Also unstated: whether the tool ships with a catalog address built in, which decides whether one catalog is authoritative by default.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:189`: Its cost and coverage are not yet measured, and a feasibility check of this finder and the certificate label is part of this design's review.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:295`: Recommended as written: MAD's existing fields, its own SAID, unsigned for now.
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts:45`: export interface Publication { name: string; description: string; tags: string; collection: string; target: string; targetId: string; endorser: string; kind: Definition['kind'] | 'assembly'; components:
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:174`: The maintainer's own catalog is one copy among any number. It is a scheduled job in continuous integration that writes files to his source.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:5`: The maintainer's values, in order: no purpose-built aggregator; very wide adoption; local-first discovery from a single introduction; identity that can move to KERI; nothing for a solo maintainer to run.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:2171`: or he should accept plainly that he is running the index

**Reviewer's proposed change.** Replace the list with seven questions. "1. Which finder comes first, and what if none passes? [The measured cost and coverage of each candidate go here.] Options: the robots line; the certificate label; code search; none yet. If none passes: (a) ship the walk and the pages, publish no catalog, and say the stranger case is unmet; (b) publish a catalog seeded from named sources, labelled as a seeded crawl. Recommended: the finder the numbers favour, and (a) if none passes, because a seeded catalog is hand-curation under Ruling 3. 2. Does the maintainer run and publish a catalog? Recommended: yes, one scheduled build per public snapshot, from continuous integration to his own source. It is the one thing in this design he runs, and while it is the only catalog it is the index in practice; what keeps it from being authoritative is that it holds nothing a second build cannot reproduce and that the tool has no catalog address built in. Alternative: publish none, and every reader builds their own from the finder's bulk input. 3. Does the catalog build write pages a person can browse (an index and a page per SAID)? Recommended: yes, generated from the same rows with no text, ranking or form of their own; otherwise nothing a person can open spans two sources until MAD's Explore exists (bpm-upm.22, deferred), and somebody will make a site over the JSON. The cost: strangers' claimed text is shown under the catalog host's address. 4. Are these the names and paths? [as written, plus the catalog's file names and the `pages` template.] 5. Where does the maintainer's own source live, under which domain, and what is the second host? [as written, with the root-of-host condition from objective-12; needed before step 0.] 6. Is the publication record right? It keeps MAD's name, description, collection and target. It differs from `mad/src/views.ts` `Publication` in four ways: `tags` is a list, not one string; there is no `kind` (the reader takes it from the definition); there is no `endorser` until signatures; there are no `components`. Two sub-questions: may a publication target an assembly, as MAD's Publish screen allows, once assemblies have SAIDs; and does a publication carry an optional lineage claim (`supersedes`: a SAID, claimed like the rest)? Recommended: yes to both; the lineage claim because for MAD a definition's bytes should not name its predecessor. Whatever is ruled here commits MAD's later signed bundle (bpm-nq3.5) to the same fields. 7. Do AI Catalog entries ship in this cut? Recommended: no; if yes, without the optional digest."

**What the skeptic checked.** design.md:174, 189, 191 and 292-295; /Users/seriouscoderone/code/bpm/mad/src/views.ts:45 as quoted; /Users/seriouscoderone/code/bpm/mad/src/ui.ts:288 (the form requires name, description, tags and collection, and the target defaults to the current assembly); discovery-survey.md:5 and 2171 as quoted. `bd show bpm-nq3.6` is the deferred ruling "whether assemblies or selections get frozen SAIDs others can pin", behind bpm-nq3.3. Measured the price of one build for the recommended finder (missed 3).

**Skeptic's better change.** Six questions in order of effect on the objective, each leading with the options and the recommendation. 1. Does the maintainer run and publish a catalog, and does it carry pages a person can browse? (The reviewer's 2 and 3 as one decision, with the price: for the robots line one build reads about 150 GB.) 2. Which finder first, and what if none passes? (The reviewer's 1.) 3. Names and paths, including the catalog's file names and the `pages` template. 4. Hosts, with the root-of-host condition. 5. The publication record: the four differences from `Publication` in views.ts as the reviewer lists them, the lineage claim (objective-06), and whether an unsigned publication has a SAID of its own (missed 4). 6. Do AI Catalog entries ship in this cut? Remove the sub-question about assemblies: bpm-nq3.6 already holds it, and asking it here would settle a deferred MAD ruling from this repository; name that bead in "What waits on other work" (objective-15). Send the proposed done_when (objective-03) with the design, since bpm-5g1.5 requires the epic's done_when to be amended to match.

### objective-14: The example's `refers` list omits a SAID that is in the document, and the rule for recognising a SAID inside a definition is not stated

Severity: should-fix. Section: A source. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The rule says `refers` lists the SAIDs that appear inside a served definition. The example gives two SAIDs for EIjETqo6... (rr `paid-admission`). The frozen document contains three distinct ones: the outcome and issue point at the `admission` authorization, `rely_on[0].said` at the `payment-received` fact, and `track` at the `payment` aggregate (ECru8k3C...), which the example leaves out. An implementer reading the example could conclude that some references are meant to be skipped. `refers` is what answers "who relies on this", so a missing entry is a missing answer. The design also does not say what counts as a SAID inside a definition. In gym-bp all 99 references are whole string values; none is embedded in a longer string or used as a key.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:67`: "refers": ["EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
- `test: `python -I .../scratchpad/design-review/objective_refs.py /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store` (full path in objective-06)`: refers ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1 at track -> aggregate payment
- `test: `python -I /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/embedded.py /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store``: whole-value references: 99  embedded in longer strings: 0  in keys: 0

**Reviewer's proposed change.** In the example, change the `refers` value to the three SAIDs in SAID order: `["ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1", "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]`. In the `refers` rule, add: "A SAID inside a definition is any JSON string value that is exactly a Blake3-256 SAID (44 characters starting with `E`) and is not the definition's own. Each distinct one is listed once, in SAID order. A SAID inside a longer string, or used as a key, is not listed."

**What the skeptic checked.** Printed /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json: `track` is ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1, which design.md:67 omits. Re-ran embedded.py on the local store ("whole-value references: 99  embedded in longer strings: 0  in keys: 0") and on a clean rebuild (61, 0, 0). Then froze a scratch copy of bpm-core's `sitting` fixture and ran the same script on /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-objective/sit/.bpm/store: "whole-value references: 21  embedded in longer strings: 3  in keys: 1" (`authz:E...`, `fact:E...`, and one mapping key). documents.md's pointer table lists "`see[].on` | `fact` (the mapping's keys)".

**Skeptic's better change.** Adopt the corrected example. Change the rule's last sentence: as proposed, "A SAID inside a longer string, or used as a key, is not listed" leaves out positions that bpm-core's own pointer table names. In the `sitting` documents each such SAID also appears as a whole value in the same document, so the list comes out the same today (my refers_rule.py gives 16 distinct references under either rule, and 52 for clean gym-bp), but the rule would rest on that coincidence and the walk's "path of the reference" would miss those places. Text: "A SAID inside a definition is any run of base64url characters, exactly 44 long and starting with `E`, with no base64url character on either side, found in a JSON string value or a key, other than the definition's own SAID. Each distinct one is listed once, sorted as strings. The list can include strings that only look like SAIDs, such as a principal's identifier; nothing serves them, so they resolve to nothing."

### objective-15: A visitor looks for a protocol, which is a set; the design does not say what page shows a set

Severity: should-fix. Section: Terms. Skeptic: partly; proposed change: adopt-modified.

**Problem.** The design opens with "In MAD a protocol is a set of definitions" and then defines a definition, for MAD, as a model, an authorization or a responsibility. A visitor to a reference site opens a protocol, not one schema fragment. In the test data the set is a frozen document: 7 of gym-bp's 36 are selections, each referring to its responsibilities, so the generic page for a selection is the protocol's page and links to its members. For MAD the set is an assembly, which MAD's Publish screen targets and HANDOFF says can be published, but which Ruling 2's list of three kinds does not name and which has no SAID yet. The design should say what shows a set today and put the assembly question to the maintainer, without changing the ruling.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:24`: A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility. In the test data: gym-bp's frozen documents.
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:58`: it can be published, but no runtime instantiates an assembly
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts:45`: kind: Definition['kind'] | 'assembly'
- `test: objective_refs.py over /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store`: kinds: {'rr': 13, 'selection': 7, 'aggregate': 8, 'fact': 5, 'authorization': 2, None: 1}

**Reviewer's proposed change.** In the Terms table, change the Definition row to: "A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility (Ruling 2). In the test data: gym-bp's frozen documents, which include selections, frozen sets of responsibilities." Add after the table: "A protocol is a set of definitions. Where the set is itself a frozen document, as a gym-bp selection is, its page is the protocol's page: it lists the members and links to each. Whether a MAD assembly is published the same way once it has a SAID is part of open question 6."

**What the skeptic checked.** design.md:9 and 24; HANDOFF.md:58 as quoted; views.ts:45 as quoted; ui.ts:288 (Publish targets the current assembly unless a definition was chosen). On a clean rebuild gym-bp has 3 selections among 28 documents (class-brick, dropin-class, member-class); the count of 7 comes from the local store, where four are earlier freezes. `bd show bpm-nq3.6`: "Rule: whether assemblies or selections get frozen SAIDs others can pin", deferred, depends on bpm-nq3.3.

**Skeptic's better change.** Adopt the Terms row. Adopt the sentence after the table with a different ending: "A protocol is a set of definitions. Where the set is itself a frozen document, as a gym-bp selection is, its page is the protocol's page: it lists the members and links to each. A MAD assembly has no SAID; whether assemblies or selections get one is bpm-nq3.6." Add to "What waits on other work": "A page for a MAD protocol as a set | Whether assemblies or selections get frozen SAIDs (bpm-nq3.6)". Do not add it to the open questions.

### objective-16: The design is silent on the maintainer's second value: who would publish a source, and how MAD's own user gets an address

Severity: consider. Section: What this project is for. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** "What it does not promise" covers the index and assessment and says nothing about adoption, which is second in the maintainer's order of values. The source document, the robots line and the publication record are new formats with no publishers and no readers. The survey's closest analog, with eleven vendors behind it, had nine publishers after about five months. A source also needs an address its operator controls, and for the robots line the root of a host; MAD's user is described as a business operator who should not have to think about infrastructure. The design enables path-hosted sources, the cheapest hosting, and recommends a finder that cannot see them. A design that becomes authority on approval should state this limit and name the expected route to more than a handful of sources.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:435`: After about five months: nine publishers in roughly 38,000 domains probed, every referral pointing at the same operator, zero DNS records
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:481`: A new /.well-known/mad/ suffix has no publishers and no readers
- `/Users/seriouscoderone/code/bpm/mad/HANDOFF.md:21`: The user is a business operator or “vibe coder” who can explain a business but should not need to think in message brokers, cryptographic protocols or database engines.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:92`: A source can therefore live under a path on a shared host.

**Reviewer's proposed change.** Add a third bullet under "What it does not promise": "That parties will publish. The source document, the robots line and the publication record are new and have no adopters. The survey's closest analog, backed by eleven vendors, had nine publishers after about five months. What a publisher gets for the effort is a readable page for each of its definitions and a place in any catalog. The expected route to more than a handful of sources is MAD's own publish step writing a source (bpm-nq3.5). How a MAD user who has no host gets an address is not designed here, and a source under a path on a shared host is not seen by the robots-line finder."

**What the skeptic checked.** discovery-survey.md:435 and 481, HANDOFF.md:21 and design.md:92 as quoted; "What it does not promise" (design.md:13-16) has two bullets and neither is about adoption. `bd show bpm-nq3.5`: publish is "sign and emit a shareable bundle of frozen definitions with provenance that another MAD instance can import", and its comment leaves "how a publication is made retrievable at a source" to mad-discovery. No bead says MAD's publish step writes a source.

**Skeptic's better change.** Shorter bullet: "That parties will publish. The source document, the robots line and the publication record are new and have no adopters; the survey's closest analog had nine publishers after about five months. A source needs an address its operator controls, and the robots-line finder needs that address at the root of a host." Leave out the sentence naming bpm-nq3.5 as the expected route to more sources: that bead is the signed bundle, and nothing yet assigns writing a source to MAD's publish step. If the maintainer wants that route stated, it is a new bead, not a claim in this design.

### What the objective reviewer missed

#### The "36 frozen documents" are the maintainer's local store; gym-bp as committed freezes to 28, and `build <folder>` over a store would serve the leftovers

Severity: should-fix.

**Problem.** gym-bp's `.bpm/store` is gitignored and rebuilt by `./rebuild.sh`. A clean rebuild holds 28 documents. The maintainer's local store holds 36, because bpm-core's store keeps earlier freezes: 8 of the 36 are superseded leftovers. The design reports its measurement as "All 36 of gym-bp's frozen documents" and makes "gym-bp's frozen documents" the fixtures, so an implementer on a fresh clone gets a different set from the one the design describes. The first review's figures were taken from the 36, including two it lists as sound: 99 references, 6 referrers of `admission` and 7 of `payment-received`. Clean, they are 61, 4 and 4, and there is no same-alias group. Any bpm-core author's store has the same property, so `build <folder>` pointed at a store serves superseded documents and reports them as referrers; a third of the answer to "who relies on this" would be stale.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- g
- y
- m
- -
- b
- p
- /
- R
- E
- A
- D
- M
- E
- .
- m
- d
- :
- 
- "
- |
- 
- `
- .
- b
- p
- m
- /
- `
- 
- |
- 
- t
- h
- e
- 
- f
- r
- o
- z
- e
- n
- 
- s
- t
- o
- r
- e
- ;
- 
- g
- i
- t
- i
- g
- n
- o
- r
- e
- d
- ,
- 
- r
- e
- b
- u
- i
- l
- t
- 
- b
- y
- 
- `
- .
- /
- r
- e
- b
- u
- i
- l
- d
- .
- s
- h
- `
- 
- |
- "
- 
- a
- n
- d
- 
- "
- F
- r
- o
- z
- e
- n
- 
- b
- y
- t
- e
- s
- 
- n
- e
- v
- e
- r
- 
- e
- n
- t
- e
- r
- 
- g
- i
- t
- .
- "
- 
- T
- e
- s
- t
- :
- 
- c
- o
- p
- i
- e
- d
- 
- g
- y
- m
- -
- b
- p
- '
- s
- 
- t
- r
- a
- c
- k
- e
- d
- 
- f
- i
- l
- e
- s
- 
- (
- w
- i
- t
- h
- o
- u
- t
- 
- s
- i
- m
- s
- /
- )
- 
- t
- o
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- o
- b
- j
- e
- c
- t
- i
- v
- e
- /
- g
- y
- m
- -
- c
- l
- e
- a
- n
- 
- a
- n
- d
- 
- r
- a
- n
- 
- `
- B
- P
- M
- =
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- b
- p
- m
- -
- c
- o
- r
- e
- /
- .
- v
- e
- n
- v
- /
- b
- i
- n
- /
- b
- p
- m
- 
- s
- h
- 
- .
- /
- r
- e
- b
- u
- i
- l
- d
- .
- s
- h
- `
- 
- t
- h
- e
- r
- e
- :
- 
- "
- s
- t
- o
- r
- e
- :
- 
- 2
- 8
- 
- f
- r
- o
- z
- e
- n
- 
- d
- o
- c
- u
- m
- e
- n
- t
- s
- "
- .
- 
- `
- c
- o
- m
- m
- `
- 
- a
- g
- a
- i
- n
- s
- t
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- g
- y
- m
- -
- b
- p
- /
- .
- b
- p
- m
- /
- s
- t
- o
- r
- e
- :
- 
- 8
- 
- f
- i
- l
- e
- s
- 
- o
- n
- l
- y
- 
- i
- n
- 
- t
- h
- e
- 
- l
- o
- c
- a
- l
- 
- s
- t
- o
- r
- e
- 
- (
- l
- i
- s
- t
- e
- d
- 
- i
- n
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- o
- b
- j
- e
- c
- t
- i
- v
- e
- /
- s
- t
- a
- l
- e
- .
- t
- x
- t
- )
- ,
- 
- n
- o
- n
- e
- 
- o
- n
- l
- y
- 
- i
- n
- 
- t
- h
- e
- 
- c
- l
- e
- a
- n
- 
- o
- n
- e
- .
- 
- o
- b
- j
- e
- c
- t
- i
- v
- e
- _
- r
- e
- f
- s
- .
- p
- y
- 
- o
- n
- 
- t
- h
- e
- 
- c
- l
- e
- a
- n
- 
- s
- t
- o
- r
- e
- :
- 
- "
- a
- u
- t
- h
- o
- r
- i
- z
- a
- t
- i
- o
- n
- :
- a
- d
- m
- i
- s
- s
- i
- o
- n
- 
- <
- -
- 
- 4
- 
- d
- o
- c
- s
- "
- ,
- 
- "
- f
- a
- c
- t
- :
- p
- a
- y
- m
- e
- n
- t
- -
- r
- e
- c
- e
- i
- v
- e
- d
- 
- <
- -
- 
- 4
- 
- d
- o
- c
- s
- "
- ,
- 
- e
- m
- p
- t
- y
- 
- a
- l
- i
- a
- s
- -
- c
- o
- l
- l
- i
- s
- i
- o
- n
- 
- l
- i
- s
- t
- .
- 
- T
- h
- e
- 
- d
- e
- s
- i
- g
- n
- '
- s
- 
- b
- y
- t
- e
- 
- r
- u
- l
- e
- 
- o
- v
- e
- r
- 
- b
- o
- t
- h
- 
- (
- b
- y
- t
- e
- c
- h
- e
- c
- k
- .
- p
- y
- 
- i
- n
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- f
- o
- l
- d
- e
- r
- )
- :
- 
- "
- d
- o
- c
- u
- m
- e
- n
- t
- s
- :
- 
- 3
- 6
- 
- 
- v
- e
- r
- i
- f
- y
- 
- c
- o
- m
- p
- a
- c
- t
- :
- 
- 3
- 6
- 
- 
- v
- e
- r
- i
- f
- y
- 
- a
- s
- 
- s
- t
- o
- r
- e
- d
- :
- 
- 0
- "
- 
- a
- n
- d
- 
- "
- d
- o
- c
- u
- m
- e
- n
- t
- s
- :
- 
- 2
- 8
- 
- 
- v
- e
- r
- i
- f
- y
- 
- c
- o
- m
- p
- a
- c
- t
- :
- 
- 2
- 8
- 
- 
- v
- e
- r
- i
- f
- y
- 
- a
- s
- 
- s
- t
- o
- r
- e
- d
- :
- 
- 0
- "
- .

**Proposed change.** In "Checking bytes against a SAID", replace the second and third measured bullets with: "All 28 documents that gym-bp's `./rebuild.sh` freezes from a clean clone verify once serialized compactly, both by Python and by Node's `JSON.parse` then `JSON.stringify`. (The measurement ran over the maintainer's local store, which also held 8 earlier freezes; those verify too.)" and "None verifies as stored, because the store files are pretty-printed." In "Tests", first bullet: "gym-bp's frozen documents, taken from a clean `./rebuild.sh` (28 documents) and copied in compact, and one KERI schema...". In "A source", add the rule "What a source serves" given under objective-05, so that `build` serves the named SAIDs and what they refer to, and nothing else from the folder.

#### The configuration file, the publisher's one authored input, is not specified, and `build` is never told the address it must write

Severity: should-fix.

**Problem.** Every address in the source document is absolute (`source`, the `definitions` template, the robots line), but `build <folder> --out <folder>` takes no address and the configuration file is described only as "holding publications, introductions and catalogs". The design says a source can live under a path on a shared host and gives the layout only "at the root of an origin". An implementer has to guess the file's name and shape, where the address comes from, and what the folder looks like under a path. This file is also the whole cost to a publisher, which the design never states. The test data makes it concrete: gym-bp's documents carry no description and only its three selections carry a name, so every publication in the Build, Walk and Pages tests, and the one done_when clause 1 asks a lookup to list, has to be hand-written into a file the design does not describe.

**Evidence.**

- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 5
- 3
- :
- 
- "
- M
- a
- k
- e
- s
- 
- a
- 
- s
- o
- u
- r
- c
- e
- 
- f
- r
- o
- m
- 
- a
- 
- f
- o
- l
- d
- e
- r
- 
- o
- f
- 
- f
- r
- o
- z
- e
- n
- 
- d
- o
- c
- u
- m
- e
- n
- t
- s
- 
- a
- n
- d
- 
- o
- n
- e
- 
- c
- o
- n
- f
- i
- g
- u
- r
- a
- t
- i
- o
- n
- 
- f
- i
- l
- e
- 
- h
- o
- l
- d
- i
- n
- g
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- s
- ,
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- 
- a
- n
- d
- 
- c
- a
- t
- a
- l
- o
- g
- s
- .
- "
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 4
- 8
- :
- 
- "
- L
- a
- i
- d
- 
- o
- u
- t
- 
- a
- t
- 
- t
- h
- e
- 
- r
- o
- o
- t
- 
- o
- f
- 
- a
- n
- 
- o
- r
- i
- g
- i
- n
- 
- i
- t
- 
- l
- o
- o
- k
- s
- 
- l
- i
- k
- e
- 
- t
- h
- i
- s
- "
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 9
- 2
- :
- 
- "
- A
- 
- s
- o
- u
- r
- c
- e
- 
- c
- a
- n
- 
- t
- h
- e
- r
- e
- f
- o
- r
- e
- 
- l
- i
- v
- e
- 
- u
- n
- d
- e
- r
- 
- a
- 
- p
- a
- t
- h
- 
- o
- n
- 
- a
- 
- s
- h
- a
- r
- e
- d
- 
- h
- o
- s
- t
- .
- "
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 6
- 2
- -
- 6
- 3
- :
- 
- "
- \
- "
- s
- o
- u
- r
- c
- e
- \
- "
- :
- 
- \
- "
- h
- t
- t
- p
- s
- :
- /
- /
- g
- y
- m
- .
- e
- x
- a
- m
- p
- l
- e
- /
- .
- w
- e
- l
- l
- -
- k
- n
- o
- w
- n
- /
- m
- a
- d
- /
- s
- o
- u
- r
- c
- e
- .
- j
- s
- o
- n
- \
- "
- ,
- 
- \
- "
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- s
- \
- "
- :
- 
- \
- "
- h
- t
- t
- p
- s
- :
- /
- /
- g
- y
- m
- .
- e
- x
- a
- m
- p
- l
- e
- /
- .
- w
- e
- l
- l
- -
- k
- n
- o
- w
- n
- /
- o
- o
- b
- i
- /
- {
- s
- a
- i
- d
- }
- /
- i
- n
- d
- e
- x
- .
- j
- s
- o
- n
- \
- "
- "
- .
- 
- T
- e
- s
- t
- :
- 
- o
- b
- j
- e
- c
- t
- i
- v
- e
- _
- r
- e
- f
- s
- .
- p
- y
- 
- o
- n
- 
- t
- h
- e
- 
- c
- l
- e
- a
- n
- 
- g
- y
- m
- 
- s
- t
- o
- r
- e
- 
- p
- r
- i
- n
- t
- s
- 
- "
- d
- o
- c
- s
- 
- w
- i
- t
- h
- 
- n
- a
- m
- e
- :
- 
- 3
- 
- 
- w
- i
- t
- h
- 
- d
- e
- s
- c
- r
- i
- p
- t
- i
- o
- n
- :
- 
- 0
- "
- .

**Proposed change.** Add a subsection "The configuration file" after the rules for a source, with an example and three rules: `{ "base": "https://gym.example/", "serve": ["E..."], "publications": [{ "target": "E...", "name": "...", "description": "...", "tags": ["..."], "collection": "..." }], "introductions": [{ "source": "https://...", "for": ["E..."] }], "catalogs": ["https://..."] }`. "`base` is the address the output folder will be uploaded to; every address `build` writes is formed from it. The folder has the same layout under any base. `robots.txt` and `sitemap.xml` are written only when the base is the root of a host. `build` computes what can be computed (`refers`, the templates) and the operator writes the rest by hand: one publication for each definition they want found by name, and one introduction for each source they know." The key names join the names question. In "Tests" add: "The fixtures include a hand-written configuration with publications for gym-bp's three selections; gym-bp's documents carry no description."

#### "Anyone can rebuild" costs about 150 GB per build for the recommended finder, and the catalog gives no cheaper way to check a row

Severity: should-fix.

**Problem.** What keeps the maintainer's catalog from being the authoritative site is that anyone can regenerate it (Ruling 3; design.md:174, "a reader who distrusts it can run the same command"). For the robots line, one rebuild reads the whole of one crawl's robots.txt archive: 100,000 files of about 1.5 MB, roughly 150 GB compressed. The design says only "Needs a bulk download or a paid query". At that price few second builds will exist, so his copy is the index in practice, and a reader who doubts one row has no means to check it short of the full download. The sources list is said to record "how it was found" but the design does not say what that record contains.

**Evidence.**

- T
- e
- s
- t
- :
- 
- `
- c
- u
- r
- l
- 
- -
- s
- S
- 
- h
- t
- t
- p
- s
- :
- /
- /
- d
- a
- t
- a
- .
- c
- o
- m
- m
- o
- n
- c
- r
- a
- w
- l
- .
- o
- r
- g
- /
- c
- r
- a
- w
- l
- -
- d
- a
- t
- a
- /
- C
- C
- -
- M
- A
- I
- N
- -
- 2
- 0
- 2
- 6
- -
- 4
- 3
- /
- r
- o
- b
- o
- t
- s
- t
- x
- t
- .
- p
- a
- t
- h
- s
- .
- g
- z
- 
- |
- 
- g
- u
- n
- z
- i
- p
- 
- |
- 
- w
- c
- 
- -
- l
- `
- 
- g
- i
- v
- e
- s
- 
- 1
- 0
- 0
- 0
- 0
- 0
- .
- 
- H
- E
- A
- D
- 
- r
- e
- q
- u
- e
- s
- t
- s
- 
- o
- n
- 
- f
- i
- l
- e
- s
- 
- 1
- ,
- 
- 2
- 5
- 0
- 0
- 0
- ,
- 
- 5
- 0
- 0
- 0
- 0
- ,
- 
- 7
- 5
- 0
- 0
- 0
- 
- a
- n
- d
- 
- 9
- 9
- 9
- 9
- 9
- 
- o
- f
- 
- t
- h
- a
- t
- 
- l
- i
- s
- t
- 
- r
- e
- t
- u
- r
- n
- 
- c
- o
- n
- t
- e
- n
- t
- -
- l
- e
- n
- g
- t
- h
- 
- 1
- 4
- 1
- 3
- 9
- 2
- 1
- ,
- 
- 1
- 4
- 9
- 9
- 7
- 3
- 1
- ,
- 
- 1
- 5
- 3
- 0
- 9
- 8
- 1
- ,
- 
- 1
- 5
- 8
- 4
- 9
- 6
- 4
- 
- a
- n
- d
- 
- 1
- 5
- 6
- 5
- 9
- 8
- 4
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 6
- 8
- :
- 
- "
- o
- n
- e
- 
- l
- i
- s
- t
- i
- n
- g
- 
- e
- v
- e
- r
- y
- 
- s
- o
- u
- r
- c
- e
- 
- f
- o
- u
- n
- d
- 
- a
- n
- d
- 
- h
- o
- w
- 
- i
- t
- 
- w
- a
- s
- 
- f
- o
- u
- n
- d
- "
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 8
- 4
- :
- 
- "
- M
- o
- n
- t
- h
- l
- y
- .
- 
- O
- n
- l
- y
- 
- h
- o
- s
- t
- s
- 
- C
- o
- m
- m
- o
- n
- 
- C
- r
- a
- w
- l
- 
- v
- i
- s
- i
- t
- s
- .
- 
- N
- e
- e
- d
- s
- 
- a
- 
- b
- u
- l
- k
- 
- d
- o
- w
- n
- l
- o
- a
- d
- 
- o
- r
- 
- a
- 
- p
- a
- i
- d
- 
- q
- u
- e
- r
- y
- .
- "

**Proposed change.** In the finder table, robots-line row, replace "Needs a bulk download or a paid query." with "One crawl's robots.txt archive is 100,000 files of about 1.5 MB, roughly 150 GB compressed, read in full for each build." In "The catalog" step 4, define the record: "`sources.json` gives, for each source, how it was found in a form that can be checked on its own: for a finder, the finder's name, the snapshot and the place in it (for the robots line, the archive file and the record's offset and length); for an introduction, the introducing source's address." After "a reader who distrusts it can run the same command" add: "or check one row by fetching the named record and the source it points to. Until a second party runs the build, the maintainer's copy is the only one." Put the figure in the question about whether he runs the catalog.

#### An unsigned publication's own SAID is unspecified, is read by nothing in this cut, and would merge independent endorsers if used as the text says

Severity: should-fix.

**Problem.** The design gives each publication a `d`, "computed by the same rule", so that "copies of one publication on several sources are then recognizably one publication". Three problems. (1) The rule checks bytes as served, but a publication is an object inside `source.json`; the serialization its SAID is computed over is not stated, and the same six fields give a different SAID when the keys or the tags are in another order. (2) An unsigned publication names no endorser, so two unrelated sources that write the same text get the same `d`. Treating them as one publication merges two independent endorsements, against the design's own rule that every statement is attributed to the address it was fetched from; MAD's rule about copies is about one signed publication. (3) Nothing in this cut reads `d`, and the design says the signed record will be "a new record with a new SAID". An implementer has to guess both how to compute it and whether the catalog merges on it.

**Evidence.**

- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 2
- 4
- :
- 
- "
- `
- d
- `
- 
- i
- s
- 
- t
- h
- e
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- '
- s
- 
- o
- w
- n
- 
- S
- A
- I
- D
- ,
- 
- c
- o
- m
- p
- u
- t
- e
- d
- 
- b
- y
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- r
- u
- l
- e
- .
- 
- C
- o
- p
- i
- e
- s
- 
- o
- f
- 
- o
- n
- e
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- 
- o
- n
- 
- s
- e
- v
- e
- r
- a
- l
- 
- s
- o
- u
- r
- c
- e
- s
- 
- a
- r
- e
- 
- t
- h
- e
- n
- 
- r
- e
- c
- o
- g
- n
- i
- z
- a
- b
- l
- y
- 
- o
- n
- e
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- "
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 2
- 7
- :
- 
- "
- a
- 
- s
- i
- g
- n
- e
- d
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- 
- i
- s
- 
- a
- 
- n
- e
- w
- 
- r
- e
- c
- o
- r
- d
- 
- w
- i
- t
- h
- 
- a
- 
- n
- e
- w
- 
- S
- A
- I
- D
- "
- .
- 
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 9
- 8
- :
- 
- "
- E
- v
- e
- r
- y
- 
- s
- t
- a
- t
- e
- m
- e
- n
- t
- 
- i
- s
- 
- a
- t
- t
- r
- i
- b
- u
- t
- e
- d
- 
- t
- o
- 
- t
- h
- e
- 
- s
- o
- u
- r
- c
- e
- 
- a
- d
- d
- r
- e
- s
- s
- 
- i
- t
- 
- w
- a
- s
- 
- f
- e
- t
- c
- h
- e
- d
- 
- f
- r
- o
- m
- .
- "
- 
- m
- a
- d
- -
- u
- x
- -
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 6
- 6
- :
- 
- "
- M
- u
- l
- t
- i
- p
- l
- e
- 
- c
- o
- p
- i
- e
- s
- 
- o
- f
- 
- o
- n
- e
- 
- s
- i
- g
- n
- e
- d
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- 
- d
- o
- 
- n
- o
- t
- 
- m
- u
- l
- t
- i
- p
- l
- y
- 
- i
- t
- s
- 
- e
- n
- d
- o
- r
- s
- e
- m
- e
- n
- t
- .
- "
- 
- T
- e
- s
- t
- :
- 
- `
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- b
- p
- m
- -
- c
- o
- r
- e
- /
- .
- v
- e
- n
- v
- /
- b
- i
- n
- /
- p
- y
- t
- h
- o
- n
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- o
- b
- j
- e
- c
- t
- i
- v
- e
- /
- p
- u
- b
- _
- s
- a
- i
- d
- .
- p
- y
- `
- 
- (
- b
- p
- m
- -
- c
- o
- r
- e
- '
- s
- 
- `
- s
- a
- i
- d
- i
- f
- y
- `
- 
- o
- n
- 
- t
- h
- e
- 
- d
- e
- s
- i
- g
- n
- '
- s
- 
- e
- x
- a
- m
- p
- l
- e
- 
- p
- u
- b
- l
- i
- c
- a
- t
- i
- o
- n
- )
- 
- p
- r
- i
- n
- t
- s
- 
- "
- d
- e
- s
- i
- g
- n
- '
- s
- 
- k
- e
- y
- 
- o
- r
- d
- e
- r
- :
- 
- E
- O
- n
- 2
- 8
- G
- x
- 5
- .
- .
- .
- "
- ,
- 
- "
- n
- a
- m
- e
- 
- b
- e
- f
- o
- r
- e
- 
- t
- a
- r
- g
- e
- t
- :
- 
- E
- N
- k
- w
- S
- G
- u
- v
- .
- .
- .
- "
- ,
- 
- "
- t
- a
- g
- s
- 
- i
- n
- 
- a
- n
- o
- t
- h
- e
- r
- 
- o
- r
- d
- e
- r
- :
- 
- E
- M
- K
- u
- P
- 6
- z
- p
- .
- .
- .
- "
- ,
- 
- a
- n
- d
- 
- "
- t
- w
- o
- 
- u
- n
- r
- e
- l
- a
- t
- e
- d
- 
- s
- o
- u
- r
- c
- e
- s
- 
- w
- r
- i
- t
- i
- n
- g
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- s
- i
- x
- 
- f
- i
- e
- l
- d
- s
- 
- g
- e
- t
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- d
- :
- 
- T
- r
- u
- e
- "
- .

**Proposed change.** In "Publications", replace the `d` bullet with: "A publication has no identifier of its own in this cut. It is the claim of the source address it was fetched from, and the same text on two sources is two claims. A publication gets its own SAID with its signature, when the record names the principal who made it; MAD's rule about copies of one signed publication applies from then." Remove `"d": "E..."` from the example. In the publication question, recommend "MAD's fields, unsigned, no SAID of its own for now", and give the alternative: keep `d`, fix the serialization (compact, keys in the order d, target, name, description, tags, collection), and state that equal `d` values from different addresses are never merged.

<a id="buildability"></a>

## Buildability: guesswork, contradictions and facts

**Reviewer's summary.** The design's factual claims about the workspace hold: 36 gym-bp store documents, none verifying as stored and all verifying compact, GLEIF's schema verifying as served (re-fetched today), the commit id, the links and anchors, the bead ids and the MAD quotations all check out. Two defects sit in the SAID machinery itself. The byte check as written passes any definition whose SAID field still holds the 44 `#` placeholder (36 of 36 in a test), so "verified" is true of bytes bpm-core refuses; three added conditions fix it and keep every honest document passing. A publication's `d` cannot be computed or checked from the text, because a publication is an object inside source.json and the only rule given is over served bytes; field order alone changes it. The one worked example also breaks its own rule (`refers` omits a SAID that is in the definition). The largest things an implementer must guess are the source document's field rules, what counts as a reference inside a definition, the catalog's files and entry point (the example names a `catalog.json` the build never writes), every limit except the two sizes, the walk's report and failure output, the build's configuration file and the robots line's grammar. Sections contradict each other in five places: HTTPS-only against tests on local servers, "same sources list" against a per-run time limit, `catalog build --out` against "sources named on its command line", "no prose of its own" against the page's contents, and MAD's claimed/verified/unresolved against the Trust table's verified/observed/claimed. Four statements claim more than their evidence: the AI Catalog digest is optional, not required (and the required `identifier` is missing); "any static host" fails by default on both hosts open question 3 names; JSON-LD does not make search engines index a page nothing links to; and the publication is not "MAD's existing fields" (MAD stores tags as one string and also carries endorser, kind and components). "The same Node, TypeScript and test runner as mad/" under-determines the toolchain: mad pins no Node version, uses a browser tsconfig, and Node 24 has no Blake3. On splitting: after these edits steps 1 and 2 (check, source build, walk) are one buildable design; the catalog is still a sketch that needs its wire format written down before it is planned, and step 4 has no tests at all.

**Skeptic's overall verdict.** All 21 findings reproduced; two are narrower than stated (the fourth point of buildability-13, and buildability-20) and none is refuted. Before the maintainer sees the design, fix the byte check (with "at least once" instead of the reviewer's "exactly once", because a keripy inception event carries its SAID twice and verifies today), correct the example's `refers`, take `d` off the unsigned publication (nothing in this cut reads it and it cannot be checked as written), and write down what strangers must agree on: the source document's members, the reference rule, the robots line, the catalog's file names, every limit as a number including a cap on definitions per source (one 1 MB source document can otherwise name 14,703 definitions, 14.7 GB of fetches), and the SAID encoding with one worked value. Also correct the four overclaims (any static host, search engines index the pages, the AI Catalog digest is "required", "MAD's existing fields") and the contradictions (HTTPS-only against local test servers, `catalog build` with no way to name a source, and "steps 1 to 4 need no cloud account" against a finder that needs about 165 GB a month or a paid query). Do not take these parts of the first review: a flag per limit, "no cap on sources", catalog rows for SAIDs that are only referenced (a stranger then chooses file names, and this machine's file system folds case), `.nojekyll` as the GitHub Pages fix (the Pages upload action drops dot-folders by default), the catalog's `--address` flag, and exported functions for a MAD tool that does not exist. Three of the reviewer's proposals disagree about the output folder (must be empty, against rename-and-keep-the-previous-output) and need the one rule given under buildability-09. Questions for the maintainer: whether an unsigned publication needs its own SAID now; when the private repository becomes public, since "anyone can run the same command" depends on it; whether ARD output is dropped; and the limit numbers and catalog file names.

**What the reviewer found sound as written.**

- gym-bp's store holds 36 documents; none passes the byte check as stored (pretty-printed) and all 36 pass once serialized compactly: reproduced with bpm-core's Python.
- GLEIF's Qualified vLEI Issuer schema, fetched today from www.gleif.org/.well-known/oobi/<SAID>/index.json, returned 200 with no redirect and content-type application/json, carries its SAID once in $id, and passes the byte check.
- The description of bpm-core's said.py is accurate: Blake3-256 over compact JSON with d set to 44 '#', CESR code E, 44 characters.
- Commit 713a12f is the repository's first commit and contains MAD-DISCOVERY-SPEC.md; the 'What was dropped' table matches that spec's sections.
- Every relative link and heading anchor in design.md and README.md resolves (../README.md#rulings, #trust-what-is-verified-observed-and-claimed, #finding-sources-nobody-linked, the two research files).
- All eleven bead ids the design cites exist and say what the design says they say, apart from the two library pointers in buildability-20; the README's three rulings match the close reasons of bpm-5g1.1, .2 and .3.
- The four MAD quotations are verbatim in mad/docs/mad-ux-design.md (lines 43, 60, 64, 66), and 'Introductions and retrieval' is a real heading in micro-apps-vision.md; mad/HANDOFF.md line 30 does list discovery by an independent author first.
- Survey and review counts hold: eight families, 'roughly 200 to 250 publishing domains', the Server Cards quotation, and 108 findings (56 confirmed, 52 partly, none refuted).
- A case-insensitive file system cannot produce a wrong 'verified': no two of the 36 SAIDs collide when case is folded, and every answer is decided by checking bytes, not by a file name.
- The byte check does not depend on the unmade property-order ruling for definitions: it never parses or reorders the bytes it checks (this fails only for publications, see buildability-02).
- Node 24 runs .ts files directly (type stripping), so the toolchain proposed in buildability-16 needs no bundler.

### buildability-01: The byte check as written passes bytes that do not contain the SAID

Severity: must-fix. Section: Checking bytes against a SAID. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The rule replaces every occurrence of the SAID and hashes, but never requires the SAID to be present. So a definition whose SAID field still holds the 44 `#` placeholder passes for that SAID: 36 of 36 gym-bp documents do. A definition that holds a run of 44 `#` anywhere has further passing variants. bpm-core's `verify_said` refuses all of them, so the rule is weaker than the workspace rule the section says it applies, and the Trust table's "These bytes have this SAID" is true of at least two byte strings per definition. A source could serve the placeholder form; the walk and the catalog would report it verified; MAD or bpm-core would then refuse the bytes.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:103`: Take the bytes as served. Replace every occurrence of the expected SAID with 44 `#` characters. Compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/placeholder.py`: placeholder form (d = 44 '#', SAID absent from the bytes): 36 of 36 pass the byte check as written; bpm-core verify_said on the last one: refuses (said mismatch)
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/malleable.py`: d := 44 '#', note := the SAID    byte check: VERIFIED  bpm-core verify_said: refuses (said mismatch)
distinct byte strings that pass the byte check: 3
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/said.py:32`: if doc["d"] != expected:
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/strict.py (the proposed rule)`: stricter rule: honest compact bytes 36 of 36 pass; placeholder forms 0 of 36 pass
stricter rule: GLEIF QVI schema as served passes: True
without the not-next-to-# clause, two byte strings pass for one SAID: True | with it: False

**Reviewer's proposed change.** Replace the quoted rule (line 103) with:

> Take the bytes as served. The check fails at once unless the expected SAID occurs in them exactly once, the character before it and the character after it are not `#`, and the bytes hold no run of 44 or more `#`. Otherwise replace the SAID with 44 `#` characters, compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.

Replace the sentence "The two agree whenever a document contains its own SAID only in its SAID field, which holds for every document tested." with: "The three conditions make the check accept exactly one byte string per SAID, as bpm-core's rule does. Without them the same definition with its SAID field still holding the 44 `#` also passes (measured: 36 of 36). A definition that itself contains a run of 44 `#` cannot be served, and the build refuses it by name."

In Tests, add to the SAID check's failing cases: "the SAID field holding 44 `#`, the SAID present twice, a run of 44 `#` elsewhere in the document".

**What the skeptic checked.** Wrote and ran my own script: /Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-buildability/sk1.py. The rule as written passes 0 of 36 store files as stored, 36 of 36 compact, and 36 of 36 with `d` set to 44 `#` (the SAID absent from the bytes); bpm-core's verify_said refuses all 36 of those. For a document holding a 44-`#` run, four distinct byte strings pass as written. The reviewer's stricter rule gives honest 36/36, placeholder 0/36, and without the adjacency clause both `S#` and `#S` forms pass. Re-fetched GLEIF's schema (200, no redirect): SAID once, one `#` (in `$schema`), not adjacent, passes. Then ran a keripy inception event (~/code/KERI/said-test/.venv/bin/python -I -B /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-buildability/keri_icp.py): it holds its SAID twice, passes the design's rule as written, and is refused by the reviewer's 'exactly once'.

**Skeptic's better change.** Use 'at least once', not 'exactly once'. 'Exactly once' refuses a KERI-written document the design's rule accepts today, and it is not needed for the property: with the other two conditions at most one byte string still verifies per SAID (tested: placeholder forms 0 of 36, adjacency pair refused, and of the 44-`#` variants only the form with every run replaced passes). Text for line 103:

> Take the bytes as served. The check fails at once unless the expected SAID occurs in them at least once, no occurrence has a `#` directly before or after it, and the bytes hold no run of 44 or more `#`. Otherwise replace every occurrence of the SAID with 44 `#` characters, compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.

Replace 'The two agree whenever...' with: 'With these conditions at most one byte string verifies for a SAID. Without them the same definition with its SAID field still holding the 44 `#` also passes (measured: 36 of 36), and bpm-core refuses those bytes. A document may carry its SAID in more than one field: a keripy inception event carries it twice and verifies. A definition that itself contains a run of 44 `#` cannot be served, and the build refuses it by name.' Drop the reviewer's phrase 'as bpm-core's rule does': bpm-core also requires the field to be a top-level `d`, which GLEIF's schema (`$id`) does not have. Tests, failing cases to add: 'the SAID field holding 44 `#`, a run of 44 `#` elsewhere, a `#` beside the SAID' (not 'the SAID present twice').

### buildability-02: A publication's `d` cannot be computed or checked from what the design says

Severity: must-fix. Section: Publications. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** `d` is "computed by the same rule", but the only rule in the document is over bytes as served, and a publication is an object inside source.json whose bytes are never served on their own. A reader would have to re-serialize the object, and the design gives no member order or serialization and does not say whether a reader checks `d` at all. Member order alone changes the value. This is the cross-language serialization problem the design says "never reaches a reader", and it does depend on a property-order choice, which the section above says the check avoids. If readers do not check `d`, any source can put another publication's `d` on different text and "recognizably one publication" merges the two. The example's `d` is the placeholder `E...`, so nothing in the document can be checked against a value.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:124`: `d` is the publication's own SAID, computed by the same rule.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:72`: "d": "E...",
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:113`: A serialization difference between languages is caught at build time, on the publisher's machine, and never reaches a reader.
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/pub.py (bpm-core saidify over the example publication)`: d, fields in the example's order      : EOn28Gx5FennsRGF4xE4iT_9wd17JgJb4-cCD9Xyp-Qi
d, same fields in another order       : EMCxXQmAwVIkq-R1n7JIRShMPOdikzuJ44peHvRiC8Wu
d, tags as MAD's string 'gym, admission': EHcjnlUQuNWofYCc02nPPoYDRmHEu3BrDtRrzRzZo_u7

**Reviewer's proposed change.** Recommended: serve each publication as its own SAID-addressed file, so the one byte check covers it and no serialization rule is needed on the reader's side.

1. In the layout under "A source", change the second line to: `/.well-known/oobi/<SAID>/index.json         the bytes of the definition or publication with that SAID`.
2. In the example source document, replace the publication object with `{ "said": "EOn28Gx5FennsRGF4xE4iT_9wd17JgJb4-cCD9Xyp-Qi", "target": "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U" }`, and show the publication file's bytes under it: `{"d":"EOn28Gx5FennsRGF4xE4iT_9wd17JgJb4-cCD9Xyp-Qi","target":"EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U","name":"Paid admission","description":"A cashier admits a patron who has paid.","tags":["gym","admission"],"collection":"Fitness / Front desk"}`.
3. Replace the `d` bullet with: "`d` is the publication's own SAID. The build writes the publication as compact JSON with its members in the order `d`, `target`, `name`, `description`, `tags`, `collection` and computes `d` over those bytes by bpm-core's rule. A reader fetches the publication through the `definitions` template and runs the byte check, exactly as for a definition; a publication whose bytes fail is reported as unresolved, not as a publication. The `target` beside `said` in the source document only tells the reader which publications to fetch; the reader uses the `target` inside the checked bytes."

If publications stay embedded instead, the design must add: "A reader re-serializes the publication object compactly, members in the order they appear in the source document, UTF-8, non-ASCII unescaped, with 44 `#` in `d`, hashes it, and drops the publication on mismatch", and must stop saying that serialization differences never reach a reader.

**What the skeptic checked.** Recomputed the three values with bpm-core's saidify in sk1.py (same folder as above): EOn28Gx5FennsRGF4xE4iT_9wd17JgJb4-cCD9Xyp-Qi (example order), EMCxXQmAwVIkq-R1n7JIRShMPOdikzuJ44peHvRiC8Wu (other order), EHcjnlUQuNWofYCc02nPPoYDRmHEu3BrDtRrzRzZo_u7 (tags as a string). All three match what was reported, and the proposed publication file bytes pass the byte check. Then looked for anything in the design that reads `d`: the walk report and the catalog attribute each publication to the source address it came from (/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md lines 127, 152, 198-199) and nothing merges by `d`. The MAD sentence the design cites for it is about signed publications (/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:66, 'Multiple copies of one signed publication do not multiply its endorsement'). The design also says a signed publication 'is a new record with a new SAID'.

**Skeptic's better change.** Remove `d` from the unsigned publication instead of adding a second kind of served file to support it. Nothing in this cut reads it, it does not survive signing, and it is the only thing in the design that would put a serialization rule on a reader. Replace the `d` bullet with: 'A publication has no identifier of its own in this cut. It is unsigned, so it is a claim by the source address it was fetched from, and the same text on two addresses is two claims. It gets its own SAID when it is signed (bpm-nq3.5): a signed publication is then a file served by SAID like a definition, so the one byte check covers it and no reader re-serializes anything.' Delete `"d": "E..."` from the example. In open question 4 replace 'its own SAID, unsigned for now' with 'no SAID of its own until it is signed', and name the alternative there: if he wants an identifier now, use the reviewer's separate-file form (it works; I checked the bytes). Do not adopt the reviewer's embedded fallback: it makes every reader re-serialize JSON across languages, which the check section says this design avoids.

### buildability-03: The example's `refers` list breaks the rule stated under it

Severity: must-fix. Section: A source. Skeptic: confirmed; proposed change: adopt.

**Problem.** The rule says `refers` lists the SAIDs that appear inside a served definition. The served definition in the example (gym-bp's `paid-admission`) contains three other SAIDs; the example lists two. The missing one is the tracked aggregate `payment`. An implementer who uses the example as a first fixture either gets a failing test or concludes that `refers` is selective by field, which would make the tool kind-aware.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:67`: "refers": ["EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:95`: **`refers` lists the SAIDs that appear inside a served definition.**
- `/Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json`: "track": "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1",
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/refs.py`: missing from design example refers: ['ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1']

**Reviewer's proposed change.** Replace line 67 with: `"refers": ["ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1", "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]` (all three, in sorted order; see buildability-04 for the order rule).

**What the skeptic checked.** Parsed /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U.json in sk1.py. It is the rr `paid-admission` and holds three other SAIDs: /outcome/said and /issue/0 (EGVa..., authorization admission), /rely_on/0/said (EMSa..., fact payment-received) and /track (ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1, aggregate payment). The example lists the first two only.

### buildability-04: What counts as a SAID inside a definition is never defined

Severity: should-fix. Section: A source. Skeptic: confirmed; proposed change: adopt.

**Problem.** `refers`, walk step 4 ("confirm the reference is in them"), the report's "path of the reference" and catalog step 3 ("Extract the SAIDs that appear inside") all rest on a rule the design does not give. Is a reference any 44-character match in the bytes or a whole JSON string value? Is the definition's own SAID excluded? Do object keys count? What order, and are repeats kept? What is a "path"? A path needs parsed JSON, while the check section says no knowledge of the format is needed. Two implementations would write different `refers` lists and different catalog rows for the same bytes, which defeats comparing two builds with a plain diff. The design should also say that a KERI identifier of the same shape matches the pattern, so a reference is a SAID-shaped value and not proof that such a definition exists.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:153`: definitions that refer to it, with the path of the reference inside them (verified).
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:167`: Extract the SAIDs that appear inside.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:101`: The check needs no knowledge of the document's format:
- `/Users/seriouscoderone/code/bpm/bpm-core/.venv/bin/python /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/check.py (all 36 gym-bp store documents)`: exact refs 99 substring refs 0 refs to SAIDs not in store set()

**Reviewer's proposed change.** Add a short section after "Checking bytes against a SAID":

> ## References inside a definition
>
> A definition is a JSON document. A reference is a string value anywhere in it that is exactly a SAID (`E` followed by 43 characters from `A-Z`, `a-z`, `0-9`, `-`, `_`) and is not the definition's own SAID. Object keys, and SAIDs inside longer strings, are not references. `refers` is the set of those SAIDs, each once, sorted by code unit. The path of a reference is its JSON Pointer (RFC 6901); a SAID that occurs twice has two paths. In gym-bp's 36 documents all 99 references are whole string values. A KERI identifier that starts with `E` has the same shape, so a reference says "a SAID-shaped value is here", not that a definition with that SAID exists.

In the walk, step 4, replace "confirm the reference is in them" with "confirm by the rule in References inside a definition that the bytes hold it". In the catalog, step 3, replace "Extract the SAIDs that appear inside" with "Extract its references".

**What the skeptic checked.** sk1.py over all 36 store documents: 99 references, all whole string values; 0 inside longer strings; 0 SAID-shaped object keys; 0 references outside the store; a plain regex over the raw bytes also finds 99. In 13 cases one definition holds the same SAID at more than one path, so 'a SAID that occurs twice has two paths' matters. GLEIF's schema holds two more SAID-shaped whole string values (/properties/a/oneOf/1/$id and /properties/r/oneOf/1/$id); they are ids of blocks nested in the same file, not separate documents, which supports the proposed sentence that a reference is a SAID-shaped value and not proof a definition exists. Design lines 101, 153, 167 read as quoted.

### buildability-05: The source document's fields have no types, no required/optional rule and no rule for unknown or mismatching values

Severity: should-fix. Section: A source. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The section gives one example and six prose rules. It does not say which members are required, what a reader does with a missing or unknown member, whether addresses may be relative, what template syntax `definitions` uses, or what happens when the `source` member differs from the address the document was fetched from (the catalog rules attribute by fetched address, so the member is either redundant or needs a rule). The unknown-member rule matters twice: bpm-core refuses unknown fields, yet the design promises signatures arrive "as new fields", which only works if today's readers ignore what they do not know. Addresses also need one comparison rule or "remember visited addresses" cannot end cycles reliably. Finally, the reader's 1 MB limit on a source document is not enforced at build, so a large source can build cleanly and be unreadable by every reader.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:93`: **`definitions` is a template.** A reader builds the address of a definition's bytes from it and never guesses a path.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:127`: An endorsing principal and a signature are added later as new fields; a signed publication is a new record with a new SAID.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:198`: Every statement is attributed to the source address it was fetched from.
- `/Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:403`: | `UNKNOWN_FIELD` | A key the kind's shape template does not declare, at any depth
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:229`: 1 MB for a source document, 1 MB for a definition.

**Reviewer's proposed change.** Add under the rules for a source:

> | Member | Type | Required | Rule |
> |---|---|---|---|
> | `source` | absolute `https` address | yes | Must equal the address the document was fetched from. If it does not, the reader discards the document and reports the address as unresolved. This keeps a copy served elsewhere from being attributed to the copier. |
> | `definitions` | absolute `https` address containing the literal `{said}` exactly once | yes when `serves` or `publications` is not empty | The reader replaces `{said}` with the SAID. There is no other template syntax. It may name another host. |
> | `serves` | array of `{ said, refers }` | no, default empty | `said` is a Blake3-256 SAID. `refers` is an array of SAIDs, default empty. |
> | `publications` | array | no, default empty | See Publications. |
> | `introductions` | array of `{ source, for }` | no, default empty | `source` is an absolute `https` address. `for` is an array of SAIDs, default empty. |
> | `catalogs` | array of absolute `https` addresses | no, default empty | Each is a catalog's address; see The catalog. |
>
> Every address is absolute; nothing is resolved against anything. The build therefore needs the source's address before it writes, and a folder built for one address cannot be served from another without a rebuild. Two addresses are the same when their WHATWG URL serializations are equal after the fragment is dropped.
>
> A reader ignores a member it does not know and discards a document in which a known member has the wrong type. bpm-core refuses unknown fields in definitions; a source document is a listing, not a hashed definition, and ignoring is what lets signatures arrive later as new members.
>
> The build refuses to write a source document or a definition larger than the readers' limit (1 MB each) and names it.

**What the skeptic checked.** Design lines 93, 127, 198 and 229 read as quoted; none states a type, a required member, a template syntax or a rule for the `source` member. /Users/seriouscoderone/code/bpm/bpm-core/docs/conventions/documents.md:403 is the UNKNOWN_FIELD row as quoted. The size ceiling is real: at gym-bp's density a `serves` entry is 180 bytes, so a 1 MB source document holds about 5,500 definitions.

**Skeptic's better change.** Adopt the table and the three paragraphs with two small edits. (1) If buildability-02 is resolved by removing `d`, the `definitions` row reads 'yes when `serves` is not empty'. (2) End the last paragraph with the number: 'The build refuses to write a source document or a definition larger than the readers' limit (1 MB each) and names it. At gym-bp's density of references that is about 5,500 definitions per source; a larger publisher splits into several sources that introduce each other.'

### buildability-06: "Any static host" is unproven, and both hosts named in open question 3 mishandle this layout by default

Severity: should-fix. Section: The three parts. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design says deploying is copying a folder to any static host and recommends S3 behind CloudFront plus GitHub Pages. GitHub Pages runs Jekyll by default, which skips folders starting with a dot, so `.well-known` would not be served. CloudFront does not return `index.html` for a folder address below the root, so `/definitions/<SAID>/` would not resolve. Neither is fatal, but an implementer following the text would find out at step 5. The section also describes the layout only "at the root of an origin" although a source may live under a path, and it does not say how generated pages link to each other (absolute links break under a path).

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:44`: Deploying means copying a folder to any static host.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:294`: Recommended: a static bucket behind CloudFront in the `personal` AWS account
- `https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll`: By default, Jekyll doesn't build files or folders that: ... Start with `_`, `.`, or `#`
- `https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html`: If you define a default root object, an end-user request for a subdirectory of your distribution does not return the default root object.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:205`: For each definition a source serves, the build writes one HTML page at `/definitions/<SAID>/`.

**Reviewer's proposed change.** Line 44: replace "Deploying means copying a folder to any static host." with "Deploying means copying a folder to a static host that serves dot-folders and sets the content type from the file extension."

Add to "A source", after the layout: "Under a path on a shared host the same layout sits below that path. Every link between generated pages is relative and names `index.html` in full, so no host has to map a folder address to its index file (CloudFront does not, below the root). The build writes an empty `.nojekyll` file at the top of the output, because GitHub Pages otherwise skips every folder whose name starts with a dot, `.well-known` included."

Line 205: replace "at `/definitions/<SAID>/`" with "at `/definitions/<SAID>/index.html`".

**What the skeptic checked.** Re-fetched both pages today. docs.github.com: 'By default, Jekyll doesn't build files or folders that: ... Start with _ , . , or #'. docs.aws.amazon.com: 'If you define a default root object, an end-user request for a subdirectory of your distribution does not return the default root object.' Design lines 44, 48, 205 and 294 read as quoted, and line 53 already says `index.html` while line 205 says the folder. I also read https://raw.githubusercontent.com/actions/upload-pages-artifact/main/action.yml: its tar command carries `--exclude=.[^/]*` unless `include-hidden-files` is 'true' (default false).

**Skeptic's better change.** Adopt the line 44 rewording and the paragraph on relative links that name `index.html`. Do not have the build write `.nojekyll`. It fixes only a branch deploy: a deploy through GitHub Actions (which line 174 implies for the scheduled catalog job) drops every dot-folder and dot-file from the upload by default, `.well-known` and `.nojekyll` alike. Put the host facts where the hosts are named, in open question 3: 'Both hosts need a setting before they serve this layout. GitHub Pages skips dot-folders: a branch deploy needs an empty `.nojekyll` file, and a deploy through GitHub Actions needs `include-hidden-files: true` on the upload step. CloudFront over a private bucket does not map a folder address to `index.html` below the root. Step 5 ends by running `who` against the deployed address, which catches either.' At line 205 use the page path chosen in buildability-07; the two findings edit that line differently.

### buildability-07: Readable pages cannot be found from a source document, contradict the no-prose rule, and overstate what JSON-LD does

Severity: should-fix. Section: Readable pages. Skeptic: confirmed; proposed change: adopt.

**Problem.** Four gaps. (1) The source document has no member giving a page's address, and a reader "never guesses a path", so a walk report or catalog row cannot link to the page that is meant to replace a reference site's "somewhere to read a definition". The word `definitions` also names two different places: the template for bytes (under `/.well-known/oobi/`) and the folder of pages (`/definitions/`). (2) "Every word on the page comes from the definition or from a publication" cannot be true of a page that shows "the command that checks it" and has sections for referring definitions and catalogs; those need labels. (3) "so general search engines index it" is stronger than the evidence: nothing links to the pages (no index page, no sitemap), and the survey's own sketch listed a sitemap for exactly this reason and found searching for a bare SAID incomplete. (4) Escaping is not stated. A source can serve definitions other parties wrote (gym-bp vendors three), so a string in a definition would run as script on the publisher's origin if an implementer interpolates it.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:213`: Every word on the page comes from the definition or from a publication. The build writes no prose of its own, which is MAD's rule for shown text. The page also carries a JSON-LD block with the SAID as its identifier, so general search engines index it.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:208`: the SAID, and the command that checks it;
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:448`: sitemap.xml, a Sitemap line in robots.txt, and an llms.txt list, so Googlebot, Bingbot and CCBot find the pages.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:576`: a bare quoted SAID returned zero relevant results in standard mode

**Reviewer's proposed change.** 1. Add an optional member to the source document and its table: `"pages": "https://gym.example/pages/{said}/index.html"`, with the rule "`pages` is a template like `definitions`; a report or catalog row links to a readable page only through it." Rename the folder in the layout from `/definitions/<SAID>/index.html` to `/pages/<SAID>/index.html` so `definitions` means one thing.
2. Replace the first two sentences of line 213 with: "Everything the page says about a definition comes from the definition or from a publication. The build adds only a fixed set of section labels and the check command, kept in one place in the code; it writes no description of its own. A definition with no publication is titled by its SAID."
3. Replace "so general search engines index it" with "so a crawler that reaches the page reads the SAID as its identifier (schema.org `identifier`). The build also writes one index page that links every definition page, so a crawler that finds the source can reach them. The survey found that searching the web for a bare SAID is incomplete, so this helps people land on the page and is not a lookup."
4. Add: "Every string taken from a definition or a publication is HTML-escaped. The only links made from content are links to other definition pages by SAID. The JSON-LD block is written with `<` escaped."

**What the skeptic checked.** Design lines 208 and 213 read as quoted, and the design has no index page, sitemap or member that gives a page's address. /Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:448 and :576 read as quoted. MAD's rule (the mad-shown-text-from-definitions memory) allows a deterministic generator over definitions and bars engine-written prose, so fixed section labels are consistent with it and 'every word' is not achievable for a page that prints a command. gym-bp does vendor other parties' documents (/Users/seriouscoderone/code/bpm/CLAUDE.md, gym-bp bullet), so escaping is a real requirement.

### buildability-08: The robots line has no grammar or parsing rule, and the build's `robots.txt` would replace the site's own

Severity: should-fix. Section: A source. Skeptic: confirmed; proposed change: adopt.

**Problem.** The line is given as `Mad-Source: <address>` and nothing else. A finder author must guess whether the field name is case-sensitive, whether the line belongs to a `User-agent` group, whether a host may carry several (a shared host with several sources would need that), and whether the address must be absolute. Separately, the layout lists `/robots.txt` as build output. An origin's robots.txt belongs to the whole site, so copying the build folder to an origin that already has one replaces it. The fetch rules also say the tool sends "a named user agent" and that a catalog build "honours robots.txt" without giving the name or the token it obeys.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:97`: **The robots.txt line** (`Mad-Source: <address of the source document>`) is the one thing a source emits for parties who have never heard of it.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:55`: /robots.txt                                 carries one line naming the source document
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:233`: A named user agent. A catalog build also honours robots.txt.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:508`: a robots.txt directive (example: Agentmap: https://example.com/entries.json)

**Reviewer's proposed change.** Replace the robots bullet (line 97) with: "**The robots.txt line** is `Mad-Source: <absolute https address of the source document>`, one line per source document, anywhere in the file. A finder matches the field name without regard to case, trims spaces, ignores anything after a `#`, takes every such line (a host may name several sources) and ignores which `User-agent` group it sits in, as crawlers do for `Sitemap:`. It is the one thing a source emits for parties who have never heard of it. See Finding sources nobody linked."

In the layout, replace the `/robots.txt` line with: `/robots.txt   the operator adds the Mad-Source line (the build prints it; it does not write this file)`. In The tool, add to `build`: "Prints the robots line to add. It never writes `robots.txt`, because that file belongs to the whole site."

In Fetching safely, replace the last bullet with: "The user agent is `mad-discovery (+<address of this project's page>)`. A catalog build obeys `robots.txt` rules for the token `mad-discovery` and for `*`. The walk does not read robots rules: a person asked for that address."

**What the skeptic checked.** Design lines 55, 97 and 233 read as quoted: the line's grammar is not given, `/robots.txt` is listed inside 'the output folder of one build', and the user agent is unnamed. discovery-survey.md:508 reads as quoted (ARD's `Agentmap:` directive is the precedent).

### buildability-09: `build` and `verify` leave their inputs to guesswork: the configuration file, where the expected SAID comes from, and what "re-serializes when needed" does

Severity: should-fix. Section: The tool. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Three things are missing. (1) The configuration file's shape, and where the build learns the source's own address, which it must bake into `source` and `definitions`. (2) How the build learns each input's expected SAID. The check is format-agnostic and GLEIF's schema carries its SAID in `$id`, so reading `d` is not a general answer; `verify` likewise takes an optional SAID with no rule for when it is omitted. (3) "The build re-serializes its inputs when needed" has no algorithm and no remedy when it fails. Node's parse-then-stringify cannot reproduce every serialization: it reorders integer-like keys and rewrites some numbers. The 36-of-36 result does not exercise this, because gym-bp's documents contain no number but `0` and no non-ASCII text. The build's refusal keeps this safe, but the publisher is not told what to do next.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:253`: Makes a source from a folder of frozen documents and one configuration file holding publications, introductions and catalogs.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:113`: The build re-serializes its inputs when needed, then checks every file it is about to write against its SAID and refuses to write one that fails.
- `node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/node-check.mjs (Node v24.19.0, JSON.stringify(JSON.parse(src)))`: integer-like keys    {"b":1,"10":2,"2":3,"a":4} -> {"2":3,"10":2,"b":1,"a":4} DIFFERENT
float 1.0            {"x":1.0} -> {"x":1} DIFFERENT
- `grep -h -o '"[^"]*": *-\?[0-9][0-9.eE+-]*' /Users/seriouscoderone/code/bpm/gym-bp/.bpm/store/*.json | sort | uniq -c (every number in the 36 documents)`: 2 "minimum": 0
- `/Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/fsio.py:32`: text = json.dumps(doc, indent=2, ensure_ascii=False, allow_nan=False) + "\n"

**Reviewer's proposed change.** In the command table, change the `build` row to `build <folder> --config <file> --out <folder>`, and add below the table:

> **Inputs to `build`.** The input folder holds one file per definition, named `<SAID>.json`, which is the shape of a bpm-core store. The file name is the expected SAID; the build never reads a SAID out of a document. For each file the build tries the bytes as they are, then `JSON.stringify(JSON.parse(text))`, and writes the first that passes the byte check. If neither passes it refuses the file by name. `JSON.stringify` cannot reproduce every serialization (it moves integer-like keys first and rewrites numbers such as `1.0` and `1e16`), so a refused file means: supply the compact bytes the SAID was computed over. `--out` must be empty or absent, and the build writes nothing unless every file passes.
>
> **The configuration file** is JSON: `{ "source": "<address of the source document>", "publications": [ { "target", "name", "description", "tags", "collection" } ], "introductions": [ { "source", "for" } ], "catalogs": [ "<address>" ] }`. `source` is required; the rest default to empty. The build derives the `definitions` template from `source`, and computes each publication's `d` and each `refers` list. A publication may target a definition that is not in the input folder (endorsing without serving). An unknown member in the configuration is refused.
>
> **`verify` without a SAID** takes it from the file name, or from the last path segment of the address that is a SAID. If there is none it exits with a usage error.

**What the skeptic checked.** Ran node /private/tmp/claude-501/-Users-seriouscoderone-code-bpm/0df03f74-64d8-4f0b-9040-da278e74b62c/scratchpad/design-review/skeptic-buildability/n1.mjs from that folder (Node v24.19.0): integer-like keys, `1.0`, `1e16`, a 20-digit integer, a duplicate key, `\/` and `é` all come back different from JSON.parse then JSON.stringify. The same script re-serialized all 36 store files; sk2.py in that folder found 36 of 36 pass the byte check and are byte-identical to Python's compact form, so the design's own measurement holds. sk1.py: none of the 36 holds non-ASCII text; grep finds `"minimum": 0` twice and no other number. /Users/seriouscoderone/code/bpm/bpm-core/src/bpm_core/fsio.py:32 reads as quoted. Design lines 113 and 253 give no configuration shape, no source of the expected SAID and no algorithm.

**Skeptic's better change.** Adopt the three paragraphs with two edits. (1) One rule for the output folder. This finding says '`--out` must be empty or absent'; buildability-18 says the build writes beside `--out` and renames so 'the previous output' survives; buildability-13 says a failed catalog build 'leaves the previous output in place'. Those cannot all hold. Use: '`--out` must be absent or empty. The build checks every input and every output in memory first and writes nothing unless all pass.' (2) Make the SAID required, `verify <file or address> <SAID>`, and drop the paragraph that infers it from a file name or a path segment. The readable page prints the full command anyway, and an inferred SAID is one more rule to get wrong.

### buildability-10: Every limit except the two sizes is a word, and the fetch rules leave the test opt-in and the address check open

Severity: should-fix. Section: Fetching safely. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The walk stops "at stated limits" that are never stated; the fetch section lists a time limit per request and per run, a cap across hosts, and limits on sources, introductions and depth, all without numbers. The draft spec this replaces did give numbers. Three more points an implementer must guess. (1) "HTTPS only" conflicts with the walk tests, which use local static servers on ports; the stated opt-in covers localhost, not plain HTTP, and its form is not given (it must not be something a stranger's document or a user flag can switch on). (2) "The host is resolved first" does not say the connection is made to the address that was checked; resolving twice lets a hostile name answer differently the second time. (3) "JSON content types" is not a list. The design also does not say what a report shows when a limit cuts the walk short.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:147`: Stop at stated limits on sources, depth and time.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:230`: A time limit per request and per run.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:227`: HTTPS only. Redirects are not followed.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:266`: Three local static servers on different ports stand for three origins.
- `git -C /Users/seriouscoderone/code/bpm/mad-discovery show 713a12f:MAD-DISCOVERY-SPEC.md (section 5)`: (timeout 5s, max 1 MB, respect robots.txt).
   Recurse into nested `application/ai-catalog+json` entries, with depth ≤ 3 and a visited-set.

**Reviewer's proposed change.** Replace the limit bullets in Fetching safely with a table (the numbers are proposals for the maintainer to set; the point is that each is a number, a flag and a default):

> | Limit | Default |
> |---|---|
> | Source document, definition, publication | 1 MB each, enforced while reading |
> | One request | 10 seconds |
> | One walk | 120 seconds |
> | Depth of introductions from the starting source | 3 |
> | Sources visited in one walk | 100 |
> | Introductions followed from one source | 50 |
> | Referring definitions fetched from one source (walk step 4) | 50 |
> | Hosts fetched at once | 8, one request at a time per host |
>
> Each is a command-line flag with that default. When a limit stops a walk, the report names the limit and counts what was left unvisited.

Replace the second bullet with: "The host is resolved once and the connection is made to the address that was checked. Refused: loopback, private (RFC 1918 and `fc00::/7`), link-local (`169.254.0.0/16`, `fe80::/10`), carrier-grade NAT (`100.64.0.0/10`), unspecified and multicast addresses, and IPv4-mapped forms of any of them."

Add: "The fetch routine takes one option, set only by the test suite, that allows `http` and loopback addresses. No flag, environment variable or fetched document can set it."

Replace "Only JSON content types are accepted for JSON files." with "A JSON file must arrive as `application/json` or a type ending in `+json`; parameters are ignored."

In The walk, step 5, replace "Stop at stated limits on sources, depth and time." with "Stop at the limits in Fetching safely."

**What the skeptic checked.** Design lines 147, 227-233 and 266 read as quoted: two sizes are numbers and every other limit is a word; 'HTTPS only' and 'Three local static servers on different ports' sit in the same document with an opt-in that covers localhost only. The draft spec (git -C /Users/seriouscoderone/code/bpm/mad-discovery show 713a12f:MAD-DISCOVERY-SPEC.md, lines 110-111) did give numbers, as quoted. I also measured what the missing limit costs: a 1 MB source document holds 14,703 `serves` entries (68 bytes each), so one source can make a catalog build fetch 14.7 GB. And I checked the implementer's route: `import('undici')` fails in Node 24 (ERR_MODULE_NOT_FOUND), so the built-in fetch cannot be given a resolver without a new dependency.

**Skeptic's better change.** Adopt the table of numbers, the resolve-once rule with its address list, the test-only option, the content-type rule and the step 5 edit. Three edits. (1) Delete 'Each is a command-line flag with that default'. That is eight flags nobody asked for. Keep the numbers as constants in one module and have a catalog build write the limits it ran with into its build description. (2) Add two rows the table lacks: 'Definitions fetched from one source | 50 in a walk, 2,000 in a catalog build, taken in SAID order' and '`robots.txt` | 500 KB'. (3) Add one sentence for the implementer: 'The routine is built on `node:https` with its own `lookup` function; Node's built-in `fetch` cannot be told which address to connect to without another dependency.'

### buildability-11: The walk's report has no format, no place for failures and no traversal order, and the cache has no location or read rule

Severity: should-fix. Section: The walk. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The report is described as three lists and a closing sentence. Its format is not given, though MAD is meant to consume it. The tests name failures (a dead source, an oversized file, a redirect, a reference that is not in the bytes) but the walk section never says what the report shows for them. The Publications section cites MAD's three states as claimed, verified, unresolved; the Trust table uses verified, observed, claimed. "Unresolved" has no place in the design, and it is exactly what those failures are. The order of the walk (breadth-first or depth-first, and the order among equals) is not given, which decides what is reached once a limit applies. The cache is "a local folder" with "a log": no location, no file names, and no rule for whether the walk ever reads it or re-checks what it reads.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:149`: The report has three lists, each entry naming the source it came from and the chain of introductions that led there:
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:127`: That makes every publication *claimed*, in MAD's three provenance states (claimed, verified, unresolved).
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:159`: Fetched definitions are kept in a local folder keyed by SAID, with a log of where and when each was retrieved, so a remote outage does not erase what was learned.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:64`: A provenance panel reveals these distinctions and labels claimed, verified or unresolved information.
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:61`: - Retrieval observations: where, when and which record was obtained.

**Reviewer's proposed change.** Replace "The report has three lists, each entry naming the source it came from and the chain of introductions that led there:" with: "The report is one JSON document on standard output; `--text` prints the same content for reading. It has four lists. Each entry names the source address it came from and `via`, the chain of introducing addresses from the starting source:" and add a fourth bullet: "`unresolved`: everything the walk was pointed at and could not fetch or check, each with one reason from a fixed list: `unreachable`, `redirected`, `too-large`, `not-json`, `not-a-source-document`, `said-mismatch`, `reference-absent`, `limit`."

Add after the steps: "The walk is breadth-first: every source at one depth before the next. Within a depth, sources introduced for the SAID come first, then the rest, each group in address order."

Replace the cache sentence with: "The cache is the folder given by `--cache`, default `~/.cache/mad-discovery`. `definitions/<SAID>.json` holds checked bytes, and `retrievals.jsonl` gains one line per fetch (SAID, address, time, result). The walk reads the cache only when a fetch fails, re-checks the bytes against the SAID it asked for, and marks the entry as coming from the cache. A catalog build never reads it." The re-check also covers a case-insensitive file system handing back a file stored under a SAID that differs only in case.

In the Trust table add a row: "Unresolved | What a reader was pointed at and could not fetch or check." and a line under it: "Claimed, verified and unresolved are MAD's three states. Observed is this project's word for what MAD's design calls a retrieval observation."

**What the skeptic checked.** Design lines 127, 149-159 and 237-241 read as quoted: the report is three lists with no format, no place for failures and no order of travel; 'unresolved' is cited at line 127 and absent from the Trust table. /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:61 and :64 read as quoted. This machine's file system folds case (wrote EAbc.json then EaBC.json into a scratch folder; one file remained, holding the second content), so the proposed re-check of cached bytes is needed.

**Skeptic's better change.** Adopt all of it, and name the report's members, because buildability-12 makes a catalog row 'the shape of the walk's report' and that puts the shape on the wire. After 'The report is one JSON document on standard output' add:

```
{ "said": "<SAID asked for>", "from": "<starting source>",
  "serves":       [ { "source": "<address>", "via": ["<address>"] } ],
  "publications": [ { "source": "...", "via": [], "publication": { "target": "...", "name": "...", "description": "...", "tags": [], "collection": "..." } } ],
  "referrers":    [ { "source": "...", "via": [], "said": "<referring definition>", "paths": ["/rely_on/0/said"] } ],
  "unresolved":   [ { "address": "...", "via": [], "reason": "said-mismatch" } ],
  "reached": 3 }
```

'`via` is the chain of introducing addresses from the starting source, empty for the starting source itself. A catalog row has the same members without `from` and `via`.'

### buildability-12: The catalog's files, entry point and row rule are not defined, though a source and the walk both refer to a catalog by address

Severity: should-fix. Section: The catalog. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The build writes "one per SAID, one listing every source..., and one describing the build". No file is named, no address template is given, and the ordering is only "a fixed order". Yet the example source document introduces `https://gym.example/catalog/catalog.json`, a file the build does not write, and `who --catalog <address>` must turn that address into the file for one SAID. Which SAIDs get a file is also ambiguous: the row rule says a row is keyed by a SAID computed from fetched bytes, while the file "lists the same three things as the walk's report", which includes referrers of a SAID nobody serves and publications of a target nobody serves. Finally, the opening section says the project supplies "a list of what exists", but no output file lists the SAIDs, and a static host has no folder listing. Open question 2 asks about names and paths and leaves these out.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:168`: Write static files: one per SAID, one listing every source found and how it was found, and one describing the build
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:86`: "catalogs": ["https://gym.example/catalog/catalog.json"]
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:159`: With `--catalog <address>`, the walk also takes introductions from a catalog, checking each one the same way.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:197`: A row is keyed by the SAID computed from bytes the build fetched and checked, never by a SAID a document merely states.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:9`: somewhere to read a definition, a way to learn who else uses it, and a list of what exists. This project supplies all three

**Reviewer's proposed change.** Replace step 4 with a layout (names are proposals; add them to open question 2):

> 4. Write static files:
>
> ```
> catalog.json         the catalog's address. Holds its own address and three addresses:
>                      "rows" (a template with {said}), "saids", "sources" and "build"
> said/<SAID>.json     one row, in the shape of the walk's report
> saids.json           every SAID that has a row, sorted, with the names its publications give it
> sources.json         every source the build was pointed at: its address, how it was found
>                      (a finder's name, or every introducing address), and whether it was read
> build.json           the command, the tool's commit, and each public input with its date or snapshot name
> ```
>
> A catalog's address is the address of its `catalog.json`; that is what a source lists under `catalogs` and what `--catalog` takes. A reader builds a row's address from `rows` and never guesses a path.
>
> A SAID has a row if a visited source served bytes for it that passed the check, or if it is a reference inside such bytes. A publication is listed on its target's row only when that row exists for one of those reasons; a publication alone creates no row. Every array is sorted by code unit and object members are written in one fixed order. File names are the SAID exactly as written; the build fails instead of overwriting if two SAIDs differ only in case.

In open question 2 add: "and the catalog's five file names".

**What the skeptic checked.** Design lines 9, 86, 159, 168 and 197 read as quoted: the example names a `catalog.json` that step 4 never writes, `--catalog <address>` has nothing to resolve a row from, and no file lists the SAIDs. I tested the proposal's own text. It says catalog.json holds 'three addresses' and then lists four. It gives a row to any SAID that is only referenced, which contradicts line 197 ('never by a SAID a document merely states') and hands file names to strangers: one 1 MB definition holds 21,276 SAID-shaped strings, GLEIF's schema alone has two that are ids of nested blocks nobody serves, and on this machine two names that differ only in case overwrite each other (scratch test: EAbc.json then EaBC.json, one file left). Under the proposed 'the build fails instead of overwriting', one hostile source stops every catalog build on a Mac.

**Skeptic's better change.** Step 4, with fixed names beside one another and no templates:

```
catalog.json        the catalog's address. Says how it was built: the tool's commit, the starting sources,
                    the finders and their public inputs with dates or snapshot names, and the limits
said/<SAID>.json    one row, in the shape of the walk's report without `from` and `via`
saids.json          every SAID that has a row, sorted
sources.json        every source the build was pointed at: its address, how it was found (a finder's
                    name, or every introducing address), and whether it was read, with the reason if not
```

'A catalog's address is the address of its `catalog.json`; that is what a source lists under `catalogs` and what `--catalog` takes. The other files have these names relative to it. No file holds its own address, so a copy on another host is byte-identical and two builds compare with a plain diff. A SAID has a row only when a visited source served bytes for it that passed the check (the rule under What a catalog row may say). A SAID that is only referenced gets no row: a reference is any 44-character string a stranger writes, and file names must not be theirs to choose.' This drops the reviewer's `rows` template, the catalog's own address inside the file, and the `--address` flag in buildability-13. In open question 2 add 'and the catalog's four file names'.

### buildability-13: Repeatability conflicts with the limits, and the catalog command cannot be given the sources the text says it takes

Severity: should-fix. Section: The catalog. Skeptic: partly; proposed change: adopt-modified.

**Problem.** Four inconsistencies. (1) Two parties "should produce the same sources list", yet the shared fetch routine has a time limit per run, a cap on sources and concurrent fetching, any of which makes the result depend on timing and visit order. "How it was found" also depends on visit order unless every introducer is recorded. (2) The synopsis is `catalog build --out <folder>`, but the text says the catalog covers what is reachable "from the sources named on its command line"; there is nowhere to name them, and nowhere to choose a finder. (3) The finder is "a plug-in" with no interface. (4) The build description holds the command, dates and the tool's commit, so the test "two builds over the same fixtures produce identical files" cannot hold for every file; and with no versions in this workspace the design does not say how the tool knows its commit. Related: the Trust table says an observation carries a time, while rows carry none.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:172`: Two parties who run it at the same time should produce the same sources list.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:191`: Until a finder is proven, the catalog covers only what is reachable by introductions from the sources named on its command line.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:256`: | `catalog build --out <folder>` | The catalog build. |
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:189`: The finder is a plug-in, so the choice can change without touching sources that already carry the line.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:267`: Two builds over the same fixtures produce identical files.

**Reviewer's proposed change.** Change the synopsis in both places to `catalog build --out <folder> --address <address of catalog.json> [--from <source address>]... [--finder <name>]...`.

Add after the **Repeatable** paragraph: "A catalog build has no time limit for the run and no cap on sources: a build that cannot finish fails and leaves the previous output in place. The depth and per-source limits apply and are written to `build.json`. The set of sources is everything reachable within those limits, and every introducer of a source is recorded, so the order of fetching cannot change the output. A source that does not answer is listed in `sources.json` as unread with the reason. Two builds differ there when the web differed, and nowhere else. A row carries no time; the time of observation is the build's date in `build.json`."

Replace "The finder is a plug-in, so" with "A finder is a module in this package that exports one function returning source addresses, each with the public input it came from, and `--finder` selects one by name. No outside code is loaded. So".

Add to step 4's description of the build file: "The commit is read from the checkout the tool runs from." In Tests, change the catalog line to "Two builds over the same fixtures produce identical files, `build.json` excepted."

**What the skeptic checked.** Design lines 172, 189, 191, 230-231, 256 and 267 read as quoted. Points 1 to 3 hold: a per-run time limit and a cap applied in fetch order make the sources list depend on timing; the synopsis has nowhere to name a source or a finder; 'plug-in' has no interface. Point 4 I checked against line 168: the build description holds the command, the tool's commit and the inputs with their dates or snapshot names, and no build time.

**Skeptic's better change.** Synopsis: `catalog build --out <folder> [--from <source address>]... [--finder <name>]...` (no `--address`; see buildability-12). Do not adopt 'no cap on sources': an unattended job that follows strangers' introductions needs one, and a cap is repeatable if it is applied in a fixed order. Text after the Repeatable paragraph: 'A catalog build has no clock limit for the run: a build that cannot finish fails and writes nothing. The caps on depth, sources, introductions per source and definitions per source apply and are written to `catalog.json`. Sources are taken breadth-first, in address order within a depth, and every introducer of a source is recorded, so the same inputs give the same set whatever order the fetches finish in. A source that does not answer is listed in `sources.json` as unread with the reason. `catalog.json` records the starting sources, finders, limits and the tool's commit, not the command line as typed, so two builds into different folders are identical in every file. A row carries no time; the time of observation is the date of each public input.' Adopt the finder sentence ('a module in this package ... No outside code is loaded') and 'The commit is read from the checkout the tool runs from'. Leave the catalog test as written, without 'build.json excepted'.

### buildability-14: The publication is not "MAD's existing fields": one type differs and four fields are dropped without saying so

Severity: should-fix. Section: Publications. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design says its fields are those of MAD's `Publication` and that this "commits MAD's later signed bundle to the same fields". MAD's type holds `tags` as one comma-separated string, where the example uses an array, and also carries `endorser`, `kind`, `targetId` and `components`. The design drops those four and says "A publication says nothing about the definition's kind" without noting that MAD's record does. MAD also publishes assemblies ("An assembly endorsement targets the assembly"), which this record cannot target, and that is not listed under what waits. Required-ness is not stated; MAD requires all four form fields. The example's `collection` uses ` / ` as if it were a path, with no rule.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:121`: The fields are the ones MAD's Publish screen already collects (`mad/src/views.ts`, `Publication`): a name, a description, tags and a collection placement, plus the target's SAID.
- `/Users/seriouscoderone/code/bpm/mad/src/views.ts:45`: export interface Publication { name: string; description: string; tags: string; collection: string; target: string; targetId: string; endorser: string; kind: Definition['kind'] | 'assembly'; components:
- `/Users/seriouscoderone/code/bpm/mad/src/ui.ts:288`: return fail('Name, description, tags and collection are required.');
- `/Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:68`: An assembly endorsement targets the assembly.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:295`: Recommended as written: MAD's existing fields, its own SAID, unsigned for now. It commits MAD's later signed bundle (bpm-nq3.5) to the same fields.

**Reviewer's proposed change.** Replace the second sentence of line 121 with: "It takes the four things MAD's Publish screen asks for (`mad/src/ui.ts`, `previewPublication`): a name, a description, tags and a collection placement, all required there and here, plus the target's SAID. It differs from MAD's `Publication` type (`mad/src/views.ts`) in four ways, each to be settled with bpm-nq3.5. `tags` is an array of strings; MAD stores one comma-separated string. `collection` is one string, and ` / ` inside it means nothing to this project. `endorser` is left out until it can be signed, because an unsigned endorser is a claim anyone can make. `kind`, `targetId` and `components` are left out: the first two are local to a MAD instance and the third belongs to assemblies."

Add a row to "What waits on other work": "Publications that target an assembly | Whether assemblies get SAIDs (bpm-nq3.6)".

In open question 4, replace "MAD's existing fields, its own SAID, unsigned for now. It commits MAD's later signed bundle (bpm-nq3.5) to the same fields." with "four of MAD's fields with tags as an array, its own SAID, unsigned for now. It asks MAD's later signed bundle (bpm-nq3.5) to carry the same four fields and the same SAID rule."

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/src/views.ts:45 is the Publication interface as quoted: `tags: string`, plus `targetId`, `endorser`, `kind` and `components`. /Users/seriouscoderone/code/bpm/mad/src/ui.ts:288 requires all four form fields and builds the record; ui.ts:86 shows MAD's `target` is today a string of the form `demo:<kind>:<id>:r<revision>`, not a SAID. /Users/seriouscoderone/code/bpm/mad/docs/mad-ux-design.md:68 reads as quoted. Design lines 121 and 295 read as quoted.

**Skeptic's better change.** Adopt the replacement text, the new row for assembly publications and the open question 4 wording, with one correction and one addition. The proposed text says `kind` and `targetId` are 'local to a MAD instance'. Only `targetId` is; `kind` is the definition's kind, and the design's own line 125 gives the reason it is left out. Write: '`targetId` is left out because it is a prototype id local to one MAD instance, `kind` because a reader takes it from the definition's own content, and `components` because it belongs to assemblies.' Add a fifth difference: '`target` is a SAID here; in MAD today it is a `demo:` reference string, until bpm-nq3.3 gives definitions SAIDs.'

### buildability-15: The AI Catalog entry is described wrongly: the digest is optional, the required identifier is missing, and three details are unnamed

Severity: should-fix. Section: AI Catalog entries. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The design emits "the sha-256 digest that format requires". The project's own evidence says the digest is optional and that no surveyed entry carried one, so the stated reason for writing a second digest beside the SAID is false (Ruling 2 dropped sha2-256 hashing). The member the format does require, `identifier`, is not in the design's list. The extension key is unnamed, and the format requires it to be a URL or reverse-DNS string, which ties it to the domain in open question 3. "A media type" is unnamed. "A recorded commit" is recorded nowhere. The ARD sentence gives a condition nobody can evaluate from the text: ARD requires a `urn:air:` identifier on the publisher's domain and a display name, which a definition without a publication does not have.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:219`: the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:1666`: `digest` is an optional AI Catalog member (ARD defines none at entry level) and duplicates the spec's `full` hash in another encoding; that holds. The implication is narrower: publishers do not emit `digest` in practice (0 of 178 sampled entries)
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:141`: Entry fields: identifier (open text, any URI or URN), type (open string, media type recommended), exactly one of url or data, and optional displayName, description, tags, version, updatedAt, extensions, publisher, digest, trustManifests[].
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:1697 (quoting the AI Catalog specification)`: To avoid collisions between independent publishers, the keys MUST be a valid URL or a reverse-DNS string:
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:221`: ARD's file (`/.well-known/ard.json`) is emitted only if the same document is valid there; the two formats have diverged and nothing here depends on either.

**Reviewer's proposed change.** Replace the first paragraph with: "When a source sits at the root of an origin, the build also writes `/.well-known/ai-catalog.json` with one entry per served definition, in the Linux Foundation AI Catalog format: `identifier` (the SAID; the format requires an identifier and accepts any text), `type` (`application/json`), `url` (the definition's address), and `extensions` holding the SAID under one key. The format requires that key to be a URL or a reverse-DNS string, so it is fixed when the maintainer's domain is (open question 3). The format's optional `digest`, a sha-256 of the served bytes, is left out: nothing here reads it, none of 178 surveyed entries carried one, and it would put a second digest beside the SAID."

Replace "The fields are written against a recorded commit of the AI Catalog specification, which had no tagged release when surveyed." with "The specification had no tagged release when surveyed, so the test that validates the generated file names the commit of the specification it was written against."

Replace the ARD sentence with: "ARD's file (`/.well-known/ard.json`) is not written. ARD requires a `urn:air:` identifier on the publisher's own domain and a display name, which a definition without a publication does not have, and nothing here depends on it."

**What the skeptic checked.** The three research quotations are real, two at slightly different lines than cited: 'Entry fields: identifier ... optional ... digest' is /Users/seriouscoderone/code/bpm/mad-discovery/docs/research/discovery-survey.md:143 (141 is the heading); 'the keys MUST be a valid URL or a reverse-DNS string' is /Users/seriouscoderone/code/bpm/mad-discovery/docs/research/spec-review.md:1700 (not 1697); spec-review.md:1666 reads as quoted ('0 of 178 sampled entries'). discovery-survey.md:171 confirms ARD's requirements: 'Each entry MUST carry identifier (schema pattern ^urn:air:...), displayName, type'. Design lines 219 and 221 read as quoted, so 'the sha-256 digest that format requires' is wrong and the required `identifier` is missing.

**Skeptic's better change.** Adopt the first paragraph without the extension key: 'When a source sits at the root of an origin, the build also writes `/.well-known/ai-catalog.json` with one entry per served definition, in the Linux Foundation AI Catalog format: `identifier` (the SAID; the format requires an identifier and accepts any text), `type` (`application/json`) and `url` (the definition's address). The format's optional `digest`, a sha-256 of the served bytes, is left out: nothing here reads it, none of 178 surveyed entries carried one, and it would put a second digest beside the SAID.' With the SAID as `identifier`, an extension key repeats the same value, and a key that must be a URL or reverse-DNS string would make step 4 wait on the domain, against line 278 ('Steps 1 to 4 need no hosting, no domain'). Adopt the sentence about naming the specification's commit in the test. Adopt 'ARD's file is not written' and also put it to the maintainer as a yes or no in the open questions, because Ruling 3 names ARD among the generated adapters.

### buildability-16: "The same Node, TypeScript and test runner as mad/" does not determine a toolchain

Severity: should-fix. Section: The tool. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Read literally against mad/, the sentence yields: no Node version (mad pins none), TypeScript as a type check only, tests written as `.mjs` files that load TypeScript through an esbuild helper, and a tsconfig for a browser bundle (DOM library, bundler resolution, no emit). A command-line package needs things mad does not have: a way to run its TypeScript, Node's type definitions, and a Blake3 implementation. Node 24 has no Blake3, and mad has no dependency that supplies one, so the design names no way to compute the one digest it depends on.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:249`: One TypeScript package, using the same Node, TypeScript and test runner as `mad/`.
- `/Users/seriouscoderone/code/bpm/mad/package.json`: "test": "node --test tests/*.test.mjs"
- `/Users/seriouscoderone/code/bpm/mad/tsconfig.json`: "moduleResolution": "Bundler",
- `/Users/seriouscoderone/code/bpm/mad/tests/load.mjs:3`: // Tests import src/ through esbuild: one in-memory ES module bundle, loaded from a data URL.
- `node -e "const c=require('crypto');console.log(c.getHashes().filter(h=>/blake/i.test(h)))" (Node v24.19.0)`: [ 'blake2b512', 'blake2s256' ]

**Reviewer's proposed change.** Replace line 249's first sentence with: "One TypeScript package. Node 24, stated in the package's `engines` (mad states none). TypeScript 7.0.2 as a type check only (`tsc --noEmit`), as in mad. Tests run with `node --test`, as in mad. Source files are `.ts` and Node runs them directly by stripping types, so there is no bundler and no build step; mad's esbuild test loader is not copied. The tsconfig targets Node, not the browser: no DOM library, Node's type definitions added. Two dependencies, pinned exactly as mad pins its own: a Blake3 implementation in plain JavaScript (Node's `crypto` has none; `@noble/hashes` is the candidate) and `@types/node`."

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad/package.json: no `engines`, test script `node --test tests/*.test.mjs`, typescript 7.0.2, esbuild 0.28.2, no hash library. /Users/seriouscoderone/code/bpm/mad/tsconfig.json: DOM library, `moduleResolution: Bundler`, `noEmit`. /Users/seriouscoderone/code/bpm/mad/tests/load.mjs:3 as quoted. Node v24.19.0 `crypto.getHashes()` lists only blake2b512 and blake2s256. I then tested the proposed toolchain in the scratch folder: a `.ts` file runs directly; an `enum` fails with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX; an import without the `.ts` extension fails with ERR_MODULE_NOT_FOUND; and a `.ts` file under node_modules fails with ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING.

**Skeptic's better change.** The proposed text is right but leaves out the three limits I hit. Use: 'One TypeScript package, run from a checkout. Node 24, stated in `engines` (mad states none). Source files are `.ts` and Node runs them directly by stripping types, so there is no bundler and no build step. That limits the code to syntax that can be erased (no enums or parameter properties; `erasableSyntaxOnly` in the tsconfig) and to relative imports that name the `.ts` extension. Node refuses to strip types for files under `node_modules`, so this holds only while the tool runs from a checkout; installing it as a package would need a build step. TypeScript 7.0.2 as a type check only (`tsc --noEmit`) and tests with `node --test`, both as in mad; mad's esbuild test loader is not copied. The tsconfig targets Node: no DOM library, Node's type definitions added. Two dependencies, pinned exactly as mad pins its own: a Blake3 implementation in plain JavaScript (Node's `crypto` has only BLAKE2; `@noble/hashes` is the candidate) and `@types/node`.'

### buildability-17: The tests leave stated behaviours unchecked, and the main fixtures come from a store that is not in git

Severity: should-fix. Section: Tests. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** Gaps against behaviours the design states: no test that a pretty-printed input comes out compact (the path every gym-bp document takes), none for `refers` being correct, none for a source that lists a SAID and serves other bytes, none for the private-address refusal or the content-type rule, none for any limit, none for the cache surviving an outage, none for a catalog row keyed by the computed SAID, none for a source dropping out, and none at all for readable pages or AI Catalog entries (build step 4). "Copied in as fixtures" also hides a step: gym-bp's frozen documents exist only in a gitignored store rebuilt by a script, and the design does not say which form is committed or what produces the compact bytes. If the code under test produces them, the claim that no expected value comes from the code under test no longer holds.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:264`: gym-bp's frozen documents (written by bpm-core in Python) and one KERI schema (written by KERI's tooling), copied in as fixtures.
- `/Users/seriouscoderone/code/bpm/gym-bp/README.md:24`: Frozen bytes never enter git.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:265`: **Build.** The output of a build verifies; a build refuses an input that does not.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:275`: 4. Readable pages and AI Catalog entries.

**Reviewer's proposed change.** Add to the first bullet: "The fixtures are made once: run `gym-bp/rebuild.sh`, then write each store file compactly with bpm-core's own serializer (`json.dumps(doc, separators=(",", ":"), ensure_ascii=False)`) and commit the result under its SAID. The pretty-printed failing case is the store file as it is. The KERI schema is GLEIF's Qualified vLEI Issuer schema, `EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao`, as served."

Replace the Build bullet with: "**Build.** The output of a build verifies. A pretty-printed input comes out compact. Each `refers` list equals the references in the bytes. A file whose name is not its SAID is refused by name, as is an input Node cannot re-serialize (an integer-like key, `1.0`) and a source document over the size limit. Two builds of the same input are byte-identical."

Add to the Walk bullet: "a source that lists a SAID and serves other bytes; a source document whose `source` is not its address; a wrong content type; a private address refused when the test option is off; a depth limit and a source limit reached and named in the report; sources introduced for the SAID visited first; a definition returned from the cache when its source is dead."

Add to the Catalog bullet: "A row is keyed by the computed SAID when a source lists a different one. A source removed between two builds is absent from the second. A robots rule that disallows the tool is obeyed."

Add a bullet: "**Pages and AI Catalog.** A definition containing `<script>` renders as text. Every link on a page resolves inside the output folder. The AI Catalog file validates against the specification at the named commit."

**What the skeptic checked.** Design lines 264-268 against the behaviours stated elsewhere: no test for compact output from a pretty-printed input, for `refers`, for the address or content-type rules, for any limit, for the cache, or for pages and AI Catalog entries (build step 4, line 275). gym-bp's store is not in git: /Users/seriouscoderone/code/bpm/gym-bp/.bpm/.gitignore holds `*`, `git -C gym-bp ls-files .bpm` prints nothing, and /Users/seriouscoderone/code/bpm/gym-bp/README.md:24 says 'Frozen bytes never enter git.' The store has 36 files and /Users/seriouscoderone/code/bpm/gym-bp/rebuild.sh rebuilds it.

**Skeptic's better change.** Adopt the fixture paragraph and the added tests, trimmed to match the other verdicts. In the SAID check's failing cases use 'the SAID field holding 44 `#`, a run of 44 `#` elsewhere, a `#` beside the SAID' and not 'the SAID present twice'. Keep the catalog line 'Two builds over the same fixtures produce identical files' with no exception. Add to the Catalog bullet: 'A source that lists more definitions than the cap is cut at the cap and reported.' Drop 'a source document whose `source` is not its address' only if buildability-05 is not adopted.

### buildability-18: No command says what it does on failure or what it exits with

Severity: should-fix. Section: The tool. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The command table gives one line per command and no failure behaviour. For `build` the design says only that it refuses to write a file that fails; it does not say whether other files are still written. For `verify`, `who` and `catalog build` nothing is said. bpm-core's command-line tool, the precedent in this workspace, prints JSON and exits 0 only when there is no error. An AI or a script driving this tool needs the same certainty.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:253`: Checks every output file against its SAID.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:254`: | `verify <file or address> [SAID]` | Runs the byte check. |
- `/Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md:73`: Codes are stable strings; CLI exits 0 iff no `error`.

**Reviewer's proposed change.** Add under the command table:

> | Command | Fails when | What it does |
> |---|---|---|
> | `build` | The configuration is unreadable or has an unknown member; an input does not verify or is misnamed; an output would exceed a size limit; `--out` is not empty | Names every failing file, writes nothing, exits 1 |
> | `verify` | The bytes fail the check, or the fetch is refused | Prints the expected and the computed SAID and the reason, exits 1 |
> | `who` | The starting source cannot be read | Exits 1. Any later failure is an `unresolved` entry and the walk exits 0 |
> | `catalog build` | A finder's public input cannot be read | Writes nothing, exits 1. A source that cannot be read is listed as unread and the build goes on |
>
> A usage error exits 2. Every command prints JSON on standard output. `build` and `catalog build` write to a new folder beside `--out` and rename it at the end, so a failed run leaves the previous output as it was.

**What the skeptic checked.** Design lines 253-256 give one line per command and no failure behaviour. /Users/seriouscoderone/code/bpm/bpm-core/CLAUDE.md:73 reads 'Codes are stable strings; CLI exits 0 iff no `error`', so the precedent is real. I compared the proposed table with buildability-09 and -13: this one lists '`--out` is not empty' as a failure and then says the build writes beside `--out` and renames so 'a failed run leaves the previous output as it was'. If `--out` must be empty there is no previous output.

**Skeptic's better change.** Adopt the table, exit codes 0, 1 and 2, and JSON on standard output. Delete the last sentence ('`build` and `catalog build` write to a new folder beside `--out` and rename it at the end...') and use the one rule from buildability-09 as amended: '`--out` must be absent or empty; nothing is written unless every check passes.' In the `catalog build` row keep 'Writes nothing, exits 1'.

### buildability-19: Eight terms are used without explanation

Severity: consider. Section: Terms. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** A reader who does not know KERI or the agent-catalog work meets these with no gloss: ARD (never expanded or described, first used at line 221), CESR (line 25), "untargeted ACDC" (line 245), JSON-LD (line 213), "MCP's Server Cards extension" (line 221), "blocks" (line 155, MAD's word for RRs), "principal" (lines 127 and 245) and "origin" (line 48). "Data OOBI" is explained where it is used, which is the model to follow.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:221`: ARD's file (`/.well-known/ard.json`) is emitted only if the same document is valid there
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:245`: The KERI form of such a statement is an untargeted ACDC.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:155`: In MAD, blocks link only through shared models

**Reviewer's proposed change.** Add two rows to the Terms table: "Principal | A person or organization identified by a key it holds itself. MAD's word; nothing here identifies principals until publications are signed." and "Origin | A scheme, host and port, such as `https://gym.example`. A source may sit at an origin's root or under a path on it."

Gloss the rest where first used: line 25 "CESR-encoded (KERI's text encoding for digests and keys)"; line 155 "blocks (responsibilities)"; line 213 "a JSON-LD block (structured data that crawlers read from a page)"; line 221 "MCP's Server Cards extension (how a Model Context Protocol client finds a server's description)" and "ARD (Agentic Resource Discovery, a second catalog format built on AI Catalog)"; line 245 "an untargeted ACDC (a signed KERI credential addressed to no particular holder)".

**What the skeptic checked.** Each term is used without a gloss at the line given (ARD 221, CESR 25, untargeted ACDC 245, JSON-LD 213, Server Cards 221, blocks 155, principal 127 and 245, origin 48). The survey expands ARD as 'Agentic Resource Discovery' ten times, so that part of the gloss is right. The other part is not: discovery-survey.md:193 quotes ARD's ADR-0010, 'we will only have a loose coupling between ARD entries and `ai-catalog` entries', and line 117 calls the two a 'path fork'.

**Skeptic's better change.** Adopt the two Terms rows and the glosses with two changes. ARD: 'ARD (Agentic Resource Discovery, a separate catalog format only loosely coupled to AI Catalog)', not 'built on AI Catalog'. CESR: a gloss does not let anyone encode a SAID. State the encoding and one worked value in 'Checking bytes against a SAID' instead (see the first missed finding) and leave line 25 as it is.

### buildability-20: Two bead pointers name the wrong bead for MAD's shared library

Severity: consider. Section: What waits on other work. Skeptic: partly; proposed change: adopt.

**Problem.** The table cites bpm-vfn.1 for "MAD's shared library and file format"; bpm-vfn.1 is only the format ruling, and the library is bpm-vfn.3. The tool section cites bpm-nq3.3 for "MAD's shared library"; bpm-nq3.3 is the task that gives MAD definitions SAIDs. Someone following either pointer lands on a bead that does not describe a library.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:285`: | A renderer that knows MAD's kinds | MAD's shared library and file format (bpm-vfn.1) |
- `bd show bpm-vfn.1 (run from /Users/seriouscoderone/code/bpm)`: Rule: the storage medium and file format the CLI and the UI share
- `bd show bpm-vfn.3 (run from /Users/seriouscoderone/code/bpm)`: One TypeScript library and a business-process CLI that create, validate, rehearse and check MAD data
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:260`: The SAID check is the one piece that also belongs in MAD's shared library (bpm-nq3.3).

**Reviewer's proposed change.** Line 285: replace "(bpm-vfn.1)" with "(the format ruling bpm-vfn.1, then the library bpm-vfn.3)". Line 260: replace "MAD's shared library (bpm-nq3.3)" with "MAD's shared library (bpm-vfn.3), which gains SAIDs in TypeScript with bpm-nq3.3".

**What the skeptic checked.** Ran bd show for bpm-vfn.1, bpm-vfn.3 and bpm-nq3.3 from /Users/seriouscoderone/code/bpm. bpm-vfn.1 is 'Rule: the storage medium and file format the CLI and the UI share' and it blocks bpm-vfn.3, 'One TypeScript library and a business-process CLI...'. bpm-nq3.3 is 'Generate real SAIDs for definitions...', with 'a Blake3-256 CESR digest (E prefix) that matches bpm-core's saidify byte-for-byte'; the README's Ruling 2 calls it 'bpm-nq3.3 (TypeScript SAIDs)'.

### buildability-21: The design does not say how MAD, a browser page, will consume the walk

Severity: consider. Section: The tool. Skeptic: confirmed; proposed change: adopt-modified.

**Problem.** The README calls mad-discovery "the network side" that MAD's Explore and provenance panel consume, and MAD is a browser prototype with no backend. The design offers only a command-line tool and a fetch routine that resolves host names before connecting, which a browser cannot do. A walk run in a browser would also need every source to send a cross-origin header; GLEIF's endpoint, the design's model for the definition path, sends none. This does not block the first cut, but whether a source must send that header is cheap to decide before anyone else publishes and costly after.

**Evidence.**

- `/Users/seriouscoderone/code/bpm/mad-discovery/README.md:31`: mad-discovery is the network side they consume.
- `/Users/seriouscoderone/code/bpm/mad-discovery/docs/design.md:228`: The host is resolved first, and private, loopback and link-local addresses are refused.
- `curl -sS -D - -o /dev/null https://www.gleif.org/.well-known/oobi/EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao/index.json | grep -i '^content-type\|^access-control' (2026-11-08)`: content-type: application/json

**Reviewer's proposed change.** Add to The tool: "The package exports the functions the commands call (the check, the source build, the walk, the catalog build), so MAD's command-line tool can import them. The walk runs in Node only."

Add a row to "What waits on other work": "A walk run inside MAD's browser page | A decision on whether sources must send `Access-Control-Allow-Origin: *`, and on how the address rules apply where a page cannot resolve a host name. Until then MAD reads the walk's report or its cache."

**What the skeptic checked.** /Users/seriouscoderone/code/bpm/mad-discovery/README.md:31 reads 'mad-discovery is the network side they consume.' Design line 228 resolves host names before connecting, which a browser page cannot do. Re-fetched GLEIF's schema with curl today: 200, `content-type: application/json`, and no `access-control-allow-origin` header among the 20 response headers. bpm-vfn.3 (MAD's library and command-line tool) is deferred, and Node refuses to strip types for a `.ts` file under node_modules (tested), so nothing says how one nested repository would import the other.

**Skeptic's better change.** Keep the row in 'What waits on other work' as proposed; it is a cheap decision to flag before anyone else publishes. Replace the first proposed sentence with 'The walk runs in Node only.' and drop the promise of exported functions for MAD's command-line tool: that tool does not exist yet, and an export list written for it is a guess.

### What the buildability reviewer missed

#### The SAID encoding is named but not given, and the obvious reading produces a wrong value of the right shape

Severity: should-fix.

**Problem.** The check says 'encode it as a CESR SAID' and the Terms table says 'CESR-encoded, 44 characters starting with `E`'. An engineer who has not read said.py will write `E` followed by the base64url of the 32 digest bytes. That is also 44 characters starting with `E`, and it is wrong. The design has no worked value to test against: the only `d` in its example is `E...`. The tests' outside vectors would catch the mistake, but only after the implementer has guessed. The first reviewer listed the description of said.py as sound and proposed only a gloss for CESR.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 0
- 3
- 
- '
- C
- o
- m
- p
- u
- t
- e
- 
- t
- h
- e
- 
- B
- l
- a
- k
- e
- 3
- -
- 2
- 5
- 6
- 
- d
- i
- g
- e
- s
- t
- 
- o
- f
- 
- t
- h
- e
- 
- r
- e
- s
- u
- l
- t
- 
- a
- n
- d
- 
- e
- n
- c
- o
- d
- e
- 
- i
- t
- 
- a
- s
- 
- a
- 
- C
- E
- S
- R
- 
- S
- A
- I
- D
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- b
- p
- m
- -
- c
- o
- r
- e
- /
- s
- r
- c
- /
- b
- p
- m
- _
- c
- o
- r
- e
- /
- s
- a
- i
- d
- .
- p
- y
- :
- 2
- 2
- 
- `
- f
- u
- l
- l
- 
- =
- 
- "
- E
- "
- 
- +
- 
- b
- a
- s
- e
- 6
- 4
- .
- u
- r
- l
- s
- a
- f
- e
- _
- b
- 6
- 4
- e
- n
- c
- o
- d
- e
- (
- b
- y
- t
- e
- s
- (
- [
- 0
- ]
- )
- 
- +
- 
- d
- i
- g
- e
- s
- t
- )
- .
- d
- e
- c
- o
- d
- e
- (
- "
- a
- s
- c
- i
- i
- "
- )
- .
- r
- s
- t
- r
- i
- p
- (
- "
- =
- "
- )
- [
- 1
- :
- ]
- `
- .
- 
- T
- e
- s
- t
- :
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- b
- p
- m
- -
- c
- o
- r
- e
- /
- .
- v
- e
- n
- v
- /
- b
- i
- n
- /
- p
- y
- t
- h
- o
- n
- 
- /
- p
- r
- i
- v
- a
- t
- e
- /
- t
- m
- p
- /
- c
- l
- a
- u
- d
- e
- -
- 5
- 0
- 1
- /
- -
- U
- s
- e
- r
- s
- -
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- -
- c
- o
- d
- e
- -
- b
- p
- m
- /
- 0
- d
- f
- 0
- 3
- f
- 7
- 4
- -
- 6
- 4
- d
- 8
- -
- 4
- f
- 0
- b
- -
- 9
- 0
- 4
- 0
- -
- d
- a
- 2
- 7
- 8
- e
- 7
- 4
- b
- 6
- 2
- c
- /
- s
- c
- r
- a
- t
- c
- h
- p
- a
- d
- /
- d
- e
- s
- i
- g
- n
- -
- r
- e
- v
- i
- e
- w
- /
- s
- k
- e
- p
- t
- i
- c
- -
- b
- u
- i
- l
- d
- a
- b
- i
- l
- i
- t
- y
- /
- s
- k
- 1
- .
- p
- y
- ,
- 
- l
- a
- s
- t
- 
- l
- i
- n
- e
- ,
- 
- f
- o
- r
- 
- t
- h
- e
- 
- t
- h
- r
- e
- e
- 
- b
- y
- t
- e
- s
- 
- `
- a
- b
- c
- `
- :
- 
- '
- C
- E
- S
- R
- :
- 
- c
- o
- r
- r
- e
- c
- t
- 
- E
- G
- Q
- 3
- s
- 6
- w
- 4
- R
- l
- E
- z
- _
- 7
- Y
- 7
- d
- S
- c
- 6
- j
- b
- V
- I
- x
- V
- h
- G
- X
- X
- n
- b
- A
- _
- 0
- 1
- n
- G
- z
- V
- v
- Z
- 2
- F
- 
- 4
- 4
- 
- 
- n
- a
- i
- v
- e
- 
- '
- E
- '
- +
- b
- 6
- 4
- u
- r
- l
- (
- d
- i
- g
- e
- s
- t
- )
- 
- E
- Z
- D
- e
- z
- r
- D
- h
- G
- U
- T
- P
- _
- t
- j
- t
- 1
- J
- z
- q
- N
- t
- U
- j
- F
- W
- E
- Z
- d
- e
- d
- s
- D
- _
- T
- W
- c
- b
- N
- W
- 9
- n
- Y
- U
- 
- 4
- 4
- 
- 
- e
- q
- u
- a
- l
- :
- 
- F
- a
- l
- s
- e
- '
- .

**Proposed change.** After the quoted rule in 'Checking bytes against a SAID' add: 'The encoding: put one zero byte in front of the 32 digest bytes, base64url-encode the 33 bytes (44 characters, no padding), and replace the first character, which is always `A`, with `E`. `E` followed by the base64url of the 32 bytes alone is also 44 characters and is wrong. Worked value: the three bytes `abc` give `EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F`.'

#### 'Anyone can rebuild' depends on a tool that is in a private repository, and the design never says how another party runs it

Severity: should-fix.

**Problem.** The design promises a view 'that anyone can rebuild' and says a reader who distrusts the maintainer's catalog 'can run the same command'. Ruling 1 created the repository private, and it is private today. Until that changes, nobody else can rebuild the catalog, run `verify`, or build a source with this tool; they can only write the files by hand. The design also says nothing about how another party would get the tool. The toolchain proposed in buildability-16 runs only from a checkout, because Node refuses to strip types under node_modules, so 'install it from npm' would need a build step and a version, which the workspace does not have yet. This is not a reason to reopen Ruling 1. It is a dependency the design should state and a question it should ask, because the objective rests on it.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 1
- 
- '
- A
- 
- d
- i
- r
- e
- c
- t
- o
- r
- y
- 
- o
- f
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- s
- 
- b
- e
- c
- o
- m
- e
- s
- 
- a
- 
- m
- e
- c
- h
- a
- n
- i
- c
- a
- l
- 
- v
- i
- e
- w
- 
- t
- h
- a
- t
- 
- a
- n
- y
- o
- n
- e
- 
- c
- a
- n
- 
- r
- e
- b
- u
- i
- l
- d
- 
- a
- n
- d
- 
- n
- o
- b
- o
- d
- y
- 
- o
- w
- n
- s
- .
- '
- 
- a
- n
- d
- 
- :
- 1
- 7
- 4
- 
- '
- a
- 
- r
- e
- a
- d
- e
- r
- 
- w
- h
- o
- 
- d
- i
- s
- t
- r
- u
- s
- t
- s
- 
- i
- t
- 
- c
- a
- n
- 
- r
- u
- n
- 
- t
- h
- e
- 
- s
- a
- m
- e
- 
- c
- o
- m
- m
- a
- n
- d
- .
- '
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- R
- E
- A
- D
- M
- E
- .
- m
- d
- :
- 1
- 7
- 
- '
- R
- e
- m
- o
- t
- e
- :
- 
- `
- g
- i
- t
- h
- u
- b
- .
- c
- o
- m
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- `
- ,
- 
- p
- r
- i
- v
- a
- t
- e
- .
- '
- 
- `
- g
- h
- 
- r
- e
- p
- o
- 
- v
- i
- e
- w
- 
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- 
- -
- -
- j
- s
- o
- n
- 
- v
- i
- s
- i
- b
- i
- l
- i
- t
- y
- ,
- i
- s
- P
- r
- i
- v
- a
- t
- e
- `
- 
- t
- o
- d
- a
- y
- :
- 
- {
- "
- i
- s
- P
- r
- i
- v
- a
- t
- e
- "
- :
- t
- r
- u
- e
- ,
- "
- v
- i
- s
- i
- b
- i
- l
- i
- t
- y
- "
- :
- "
- P
- R
- I
- V
- A
- T
- E
- "
- }
- .
- 
- b
- d
- 
- s
- h
- o
- w
- 
- b
- p
- m
- -
- 5
- g
- 1
- .
- 1
- 
- (
- c
- l
- o
- s
- e
- 
- r
- e
- a
- s
- o
- n
- )
- :
- 
- '
- c
- r
- e
- a
- t
- e
- d
- 
- p
- r
- i
- v
- a
- t
- e
- '
- ;
- 
- i
- t
- s
- 
- d
- e
- s
- c
- r
- i
- p
- t
- i
- o
- n
- :
- 
- '
- w
- h
- a
- t
- 
- i
- t
- 
- s
- e
- r
- v
- e
- s
- 
- i
- s
- 
- p
- u
- b
- l
- i
- c
- 
- b
- y
- 
- d
- e
- s
- i
- g
- n
- '
- .
- 
- S
- c
- r
- a
- t
- c
- h
- 
- t
- e
- s
- t
- ,
- 
- a
- 
- `
- .
- t
- s
- `
- 
- f
- i
- l
- e
- 
- i
- m
- p
- o
- r
- t
- e
- d
- 
- f
- r
- o
- m
- 
- n
- o
- d
- e
- _
- m
- o
- d
- u
- l
- e
- s
- 
- u
- n
- d
- e
- r
- 
- N
- o
- d
- e
- 
- v
- 2
- 4
- .
- 1
- 9
- .
- 0
- :
- 
- '
- E
- R
- R
- _
- U
- N
- S
- U
- P
- P
- O
- R
- T
- E
- D
- _
- N
- O
- D
- E
- _
- M
- O
- D
- U
- L
- E
- S
- _
- T
- Y
- P
- E
- _
- S
- T
- R
- I
- P
- P
- I
- N
- G
- :
- 
- S
- t
- r
- i
- p
- p
- i
- n
- g
- 
- t
- y
- p
- e
- s
- 
- i
- s
- 
- c
- u
- r
- r
- e
- n
- t
- l
- y
- 
- u
- n
- s
- u
- p
- p
- o
- r
- t
- e
- d
- 
- f
- o
- r
- 
- f
- i
- l
- e
- s
- 
- u
- n
- d
- e
- r
- 
- n
- o
- d
- e
- _
- m
- o
- d
- u
- l
- e
- s
- '
- .

**Proposed change.** Add open question 5: '**When is the tool public, and how does someone else run it?** Ruling 1 created the repository private. Until it is public, nobody else can rebuild the catalog or run `verify`, so "anyone can rebuild" is true of the file formats and not yet of the tool. Recommended: make the repository public before step 5; others run the tool from a clone with Node 24. An npm package waits until someone asks for one, because it needs a build step and a version.' At line 174 append 'once the tool is public (open question 5)'. In 'A source', add: 'A source can also be written by hand or by another tool. The files are the contract, not this tool.'

#### The build order says steps 1 to 4 need no cloud account, but step 3 includes the finder, which needs about 165 GB a month or a paid query

Severity: should-fix.

**Problem.** Step 3 is 'The catalog build with introductions only, then the first finder', and the next paragraph says steps 1 to 4 need no hosting, no domain and no cloud account. The design's own finder table says the recommended finder 'Needs a bulk download or a paid query', and the survey sizes that download at 0.15 TiB compressed per month, about 165 GB. The design also calls the finder's cost and coverage unmeasured and makes its feasibility check part of this review. An implementer who starts step 3 as written reaches a job that either moves 165 GB or needs an account, inside a block of steps the document says need neither.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 2
- 7
- 4
- 
- '
- 3
- .
- 
- T
- h
- e
- 
- c
- a
- t
- a
- l
- o
- g
- 
- b
- u
- i
- l
- d
- 
- w
- i
- t
- h
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- 
- o
- n
- l
- y
- ,
- 
- t
- h
- e
- n
- 
- t
- h
- e
- 
- f
- i
- r
- s
- t
- 
- f
- i
- n
- d
- e
- r
- .
- '
- 
- :
- 2
- 7
- 8
- 
- '
- S
- t
- e
- p
- s
- 
- 1
- 
- t
- o
- 
- 4
- 
- n
- e
- e
- d
- 
- n
- o
- 
- h
- o
- s
- t
- i
- n
- g
- ,
- 
- n
- o
- 
- d
- o
- m
- a
- i
- n
- 
- a
- n
- d
- 
- n
- o
- 
- c
- l
- o
- u
- d
- 
- a
- c
- c
- o
- u
- n
- t
- .
- '
- 
- :
- 1
- 8
- 4
- 
- '
- M
- o
- n
- t
- h
- l
- y
- .
- 
- O
- n
- l
- y
- 
- h
- o
- s
- t
- s
- 
- C
- o
- m
- m
- o
- n
- 
- C
- r
- a
- w
- l
- 
- v
- i
- s
- i
- t
- s
- .
- 
- N
- e
- e
- d
- s
- 
- a
- 
- b
- u
- l
- k
- 
- d
- o
- w
- n
- l
- o
- a
- d
- 
- o
- r
- 
- a
- 
- p
- a
- i
- d
- 
- q
- u
- e
- r
- y
- .
- '
- 
- :
- 1
- 8
- 9
- 
- '
- I
- t
- s
- 
- c
- o
- s
- t
- 
- a
- n
- d
- 
- c
- o
- v
- e
- r
- a
- g
- e
- 
- a
- r
- e
- 
- n
- o
- t
- 
- y
- e
- t
- 
- m
- e
- a
- s
- u
- r
- e
- d
- '
- .
- 
- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- r
- e
- s
- e
- a
- r
- c
- h
- /
- d
- i
- s
- c
- o
- v
- e
- r
- y
- -
- s
- u
- r
- v
- e
- y
- .
- m
- d
- :
- 7
- 2
- 8
- 
- '
- C
- o
- m
- m
- o
- n
- 
- C
- r
- a
- w
- l
- 
- s
- t
- o
- r
- e
- s
- 
- t
- h
- e
- 
- r
- o
- b
- o
- t
- s
- .
- t
- x
- t
- 
- o
- f
- 
- e
- v
- e
- r
- y
- 
- h
- o
- s
- t
- 
- i
- t
- 
- v
- i
- s
- i
- t
- s
- 
- a
- s
- 
- a
- 
- s
- e
- p
- a
- r
- a
- t
- e
- 
- d
- a
- t
- a
- s
- e
- t
- 
- (
- O
- c
- t
- o
- b
- e
- r
- 
- 2
- 0
- 2
- 6
- :
- 
- 1
- 0
- 0
- ,
- 0
- 0
- 0
- 
- f
- i
- l
- e
- s
- ,
- 
- 0
- .
- 1
- 5
- 
- T
- i
- B
- 
- c
- o
- m
- p
- r
- e
- s
- s
- e
- d
- )
- '
- .

**Proposed change.** Split the step. '3. The catalog build with introductions only.' '4. Readable pages and AI Catalog entries.' '5. The first finder, after its feasibility check.' '6. The maintainer's own source deployed, and a second real origin for a live check.' Replace line 278's first sentence with: 'Steps 1 to 4 need no hosting, no domain and no cloud account. Step 5 reads Common Crawl's robots.txt archive: about 165 GB a month as a bulk download, or a paid query, which needs an account.' Update the Tests note on the stranger case to say it uses a fixture for the finder's input and so belongs to step 3.

#### Nothing bounds how many definitions one source can make a reader fetch

Severity: should-fix.

**Problem.** The fetch rules limit sources per run, introductions per source and depth. They do not limit definitions per source, and the catalog build fetches every definition a source lists. A source document at the 1 MB limit holds 14,703 `serves` entries, each up to 1 MB, so one stranger's file can make a catalog build fetch 14.7 GB from one address. In the walk, step 4 fetches every definition whose `refers` names the SAID, and one source document can hold 8,770 such entries. The first reviewer's limits table caps the walk's step 4 at 50 but leaves the catalog uncapped, and buildability-13 then removes the cap on sources as well.

**Evidence.**

- /
- U
- s
- e
- r
- s
- /
- s
- e
- r
- i
- o
- u
- s
- c
- o
- d
- e
- r
- o
- n
- e
- /
- c
- o
- d
- e
- /
- b
- p
- m
- /
- m
- a
- d
- -
- d
- i
- s
- c
- o
- v
- e
- r
- y
- /
- d
- o
- c
- s
- /
- d
- e
- s
- i
- g
- n
- .
- m
- d
- :
- 1
- 6
- 7
- 
- '
- F
- o
- r
- 
- e
- v
- e
- r
- y
- 
- d
- e
- f
- i
- n
- i
- t
- i
- o
- n
- 
- a
- 
- s
- o
- u
- r
- c
- e
- 
- s
- e
- r
- v
- e
- s
- ,
- 
- f
- e
- t
- c
- h
- 
- t
- h
- e
- 
- b
- y
- t
- e
- s
- 
- a
- n
- d
- 
- c
- h
- e
- c
- k
- 
- t
- h
- e
- m
- .
- '
- 
- a
- n
- d
- 
- :
- 2
- 3
- 1
- 
- '
- L
- i
- m
- i
- t
- s
- 
- o
- n
- 
- s
- o
- u
- r
- c
- e
- s
- 
- p
- e
- r
- 
- r
- u
- n
- ,
- 
- i
- n
- t
- r
- o
- d
- u
- c
- t
- i
- o
- n
- s
- 
- p
- e
- r
- 
- s
- o
- u
- r
- c
- e
- 
- a
- n
- d
- 
- d
- e
- p
- t
- h
- .
- '
- 
- M
- e
- a
- s
- u
- r
- e
- d
- 
- w
- i
- t
- h
- 
- b
- p
- m
- -
- c
- o
- r
- e
- '
- s
- 
- P
- y
- t
- h
- o
- n
- 
- i
- n
- 
- t
- h
- e
- 
- s
- c
- r
- a
- t
- c
- h
- 
- f
- o
- l
- d
- e
- r
- 
- (
- J
- S
- O
- N
- 
- b
- u
- i
- l
- t
- 
- w
- i
- t
- h
- 
- c
- o
- m
- p
- a
- c
- t
- 
- s
- e
- p
- a
- r
- a
- t
- o
- r
- s
- )
- :
- 
- '
- b
- y
- t
- e
- s
- 
- p
- e
- r
- 
- s
- e
- r
- v
- e
- s
- 
- e
- n
- t
- r
- y
- 
- w
- i
- t
- h
- 
- e
- m
- p
- t
- y
- 
- r
- e
- f
- e
- r
- s
- :
- 
- 6
- 8
- 
- -
- >
- 
- e
- n
- t
- r
- i
- e
- s
- 
- i
- n
- 
- a
- 
- 1
- 
- M
- B
- 
- s
- o
- u
- r
- c
- e
- 
- d
- o
- c
- u
- m
- e
- n
- t
- :
- 
- 1
- 4
- 7
- 0
- 3
- 
- -
- >
- 
- b
- y
- t
- e
- s
- 
- a
- 
- r
- e
- a
- d
- e
- r
- 
- m
- a
- y
- 
- f
- e
- t
- c
- h
- 
- a
- t
- 
- 1
- 
- M
- B
- 
- e
- a
- c
- h
- :
- 
- 1
- 4
- .
- 7
- 
- G
- B
- '
- 
- a
- n
- d
- 
- '
- e
- n
- t
- r
- i
- e
- s
- 
- a
- l
- l
- 
- c
- l
- a
- i
- m
- i
- n
- g
- 
- t
- o
- 
- r
- e
- f
- e
- r
- 
- t
- o
- 
- X
- :
- 
- 8
- 7
- 7
- 0
- '
- .

**Proposed change.** In 'Fetching safely' add a limit: 'Definitions fetched from one source: 50 in a walk, 2,000 in a catalog build (numbers for the maintainer to set), taken in SAID order so the cut is the same on every run. A source over the limit is reported with the count left unfetched.' In The catalog, step 3, change 'For every definition a source serves' to 'For each definition a source serves, up to the limit in Fetching safely'. Keep a cap on sources in a catalog build (see the verdict on buildability-13).
