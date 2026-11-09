# MAD Discovery — Build Spec

Content-addressed MAD definitions (DCR graphs), published via the ARD / AI Catalog
standard, plus a reverse index that answers: **"who else publishes a definition with hash X?"**

Target: AWS, profile `personal`. Read this whole file before writing code.

---

## 0. Ground rules for the agent

- Every AWS command runs with `AWS_PROFILE=personal`. Before the first deploy, run
  `aws sts get-caller-identity` and show the account ID to the user for confirmation.
- Never deploy, destroy, or create paid resources without asking first. Use `cdk diff` before every `cdk deploy`.
- Tag every resource: `project=mad-discovery`.
- Keep it serverless and near-zero idle cost (no NAT gateways, no always-on compute, DynamoDB on-demand).
- Read the current specs before implementing catalog formats. They are young and changing:
  - https://ai-catalog.io/ (base AI Catalog spec)
  - https://agenticresourcediscovery.org/ (ARD layer)
  Pin the `specVersion` you implement in `docs/SPEC_VERSIONS.md`.
- Work in phases (§6). Stop at the end of each phase, summarize, and wait for go-ahead.

## 1. Stack

- Language: TypeScript (Node 20+) everywhere. Monorepo with npm workspaces.
- IaC: AWS CDK v2 (TypeScript).
- Region: `us-west-2` unless the user says otherwise.
- Tests: vitest.

```
packages/
  mad-hash/      # library + CLI: canonicalize + hash DCR definitions
  publisher/     # builds ai-catalog.json + defs/ from a local folder of definitions
  indexer/       # crawler Lambda + query API Lambda
infra/           # CDK app
definitions/     # the user's own MAD definitions (source of truth, JSON)
docs/
```

## 2. Definition format (v0 — confirm with user)

A MAD definition is a DCR graph in JSON:

```json
{
  "mad": "0",
  "kind": "dcr-graph",
  "events":    [{ "id": "approve", "label": "Approve invoice", "role": "manager" }],
  "relations": [{ "type": "condition", "from": "submit", "to": "approve" }],
  "marking":   { "executed": [], "included": ["submit","approve"], "pending": [] }
}
```

Relation `type` ∈ `condition | response | include | exclude | milestone`.
Nested sub-graphs are out of scope for v0.

## 3. Hashing (`packages/mad-hash`)

The core of the project. It must be deterministic and well-tested.

**Normal form:**
1. Validate against a JSON Schema (store in `packages/mad-hash/schema/`).
2. Sort `events` by `id`, sort `relations` by `(type, from, to)`, and sort marking arrays.
3. Drop unknown/non-semantic keys (anything prefixed `x-` is metadata, never hashed).
4. Serialize with JCS (RFC 8785) via the `canonicalize` npm package.

**Two hashes, both encoded as CIDv1 (raw codec, sha2-256 multihash, base32) via `multiformats`:**
- `full`: hash of the normal form. Identical definitions get identical hashes.
- `structural`: hash of the graph *shape*, ignoring event IDs, labels and roles.
  Compute it with Weisfeiler–Lehman color refinement over the relation graph:
  - initial color = relation-type signature + marking flags;
  - 3 iterations;
  - hash the sorted multiset of final colors plus the sorted relation list in color space.

  Document that collisions are possible. The structural hash is a *candidate* match only, and the indexer
  confirms matches by comparing the fetched definitions.

**CLI:** `mad-hash <file.json>` prints `{ full, structural }`. Also `mad-hash --normalize`.

**Tests (required):**
- reordering events/relations doesn't change either hash;
- renaming IDs/labels changes `full` but not `structural`;
- changing any relation changes both;
- golden-file fixtures in `packages/mad-hash/test/fixtures/`.

## 4. Publishing (`packages/publisher` + infra)

- Input: `definitions/*.json`.
- Output (to S3, served via CloudFront):
  - `/defs/<full-cid>.json`: normalized definition, immutable, `Cache-Control: max-age=31536000, immutable`.
  - `/.well-known/ai-catalog.json`: catalog with one entry per definition:
    - `identifier`: the publisher-domain `urn:air:` URN form, per the current spec;
    - `displayName`;
    - media type `application/vnd.mad.dcr+json`, emitted under **both** `mediaType` and `type`
      (the base and ARD specs diverged on the field name);
    - `url` → `/defs/<cid>.json`;
    - `representativeQueries` (2–5, from the definition's `x-description` if present);
    - custom field `"mad:hashes": { "full": "...", "structural": "..." }`.
  - `robots.txt` with an `Agentmap:` directive, and a `Link: <...>; rel="ai-catalog"` header on `/`.
- No signing in v0. The trust manifest is optional, and same-origin keys add no real security.
- Domain: **open question** (see §8). Until answered, use the CloudFront default domain.
- Command: `npm run publish` builds, diffs against S3, uploads, and invalidates the catalog path only.

## 5. Indexer (`packages/indexer` + infra)

**Crawler Lambda** (EventBridge schedule, daily; also invocable manually):
1. Seed sources (in a DynamoDB `sources` table or an S3 config file):
   - a list of domains;
   - optional ARD registry endpoints (query them for the MAD media type).
2. For each domain, fetch `/.well-known/ai-catalog.json` (timeout 5s, max 1 MB, respect robots.txt).
   Recurse into nested `application/ai-catalog+json` entries, with depth ≤ 3 and a visited-set.
3. For each entry with the MAD media type or a `mad:hashes` field:
   1. fetch the definition and re-hash it with `mad-hash`;
   2. record `verified=true` only if the computed hashes match the claimed ones;
   3. mismatches are stored with `verified=false` and a reason.
4. Politeness: per-domain concurrency of 1, and a global concurrency cap.

**DynamoDB tables** (on-demand):
- `mad-index`:
  - PK `hash#<cid>`, SK `pub#<urn>`;
  - attrs: `kind` (full|structural), `defUrl`, `domain`, `verified`, `firstSeen`, `lastSeen`.
- `mad-sources`: crawl targets and last crawl status.

**Query API** (API Gateway HTTP API + Lambda, public, rate-limited):
- `GET /hash/{cid}` → list of publishers (verified first) for a full or structural hash.
- `GET /definition/{cid}/similar` → by structural hash, excluding exact full match.
- `POST /search`: minimal ARD-conformant registry endpoint (text query plus optional filters). This makes
  our indexer itself a valid ARD registry. Support a `mad:hash` filter.

**Self-check:** our own catalog is always in the seed list, so lookups of our own hashes return
at least ourselves.

## 6. Phases

1. **mad-hash** library + CLI + tests. No AWS. *Stop for review.*
2. **Publisher** working locally (writes to `./dist`), then the CDK stack for S3 + CloudFront. *Stop before deploy.*
3. **Indexer**: crawler + DynamoDB + query API. Test against a local fixture server first, then deploy. *Stop before deploy.*
4. **End-to-end:** publish 2–3 sample definitions, including two that differ only by labels. Crawl,
   then confirm `GET /hash/<structural>` returns both and `GET /hash/<full>` returns one each.

## 7. Out of scope (v0)

Signing/trust manifests, IPFS pinning, nested DCR sub-graphs, auth on the query API, UI.

## 8. Open questions — ask the user at the start

1. Custom domain for the publisher (needed for a meaningful `urn:air:` identifier)? Is it in Route 53 on `personal`?
2. Is there an existing DCR JSON format from earlier MAD work that §2 should match instead?
3. Region: is `us-west-2` OK?
4. Initial seed domains beyond our own?
