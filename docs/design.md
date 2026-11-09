# mad-discovery design

**Status: draft for the maintainer's review.** Nothing here is built. It replaces the draft build spec (`git show 713a12f:MAD-DISCOVERY-SPEC.md`) and is written to the three rulings in the [README](../README.md#rulings). The evidence behind those rulings is in [research/spec-review.md](research/spec-review.md) and [research/discovery-survey.md](research/discovery-survey.md).

## What this project is for

The maintainer's objective: nobody should need to make a protocol reference or aggregation site such as openhaven.net.

In MAD a protocol is a set of definitions: models, authorizations and responsibilities. Each is identified by a SAID, a digest of its own content, so two parties holding the same SAID hold the same definition and nobody assigns or approves the identity. A reference site adds three things on top of that: somewhere to read a definition, a way to learn who else uses it, and a list of what exists. This project supplies all three from what parties publish about themselves.

**What it promises.** No hand-curation, no submission step and no authoritative site. A directory of definitions becomes a mechanical view that anyone can rebuild and nobody owns.

**What it does not promise.**

- That no index exists anywhere. Asking "who else uses this SAID" of parties you have no link to needs a list that somebody compiled. The survey found no exception across eight families of mechanisms. This design keeps that list rebuildable, replaceable and without authority.
- Independent assessment. Much of what openhaven.net offers is its researchers' judgement of each protocol, and it refuses self-description. Replacing that needs statements about a SAID signed by third parties, which waits for signatures (see [Trust](#trust-what-is-verified-observed-and-claimed)).

## Terms

These are MAD's own words for discovery, from `mad/docs/mad-ux-design.md` ("Explore what MAD has learned") and `mad/docs/micro-apps-vision.md` ("Introductions and retrieval"). MAD's documents leave their wire formats open; the formats below are this project's proposal for them.

| Term | Meaning here |
|---|---|
| Definition | A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility. In the test data: gym-bp's frozen documents. |
| SAID | The definition's identifier: a Blake3-256 digest of its content, CESR-encoded, 44 characters starting with `E`. The workspace's rule; this project adds no other digest. |
| Source | A place on the web that serves definitions and records about them as static files. It is identified by the address of its source document. |
| Source document | One JSON file that says what a source serves, which publications it carries and which other sources it knows. |
| Publication | A record that endorses one exact definition and describes it for discovery: a name, a description, tags and a collection placement. |
| Introduction | A pointer from one source to another source's address, optionally naming the SAIDs it is expected to carry. A hint to fetch and check, never a fact. |
| Catalog | A listing derived from sources: for each SAID, where it is served, who publishes it and which definitions refer to it. Any number can exist and none is authoritative. |
| Reader | Whoever runs a lookup. |
| Finder | The part of a catalog build that proposes source addresses from a public input. |

Two words from earlier discussion are gone. "Declaration" already means something else in MAD (a responsibility's state and view declarations), so the records here are publications and introductions. And nothing claims authorship: identity comes from content, so there is no author to record.

## The three parts

1. **A source** is a folder of static files that a party uploads to an address it controls.
2. **The walk** is a lookup a reader runs from their own machine. Given a SAID and one source address, it reads that source, follows its introductions to other sources and reports what it found. Nothing is hosted.
3. **A catalog** is the output of a repeatable build that visits every source it can find and writes static files. It covers the case the walk cannot: two parties who never linked to each other.

Two generated extras ride on a source: a readable page per definition, and entries in the AI Catalog format so existing agent tooling can find the definitions.

All of it is one TypeScript package with a command-line tool. There is no server, database or query service. Deploying means copying a folder to any static host.

## A source

A source is the output folder of one build. Laid out at the root of an origin it looks like this:

```
/.well-known/mad/source.json                the source document
/.well-known/oobi/<SAID>/index.json         the bytes of the definition with that SAID
/definitions/<SAID>/index.html              the readable page for that definition
/.well-known/ai-catalog.json                AI Catalog entries (generated)
/robots.txt                                 carries one line naming the source document
```

The source document:

```json
{
  "source": "https://gym.example/.well-known/mad/source.json",
  "definitions": "https://gym.example/.well-known/oobi/{said}/index.json",
  "serves": [
    {
      "said": "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U",
      "refers": ["EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB", "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
    }
  ],
  "publications": [
    {
      "d": "E...",
      "target": "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U",
      "name": "Paid admission",
      "description": "A cashier admits a patron who has paid.",
      "tags": ["gym", "admission"],
      "collection": "Fitness / Front desk"
    }
  ],
  "introductions": [
    {
      "source": "https://city.example/.well-known/mad/source.json",
      "for": ["EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
    }
  ],
  "catalogs": ["https://gym.example/catalog/catalog.json"]
}
```

Rules for a source:

- **A source is identified by the address of its source document**, not by a domain. A source can therefore live under a path on a shared host. The domain is a locator, never an identity.
- **`definitions` is a template.** A reader builds the address of a definition's bytes from it and never guesses a path.
- **The definition path follows an existing convention.** `/.well-known/oobi/<SAID>/index.json` is the shape GLEIF publishes its vLEI schemas in today, and a file served there is what KERI calls a data OOBI: an address paired with a SAID, checked by the recipient. Serving under `index.json` gives the right content type on any static host.
- **`refers` lists the SAIDs that appear inside a served definition.** It lets a reader ask "which definitions here refer to X" without fetching every definition. It is a claim until the reader fetches the referring definition and sees the reference in its bytes.
- **`catalogs` introduces catalogs the source's operator finds useful.** A reader who knows one source thereby learns of catalogs, which is how MAD's design says discovery starts ("bootstrapped introductions to available catalogs").
- **The robots.txt line** (`Mad-Source: <address of the source document>`) is the one thing a source emits for parties who have never heard of it. See [Finding sources nobody linked](#finding-sources-nobody-linked).

## Checking bytes against a SAID

The check needs no knowledge of the document's format:

> Take the bytes as served. Replace every occurrence of the expected SAID with 44 `#` characters. Compute the Blake3-256 digest of the result and encode it as a CESR SAID. The bytes are verified if that equals the expected SAID.

This is the workspace's SAID rule (`bpm-core/src/bpm_core/said.py`) applied to bytes instead of to a parsed document. The two agree whenever a document contains its own SAID only in its SAID field, which holds for every document tested.

Measured on 2026-11-08 with a throwaway script:

- GLEIF's Qualified vLEI Issuer schema, exactly as served from `www.gleif.org`, verifies. It was written by KERI's own tooling and carries its SAID in `$id`, not `d`.
- All 36 of gym-bp's frozen documents verify once serialized compactly, both by Python and by Node's `JSON.parse` then `JSON.stringify`.
- None of the 36 verifies as stored, because the store files are pretty-printed.

So a source must serve the compact serialization the SAID was computed over. The build re-serializes its inputs when needed, then checks every file it is about to write against its SAID and refuses to write one that fails. A serialization difference between languages is caught at build time, on the publisher's machine, and never reaches a reader.

Only Blake3-256 SAIDs (code `E`) are accepted. Any other code is reported as unsupported. SAIDs are compared as exact 44-character strings; there is one text form.

This check is independent of the unmade property-order ruling (bpm-nq3.1). That ruling governs how MAD will *generate* a SAID from a definition. Checking bytes someone already serialized does not depend on it.

## Publications

A publication endorses one exact definition and carries its discovery metadata. The fields are the ones MAD's Publish screen already collects (`mad/src/views.ts`, `Publication`): a name, a description, tags and a collection placement, plus the target's SAID.

- `target` is the SAID of the definition endorsed.
- `d` is the publication's own SAID, computed by the same rule. Copies of one publication on several sources are then recognizably one publication, as MAD's design requires ("multiple copies of one signed publication do not multiply its endorsement").
- A publication says nothing about the definition's kind. The reader takes that from the definition's own content.

In this first cut a publication is unsigned, so it is attributed only to the source address it was fetched from. That makes every publication *claimed*, in MAD's three provenance states (claimed, verified, unresolved). An endorsing principal and a signature are added later as new fields; a signed publication is a new record with a new SAID.

MAD separately plans to publish as a signed bundle that another MAD instance imports (bpm-nq3.5). The two must agree on what a publication contains. This design takes MAD's existing fields so that they do.

## Introductions

An introduction names another source document's address and, optionally, the SAIDs the introducer expects it to carry. It follows KERI's out-of-band introduction: an untrusted pointer that the recipient fetches and checks.

A source's operator lists the sources they know: where they first got a definition, and others they know to publish the same SAIDs. The reader records the introducing source as the introducer, which MAD's design asks to keep ("introducers when known").

Introductions make the walk possible. They also carry the weakness the survey found in every link-walking scheme: a reader reaches only what somebody linked. The catalog exists for the rest.

## The walk

`mad-discovery who <SAID> --from <source address>` runs on the reader's machine:

1. Fetch the source document at the given address.
2. If the source serves the SAID, fetch the bytes and check them.
3. Collect the source's publications whose target is the SAID.
4. For each served definition whose `refers` lists the SAID, fetch that definition, check its bytes and confirm the reference is in them.
5. Follow the source's introductions, those naming the SAID first, and repeat. Stop at stated limits on sources, depth and time. Remember visited addresses so cycles end.

The report has three lists, each entry naming the source it came from and the chain of introductions that led there:

- sources that serve the definition (verified by the byte check);
- publications of it (claimed);
- definitions that refer to it, with the path of the reference inside them (verified).

The third list is what answers "who else issues or relies on this model". In MAD, blocks link only through shared models, so the responsibilities that refer to a model's SAID are the ones that can interoperate over it. The project stays format-agnostic by recording where a SAID appears and leaving what the reference means to tools that know the kind.

The report ends by saying how many sources it reached, and that reaching none is not evidence that nobody else uses the definition.

Fetched definitions are kept in a local folder keyed by SAID, with a log of where and when each was retrieved, so a remote outage does not erase what was learned. With `--catalog <address>`, the walk also takes introductions from a catalog, checking each one the same way.

## The catalog

`mad-discovery catalog build --out <folder>` is a batch:

1. Run the finders to get candidate source addresses.
2. Visit each source; follow introductions to more sources, within limits.
3. For every definition a source serves, fetch the bytes and check them. Extract the SAIDs that appear inside.
4. Write static files: one per SAID, one listing every source found and how it was found, and one describing the build (the command, the tool's commit, and the public inputs used, each with its date or snapshot name).

The file for a SAID lists the same three things as the walk's report. A catalog therefore returns introductions, in MAD's sense: a reader takes the addresses from it and checks everything again for themselves. A catalog assigns no identity and settles nothing.

**Repeatable** means: the same command over the same public inputs. Two parties who run it at the same time should produce the same sources list. The result changes only as the public web changes. Output is written in a fixed order with no build timestamps inside the rows, so two builds can be compared with a plain diff.

The maintainer's own catalog is one copy among any number. It is a scheduled job in continuous integration that writes files to his source. There is no database and no query endpoint, and a reader who distrusts it can run the same command.

### Finding sources nobody linked

This is the hard part and the one open design choice that affects whether the objective is met. A walk cannot connect two authors who never met but arrived at the same definition, and `mad/HANDOFF.md` names that case first among its success criteria. Something has to notice a new source without being told.

A finder reads a public input that already exists and that the maintainer does not operate. Candidates:

| Finder | What the source emits | Public input read | Known limits |
|---|---|---|---|
| Robots line | One line in `robots.txt` naming its source document | Common Crawl's monthly archive of every robots.txt it fetched | Monthly. Only hosts Common Crawl visits. Needs a bulk download or a paid query. Sources under a path on a shared host have no robots.txt. |
| Certificate label | A host name with an agreed first label, such as `mad-source.<domain>` | Certificate Transparency logs, which record every publicly trusted certificate | Needs its own host name and DNS. Searching the logs by label depends on a few search services. Unmeasured. |
| Code search | The source document at its well-known path in a public repository | GitHub code search | One company. Needs a token. Not exhaustive. Finds only sources kept on GitHub. |
| Existing registries | AI Catalog entries | Registries that crawl AI Catalog files | The survey found none that picks up an unlisted domain without a request. |

**Recommendation, provisional:** the robots line first. It costs a source one line, robots.txt is the most widely served file of its kind, and an open archive already collects it. Its cost and coverage are not yet measured, and a feasibility check of this finder and the certificate label is part of this design's review. The finder is a plug-in, so the choice can change without touching sources that already carry the line.

Until a finder is proven, the catalog covers only what is reachable by introductions from the sources named on its command line. That limit is stated in the catalog's own build description.

### What a catalog row may say

A catalog is built from documents written by strangers, so:

- A row is keyed by the SAID computed from bytes the build fetched and checked, never by a SAID a document merely states.
- Every statement is attributed to the source address it was fetched from. Nothing in one source's files can create or change a row attributed to another source.
- Publications are recorded as claimed.
- A count of sources is a count of addresses, which costs nothing to inflate. The catalog reports it as such. Which sources or principals to believe stays the reader's decision.
- A source that disappears drops out at the next build, because every build starts from nothing.

## Readable pages

For each definition a source serves, the build writes one HTML page at `/definitions/<SAID>/`. It shows:

- the names and descriptions from this source's publications of it;
- the SAID, and the command that checks it;
- the definition's content as a readable outline, with each SAID inside it linked to that definition's page when the source serves it;
- the definitions on this source that refer to it;
- the catalogs this source introduces, for looking further.

Every word on the page comes from the definition or from a publication. The build writes no prose of its own, which is MAD's rule for shown text. The page also carries a JSON-LD block with the SAID as its identifier, so general search engines index it.

This first cut renders any JSON document generically. A renderer that knows MAD's kinds belongs with MAD's shared library and arrives with MAD's export.

## AI Catalog entries

The build also writes `/.well-known/ai-catalog.json` with one entry per served definition, in the Linux Foundation AI Catalog format: the definition's address, a media type, the sha-256 digest that format requires, and the SAID under an extension key.

This is an advertisement, not a foundation. The survey found about 200 to 250 domains publishing such files and no general registry that finds a new domain unasked. It is here because MCP's Server Cards extension points clients at this file, and because it is cheap. The fields are written against a recorded commit of the AI Catalog specification, which had no tagged release when surveyed. ARD's file (`/.well-known/ard.json`) is emitted only if the same document is valid there; the two formats have diverged and nothing here depends on either.

## Fetching safely

The walk and the catalog build fetch addresses chosen by strangers. Both use one fetch routine with these rules:

- HTTPS only. Redirects are not followed.
- The host is resolved first, and private, loopback and link-local addresses are refused. Tests opt in to localhost explicitly.
- Size limits enforced while reading, not from the stated length: 1 MB for a source document, 1 MB for a definition. No transparent decompression beyond the limit.
- A time limit per request and per run.
- One request at a time per host and a cap across hosts. Limits on sources per run, introductions per source and depth.
- Only JSON content types are accepted for JSON files. Nothing fetched is executed or rendered.
- A named user agent. A catalog build also honours robots.txt.

## Trust: what is verified, observed and claimed

| Kind | What it covers |
|---|---|
| Verified | These bytes have this SAID. This definition contains a reference to that SAID. |
| Observed | This source address served this record at this time. |
| Claimed | Everything a publication says, including that it endorses its target. |

Nothing else is known in this first cut. In particular a source can publish any SAID at no cost, so the number of sources publishing a definition is not a vote.

Signatures change that, and they are additive. A publication gains an endorsing principal and a signature by that principal's self-held key; a reader who can check it marks the publication verified and counts principals, not addresses. Third parties can then publish signed statements about a definition they did not write, which is how an assessment travels with a definition instead of living on a reference site. The KERI form of such a statement is an untargeted ACDC. That work waits on durable keys (bpm-upm.25) and the KERI path (bpm-upm.26) in MAD; no step here has to be undone for it.

## The tool

One TypeScript package, using the same Node, TypeScript and test runner as `mad/`. One command, `mad-discovery`:

| Command | What it does |
|---|---|
| `build <folder> --out <folder>` | Makes a source from a folder of frozen documents and one configuration file holding publications, introductions and catalogs. Checks every output file against its SAID. |
| `verify <file or address> [SAID]` | Runs the byte check. |
| `who <SAID> --from <address>` | The walk. |
| `catalog build --out <folder>` | The catalog build. |

The verb for making a source is `build`. "Publish" stays out of the command names while MAD's publish-versus-freeze ruling (bpm-nq3.2) is open.

The SAID check is the one piece that also belongs in MAD's shared library (bpm-nq3.3). It lives here until that library has it, then this package imports it and deletes its own copy. There is one implementation at any time.

## Tests

- **SAID check against outside vectors.** gym-bp's frozen documents (written by bpm-core in Python) and one KERI schema (written by KERI's tooling), copied in as fixtures. A frozen document cannot drift from its SAID, so the copies stay valid. Failing cases: one byte changed, a wrong SAID, pretty-printed bytes, an unsupported code. No expected value is generated by the code under test.
- **Build.** The output of a build verifies; a build refuses an input that does not.
- **Walk.** Three local static servers on different ports stand for three origins. The first introduces the second, the second the third; a lookup from the first finds all three. Also: a cycle, a dead source, an oversized file, a redirect, a source whose `refers` names a reference that is not in the bytes.
- **Catalog.** Two builds over the same fixtures produce identical files. A source cannot create a row attributed to another source.
- **The stranger case.** Two sources that never link to each other, plus a fixture standing for the finder's public input. The catalog lists both for the same SAID.

## Build order

1. The SAID check, and `build` over gym-bp's frozen documents. No network.
2. Introductions and the walk, tested across local origins.
3. The catalog build with introductions only, then the first finder.
4. Readable pages and AI Catalog entries.
5. The maintainer's own source deployed, and a second real origin for a live check.

Steps 1 to 4 need no hosting, no domain and no cloud account. Each is planned and reviewed before it starts.

## What waits on other work

| Waiting | On |
|---|---|
| MAD's own definitions as content | SAIDs for MAD definitions and an export of them (bpm-nq3.1, then bpm-nq3.3) |
| A renderer that knows MAD's kinds | MAD's shared library and file format (bpm-vfn.1) |
| Signed publications and third-party assessments | Durable keys (bpm-upm.25) and the KERI path (bpm-upm.26) |
| Using what is found inside MAD | The provenance panel and Explore (bpm-upm.21, bpm-upm.22) |
| Finding similar, not identical, definitions | Structural category (bpm-nq3.7, bpm-upm.23) |

## Open questions for the maintainer

1. **Which finder comes first?** Recommended: the robots line, provisionally, pending the feasibility check. The alternative is the certificate label, or no finder until one is measured.
2. **Are these the names and paths?** Recommended as written: definitions under `/.well-known/oobi/<SAID>/index.json`, the source document at `/.well-known/mad/source.json`, the robots line `Mad-Source:`. The definition path reuses KERI's and GLEIF's convention; the other two are new. All three are cheap to change before anyone else publishes.
3. **Where does the maintainer's own source live, and under which domain?** Recommended: a static bucket behind CloudFront in the `personal` AWS account, under a domain he controls, because the address goes into other parties' introductions and a default CloudFront address is throwaway. A second origin on a different host, such as GitHub Pages, serves the live check. This does not block steps 1 to 4.
4. **Is the publication record right?** Recommended as written: MAD's existing fields, its own SAID, unsigned for now. It commits MAD's later signed bundle (bpm-nq3.5) to the same fields.

## What was dropped from the draft spec

| Dropped | Why |
|---|---|
| The DCR graph format | Not a MAD definition. Ruling 2. |
| CIDv1 sha2-256 over JCS | A second digest beside the SAID. Ruling 2. |
| The Weisfeiler-Lehman structural hash | Underspecified, and a different equivalence from MAD's category. Ruling 2. |
| The crawler Lambda, DynamoDB index and query API | An aggregation site by another name. Ruling 3. |
| The ARD registry endpoint | Would make this project a registry operator. Ruling 3. |
| The CDK application and npm workspaces | Nothing left for them to hold: the output is a folder of static files and the code is one package. |
| Phases that stop before each deploy | Replaced by the build order above, which has no deploy until step 5. |

The findings behind each row are in [research/spec-review.md](research/spec-review.md).
