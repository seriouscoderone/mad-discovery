# mad-discovery design

**Status: approved by the maintainer on 2026-11-09, with the changes from its stress test written in.** Nothing here is built yet. It replaces the draft build spec (`git show 713a12f:MAD-DISCOVERY-SPEC.md`) and is written to the rulings in the [README](../README.md#rulings).

How it got here: a first draft went through an adversarial review (six lenses, each rechecked by a skeptic; 95 findings, none refuted), a second draft through a consistency check (74 items), and the result through a stress test with the maintainer (nine branches, five of which changed the design). The review is in [research/design-review.md](research/design-review.md), and the stress test's outcome is at the end of this document. The evidence behind the rulings is in [research/spec-review.md](research/spec-review.md) and [research/discovery-survey.md](research/discovery-survey.md).

[Decisions made at review](#decisions-made-at-review) records what the maintainer decided. [Defaults chosen here](#defaults-chosen-here) lists the smaller choices. Everything between is the specification.

## What this project is for

The maintainer's objective: nobody should need to make a protocol reference or aggregation site such as openhaven.net.

In MAD a protocol is a set of definitions: models, authorizations and responsibilities. Each is identified by a SAID, a digest of its own content, so two parties holding the same SAID hold the same definition and nobody assigns or approves the identity. A reference site adds several things on top of that. This is what supplies each of them here:

| What a reference site gives | What supplies it here | Who can use it |
|---|---|---|
| Somewhere to read a definition | A page per definition on each source | A person |
| Who else uses it | The walk, and a catalog's row for the SAID | A program through the row; a person through the catalog's page |
| A list of what exists | Each source's index page, and a catalog's index | A person, per source. Across sources, as above |
| What replaced what | Only when the newer definition's bytes name the older SAID (see [Lineage](#lineage)) | A program |
| Browsing by topic, searching by a business term | Not in this cut (bpm-nq3.7, bpm-upm.22) | |
| Independent assessment | Not this project's job. The web is where ideas are offered and found; judging them happens elsewhere | |

**What it promises.** No hand-curation, no submission step and no authoritative site. Posting is open: anyone with an address can offer definitions, and no build leaves a source out. A directory of definitions becomes a mechanical view that anyone can rebuild and nobody owns.

**What it does not promise.**

- That no index exists anywhere. Asking "who else uses this SAID" of parties you have no link to needs a list that somebody compiled. The survey found no exception across eight families of mechanisms. This design keeps that list rebuildable, replaceable and without authority.
- That a catalog lists every source. No public input measured lists a brand-new website that nobody has linked to, by a route that is free, repeatable and not one company's search. The finder built first reaches websites that Common Crawl already captures. Everyone else is found through introductions. See [Finding sources nobody linked](#finding-sources-nobody-linked).
- Independent assessment. Much of what openhaven.net offers is its researchers' judgement of each protocol. This project offers ideas and says who offers them, when the offerer says so. What to make of an idea is the reader's business, decided with whatever tools they trust (see [Trust](#trust-what-is-verified-claimed-and-unresolved)).
- That parties will run sources. The source document, the robots line and the publication record are new and have no adopters. The survey's closest analog, ARD and AI Catalog, had nine publishers among roughly 38,000 domains probed after about five months, and roughly 200 to 250 worldwide.

## Terms

These are MAD's own words for discovery, from `mad/docs/mad-ux-design.md` ("Explore what MAD has learned") and `mad/docs/micro-apps-vision.md` ("Introductions and retrieval"). MAD's documents leave their wire formats open; the formats below are this project's proposal for them.

| Term | Meaning here |
|---|---|
| Definition | A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility (Ruling 2). The tool never reads a document's kind. In the test data: gym-bp's frozen documents, three of which are selections. |
| SAID | The definition's identifier: the Blake3-256 digest of its content in CESR text form. Exactly 44 characters: `E`, then one of `A` to `P`, then 42 of `A-Z a-z 0-9 - _`. The workspace's rule; this project identifies definitions by no other digest. |
| Source | A place on the web that serves definitions and records about them as static files. It is identified by the address of its source document. |
| Source document | One JSON file that says what a source serves, which publications it carries, which other sources it knows and, when the operator says so, who runs it. |
| Serve | To make a definition's bytes fetchable at a source. bpm-core's vocabulary calls this *publish*. Here a publication is the record about a definition, and serving alone is what a mirror does. |
| Publication | An offering: one exact definition put forward for others to find and reuse, with a name, a description, tags, a collection placement and, when stated, who offers it. MAD's word for the record. Here it is not an endorsement, and nothing about it is verified. |
| Introduction | A pointer to another source's address, with the SAIDs to look for there when known. The reader fetches and checks; an introduction is a hint, never a fact. It follows KERI's out-of-band introduction. |
| Catalog | A listing derived from sources: for each SAID, which source addresses serve it, which carry a publication of it and which definitions contain it. Any number can exist and none is authoritative. |
| Finder | The part of a catalog build that proposes source addresses from a public input. |
| Reader | Whoever runs a lookup. |
| Operator | The party that builds a source and serves it at an address it controls. |
| Builder | Whoever runs a catalog build. |
| AID | A KERI identifier. A source or a publication may state one as who runs it or who offers a definition. Stated, never verified here. |
| Origin | A scheme, host and port, such as `https://gym.example`. |

A protocol is a set of definitions. Where the set is itself a frozen document, as a gym-bp selection is, its page is the protocol's page: it lists the members and links to each. A MAD assembly has no SAID; whether assemblies or selections get one is the unmade ruling bpm-nq3.6.

Two words from earlier discussion are gone. "Declaration" already means something else in MAD (a responsibility's state and view declarations), so the records here are publications and introductions. And nothing proves authorship: identity comes from content, and who offers a definition is stated, not proved.

## The three parts

1. **A source** is a folder of static files that a party uploads to an address it controls.
2. **The walk** is a lookup a reader runs from their own machine. Given a SAID and one source address, it reads that source, follows its introductions to other sources and reports what it found. Nothing is hosted.
3. **A catalog** is the output of a repeatable build that visits every source it can find and writes static files. It covers the case the walk cannot, as far as its finders reach: two parties who never linked to each other.

A source also carries generated pages for people and, optionally, entries in the AI Catalog format.

It is one TypeScript package with a command-line tool. There is no server, database or query service. The tool ships with no source or catalog address built in: every lookup names where it starts, so no copy becomes the default. Deploying a source means copying its folder to the static host it was built for.

## A source

A source is one folder of static files. Its address is the address of its source document, `source.json`, and every other file sits beside it at a fixed path. The *base* is the address with `source.json` removed: for `https://gym.example/mad/source.json` the base is `https://gym.example/mad/`. An operator puts the folder wherever they like: at the root of a host, under a path, on any static host.

```
source.json                  the source document; its address is the source's address
definitions/<SAID>.json      the bytes of the definition with that SAID
pages/index.html             a page listing what this source serves
pages/<SAID>/index.html      the readable page for that definition
pages/style.css              the one stylesheet
sitemap.xml                  lists every page
```

When the folder is the root of a host, the build also writes `/.well-known/ai-catalog.json` (see [AI Catalog entries](#ai-catalog-entries)).

The source document:

```json
{
  "source": "https://gym.example/mad/source.json",
  "by": "EKxy...the AID of whoever runs this source",
  "oobi": "https://gym.example/oobi/EKxy...",
  "pages": true,
  "serves": [
    {
      "said": "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U",
      "refers": [
        "ECru8k3CerlcJF0Khe0EOubRaA4U4APPGqOdvkzNR0L1",
        "EGVaGa3kbb3-tg3Z7lj2Q9urXxS71HNZkD3sIT99f-NB",
        "EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"
      ]
    }
  ],
  "publications": [
    {
      "target": "EIjETqo6CwKdjLKiUbve977olj92nuhBoy4NPywpqD1U",
      "name": "Paid admission",
      "description": "A cashier admits a patron who has paid.",
      "tags": ["gym", "admission"],
      "collection": "Fitness / Front desk"
    }
  ],
  "introductions": [
    {
      "source": "https://city.example/mad/source.json",
      "for": ["EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
    }
  ],
  "catalogs": ["https://gym.example/catalog/catalog.json"]
}
```

| Member | Type | Required | Rule |
|---|---|---|---|
| `source` | source address | yes | Must equal the address the document was fetched from. |
| `by` | AID | no | Who runs this source, stated by the operator. Nothing here verifies it. |
| `oobi` | `https` address | no | Where that AID can be resolved: the KERI `(url, aid)` pair. The tool stores and shows it and fetches nothing from it. |
| `pages` | boolean | no, default false | True when the source has the readable pages at the paths above. |
| `serves` | array of `{ said, refers }` | no, default empty | `said` is a SAID. `refers` is an array of SAIDs, default empty. |
| `publications` | array | no, default empty | See [Publications](#publications). |
| `introductions` | array of `{ source, for }` | no, default empty | `source` is a source address. `for` is an array of SAIDs, default empty. |
| `catalogs` | array of catalog addresses | no, default empty | See [The catalog](#the-catalog). |

Rules for a source:

- **A source is identified by the address of its source document**, not by a domain and not by an AID. A source can live under a path on a shared host. The domain is a locator, never an identity; an AID, when stated, is attribution, never identity.
- **A source address has one form.** It is `https` on the default port, with a DNS host name (no IP literal, no trailing dot), no user name, password, query or fragment, a path ending in `/source.json`, and at most 512 characters. The address is the string the WHATWG URL parser serializes; that string is what is fetched, compared, stored and shown. A catalog address follows the same rule except that its path ends in `/catalog.json`.
- **`source` must equal the address the document was fetched from.** A document that names another address is a copy of someone else's files. The reader lists it as unresolved and reads nothing from it. Copying a source's files therefore does not make a second source; rebuilding them for a new address does, and that is an intentional act.
- **A definition's address is derived, never declared.** It is the base followed by `definitions/<SAID>.json`. A source cannot place its definitions anywhere else, so bytes credited to a source always came from under its own address.
- **Where this stands with KERI.** A definition's address paired with its SAID is what the KERI specification calls an OOBI for self-addressed data: the address includes the SAID, and the recipient re-derives the SAID from the reply. The specification fixes no path shape. keripy's resolver accepts only `/oobi/<SAID>` at the root of a host, and only for schemas; a source at a host root could add that shape later for models that are KERI schemas. This cut does not, and nothing here uses `/.well-known/` for a source's own files: nothing probes a well-known location, the finder and introductions carry full addresses, and the specification defines the well-known `oobi` name for AIDs returning a pointer, not for data.
- **Everything read from a source document is checked before use.** A SAID must match the pattern in [Checking bytes](#checking-bytes-against-a-said); an address must pass the address rule; an AID is at most 64 characters of `A-Z a-z 0-9 - _`. An entry that fails is dropped and counted. A reader ignores a member it does not know, inside a publication too (the configuration refuses one, because there it is the operator's own typo), and discards a document in which a known member has the wrong type.
- **`refers` lists every SAID that appears in a served definition's bytes, other than its own.** See [SAIDs inside a definition](#saids-inside-a-definition). It lets a reader ask "which definitions here contain X" without fetching every definition. It is a claim until the reader fetches the definition and finds the SAID by the same scan.
- **`catalogs` introduces catalogs the source's operator finds useful.** A reader who knows one source thereby learns of catalogs, which is how MAD's design says discovery starts ("bootstrapped introductions to available catalogs"). The build writes no catalog address the operator did not put in the configuration.
- **Size.** A source document and a definition are each at most 1 MB, and the build refuses to write a larger one. At gym-bp's density of references a 1 MB source document lists about 5,500 definitions, but a catalog build fetches at most 500 from one source and a walk 50 (see [Fetching safely](#fetching-safely)). An operator with more than 500 splits into several sources that introduce each other.
- **The files are the contract, not this tool.** A source can be written by hand or by another tool.
- **A source that wants browser wallets to read it sends `Access-Control-Allow-Origin: *`** on `source.json` and on `definitions/*`. A wallet that runs in a browser reads a source with the browser's own `fetch`, under the browser's rules rather than this tool's routine (see [Fetching safely](#fetching-safely)), and a browser lets a page read an answer from another origin only when that header allows it. The header is optional: a source without it is still a source, and the walk, `get` and `verify`, which run in Node, read it as before; no browser wallet can. `verify` over an address asks for the file as a browser would, with an `Origin` request header, because a host may send the header only to a request that carries one (CloudFront's CORS policies do), and says whether the answer carried it. The origin it names is `https://wallet.invalid`, a reserved name no host has allowed by name, and only `*` counts: a host that echoes the asking origin back lets that one origin read, not every wallet. A browser wallet checks the bytes after the browser has undone any content encoding, because a browser always asks for encodings and decodes before the page sees the body; so a source served with a content encoding can be read by a browser wallet and is refused by the tools here, which ask for none and check the bytes on the wire (see [Fetching safely](#fetching-safely)). The maintainer decided this on 2026-11-12 (Ruling 11, bpm-7h1.13); until then this rule said a browser was not expected to read a source. A static host works if it sends `.json` files as `application/json` and sends them unencoded when no content encoding is asked for.

### The robots.txt line

`Mad-Source: <source address>` is the one thing an operator emits for parties who have never heard of them. It reads, for example, `Mad-Source: https://gym.example/mad/source.json`. It goes in any robots.txt the operator controls, on a line of its own, anywhere in the file. The field name is matched without regard to case, and text after a `#` is ignored. It may name a source on another host, so an operator can put it in the robots.txt of their main website while the source lives elsewhere, including under a path on a shared host.

The build prints the line, and a `Sitemap:` line for the pages. It never writes or edits a robots.txt, because that file belongs to the whole site.

## Checking bytes against a SAID

The check needs no knowledge of the document's format. It takes the bytes as served and the SAID that was expected:

1. The bytes must contain the expected SAID.
2. Replace every occurrence of it with 44 `#` characters. Call the result the hashed form.
3. Compute the Blake3-256 digest of the hashed form and encode it as a SAID. It must equal the expected SAID.
4. Rebuild the served bytes from the hashed form. Read it left to right: wherever the next 44 bytes are all `#`, write the SAID and skip those 44 bytes; otherwise copy one byte. The result must equal the bytes as served.

**Encoding.** Put one zero byte in front of the 32 digest bytes, write the 33 bytes as base64url (44 characters, no padding) and replace the first character with `E`. Writing `E` followed by the base64url of the 32 bytes alone also gives 44 characters and is wrong. Worked value: the three bytes `abc` give `EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F`.

**What counts as a SAID.** A string is a SAID here only if it matches `^E[A-P][A-Za-z0-9_-]{42}$`. Every SAID taken from a command line, a source document, a catalog or the inside of a definition is tested against that before it goes into an address, a file name or a page. Anything else, including KERI's other digest codes, is dropped and reported as unsupported. SAIDs are compared as exact strings; there is one text form.

**Octets, not text.** The check runs on a file read as binary, or on a response body with no content encoding. It never runs on decoded text, because decoding drops a leading byte-order mark and turns each invalid UTF-8 byte into U+FFFD, so several byte strings would pass for one SAID.

**Why steps 1 and 4.** The first draft's rule had neither, and a file whose SAID field still held the 44 `#` passed for that SAID (measured on every test document). Either step refuses that file. Step 1 also refuses bytes that are not self-addressing at all, such as `abc` against the worked value above. Step 4 is what makes the check one-to-one. Without it, a file that holds the SAID in one place passes whether any other slot holds the SAID or the 44 `#`. With it the served bytes can be rebuilt from what was hashed, so at most one byte string passes for a SAID. The cost is that a document cannot be served if its own content holds 44 consecutive `#`, or a `#` directly before its own SAID (a SAID used as a URL fragment, for example), because telling its SAID field from its content needs knowledge of its format. A category template (bpm-nq3.7) is such a document; it is derived from a definition, not served as one.

**How this relates to bpm-core.** This is the CESR specification's SAID verification, applied to served bytes wherever the SAID occurs. `bpm-core/src/bpm_core/said.py` applies the same step to a parsed document's `d` field. For the compact bytes bpm-core hashes, holding the SAID once, in `d`, and no run of 44 `#`, the two give the same answer. They differ in three places. `said.py` parses first, so it also accepts the same document pretty-printed, which the byte check refuses. The byte check accepts what `said.py` cannot read, such as a KERI schema whose SAID is in `$id`. And the byte check accepts a document whose SAID sits in a field other than `d`, which `said.py` refuses; a tool that knows the kind also checks that the SAID is in the field it expects.

Measured during the review. The scripts were not kept; the review record names each one.

- GLEIF's Qualified vLEI Issuer schema, exactly as served from `www.gleif.org`, verifies. It was written by KERI's own tooling and carries its SAID in `$id`.
- All 28 documents that gym-bp's `./rebuild.sh` freezes from a clean clone verify once the whitespace between their JSON tokens is removed. The maintainer's local store also held 8 earlier freezes; those verify too.
- None verifies as stored, because the store files are pretty-printed.
- A keripy inception event, which carries its SAID in both `d` and `i`, verifies. It is the one vector that tells "replace every occurrence" from "replace the first".

**A source serves the compact bytes.** The SAID was computed over a compact serialization, and the frozen store keeps only a pretty-printed copy, so the build recovers the compact bytes without interpreting them. An input that verifies as given is copied byte for byte. Otherwise the build removes the whitespace between JSON tokens, leaves every string and number exactly as written, and checks the result. It never parses a document and writes it out again, because that changes bytes: JavaScript moves integer-like property names to the front and rewrites numbers such as `1.0` and `1e-05`. In the review, parse-then-write changed 14 of 32 awkward documents that bpm-core can freeze; whitespace removal reproduced all 32. A file that still fails is refused by name. The check runs on every file the build is about to write, so a difference is caught on the operator's machine and never reaches a reader.

**Independence from the property-order ruling.** The check compares served bytes with a SAID and chooses no order, so it does not wait on bpm-nq3.1. It presumes one thing of that ruling: that MAD can write out the exact bytes a SAID was computed over. If property order is ruled presentation only, those bytes are in the canonical order, and the order an author arranged has to travel outside the definition; this design carries no record for it.

**What verified means.** These bytes have this SAID. It does not mean they are the one normal form of a definition. Making one meaning one SAID is MAD's work (bpm-nq3.1, bpm-nq3.3).

**The envelope is MAD's.** The check presumes only the standard SAID derivation: the document has a slot for its SAID, blanked when the digest is computed. It presumes nothing about what surrounds the slot. A JSON envelope with `d` and a JSON Schema inside, the same envelope with LISP or CEL as text in a field, a KERI schema with its SAID in `$id`, and a serialization that is not JSON at all check the same way, provided each was hashed the standard way. What the envelope is, and what may sit inside it, is MAD's decision (bpm-nq3.1, bpm-nq3.3). Two places in this cut do assume JSON: the readable page renders a JSON outline and shows anything else as text, and the fetch rule accepts JSON content types for definitions. Each is a one-line change when another serialization appears; the check and the `refers` scan need none.

## SAIDs inside a definition

A SAID *appears* in a definition wherever its bytes hold 44 characters that match the SAID pattern, with no base64url character directly before or after them. That covers a SAID that is a whole string value, an object key, or part of a longer string such as an address. `refers` is the set of SAIDs that appear, other than the definition's own, each once, sorted as strings.

The scan runs on the same bytes as the check, on the operator's machine and on the reader's, and needs no parsing. When the bytes parse as JSON, a report adds the JSON Pointer of each string or key that holds the SAID, so a reader can see where it sits. A definition is a stranger's document, so that step is bounded. It is skipped for a definition nested deeper than the limit in [Fetching safely](#fetching-safely). A report gives at most 16 paths for one definition, each at most 256 characters, and states the full count of appearances. A definition that is too deep, or is not JSON, is still verified; it is reported with the count and no paths.

An appearance is not always a reference, and a reference is not a relationship. A self-addressing KERI identifier, one that starts with `E`, has the same shape as a SAID, so a filled-in identity (mad/HANDOFF.md Ruling 8) can match. The tool does not know whether a field is a reliance, an issuance or a note, and adding a SAID to a document costs nothing. A report therefore says that a definition contains this SAID at this place. What that means is for tools that know the kind.

## Publications

A publication is an offering: one exact definition put forward for others to find and reuse, the way a protocol, a standard or an application template is offered. It describes the definition for discovery and may say who offers it.

```json
{ "target": "<SAID>", "by": "<AID>", "name": "...", "description": "...", "tags": ["..."], "collection": "..." }
```

- The record takes the four things MAD's Publish form asks for (name, description, tags, collection), all required there and here, plus the target's SAID.
- **`by` is optional and names who offers the definition, as an AID.** When a publication has none, the source document's `by` applies, when it has one. Nothing here verifies it: it is attribution offered, not proved. A reader with KERI tooling can look the AID up on their own terms, starting from the source's `oobi` when it gives one.
- **A publication is not an endorsement and is not signed.** The web it sits on is untrusted ground by default, as a KERI OOBI is. A reader fetches, checks bytes against SAIDs, and decides what to make of an offering elsewhere. A publication is therefore *claimed*, in MAD's three provenance states, and a catalog never counts it.
- **A publication has no identifier of its own.** The same text at two addresses is two offerings, and nothing infers that they are one.
- **It is the record MAD writes when it writes a source.** When MAD's publish step exists (bpm-nq3.5), it writes this record into a source folder, so there is one format and not two.
- **How it differs from MAD's `Publication` type** (`mad/src/views.ts`). `tags` is a list; MAD's form holds one comma-separated string. `collection` is one string, and ` / ` inside it means nothing to this project. `target` is a SAID; in MAD today it is a prototype reference, until bpm-nq3.3. `by` is an optional AID; MAD's `endorser` is the local principal's id, and MAD's publish step maps one to the other when it has an AID to give. `targetId` is left out because it is local to one MAD instance, `kind` because a reader takes it from the definition, and `components` because it belongs to assemblies.
- **Assemblies.** MAD's Publish screen has a fourth target, the assembly. It is not in this cut: a publication's target is a SAID, and whether an assembly gets one is bpm-nq3.6. If it does, an assembly is served and looked up like any definition.
- **Limits.** A name or a collection is at most 200 characters, a description 2,000, and there are at most 32 tags of 64 characters each. No field holds a control character, and every field is well-formed Unicode: a lone surrogate fails the rule, because a browser wallet's store cannot hold such text and would refuse the whole file it sits in (Ruling 12, 2026-11-12). The same two rules hold for a source document's `by` and `oobi`, for a JSON Pointer path the scan reports from a definition's keys, and for a candidate file's `place` values. No field holds a character that reverses displayed text or does not show (Ruling 13, 2026-11-12): the bidirectional controls (U+202A to U+202E, U+2066 to U+2069, U+200E, U+200F, U+061C) and the invisible format characters (U+200B, U+2060 to U+2064, U+FEFF, U+00AD, U+180E, the tag characters U+E0000 to U+E007F) are refused like control characters, while the joiners U+200C and U+200D stay, because emoji sequences and Persian need them; a browser wallet follows the same rule, so a name that one accepts the other shows. A publication that breaks a limit is dropped and counted. The numbers are proposals.

## Introductions

An introduction names another source's address and, when known, the SAIDs to look for there. `for` lists SAIDs the other source is expected to serve, carry a publication of, or serve a definition that contains.

Introductions are entries in the build's configuration file, typed by the operator. The reader records the address of the source document each introduction was found in, and that source's `by` when it states one. That is a retrieval observation; nothing here verifies who made an introduction.

Introductions point mostly one way. An adopter knows where it got a definition and can introduce that source. The source it came from is told nothing, so it cannot introduce its adopters unless its operator hears of them and adds them by hand. A walk from an adopter therefore reaches the source it adopted from. A walk from that first source reaches only the sources its operator added, and misses later adopters.

This design has no announce or ping step by which an adopter tells a source. That would have every source run a service that accepts writes, and would make the first source to serve a definition the registry for it. A source here is static files. From the first source to serve a definition, adopters are found through a catalog and only through a catalog.

## Lineage

An edited definition is a new SAID. This cut connects it to the old one only when the new definition's bytes name the old SAID, as a bpm-core document's `supersedes` does when it was frozen as a SAID. The new one then appears among the definitions that contain the old one, and the place of the appearance is what tells a successor from a user.

Nothing else connects them. For MAD the predecessor is not expected to be inside the definition: `derivedFrom` is state on a draft, and MAD's vision calls supersession a claim. A publication carries no such claim in this cut (decision 6).

## The walk

`mad-discovery who <SAID> --from <source address> [--catalog <catalog address>]` runs on the reader's machine:

1. Fetch the source document at the given address.
2. If the source lists the SAID in `serves`, fetch the bytes and check them.
3. Collect the source's publications whose target is the SAID.
4. For each served definition whose `refers` lists the SAID, fetch that definition, check its bytes and confirm by the scan that the SAID appears in them.
5. Follow the source's introductions and repeat, within the limits in [Fetching safely](#fetching-safely). Visited addresses are remembered, so cycles end.

The walk is breadth-first: every source at one depth before any at the next. Within a depth, introductions that name the SAID in `for` come first. Among equals the walk takes one introduction from each introducing source in turn, introducing sources in address order and each source's own introductions in address order. One source cannot fill a level with its own, and the limit on introductions followed from one source cuts the same way for everyone. A catalog build takes sources in the same order; it asks about no SAID, so the `for` rule does not apply to it.

With `--catalog`, the walk also reads `said/<SAID>.json` beside that `catalog.json` and treats each source address in the row as an introduction that names the SAID in `for`, at depth 1, with the catalog's address as its `via`. It checks each one the same way. The limit on introductions followed from one source does not apply to a row; the limit on sources per run does. When the row lists more sources than that limit leaves room for, the walk takes a random sample and reports how many were listed and how many it took, because a row is open to flooding and any fixed order can be occupied. Catalogs named in a source document are listed in the report and never fetched on a source's word.

The report is one JSON document on standard output:

```json
{
  "said": "<the SAID asked for>",
  "from": "<the starting source>",
  "sources":      [ { "address": "<address>", "via": [], "by": "<AID, when stated>", "oobi": "<address, when stated>" } ],
  "serves":       [ { "source": "<address>", "via": ["<address>"] } ],
  "publications": [ { "source": "<address>", "via": [], "publication": { "target": "...", "by": "...", "name": "...", "description": "...", "tags": [], "collection": "..." } } ],
  "referrers":    [ { "source": "<address>", "via": [], "said": "<a definition that contains it>", "paths": ["/rely_on/0/said"], "appearances": 1 } ],
  "unresolved":   [ { "address": "<source address>", "via": [], "reason": "failed-check", "said": "<SAID>" },
                    { "address": "<source address>", "via": [], "reason": "truncated", "limit": "<name of the limit>" },
                    { "address": "<source address>", "via": [], "reason": "redirected", "target": "<the address the answer named>" } ],
  "dropped":      [ { "source": "<address>", "entries": 2, "publications": 1 } ],
  "catalogs":     [ "<catalog address a visited source named>" ],
  "catalog":      { "address": "<catalog address>", "listed": 0, "taken": 0 },
  "reached": 3
}
```

- `sources`: every source that was read, in the order visited, each with the chain that led there and the operator's `by` and `oobi` when its document states them. Stated, never verified. A publication without its own `by` is attributed, by its `source` address, to this list's entry. `reached` is this list's length.
- `serves`: sources that serve the definition. Verified by the byte check.
- `publications`: publications of it. Claimed.
- `referrers`: definitions whose bytes contain it. The appearance is verified; its meaning is not interpreted.
- `unresolved`: everything the walk was pointed at and could not fetch or check in full, each with an outcome from [Outcomes](#outcomes). `address` is always a source address. An entry about one definition also has `said`. `truncated` and `skipped` also have `limit`. `redirected` also has `target`, as a quoted string. A `truncated` source is listed here, and what was read from it stays in the lists above.
- `dropped`: for each source that had any, how many entries of its source document were dropped because a SAID or an address failed its rule, and how many publications because they broke a limit.
- `catalog`: present with `--catalog`. The catalog's address, how many sources its row listed and how many the walk took.
- `via` is the chain of addresses whose introductions led there: source addresses, or first the catalog address given with `--catalog`. It is empty for the starting source.

The `referrers` list is the raw material for "who else issues or relies on this model". In MAD, responsibilities link only through shared models, so the responsibilities that contain a model's SAID are the candidates to interoperate over it.

The report says how many sources it reached. Reaching none is not evidence that nobody else uses the definition.

**The walk keeps nothing between runs.** Retaining what was learned, with its provenance, is MAD's (bpm-upm.21). A reader who wants the bytes uses `get`.

**Strangers' text.** Every string a source wrote is shown as a quoted JSON string beside that source's address, and the tool's own messages never contain one. The report is ASCII-only: every character outside printable ASCII is written as a `\u` escape, so a publication's name cannot redraw a terminal or issue a command to a CI runner. A model or tool that reads the report treats those strings as data.

**What a walk reveals.** Every source the walk visits sees the reader's network address, the tool's user agent and the time. A source learns which SAID the reader is asking about only when the walk requests that SAID's bytes, or a definition that contains it, from that source. The source document is always fetched whole and matched on the reader's machine, and the walk never sends a SAID to a source that does not list it. Requests carry no cookies, no credentials and no Referer. A catalog host sees each per-SAID file a reader requests. A source that wants to know who is interested in a SAID can list it; the reader cannot prevent that except by not fetching.

### Bringing a definition home

`mad-discovery get <SAID> --from <source address> --out <folder>` fetches the definition and, transitively, every SAID that appears in it. It reads the starting source and the sources that source's introductions name, one step and no further. Each SAID is fetched from the first of those whose source document lists it in `serves`: the starting source first, then the introduced sources in address order. That includes the SAID asked for, so the starting source need not list it. A source that has reached the limit on definitions fetched from it no longer counts as listing: it is recorded `truncated` and the next lister is tried. A failed check at the first lister is not retried at the next; the entry says where it failed. Like the walk, `get` never sends a SAID to a source that does not list it. A string that only has a SAID's shape, such as a KERI identifier, is therefore reported as missing and is sent nowhere. `get` works outward from the SAID asked for, taking the SAIDs that appear in each definition in sorted order, checks each definition and writes `<SAID>.json`.

It prints `{ "said": "<SAID>", "from": "<address>", "written": ["<SAID>"], "missing": [ { "said": "<SAID>", "looked": ["<source address>"] } ], "unresolved": [] }`, with `unresolved` entries as in the walk's report.

HANDOFF's first success criterion is that an independent author can discover and reuse an exact definition. The walk and the pages are the discovering. `get` is the network half of the reusing: in the review, bpm-core refused to freeze a new responsibility until every document it pins was in the store. Landing the files in an authoring store is bpm-core's pull (bpm-n13.3) and MAD's import (bpm-upm.21, bpm-upm.22). The output folder has the shape `build` takes as input, so there is one folder shape.

## The catalog

A catalog is made by two commands, so that reading a public input and fetching strangers' addresses are separate steps.

`mad-discovery catalog find --finder <name> --out <folder> [--snapshot <name>]...` runs one finder over its public input and writes one file of candidate source addresses for each snapshot. See [What a finder returns](#what-a-finder-returns).

`mad-discovery catalog build --out <folder> [--candidates <file>]... [--from <source address>]...` is the batch:

1. Gather candidate source addresses: those named with `--from`, and those in each `--candidates` file.
2. Visit each source and follow introductions to more, breadth-first, within the limits.
3. For each definition a source serves, up to the limit, fetch the bytes, check them and scan them.
4. Write static files.

A catalog is a folder, and its address is the address of its `catalog.json`. That is what a source lists under `catalogs` and what `--catalog` takes. The other files sit beside it under fixed names:

```
catalog.json           how it was built: the tool's commit (read from the checkout it runs from; local
                       changes are not detected, so a builder who wants the record to mean something
                       builds from a clean checkout), the starting sources, the finder and snapshot name
                       of each candidate file, and the limits it ran with
candidates/<finder>/<snapshot>.json
                       each candidate file the build was given, the bytes as read, so another party can
                       compare inputs; the names are the builder's own, pattern-bound, no leading dot
index.json             every SAID that has a row, sorted; for each, the number of source addresses
                       that serve it and the names its publications give it, each beside the source
                       address that gave it
said/<SAID>.json       one row: `said`, `serves`, `publications` and `referrers`, each entry as in the
                       walk's report without `via`. No `from`, `unresolved`, `catalogs` or `reached`
sources.json           every address tried: how it was found, its outcome (with the names of the limits
                       that cut it when `truncated`), the counts of dropped entries, of definitions
                       beyond the cut and of contained SAIDs beyond the recording limits, a hex Blake3
                       digest of the source document bytes read, and each fetched definition or `refers`
                       entry of that source that did not end `verified`, with its outcome
pages/index.html       the same rows as pages
pages/<SAID>/index.html
pages/style.css        the one stylesheet, as in a source
```

No file holds the catalog's own address, so a copy on another host is byte-identical and two builds compare with a plain diff. `index.json` is the list of what exists. A catalog answers no queries: a reader fetches files.

A catalog returns introductions, in MAD's sense: a reader takes the addresses from it and checks everything again for themselves. A catalog assigns no identity and settles nothing.

### What a catalog row may say

A catalog is built from documents written by strangers, so:

- **A SAID has a row only when a visited source served bytes for it that passed the check.** A SAID that definitions contain but no source serves has no row and no file, and appears nowhere in the catalog: a row lists the definitions that contain its SAID, not the SAIDs its own definition contains. A reader finds such a SAID only in the bytes of a definition that contains it. No file name comes from a stranger's text. On a file system that ignores letter case (the macOS and Windows defaults), a file named from a stranger's string could replace a real SAID's file; a name the build computed cannot be made to collide that way.
- **Every statement is attributed to the source address it was fetched from.** Nothing in one source's files can create or change a row attributed to another source.
- **Publications are recorded as claimed**, and only in the row of a SAID that already has one.
- **A count of sources is a count of addresses**, which costs nothing to inflate. So is the list of definitions that contain a SAID. The catalog reports them as such. Which sources or principals to believe stays the reader's decision.
- **One source adds a bounded amount to a row.** From one source a row takes one publication of the SAID (the first in its source document; the rest are counted) and at most 50 definitions that contain the SAID, lowest SAID first, with the full count stated. The build writes no row larger than a reader will fetch (1 MB): a row that would be larger keeps sources in the build's order up to that size and states how many it left out. A catalog built from free addresses can still be flooded; this cut has no defence beyond these limits.
- **How a source was found can be checked on its own.** For a finder, `sources.json` gives the finder's name, the snapshot and the place in it (for the robots line, the archive file and the record's offset). For an introduction, it gives every introducing address.
- **No row is carried over from an earlier build.** A source that cannot be reached adds no rows and is listed with its outcome. A build cannot tell a source that is gone from one that was briefly down unless the host answers 404 or 410.
- **An empty build writes nothing.** A build in which no source ended `ok` or `truncated` writes nothing and exits non-zero, so a network fault on the builder's side cannot replace a catalog with an empty one.
- **Posting is open.** A catalog repeats what sources say, and no build leaves a source out. A host accepts that strangers' text appears under its address. The protections are at keeping that text inert (see [Readable pages](#readable-pages)), not at keeping it out. This is the maintainer's decision (decision 3), made over a recommendation to add an exclusion list.

### Repeatable

Repeatable means the same command over the same public inputs. Two parties who run it at the same time produce the same files if every source answered both alike. What a build includes is decided by counts and a fixed order, never by which answer arrived first: sources are taken breadth-first in the order given under [The walk](#the-walk), and every limit cuts in that order. A catalog build has no clock for the whole run, so its limits have to bound its length: sources per run, times the time for one host, divided by the hosts in flight, must fit the job that runs the build. With the proposed numbers that is about four hours. A build that cannot finish fails and writes nothing. What a build keeps in memory is bounded too, not only what it fetches: a contained SAID's record with its paths can be a hundred times the SAID's 44 bytes on the wire, so the build records at most 200 contained SAIDs from one definition and 5,000 from one source (lowest SAID first) and counts the rest. The index files have no cut: at the ceiling of 500,000 rows `index.json` is about 60 MB and the index page about 100 MB, beyond what a browser opens or the walk's file limit reads, while every row stays under 1 MB. A reader of a large catalog starts from a row, as `--catalog` does; sharding the index is a later change to the layout, to be made when a catalog nears the ceiling.

A source can answer two builders differently. `sources.json` records a digest of each source document as read, so two builds that differ can be compared source by source. A difference is information about that source, not evidence against either builder.

A reader who doubts one row can check it without rebuilding: fetch the place `sources.json` names, then the source it points to.

### Finding sources nobody linked

This is the hard part, and the review measured it. A walk cannot connect two authors who never met but arrived at the same definition, and `mad/HANDOFF.md` names discovery by an independent author first among its success criteria. Something has to notice a new source without being told.

A finder reads a public input that already exists and that the maintainer does not operate. Measured on 2026-11-09 (UTC):

| Finder | What the operator emits | Public input | What the measurement showed |
|---|---|---|---|
| Robots line | The `Mad-Source:` line in a robots.txt they control | Common Crawl's robots.txt archive: 100,000 files and 0.15 TiB compressed per crawl, a crawl every four to five weeks, free over HTTPS with no account | It works end to end on a real analog: a 1% sample of the October 2026 crawl held 18 hosts carrying ARD's `Agentmap:` line, and 14 still served it. One scan reads every file, because no index holds robots.txt text: one to three hours on 16 connections, extrapolated from samples and not yet run in full. It reaches only hosts Common Crawl captures. None of 40 GitHub Pages sites created in March 2026 was in the crawl, and 18 of 60 small project sites on their own domain had a readable robots.txt there. About 5% of hosts answer Common Crawl's robots.txt request with 403 or 429 and are unreadable; a host that only disallows CCBot is still archived. A line appears 3 days to 7 weeks after it is added. |
| Certificate label | A host name whose first label is `mad-source`, under a certificate that names it exactly | Certificate Transparency logs, through a search service that accepts a leading label | It could see a host nobody linked. There is no dependable free search: crt.sh's public database answered the query, but it had stopped updating 19 days earlier and whoever runs it has announced a rebuild. Merklemap offers the search for 49 euros a month. A wildcard certificate hides the label: about half of 138 subdomain hosts sampled, and every `github.io` site. It costs the operator a domain and a host name. |
| GitHub search | The topic `mad-source` on a public repository whose homepage is the source address | GitHub repository search: no token, 10 requests a minute, 1,000 results a query | It listed a new repository within a minute, and it reaches the `github.io` sites no other finder reaches. It is one company's index with no snapshot, so it is not repeatable, and it covers only operators with a public repository there. |
| Existing registries | AI Catalog entries | Registries that crawl AI Catalog files | The survey found none that picks up an unlisted domain without a request. |

Considered and set aside: a DNS TXT record (the open measurement datasets cover a few open zones and the top million domains, and only fixed names); probing a ranked list of domains (the build becomes a crawler, and a new source is not on the list); search-engine queries (the programmatic routes are closing); IndexNow (submissions are listed nowhere); AT Protocol's collection listing (needs an account there, and directory hosts disagreed on the count).

**Recommendation.** Build the robots finder first, and state its reach. Its input is a named snapshot that never changes, it needs no account, and its analog was found end to end. It reaches parties who control a robots.txt on a website Common Crawl already captures, which is narrower than "anyone". Because the line may name a source on another host, the source itself can live anywhere.

Not covered by the robots finder: a party whose only website is new and unlinked, which is where the first adopters are most likely to be: developers whose site is a new `github.io` page. They are found through introductions, which the maintainer adds to his own source by hand as he hears of them. The first real source showed where they live: when the second epic started (2026-11-10), the three newest crawls held no capture of any of the twelve hosts the maintainer controls, so the robots finder could not see his own line. Ruling 10 therefore added the **GitHub-topic finder** beside the robots finder: a public repository carrying the topic `mad-source` whose homepage is the source address, read through GitHub's repository search (measured above: a new repository listed within a minute; it reaches `github.io` sites; one company's index with no snapshot, so its candidate file is named by the date it ran and a build copies it into its output). The robots finder reaches established sites and is repeatable; the GitHub finder reaches new ones and is not; a catalog says which found each source.

Until a finder is proven on real hosts, a catalog covers only what is reachable from the addresses named with `--from`. A catalog built from those alone is a seeded crawl: its list of sources is somebody's hand-kept list, which Ruling 3 does not count as meeting the objective, and its `catalog.json` says so in those words.

### What a finder returns

A finder is a module in this package; no outside code is loaded. `catalog find` runs it and writes its candidates, each with where it was seen, to `<finder>/<snapshot name>.json` in its output folder. A file already there is kept and that snapshot is not read again, so that folder is the one thing kept between runs. A candidate is an introduction by the place it was seen, fetched and checked like any other.

- A finder reads all of a snapshot, or writes no file for it and exits non-zero. A missing or partly read input never produces a smaller catalog.
- Each place seen contributes one candidate: the first `Mad-Source` line in a robots.txt. An operator with several sources names one, and that source introduces the others.
- Candidates that are not source addresses are dropped. A build de-duplicates the rest across the files it is given and visits them in sorted order.
- If more remain than the limit on sources per run, the build stops and reports the count.
- A finder whose input has no snapshot name, such as GitHub search if it is ever added, names its file by the date it ran, and a build that uses the file copies it into its output so another party can compare.

The robots finder reads responses with status 200 only. Its snapshots are Common Crawl's crawls, under Common Crawl's own names; with no `--snapshot` it takes the three most recent. A build is given the candidate files of the three most recent crawls, because Common Crawl samples hosts afresh each crawl: of 300 hosts with a readable robots.txt in October 2026, 44 had no capture in either of the two crawls before. A source found only through its robots line therefore drops out three crawls after the line was last seen, or at once when its source document is gone. `catalog.json` records the names of the crawls a build used, so another party can rebuild from the same ones after a newer crawl appears. The scan retries no faster than once a second when Common Crawl answers 503, and writes nothing for a crawl if any of its files cannot be read. A finder's reads of its own public input are outside the limits in [Fetching safely](#fetching-safely), which bound fetches of addresses a stranger chose: the robots finder reads archive files larger than 1 MB, on up to 16 connections to one host.

### Who runs a catalog

Nothing here requires the maintainer to run one. The objective is met when anyone can run the command, and a catalog he hosts is one copy among any number. He has decided to host one, with pages, once the finder is proven on real hosts and the tool is public (decisions 1 and 4). Two facts bear on it. `catalog find` reads about 165 GB for each crawl it has not already scanned: three crawls the first time, one for each new crawl after that. Few second copies will exist at that price, and until a second party runs the build his copy is the only one. And "anyone can run the same command" is true only once the tool is public.

If he does, it is a scheduled job with three stages that share nothing but files:

1. **Find.** Runs `catalog find`. It reads only the named public inputs and writes candidate files. It fetches no address a stranger chose.
2. **Build.** Runs `catalog build` over those files. It holds no secret and no cloud credential, and it writes only inside `--out`. The job continues only if it exits zero.
3. **Deploy.** Holds a credential that can write only under the catalog's own folder on the host, so it cannot touch his source document, definitions or pages. It runs no code over fetched data; it copies files with the expected names, refuses any file over the one-file limit, and refuses anything else.

Dependencies are installed from a committed lockfile with install scripts disabled, and CI actions are pinned to commit hashes.

## Readable pages

For each definition a source serves, the build writes one page at `pages/<SAID>/index.html`. It shows:

- the names and descriptions from this source's publications of it, and who offers it when a publication or the source says;
- the SAID, and the command that checks it;
- the definition's content as a readable outline, with each SAID inside it linked to that definition's page when this source serves it;
- the definitions on this source that contain it, each with the place of the appearance;
- the sources this source introduces for this SAID, shown by address and labelled as introductions;
- the catalogs this source introduces, each linked to that catalog's page for this SAID.

`pages/index.html` lists what the source serves, by the names its publications give. A definition with no publication is titled by its SAID. A catalog's pages show its rows the same way: an index, and a page per SAID. On that page a source that serves the SAID is linked to its own page for it, and a definition that contains the SAID is linked to its serving source's page for that definition, in both cases only when the source document says it has pages. A source that only carries a publication of the SAID is shown by address. When the build was seeded (a hand-kept list given on the command line, no finder) the catalog's index says so in those words, since `catalog.json` is read by nobody who matters. The pages carry no order but SAID order, no ranking and no form.

**Shown text.** Everything a page says about a definition comes from the definition's bytes or from a publication, through one fixed template. The template's own words are its labels and the check command, the same on every page. The build composes no sentence, which is MAD's rule for shown text. This cut renders any JSON document generically. A renderer that knows MAD's kinds belongs with MAD's shared library (bpm-vfn.3).

**Every string on a page is a stranger's.** A source can serve definitions other parties wrote, and a catalog shows publications from every source. So:

- The page writer has one way to emit text, and it escapes `& < > " '`. It has no way to emit raw markup.
- No string from a definition or a publication becomes an element name, an attribute name, an `id`, a `class`, a `style` or a link target. An address inside a definition is shown as text.
- The only links are: to other pages in the same output folder by SAID, written relative to the page and naming `index.html`; to source and catalog addresses that passed the address rule; and to a fixed path under such an address, which the build forms from the address and a SAID that matched the pattern (`pages/<SAID>/index.html` under a source's base; `pages/<SAID>/index.html` or `said/<SAID>.json` beside a `catalog.json`).
- Every link to another host carries `rel="noopener noreferrer"`: a click tells the stranger's host nothing about the page it came from and gives it no handle on the reader's window.
- Pages contain no script. Each carries a Content-Security-Policy in a `<meta>` element (`default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'`), so the policy holds on hosts that cannot set headers.
- Pages, a source's or a catalog's, are not served from an origin that also serves an application holding keys or drafts. MAD keeps its stores in the browser's localStorage, which any script on the same origin can read.

A page is a rendering and is evidence of nothing. The check runs on the bytes at the definition's address.

**Being found by a search engine.** The build writes `sitemap.xml` listing every page, and the SAID is in each page's title and visible text, because a crawler indexes only pages it can reach. Whether a search engine then returns a page for a business term or for a SAID has not been measured.

## AI Catalog entries

When a source sits at the root of a host, the build also writes `/.well-known/ai-catalog.json` in the Linux Foundation AI Catalog format, with one entry per served definition: `identifier` (the SAID), `type` (`application/json`) and `url` (the definition's address). A display name, description or tags, when present, come only from this source's own publication of that definition (the first, when it has several). Nothing in the file is copied from a definition's content. This is the one dot-folder a source may have: GitHub Pages skips it unless told otherwise (a branch deploy needs an empty `.nojekyll`, an Actions deploy `include-hidden-files: true`).

The format's optional `digest` member, a sha-256 of the served bytes, is left out. Nothing here reads it, no surveyed entry carried one, and the SAID stays the only digest of a definition this project writes. The hex Blake3 digest in a catalog's `sources.json` is of a source document as read; it identifies nothing and is there only so that two builds can be compared.

This is an advertisement, not a foundation. The survey found about 200 to 250 domains serving such files. MCP's Server Cards extension reads this file for entries of its own type; no client or registry is known to read entries of another type from a domain nobody submitted. The fields are written against commit `6e26a18` of the specification (`Agent-Card/ai-catalog`, 2026-11-05), which had no tagged release when surveyed, and a test validates the output against it. ARD's file (`/.well-known/ard.json`) is not written: the two formats have diverged, and ARD needs an identifier and a display name a bare definition does not have. They are the last step of the first epic and outside its acceptance (decision 9).

## Fetching safely

The walk, `get` and the catalog build fetch addresses chosen by strangers. All use one fetch routine:

- **HTTPS only, port 443 only, DNS names only.** An address written as an IP literal is refused. Certificate validation is set on explicitly, so no environment variable turns it off.
- **Redirects are not followed.** A 3xx answer is the outcome `redirected`, reported with the address it named. Every address the tool fetches names a file, so no static host needs a redirect to serve one.
- **The address check is made on the connection, not before it.** The routine resolves the name once, refuses unless every address returned is public, and connects only to an address it checked. Checking first and fetching second lets a hostile name answer differently the second time. In Node this means `node:https` with the routine's own agent and its own lookup. The global agent is not used: when Node is told to take proxy settings from the environment it sends the request to the proxy and never calls the lookup. The built-in `fetch` is not used either: it resolves again when it connects, cannot be told which address to use, and follows the same proxy settings.
- **Refused addresses.** IPv4: 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24 and 224.0.0.0/3 (this-network, private, carrier-grade NAT, loopback, link-local, protocol-assignment, documentation, benchmarking, multicast, reserved and broadcast). IPv6: everything outside 2000::/3, and inside it 2001::/23, 2001:db8::/32 and 2002::/16. An IPv4 address carried inside an IPv4-mapped (::ffff:0:0/96) or NAT64 (64:ff9b::/96) address is checked by the IPv4 list, so readers on IPv6-only networks still reach IPv4-only sources.
- **Name resolution is inside the time limit.** Names are resolved with a resolver whose queries can be timed out and abandoned. Node's `dns.lookup` cannot be cancelled and runs on four worker threads shared with file access, so four slow names would stall every other source.
- **Bytes on the wire are the bytes checked.** Requests ask for no content encoding, and an answer that carries one is refused; `Content-Encoding: identity` names no encoding and passes. Size limits are enforced while reading, not from the stated length.
- **A JSON file must arrive as `application/json` or a type ending in `+json`.** Nothing fetched is executed.
- **The tool names itself**: `mad-discovery (+<address of this repository>)`. A catalog build obeys the robots.txt group for `mad-discovery`, or else the group for `*`, fetched once per host per build. A 4xx answer means no restrictions. A 5xx answer, no answer or a redirect means the host is skipped with the outcome `disallowed`. The walk is one person's own lookup and does not consult robots.txt.
- **Tests opt in to plain HTTP, other ports and loopback** through one parameter that only test code sets. It relaxes the address rule and the routine's connection check together, in `build`, the walk, `get` and the catalog build, so `http://127.0.0.1:<port>/mad/source.json` is a source address under test and nowhere else. No environment variable, configuration field or command-line flag does it.
- **Proxies.** A reader who can reach the web only through a proxy cannot run a walk in this cut, because the check above needs the connection. Proxy settings in the environment are ignored.

Limits. The rows are what must exist; the numbers are proposals for the maintainer to change. They are constants in one module, and a catalog build writes the ones it ran with into `catalog.json`.

| Limit | Walk and `get` | Catalog build |
|---|---|---|
| One request, from before name resolution to the last byte | 10 s | 10 s |
| One fetched file: source document, definition, catalog file, robots.txt | 1 MB | 1 MB |
| JSON nesting depth of a source document, a catalog file, or a definition parsed for paths | 64 | 64 |
| Paths reported for one definition | 16, each at most 256 characters | the same |
| Definitions fetched from one source, taken in SAID order | 50 | 500 |
| Contained SAIDs recorded from one definition, with their paths, lowest SAID first; the rest counted, not recorded | n/a: one SAID is asked | 200 |
| Contained SAIDs recorded from one source, across its definitions | n/a | 5,000 |
| Introductions followed from one source: the first listed in address order, visited or not | 10 | 10 |
| Depth of introductions from a starting source | 3 | 3 |
| Sources per run | 50 | 1,000 |
| Time for one host, all its sources and requests | 60 s | 120 s |
| Bytes read from one host | 20 MB | 100 MB |
| Hosts in flight, one request at a time per host | 8 | 8 |
| The whole run | 120 s | no clock |

A count limit cuts in a fixed order, and the source is recorded as `truncated` with the limit that cut it. A source whose host uses up its time or its bytes is dropped whole, and sources on that host not yet started are `skipped`; a run never keeps part of a source because the clock ran out. That sentence is about a walk's or a catalog's account of a source; `get` keeps each definition it has verified, because a verified file is its own account, and records one `timed-out` entry for the source that was cut, which supplies nothing more. A walk that reaches a limit reports what it has and lists the rest as unresolved. For a catalog build the limits also bound how long it runs (see [Repeatable](#repeatable)): one party who introduces slow sources to the depth limit can use up to the worst case and no more.

### Outcomes

Every address the walk or a build tries ends in exactly one outcome from a fixed list:

| Outcome | Meaning |
|---|---|
| `ok` | Read and used. |
| `truncated` | Read and used up to a count limit, which is named. |
| `not-found` | The host answered 404 or 410. |
| `unreachable` | No answer, a TLS failure or a 5xx. |
| `timed-out` | The request, or the source's host, used up its time or its bytes. |
| `redirected` | A 3xx answer. The target is shown as text and not followed. |
| `refused-address` | The address rule or the connection check refused it. |
| `disallowed` | robots.txt forbids it, or the host's robots.txt could not be read: a 5xx, no answer or a redirect (catalog build only). |
| `invalid` | Wrong content type, a content encoding, not JSON, too large, too deep, a known member of the wrong type, another 4xx, or a `source` that does not match. |
| `skipped` | Not tried, because a limit was reached first. |

Within a source, each definition it lists ends `verified` or `failed-check`, or with the outcome of the fetch of its address from the table above. A `refers` entry that the scan does not find in verified bytes ends `not-contained`. An introduction that names the looked-up SAID in `for` and leads to a source that was read and neither lists it in `serves`, carries a publication of it, nor lists a definition as containing it ends `not-there`; it is judged on what the document says, so a listed definition that fails is `failed-check` or `not-contained` and not also `not-there`. Only verified definitions enter a row or an output folder; bytes that fail are discarded and counted. `failed-check` is the event a reader most needs to see: a source that lists a SAID and serves something else. Outcomes are names only. No error text, no redirect target and no timings enter a catalog's files.

## Trust: what is verified, claimed and unresolved

| State | What it covers |
|---|---|
| Verified | These bytes have this SAID. This definition's bytes contain that SAID. |
| Claimed | Everything a publication says, including who it says offers the definition. What a source document says it serves, contains, or who runs it, until the reader has checked what can be checked. |
| Unresolved | A source that could not be read. Bytes that failed the check. A SAID a source says a definition contains that is not in the bytes. An introduction that names the SAID when the source it points to has nothing about it. An introduction that was not followed because a limit was reached. |

These are MAD's three provenance states. Where each record was fetched is a retrieval observation kept beside every entry (`source`, and `via` for how the walk got there); it is not a fourth state. No entry carries a time: a walk's report is of one run, so whoever keeps it records when it ran, and a catalog's files carry no times so that two builds compare. The states are the walk's labels for what it checked on this run. What MAD's provenance panel shows is decided there (bpm-upm.21).

**Untrusted ground, by design.** Everything here is served over the open web, which is untrusted by default, exactly as a KERI OOBI is. The reader fetches, checks bytes against SAIDs, and takes everything else as what the source says. A source can serve, or carry a publication of, any SAID at no cost, and can state any AID, so none of those is a vote and none is proof. What to make of an offering, and whether to look up the AID that offers it, is the reader's decision, made with whatever tools they trust. This project does not judge ideas and does not plan to.

**An address can change hands.** A domain lapses, a host account is released, a DNS record outlives the bucket it pointed to. Whoever holds the address then inherits every introduction that names it. A statement attributed to an address says who controlled that address when it was fetched and nothing about who controlled it before. A stated AID says who the operator says they are, and no more.

## The tool

One command, `mad-discovery`:

| Command | What it does |
|---|---|
| `build <folder> --config <file> --out <folder>` | Makes a source. |
| `verify <file or address> <SAID>` | Runs the byte check. The SAID is required: the tool does not look for one inside a document, which would need the name of the SAID field. Over an address it asks as a browser would, with an `Origin` request header, and also says whether browser wallets can read the file, that is whether it was sent with `Access-Control-Allow-Origin: *`; without the header it does not fail. |
| `who <SAID> --from <address> [--catalog <address>]` | The walk. |
| `get <SAID> --from <address> --out <folder>` | Fetches a definition and everything that appears in it. |
| `catalog find --finder <name> --out <folder> [--snapshot <name>]...` | Runs one finder over its public input and writes one candidate file per snapshot. It fetches no address a stranger chose. |
| `catalog build --out <folder> [--candidates <file>]... [--from <address>]...` | The catalog build. It runs no finder. With no `--candidates` it is a seeded crawl and says so. |

Every command prints JSON on standard output and exits 0 on success, 1 on failure and 2 on a usage error.

| Command | Fails when | What it does then |
|---|---|---|
| `build` | The configuration is unreadable or has an unknown member; an input is misnamed or does not verify; an AID does not match its pattern; a SAID named in `serve` has no input file; an output would exceed a size limit; `--out` is not empty | Names every failing file, writes nothing, exits 1 |
| `verify` | The bytes fail the check, or the fetch is refused | Prints the expected SAID, the computed one and the reason, exits 1 |
| `who` | The starting source cannot be read | Exits 1. Any later failure is an unresolved entry, and the command exits 0 |
| `get` | The starting source cannot be read; the definition asked for was not fetched and verified | Writes nothing, exits 1. A SAID that appears in a fetched definition and was not found is listed as missing; the verified files are written and the command exits 0, because an appearance is not always a definition |
| `catalog find` | A snapshot cannot be read in full | Writes no file for that snapshot, exits 1 |
| `catalog build` | No source ended `ok` or `truncated`; more candidates than the limit | Writes nothing, exits 1. A single source that cannot be read is listed with its outcome and the build goes on |

`--out` must be absent or empty, except for `catalog find`, whose folder is the one thing kept between runs. `build` and `catalog build` check everything in memory first and write nothing unless every check passes.

**Inputs to `build`.** The input folder holds one file per definition, named `<SAID>.json`, which is the shape of a bpm-core store. The file name is the expected SAID; the build never reads a SAID out of a document, and a file with any other name is refused.

**The configuration file** is the operator's one authored input:

```json
{
  "source": "https://gym.example/mad/source.json",
  "by": "<AID, optional>",
  "oobi": "<https address, optional>",
  "serve": ["<SAID>"],
  "publications": [ { "target": "<SAID>", "name": "...", "description": "...", "tags": ["..."], "collection": "..." } ],
  "introductions": [ { "source": "<source address>", "for": ["<SAID>"] } ],
  "catalogs": ["<catalog address>"]
}
```

`source` is required: it is the address the folder will be served at, and a folder is built for one address. `by` and `oobi` are optional. The rest default to empty. The build computes what can be computed (`refers`, the pages) and the operator writes the rest by hand: one publication for each definition they want found by name, and one introduction for each source they know. That file is the whole cost to an operator.

**What a source serves.** The configuration names the SAIDs to serve; when it names none, every publication's target that the input folder holds. A SAID named in `serve` that the input folder does not hold is refused by name. `build` serves those and every definition that appears in them, transitively, that the input folder holds, and nothing else from the folder. A bpm-core store keeps superseded freezes beside current ones, so serving a whole folder would serve the leftovers. The build reports each SAID that appears in what it serves, that it does not serve, and that no introduction names in `for`. A publication may target a definition the source does not serve.

**Toolchain.** One TypeScript package, run from a checkout. Node 24, stated in `engines`. Source files are `.ts`, and Node runs them directly by stripping types, so there is no bundler and no build step. That limits the code to syntax that can be erased (`erasableSyntaxOnly`) and to relative imports that name the `.ts` extension, and it holds only while the tool runs from a checkout; an installable package would need a build step. TypeScript is a type check only (`tsc --noEmit`) and tests run with `node --test`, both as in `mad/`. Three dependencies, pinned exactly: `typescript` and `@types/node` for the type check, and a Blake3 implementation in plain JavaScript (`@noble/hashes` is the candidate), because Node's `crypto` has none. A test that needs a parser or a validator beyond these names and pins it when that step is planned. It must be plain JavaScript because the same check will move into MAD's shared library, and MAD ships as one bundled file for the browser.

**One implementation of the check.** The SAID check also belongs in MAD's shared library (bpm-vfn.3; its SAID code arrives with bpm-nq3.3). It lives here until that library has it; then this package imports it and deletes its own copy.

**Vocabulary.** The verb for making a source is `build`. "Publish" stays out of the command names while MAD's publish-versus-freeze ruling (bpm-nq3.2) is open, and the noun *publication* follows that ruling too.

## Tests

- **SAID check against outside vectors.** No expected value and no passing input is produced by the code under test.
  - Passing: gym-bp's 28 frozen documents as the compact bytes Python hashed; GLEIF's schema as served; one keripy-written document with non-ASCII text, because the others are all ASCII; one keripy-written inception event; documents frozen by bpm-core that hold an integer-like key, `1.0`, `1e-05` and an integer above 2^53; and a document whose SAID is directly followed by one `#`, which fixes the direction of step 4.
  - Whitespace step: the store's pretty copy of each gym-bp document, and the vLEI repository's pretty copy of the schema, fail the check as stored and come out of the whitespace step equal, byte for byte, to the compact form above. That is the step's outside expected output.
  - Failing: one byte changed, a wrong SAID, a trailing newline, a leading byte-order mark, an invalid UTF-8 byte in the place where the hashed bytes hold U+FFFD, the 44 `#` in place of the SAID, a document whose content holds 44 `#`, one whose content holds 50 `#`, a `#` directly before the SAID, and two strings that do not match the pattern (one with `/`, one with another digest code).
- **Fixture handling.** Fixtures are made once: run `gym-bp/rebuild.sh`, write each store file compactly with bpm-core's own serializer, and commit both forms. They are committed as binary (`-text` in `.gitattributes`) and kept out of any formatter; a compact fixture has no final newline. gym-bp's store is gitignored, so these copies are the only committed ones. The KERI schema is taken from `WebOfTrust/vLEI` (Apache-2.0), whose bytes with whitespace removed equal what GLEIF serves; the fixture folder carries that attribution. The fixtures include a hand-written configuration with publications for gym-bp's three selections, because gym-bp's documents carry no description.
- **Build.** The output of a build verifies. A pretty-printed input comes out compact. Each `refers` equals the scan of the bytes. A misnamed file, an input that does not verify, a SAID named in `serve` with no input file and a source document over the size limit are each refused by name. Two builds of the same input are byte-identical. Only the named SAIDs and what appears in them are served.
- **Walk.** Three local static servers stand for three origins. The first introduces the second, the second the third; a lookup from the first finds all three. A cycle of introductions ends, with each source visited once. Each of these ends in a named outcome and appears in `unresolved`, never as a crash or a hang: a dead source; a 404; an oversized file; a redirect; a wrong content type; a source that lists a SAID and serves other bytes; a `refers` that names a SAID not in the bytes; an introduction `for` a SAID the introduced source has nothing about; a source document whose `source` is not its address; a byte-for-byte copy of one source served from a second origin; a depth limit and a source limit reached.
- **Get.** Over the same three origins. A definition whose closure is split between the first source and a source it introduces `for` the missing SAID: every file is written and verifies, and `build` accepts the folder as its input. A SAID-shaped string that no source read lists is reported as missing with where it was looked for, is requested from nobody, and the command exits 0. A source that serves other bytes for a SAID in the closure adds no file. A SAID that neither the starting source nor a source it introduces serves writes nothing and exits 1.
- **Hostile sources.** A name that answers public on the first lookup and loopback on the second; a name whose resolution never answers; a host written as an IP literal; a public IPv4 address returned in NAT64 form (accepted); a gzip-encoded answer; a body that arrives one byte per second; a `said` of `../../x`; a source document nested 100,000 deep; keys named `__proto__` and `constructor`; ten introductions from one source whose addresses sort ahead of the honest ones (the honest ones are still visited); a definition nested 100,000 deep (verified, reported without paths); a 1 MB definition that holds one SAID 10,000 times under a 500,000-character key (paths cut at the limit); proxy variables set in the environment (the request still goes to the source); a publication with a 100,000-character description, which is dropped and counted while the rest of the source is read; and one with terminal escape sequences in its name.
- **Catalog.** Two builds over the same fixtures produce identical files. A source cannot create a row attributed to another source. A SAID that is only contained in other definitions gets no file. A definition that contains a letter-case variant of another SAID leaves that SAID's file unchanged. A source over the definitions limit is cut at the limit and reported. A source with thousands of publications of one SAID adds one to its row. A row never exceeds the size a walk will read. A build in which every source fails writes nothing. A robots rule that disallows the tool is obeyed.
- **The stranger case, by fixture.** Two sources that never link to each other, plus a fixture in the real shape of the finder's input: a small WARC file laid out like Common Crawl's robots.txt archive, holding 200 and non-200 responses and two captures of one host. `catalog find` reads it, and the catalog built from its candidate file lists both sources for the same SAID. This tests the join, not the finder's reach.
- **Pages.** Every SAID in `serves` has a page. A fixture whose strings are `</script><script>`, `"><img src=x onerror=...>`, `javascript:alert(1)` and bidirectional control characters renders as text: the test parses the page and finds no element, attribute or link other than the ones the writer emits. Every link resolves inside the output folder, or is an address from the configuration, or is one of the fixed paths under such an address.
- **AI Catalog.** The file validates against the specification at commit `6e26a18`.

## Acceptance

The work is two epics under this one design (decision 1): bpm-5g1 and bpm-7h1.

**First epic, bpm-5g1: a second party can read, verify, look up and bring home a definition.** Its `done_when`:

1. **Walk.** The walk test passes: three sources on three local origins, the first introducing the second and the second the third; the walk from the first lists all three as serving the SAID, each verified by the byte check and shown with its chain, and lists what it could not resolve. The `who` command line cannot reach a local origin, so this clause is met by the test.
2. **Pages.** Every definition a source serves has a page, and the source's index page lists what it serves.
3. **Get.** The get test passes: a definition and everything that appears in it, split between two sources, is fetched, verified and written in the shape `build` reads.
4. The maintainer has approved this design. Done 2026-11-09.

**Second epic, bpm-7h1: a stranger is found without being told.** Opened now, blocked by the first, started when the maintainer says. Its `done_when`:

1. **Stranger, by fixture.** The test above passes: two sources that never link to each other, a WARC fixture in the shape of Common Crawl's robots.txt archive naming both, `catalog find` over it, and a catalog built from its candidate file lists both for the same SAID.
2. **Stranger, live.** Two real sources that never link to each other and are named on no command line. Each is found by a finder: its `Mad-Source` line in a robots.txt that Common Crawl captures with status 200, or a public GitHub repository carrying the topic `mad-source` whose homepage is the source address (Ruling 10). A catalog built by the documented command from named inputs lists both for the same SAID. Until this passes the finder is not proven, and the objective is not shown to be met for strangers. This clause waits on a third party's schedule: a new line shows up in a crawl 3 days to 7 weeks after it is added, and a crawl can miss either host, so it can take one or two crawls and hold the epic open.
3. **Catalog pages.** From a catalog's index page a person reaches each source's page for a SAID by links alone.

## Build order

**First epic.** These steps need no hosting, no domain and no cloud account.

1. The SAID check, `build`, the readable pages and the source's index page, over gym-bp's frozen documents. No network.
2. Introductions, the walk and `get`, tested across local origins.
3. AI Catalog entries. Outside acceptance.

When the first epic closes, the repository becomes public (decision 4), and the README names the one part that may still change: the publication record, which MAD's publish step adopts or adjusts.

**Second epic**, when the maintainer says.

4. Two robots.txt files on hosts that do not link to each other, each checked against the newest crawls' indexes first. Two one-definition sources, both serving the same definition, placed on those hosts or anywhere else, and a `Mad-Source` line naming each. The date recorded. This needs no code and starts the Common Crawl clock, which runs every four to five weeks. Done 2026-11-10: the check found none of the maintainer's hosts in the three newest crawls, the lines went up regardless on `seriouscoder.one` and `josephleehunsaker.com`, and the sources are `mad.seriouscoder.one` and `mad.josephleehunsaker.com` (Ruling 10).
5. The catalog build from named sources, and its pages.
6. The two finders (`catalog find`): the robots finder against the fixture, then one full scan of a real crawl, about 165 GB, which shows whether it fits the job it will run in; and the GitHub-topic finder (Ruling 10) against GitHub's repository search, with a fixture of its answer.
7. The live check, which is the second epic's clause 2: the two sources from step 4 rebuilt with `build` at the same addresses, and a catalog built with no source address on the command line that lists both for the same SAID. Then the maintainer's catalog goes up, with pages.

Each step is planned and reviewed before it starts, and nothing is deployed without the maintainer's say.

## What waits on other work

| Waiting | On |
|---|---|
| MAD's own definitions as content | SAIDs for MAD definitions (bpm-nq3.1, then bpm-nq3.3) and a way to write out, for each, exactly the bytes its SAID was computed over (bpm-nq3.5, or the shared store bpm-vfn.1). Display names and other annotations MAD keeps outside the committed definition travel in publications. |
| A renderer that knows MAD's kinds | MAD's shared library (bpm-vfn.3, after the format ruling bpm-vfn.1) |
| Publications of assemblies, and a page for a MAD protocol as a set | Whether assemblies or selections get SAIDs (bpm-nq3.6) |
| Using and retaining what is found inside MAD | The provenance panel and Explore (bpm-upm.21, bpm-upm.22). How a report reaches MAD follows the store ruling (bpm-vfn.1). |
| Searching by business term or tag across sources | Tag search (bpm-nq3.7) and Explore (bpm-upm.22). Until then a catalog's index is the only cross-source list. |
| Finding similar, not identical, definitions | Structural category (bpm-nq3.7, bpm-upm.23) |
| Landing fetched definitions in an authoring store | bpm-core's pull (bpm-n13.3) or MAD's import (bpm-upm.21). bpm-core's open epic bpm-n13 designs the same serve-and-fetch layer for its own CLI, and a source is the HTTP provider it deferred (bpm-n13.4). Whether bpm-core keeps those commands is for its evaluation (mad/HANDOFF.md Ruling 5). |

## Decisions made at review

The maintainer made these on 2026-11-09: first by approving the second draft with its recommended answers, then in a stress test that walked through nine branches. Each is mirrored as a numbered ruling in the [README](../README.md#rulings) and as a closed `Rule:` bead.

1. **Two epics, one design.** bpm-5g1 is narrowed to the known-address half: sources, pages, the walk and `get`. A second epic holds the catalog and the finder and starts when he says. (Ruling 4)
2. **A source is one plain folder.** `source.json`, `definitions/<SAID>.json` and `pages/`, placed anywhere; no `/.well-known/` and no OOBI-shaped path for a source's own files. A keripy-shaped `/oobi/<SAID>` for schema models is a possible later extra for root-hosted sources. (Ruling 5)
3. **Posting is open.** No exclusion list. A catalog repeats what sources say; a host accepts strangers' text under its address; the protections keep that text inert and do not keep it out. Made over a recommendation to add an exclusion list. (Ruling 6)
4. **Going public.** The repository becomes public when the first epic closes, not before the live check. The first deployed source serves a small set of gym-bp's documents labelled as test data. Hosts for the live check are chosen when the second epic starts, each checked against the crawl index first. (Ruling 4)
5. **The robots.txt line is the only finder for now**, and the first cut's ceilings stand: 1,000 sources per build, 500 definitions per source, one index file, about 165 GB per crawl. A GitHub search finder, one company's index, is added only if real adopters turn out to need it. (Ruling 9)
6. **Publications are offerings.** A publication puts a definition forward as an idea, a type, a schema, a category or a template; it is not an endorsement and is not signed. A source document may state `by` (the operator's AID) and `oobi` (where to resolve it); a publication may state its own `by`. All stated, nothing verified here. The design carries no signature framing: the web is untrusted ground by design, as a KERI OOBI is, and judging ideas is not this project's job. No identifier of its own and no lineage claim. (Ruling 7)
7. **The SAID check is format-agnostic, and the envelope is MAD's.** The check presumes only the standard SAID derivation and nothing about the envelope or the language inside it. JSON-only rendering and content types are a noted extension point. (Ruling 8)
8. **`get` is in the first cut.** It is the network half of reuse; bpm-core's pull and MAD's import are the storage half and can call it. (Ruling 9)
9. **AI Catalog entries stay; ARD's file does not.** The entries are the first epic's last step, outside its acceptance, without the optional digest. (Ruling 9)

After review, when the second epic started (2026-11-10):

10. **Finders, after the crawl check.** The three newest Common Crawl crawls hold no capture of any host the maintainer controls, so the live check could not run on his hosts as written. Both routes: the `Mad-Source` lines went up anyway on `seriouscoder.one` and `josephleehunsaker.com`, with a second source at `mad.josephleehunsaker.com`, so the robots route completes if Common Crawl ever captures those hosts; and Ruling 9 is amended: a GitHub-topic finder joins the robots finder in step 6, because the first real adopter needs it. The live clause is met by either finder. (Ruling 10)

On 2026-11-12, for the maintainer's KERI wallet, which runs in a browser:

11. **Browser wallets may read a source.** A source that wants them to sends `Access-Control-Allow-Origin: *` on `source.json` and on `definitions/*`. The header is optional; a source without it is still a source for the tools here. `verify` over an address reports it and does not fail without it. (Ruling 11, bpm-7h1.13)

12. **A stranger's string is well-formed Unicode.** A publication field, `by`, `oobi`, a JSON Pointer path reported from a definition's keys or a candidate file's `place` value that holds a lone surrogate fails its rule as a control character does: dropped and counted, in the source rules, in the scan's paths and so in a catalog's rows. A browser wallet's store cannot hold such text and refuses the whole file, so one hostile string would otherwise make a row unreadable to every wallet. A format rule, not an exclusion list. Raised by the Fortoid session (fortoid-5wa). (Ruling 12, bpm-7h1.14)

13. **A stranger's string holds no character that reverses text or does not show.** The bidirectional controls and the invisible format characters listed under the publication record's Limits are refused like control characters; the joiners U+200C and U+200D stay. One shared rule for this tool and the browser wallet, so a name one accepts the other shows as it is. Chosen over refusing every format character (emoji sequences and Persian break) and over no shared rule. Raised by the Fortoid session (fortoid-016, issue #3). (Ruling 13, bpm-7h1.18)

## Defaults chosen here

Smaller choices this draft made. Each is cheap to change now; say so if one is wrong.

- The byte check refuses a document whose own content holds 44 consecutive `#`, or a `#` directly before its own SAID.
- `refers` is a scan of bytes for anything shaped like a SAID. It records appearances, not references.
- `verify` requires the SAID.
- The walk keeps nothing between runs. The first draft's local folder duplicated the retention the README assigns to `mad`.
- A robots line may name a source on another host, and a finder reads one line per robots.txt. Allowing another host widens the finder's reach to anyone who controls a robots.txt somewhere; the cost is that a robots.txt can send every builder one small request to an address of its choosing.
- A build takes the candidates of the three most recent crawls together. Reading only the newest would drop and re-add about a fifth of sources from one build to the next. The price is that a source stays listed for up to three crawls after its robots line is removed, unless its source document is gone.
- When a build has more candidates than its limit it stops and writes nothing, instead of writing a subset. Stopping lets someone with many captured hosts halt a build; a subset lets them crowd honest sources out. Neither is solved before signatures.
- Every limit in the table, and the field limits on a publication.
- A reader who can reach the web only through a proxy cannot run a walk.
- Pages carry no JSON-LD block. Nothing here reads one, and it would be the first public RDF terms for a definition, which MAD's own projection has not chosen.
- A SAID that no source serves gets no catalog row, even when definitions contain it.
- From one source a catalog row takes one publication of a SAID and at most 50 definitions that contain it.
- The time and byte limits are per host, not per source, so that a build's worst-case length is bounded. A shared host with many sources under one host name gets one host's allowance for all of them.

## Stress Test Results: the mad-discovery design

Run on 2026-11-09 with the maintainer, after he approved the second draft. Nine branches, one at a time, each with a recommendation; he agreed with four and changed five.

### Resolved decisions

- **Build order.** Two epics under one design; the catalog half starts when the maintainer says. Agreed as recommended.
- **File layout.** One plain folder per source; `/.well-known/` and the OOBI-shaped path dropped for a source's own files. The recommendation reversed the second draft's, after checking the KERI specification (well-known `oobi` is for AIDs and returns a pointer; a data OOBI fixes no path) and keripy (`/oobi/<SAID>` at a host root, schemas only). Agreed.
- **Abuse control.** Recommended a public exclusion list for a hosted catalog. The maintainer overruled it: posting is open by intent, definitions are types and categories rather than anything that runs, the web is untrusted ground like a KERI OOBI, and authorization happens elsewhere. Recorded as his decision.
- **Going public.** Repository public when the first epic closes, not before the live check; test data labelled; hosts chosen and checked when the catalog epic starts. Agreed as recommended.
- **Finder reach and ceilings.** Robots.txt finder only; first adopters are likely reached by introductions, not the finder; ceilings accepted as stated. Agreed.
- **Publication record.** The maintainer reframed it: a publication is an offering of an idea, not an endorsement, and signatures are not what the design should be waiting for. Added the optional `by` AID on a publication and on a source, with an optional `oobi` for the source's AID; removed the signature framing throughout. Modified.
- **SAID check.** Format-agnostic, with the envelope left to MAD; the maintainer wants no specified format beyond the SAID's slot, and definitions that may one day be LISP or CEL rather than JSON Schema. The check already allows that; the JSON assumptions in rendering and content types are noted as an extension point. Agreed, with the clarification added.
- **`get`.** Kept. Agreed.
- **AI Catalog entries.** Kept as the first epic's last step, outside acceptance; no ARD file. Agreed.

### Changes made

- Acceptance and build order split into two epics; `get` added to the first epic's acceptance.
- Source layout, address rule, derived definition address, robots line example and configuration example changed to the plain folder. The "Where this stands with KERI" rule replaces the convention claim. Dot-folder notes now apply only to the AI Catalog file.
- "Posting is open" written into the promises and the catalog rules; the sentence "this cut has no way to leave a source out" replaced.
- Publications rewritten as offerings; `by` and `oobi` added to the source document and `by` to publications; the Trust section rewritten around untrusted ground; the signature paragraph and the "signed publications" waiting row removed; Terms rows for Publication, Source document and AID changed.
- The envelope paragraph added to the check section.
- Open questions replaced by Decisions made at review; rulings 4 to 9 mirrored in the README.

### Deferred / parking lot

- A keripy-resolvable `/oobi/<SAID>` shape for models that are KERI schemas, for sources at a host root.
- A GitHub search finder, if real adopters live where the robots.txt finder cannot see. Resolved by Ruling 10 (2026-11-10): they do, starting with the maintainer; the GitHub-topic finder joins step 6.
- What a build does when it has more candidates than its limit (it stops and writes nothing); theoretical until there are adopters.
- Non-JSON definition serializations: the page renderer and the accepted content types.

### Confidence assessment

- Overall: high for the first epic, which is small, needs no network beyond local test servers, and rests on a check measured against real documents. Medium for the second: the finder's reach is measured and narrow, its proof waits on Common Crawl, and open posting means the hosted catalog will carry whatever is offered.
- Areas of concern: no party other than the maintainer runs a source yet, so every format here is untested against a stranger's hand; the publication record is the part most likely to change when MAD's publish step exists.

### Clarifications from the step 2 plan's stress test (2026-11-10)

Written into the sections above, each agreed by the maintainer (record: `docs/plans/walk-and-get.md`, "Stress Test Results"): `get` keeps each verified file when a host's budget runs out, since a file is its own account; in `get` the SAID asked for may come from an introduced source, and a lister at its definitions limit yields to the next; `not-there` is judged on what the document lists and carries; the ten introductions followed are the first ten listed, visited or not; a reader ignores an unknown member inside a publication; the walk's report gained `sources`, so a source's stated `by` and `oobi` appear in it; `Content-Encoding: identity` passes. `who --catalog` waits for the catalog (second epic).


## What was dropped from the draft spec

| Dropped | Why |
|---|---|
| The DCR graph format | Not a MAD definition. Ruling 2. |
| CIDv1 sha2-256 over JCS | A second digest beside the SAID. Ruling 2. |
| The Weisfeiler-Lehman structural hash | Underspecified, and a different equivalence from MAD's category. Ruling 2. |
| The crawler Lambda, DynamoDB index and query API | An aggregation site by another name. Ruling 3. |
| The ARD registry endpoint | Would make this project a registry operator. Ruling 3. |
| The CDK application and npm workspaces | Nothing left for them to hold: the output is a folder of static files and the code is one package. |
| Phases that stop before each deploy | Replaced by the build order above. |

The findings behind each row are in [research/spec-review.md](research/spec-review.md).
