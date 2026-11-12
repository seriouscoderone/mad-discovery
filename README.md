# mad-discovery

Discovery for content-addressed MAD definitions without a curated site.

The maintainer's objective, in his words: "nobody needs to make protocol reference sites like openhaven or any other protocol aggregation site."

In MAD a protocol is a set of definitions (models, authorizations and responsibilities), each identified by a SAID, a digest of its own content. Parties serve frozen definitions, and publications that offer them, as static files at an address they control. Anyone can then ask "who else serves, describes or refers to this SAID" in two ways: by walking introductions outward from one source they already know, or from a catalog that is a repeatable build over public inputs and that anyone can regenerate.

## Status

The design is approved (2026-11-09) and the work is two epics: the known-address half (sources, pages, the walk and `get`, epic bpm-5g1) and the stranger half (the catalog and the robots.txt finder, epic bpm-7h1), which starts when the maintainer says. Steps 1 and 2 of the first epic are built: `build` makes a source from a folder of frozen definitions; `verify` checks a file or an address against a SAID; `who` walks from one source through its introductions and reports who serves, offers or contains a SAID; `get` brings a definition and everything that appears in it home. `who --catalog` waits on the catalog, the second epic. The first epic closed on 2026-11-10 with its acceptance met by tests, and the repository became public that day (Ruling 4). Step 3 of the first epic's build order is built: a source at the root of a host also gets `/.well-known/ai-catalog.json`, a Level 1 AI Catalog (specification commit `6e26a18`) with one entry per served definition and no digest; the deployed source serves it. One source is deployed, the gym-bp test data at `https://mad.seriouscoder.one/source.json` (readable at `https://mad.seriouscoder.one/pages/index.html`; how it is hosted and updated is in `deploy/README.md`); `verify`, `who` and `get` were run against it on the day it went up. The second epic started on 2026-11-10 (Ruling 10): a second source, `https://mad.josephleehunsaker.com/source.json`, serves one definition that the first also serves and neither introduces the other, and `seriouscoder.one` and `josephleehunsaker.com` each carry a `Mad-Source:` line in their robots.txt. Common Crawl has not captured those hosts in its three newest crawls, so the catalog's live stranger check waits on either that crawler or the GitHub-topic finder Ruling 10 added. The one part that may still change is the publication record, which MAD's publish step adopts or adjusts when it exists (bpm-nq3.5).

## Rulings

The maintainer's decisions, newest last. Each is the close reason of a `Rule:` bead in the workspace's beads database.

1. **Home** (bpm-5g1.1, 2026-11-08). mad-discovery is its own nested git repository under `bpm/`, gitignored there and never gitlinked. Remote: `github.com/seriouscoderone/mad-discovery`, private until the first epic closed and public since 2026-11-10 (Ruling 4). Label: `mad-discovery`. Its rulings are mirrored in this list.
2. **What is published and looked up** (bpm-5g1.2, 2026-11-08). MAD's real definitions (models, authorizations, RRs) identified by their SAIDs. mad-discovery defines no definition format and no digest of its own. Dropped from the draft spec: the DCR graph format, CIDv1 sha2-256 hashing over JCS, and the Weisfeiler-Lehman structural hash. Real MAD content waits on bpm-nq3.1 (property order) and bpm-nq3.3 (TypeScript SAIDs); gym-bp's frozen documents stand in as test data until then.
3. **What "no aggregation site" means** (bpm-5g1.3, 2026-11-08). A local walk plus a rebuildable index. Parties self-publish; a reader walks from any one known publisher through the publishers it lists; for strangers, an index is a repeatable batch over public inputs, published as a static file anyone can regenerate. The objective is met as: no hand-curation, no submission step, no authoritative site. It does not promise that no index exists anywhere. Dropped from the draft spec: the hosted crawler, the DynamoDB index, the query API and the ARD registry endpoint. Catalog formats such as AI Catalog and ARD are generated adapters, not the foundation.
4. **Two epics, one design; going public** (bpm-5g1.7, 2026-11-09). The design is approved. The work is two epics: bpm-5g1 is the known-address half (sources, readable pages, the walk and `get`, closable without any network beyond local test servers), and a second epic holds the catalog and the robots.txt finder and starts when the maintainer says. The repository becomes public when the first epic closes. The first deployed source serves a small set of gym-bp's documents labelled as test data; the hosts for the live stranger check are chosen when the second epic starts and checked against Common Crawl's index first.
5. **A source is one plain folder** (bpm-5g1.8, 2026-11-09). `source.json`, `definitions/<SAID>.json` and `pages/`, placed wherever the operator likes. No `/.well-known/` and no OOBI-shaped path for a source's own files: nothing probes a well-known location, and the KERI specification defines well-known `oobi` for AIDs returning a pointer, not for data. A definition's address is derived from the source's, never declared. A keripy-shaped `/oobi/<SAID>` for schema models is a possible later extra for root-hosted sources.
6. **Posting is open** (bpm-5g1.9, 2026-11-09). A catalog repeats what sources say and no build leaves a source out; there is no exclusion list. A host accepts that strangers' text appears under its address. The protections keep fetched text inert (escaped, never a link, never run) and do not keep it out. Made over a recommendation to add a public exclusion list: definitions are types and categories, not anything that runs, and authorization happens elsewhere.
7. **Publications are offerings; AIDs are stated, not verified** (bpm-5g1.10, 2026-11-09). A publication puts a definition forward as an idea for others to find and reuse; it is not an endorsement and is not signed, and the design carries no signature framing. A source document may state `by` (the operator's AID) and `oobi` (where to resolve it, the KERI url-and-AID pair); a publication may state its own `by`. Nothing here verifies any of it: the web is untrusted ground by design, as a KERI OOBI is, and judging ideas is not this project's job. A publication has no identifier of its own and no lineage claim.
8. **The SAID check is format-agnostic; the envelope is MAD's** (bpm-5g1.11, 2026-11-09). The check takes served bytes and a SAID, requires the SAID to be present, replaces every occurrence with 44 `#`, hashes, compares, and requires that putting the SAID back rebuilds the served bytes. It presumes only the standard SAID derivation and nothing about the envelope or the language inside it: JSON Schema, LISP or CEL in a field, a KERI schema with `$id`, or a non-JSON serialization check the same way. The envelope is MAD's decision (bpm-nq3.1, bpm-nq3.3). The price, accepted: a document whose content holds 44 consecutive `#`, or a `#` directly before its own SAID, cannot be served.
9. **The first cut's scope** (bpm-5g1.12, 2026-11-09). The robots.txt line is the only finder for now; a GitHub search finder is added only if real adopters turn out to need it; the first cut's ceilings stand as stated in the design. `get` is in the first cut as the network half of reuse. AI Catalog entries are the first epic's last step, outside its acceptance, without the optional digest; ARD's file is not written. Amended by Ruling 10.
10. **Finders, after the crawl check** (bpm-7h1.2, 2026-11-10). When the second epic started, the three newest Common Crawl crawls were found to hold no capture of any host the maintainer controls, so the live stranger check could not run on his hosts as the design wrote it. Both routes: the `Mad-Source` lines went up anyway on `seriouscoder.one` and `josephleehunsaker.com`, with a second source at `mad.josephleehunsaker.com`, so the robots route completes if Common Crawl ever captures those hosts; and a GitHub-topic finder (a public repository with topic `mad-source` whose homepage is the source address) joins the robots finder in step 6, because the first real adopter needs it. The live clause is met by either finder. Chosen over waiting on the robots lines alone, the GitHub finder alone, and a line on a captured host the maintainer does not own.
11. **Browser wallets may read a source** (bpm-7h1.13, 2026-11-12; decided during the Fortoid work, that project's bead fortoid-8v3). The maintainer's KERI wallet runs in a browser and reads sources with the browser's own `fetch`, which may read another origin's answer only when the header allows it. A source that wants browser wallets to read it sends `Access-Control-Allow-Origin: *` on `source.json` and on `definitions/*`. The header is optional: a source without it is still a source for the tools here, which run in Node, but no browser wallet can read it. `verify` over an address reports whether the file carried the header and does not fail without it. Both deployed sources have sent it since 2026-11-12 (`deploy/README.md`). Replaces the design's earlier rule that a browser is not expected to read a source.
12. **A stranger's string is well-formed Unicode** (bpm-7h1.14, 2026-11-12; raised by the Fortoid session, its bead fortoid-5wa). A string from a source document (a publication's name, description, tags or collection; `by`; `oobi`), a JSON Pointer path reported from a definition's keys, or a candidate file's `place` value that is not well-formed Unicode (a lone surrogate) fails its rule as a control character does: the entry is dropped and counted, in the source rules, in the scan's paths and so in a catalog's rows. A browser wallet's store cannot hold such text and refuses the whole file, so one hostile string would otherwise make a catalog row unreadable to every wallet, including what honest sources contributed. A format rule, not an exclusion list: Ruling 6 stands. Adopted as a task of the step 5 plan, before the catalog build executes.

## Documents

- [docs/design.md](docs/design.md): the design, approved 2026-11-09. Design authority. Its last section records the stress test with the maintainer.
- [docs/research/spec-review.md](docs/research/spec-review.md): the review of the draft build spec that led to rulings 2 and 3. Six lenses, each re-checked by a skeptic; 108 findings, none refuted.
- [docs/research/discovery-survey.md](docs/research/discovery-survey.md): the survey of eight families of discovery mechanisms that led to ruling 3.
- [docs/research/design-review.md](docs/research/design-review.md): the review of the design's first draft. Six lenses, each re-checked by a skeptic; 95 findings, none refuted. It includes the measurement of the candidate finders against live data.

The draft build spec itself is the repository's first commit: `git show 713a12f:MAD-DISCOVERY-SPEC.md`.

## Running it

Node 24, from a checkout: `npm ci`, then

```bash
npm run check                                   # TypeScript, as a type check only
npm test                                        # node --test over tests/*.test.ts
node bin/mad-discovery.ts build <folder> --config <file> --out <folder>
node bin/mad-discovery.ts verify <file> <SAID>
node bin/mad-discovery.ts verify <https address> <SAID>
node bin/mad-discovery.ts who <SAID> --from <source address>
node bin/mad-discovery.ts get <SAID> --from <source address> --out <folder>
```

`who` and `get` reach only `https` sources on the default port at DNS names; the tests stand up local origins through a test-only option that no flag exposes. A source at a host root also writes `.well-known/ai-catalog.json`; GitHub Pages skips dot-folders unless a branch deploy has an empty `.nojekyll` or an Actions deploy sets `include-hidden-files: true`.

The input folder holds one file per definition, named `<SAID>.json`. `fixtures/gym-config.json` is an example configuration; `fixtures/README.md` says where every test vector came from.

## How it relates to the other repositories

- `mad/` defines what a definition is and will give definitions their SAIDs (bpm-nq3.3). MAD's Explore, its provenance panel and the import of what is found stay there (bpm-upm.21, bpm-upm.22). mad-discovery is the network side they consume.
- `gym-bp/` holds frozen, SAID-addressed documents today. They are this project's test data.
- `bpm-core/` computes those SAIDs (Blake3-256, CESR). mad-discovery checks fetched bytes against the same rule and adds no digest of its own.

## Tracking

Work is tracked in the workspace's beads database under the label `mad-discovery`; run `bd` from `~/code/bpm`. The epics are bpm-5g1 (first) and bpm-7h1 (second); the rulings sit under bpm-5g1. Next task: `bd ready --exclude-type epic --label mad-discovery`.
