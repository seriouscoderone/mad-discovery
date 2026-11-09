# mad-discovery

Discovery for content-addressed MAD definitions without a curated site.

The maintainer's objective, in his words: "nobody needs to make protocol reference sites like openhaven or any other protocol aggregation site."

In MAD a protocol is a set of definitions (models, authorizations and responsibilities), each identified by a SAID, a digest of its own content. Parties publish frozen definitions, and their publications of them, as static files on an origin they control. Anyone can then ask "who else publishes, or refers to, this SAID" in two ways: by walking introductions outward from one source they already know, or from a catalog that is a repeatable build over public inputs and that anyone can regenerate.

## Status

A design draft awaiting the maintainer's review. There is no code and nothing is deployed.

## Rulings

The maintainer's decisions, newest last. Each is the close reason of a `Rule:` bead in the workspace's beads database.

1. **Home** (bpm-5g1.1, 2026-11-08). mad-discovery is its own nested git repository under `bpm/`, gitignored there and never gitlinked. Remote: `github.com/seriouscoderone/mad-discovery`, private. Label: `mad-discovery`. Its rulings are mirrored in this list.
2. **What is published and looked up** (bpm-5g1.2, 2026-11-08). MAD's real definitions (models, authorizations, RRs) identified by their SAIDs. mad-discovery defines no definition format and no digest of its own. Dropped from the draft spec: the DCR graph format, CIDv1 sha2-256 hashing over JCS, and the Weisfeiler-Lehman structural hash. Real MAD content waits on bpm-nq3.1 (property order) and bpm-nq3.3 (TypeScript SAIDs); gym-bp's frozen documents stand in as test data until then.
3. **What "no aggregation site" means** (bpm-5g1.3, 2026-11-08). A local walk plus a rebuildable index. Parties self-publish; a reader walks from any one known publisher through the publishers it lists; for strangers, an index is a repeatable batch over public inputs, published as a static file anyone can regenerate. The objective is met as: no hand-curation, no submission step, no authoritative site. It does not promise that no index exists anywhere. Dropped from the draft spec: the hosted crawler, the DynamoDB index, the query API and the ARD registry endpoint. Catalog formats such as AI Catalog and ARD are generated adapters, not the foundation.

## Documents

- [docs/design.md](docs/design.md): the design. Design authority once approved.
- [docs/research/spec-review.md](docs/research/spec-review.md): the review of the draft build spec that led to rulings 2 and 3. Six lenses, each re-checked by a skeptic; 108 findings, none refuted.
- [docs/research/discovery-survey.md](docs/research/discovery-survey.md): the survey of eight families of discovery mechanisms that led to ruling 3.

The draft build spec itself is the repository's first commit: `git show 713a12f:MAD-DISCOVERY-SPEC.md`.

## How it relates to the other repositories

- `mad/` defines what a definition is and will give definitions their SAIDs (bpm-nq3.3). MAD's Explore, its provenance panel and the import of what is found stay there (bpm-upm.21, bpm-upm.22). mad-discovery is the network side they consume.
- `gym-bp/` holds frozen, SAID-addressed documents today. They are this project's test data.
- `bpm-core/` computes those SAIDs (Blake3-256, CESR). mad-discovery checks fetched bytes against the same rule and adds no digest of its own.

## Tracking

Work is tracked in the workspace's beads database under the label `mad-discovery`; run `bd` from `~/code/bpm`. The epic is bpm-5g1. Next task: `bd ready --exclude-type epic --label mad-discovery`.
