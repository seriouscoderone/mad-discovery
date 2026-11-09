# mad-discovery design

**Status: draft for the maintainer's review.** Nothing here is built. It replaces the draft build spec (`git show 713a12f:MAD-DISCOVERY-SPEC.md`) and is written to the three rulings in the [README](../README.md#rulings).

This is the second draft. The first was put through an adversarial review: six reviewers with different lenses, each rechecked by a skeptic, 95 findings, none refuted. That review is in [research/design-review.md](research/design-review.md). The evidence behind the rulings is in [research/spec-review.md](research/spec-review.md) and [research/discovery-survey.md](research/discovery-survey.md).

The decisions that are the maintainer's to make are collected in [Open questions](#open-questions-for-the-maintainer). Smaller choices this draft made on its own are listed in [Defaults chosen here](#defaults-chosen-here). Everything between is the specification.

## What this project is for

The maintainer's objective: nobody should need to make a protocol reference or aggregation site such as openhaven.net.

In MAD a protocol is a set of definitions: models, authorizations and responsibilities. Each is identified by a SAID, a digest of its own content, so two parties holding the same SAID hold the same definition and nobody assigns or approves the identity. A reference site adds several things on top of that. This is what supplies each of them here:

| What a reference site gives | What supplies it here | Who can use it |
|---|---|---|
| Somewhere to read a definition | A page per definition on each source | A person |
| Who else uses it | The walk, and a catalog's row for the SAID | A program. A person too, if catalogs carry pages (open question 2) |
| A list of what exists | Each source's index page, and a catalog's index | A person, per source. Across sources, as above |
| What replaced what | Only when the newer definition's bytes name the older SAID (see [Lineage](#lineage)) | A program |
| Browsing by topic, searching by a business term | Not in this cut (bpm-nq3.7, bpm-upm.22) | |
| Independent assessment | Not in this cut. It waits for signatures | |

**What it promises.** No hand-curation, no submission step and no authoritative site. A directory of definitions becomes a mechanical view that anyone can rebuild and nobody owns.

**What it does not promise.**

- That no index exists anywhere. Asking "who else uses this SAID" of parties you have no link to needs a list that somebody compiled. The survey found no exception across eight families of mechanisms. This design keeps that list rebuildable, replaceable and without authority.
- That a catalog lists every source. No public input measured lists a brand-new website that nobody has linked to, by a route that is free, repeatable and not one company's search. The finder built first reaches websites that Common Crawl already captures. Everyone else is found through introductions. See [Finding sources nobody linked](#finding-sources-nobody-linked).
- Independent assessment. Much of what openhaven.net offers is its researchers' judgement of each protocol, and it refuses self-description. Replacing that needs statements about a SAID signed by third parties, which waits for signatures (see [Trust](#trust-what-is-verified-claimed-and-unresolved)).
- That parties will run sources. The source document, the robots line and the publication record are new and have no adopters. The survey's closest analog had nine adopters after about five months.

## Terms

These are MAD's own words for discovery, from `mad/docs/mad-ux-design.md` ("Explore what MAD has learned") and `mad/docs/micro-apps-vision.md` ("Introductions and retrieval"). MAD's documents leave their wire formats open; the formats below are this project's proposal for them.

| Term | Meaning here |
|---|---|
| Definition | A frozen document identified by its SAID. For MAD: a model, an authorization or a responsibility (Ruling 2). The tool never reads a document's kind. In the test data: gym-bp's frozen documents, three of which are selections. |
| SAID | The definition's identifier: the Blake3-256 digest of its content in CESR text form. Exactly 44 characters: `E`, then one of `A` to `P`, then 42 of `A-Z a-z 0-9 - _`. The workspace's rule; this project identifies definitions by no other digest. |
| Source | A place on the web that serves definitions and records about them as static files. It is identified by the address of its source document. |
| Source document | One JSON file that says what a source serves, which publications it carries and which other sources it knows. |
| Serve | To make a definition's bytes fetchable at a source. bpm-core's vocabulary calls this *publish*. Here a publication is the record about a definition, and serving alone is what a mirror does. |
| Publication | MAD's word for a principal's endorsement of one exact definition, with its discovery metadata: a name, a description, tags and a collection placement. In this cut the record names no principal and is unsigned, so it is a description found at a source address, not an endorsement anyone can be held to. |
| Introduction | A pointer to another source's address, with the SAIDs to look for there when known. The reader fetches and checks; an introduction is a hint, never a fact. It follows KERI's out-of-band introduction. |
| Catalog | A listing derived from sources: for each SAID, which source addresses serve it, which carry a publication of it and which definitions contain it. Any number can exist and none is authoritative. |
| Finder | The part of a catalog build that proposes source addresses from a public input. |
| Reader | Whoever runs a lookup. |
| Principal | A person or organization identified by a key it holds itself. MAD's word. Nothing here identifies principals until publications are signed. |
| Origin | A scheme, host and port, such as `https://gym.example`. |

A protocol is a set of definitions. Where the set is itself a frozen document, as a gym-bp selection is, its page is the protocol's page: it lists the members and links to each. A MAD assembly has no SAID; whether assemblies or selections get one is the unmade ruling bpm-nq3.6.

Two words from earlier discussion are gone. "Declaration" already means something else in MAD (a responsibility's state and view declarations), so the records here are publications and introductions. And nothing claims authorship: identity comes from content, so there is no author to record.

## The three parts

1. **A source** is a folder of static files that a party uploads to an address it controls.
2. **The walk** is a lookup a reader runs from their own machine. Given a SAID and one source address, it reads that source, follows its introductions to other sources and reports what it found. Nothing is hosted.
3. **A catalog** is the output of a repeatable build that visits every source it can find and writes static files. It covers the case the walk cannot: two parties who never linked to each other.

A source also carries generated pages for people and, optionally, entries in the AI Catalog format.

It is one TypeScript package with a command-line tool. There is no server, database or query service. The tool ships with no source or catalog address built in: every lookup names where it starts, so no copy becomes the default. Deploying a source means copying its folder to the static host it was built for.

## A source

A source is the output folder of one build. Every path is fixed and relative to the source's *base*, which is the address of the source document without its last three segments. For a source at the root of `gym.example` the base is `https://gym.example/`.

```
.well-known/mad/source.json              the source document
.well-known/oobi/<SAID>/index.json       the bytes of the definition with that SAID
pages/index.html                         a page listing what this source serves
pages/<SAID>/index.html                  the readable page for that definition
pages/style.css                          the one stylesheet
sitemap.xml                              lists every page
.well-known/ai-catalog.json              AI Catalog entries; only at the root of a host
```

The source document:

```json
{
  "source": "https://gym.example/.well-known/mad/source.json",
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
      "source": "https://city.example/.well-known/mad/source.json",
      "for": ["EMSaOVmC4hKCUfwULHzziJ-eHEzFEb8qPrCp9Lm3kMlL"]
    }
  ],
  "catalogs": ["https://gym.example/catalog/catalog.json"]
}
```

| Member | Type | Required | Rule |
|---|---|---|---|
| `source` | source address | yes | Must equal the address the document was fetched from. |
| `pages` | boolean | no, default false | True when the source has the readable pages at the paths above. |
| `serves` | array of `{ said, refers }` | no, default empty | `said` is a SAID. `refers` is an array of SAIDs, default empty. |
| `publications` | array | no, default empty | See [Publications](#publications). |
| `introductions` | array of `{ source, for }` | no, default empty | `source` is a source address. `for` is an array of SAIDs, default empty. |
| `catalogs` | array of catalog addresses | no, default empty | See [The catalog](#the-catalog). |

Rules for a source:

- **A source is identified by the address of its source document**, not by a domain. A source can live under a path on a shared host. The domain is a locator, never an identity.
- **A source address has one form.** It is `https` on the default port, with a DNS host name (no IP literal, no trailing dot), no user name, password, query or fragment, a path ending in `/.well-known/mad/source.json`, and at most 512 characters. The address is the string the WHATWG URL parser serializes; that string is what is fetched, compared, stored and shown. A catalog address follows the same rule except that its path ends in `/catalog.json`.
- **`source` must equal the address the document was fetched from.** A document that names another address is a copy of someone else's files. The reader lists it as unresolved and reads nothing from it. Copying a source's files therefore does not make a second source; rebuilding them for a new address does, and that is an intentional act.
- **A definition's address is derived, never declared.** It is the base followed by `.well-known/oobi/<SAID>/index.json`. A source cannot place its definitions anywhere else, so bytes credited to a source always came from under its own address.
- **The definition path follows an existing convention.** `/.well-known/oobi/<SAID>/index.json` is the shape GLEIF serves its vLEI schemas in today, and a file served there is what KERI calls a data OOBI: an address paired with a SAID, checked by the recipient. Serving under `index.json` gives the right content type on a static host.
- **Everything read from a source document is checked before use.** A SAID must match the pattern in [Checking bytes](#checking-bytes-against-a-said); an address must pass the address rule. An entry that fails is dropped and counted. A reader ignores a member it does not know, and discards a document in which a known member has the wrong type.
- **`refers` lists every SAID that appears in a served definition's bytes, other than its own.** See [SAIDs inside a definition](#saids-inside-a-definition). It lets a reader ask "which definitions here contain X" without fetching every definition. It is a claim until the reader fetches the definition and finds the SAID by the same scan.
- **`catalogs` introduces catalogs the source's operator finds useful.** A reader who knows one source thereby learns of catalogs, which is how MAD's design says discovery starts ("bootstrapped introductions to available catalogs"). The build writes no catalog address the operator did not put in the configuration.
- **Size.** A source document and a definition are each at most 1 MB, and the build refuses to write a larger one. At gym-bp's density of references that is about 5,500 definitions per source. A larger operator splits into several sources that introduce each other.
- **The files are the contract, not this tool.** A source can be written by hand or by another tool.
- **A browser is not expected to read a source.** The walk runs in Node, so a source needs no cross-origin header and any static host works. This is part of open question 3, because it is costly to change once others run sources.

### The robots.txt line

`Mad-Source: <source address>` is the one thing an operator emits for parties who have never heard of them. It goes in any robots.txt the operator controls, on a line of its own, anywhere in the file. The field name is matched without regard to case, and text after a `#` is ignored. It may name a source on another host, so an operator can put it in the robots.txt of their main website while the source lives elsewhere, including under a path on a shared host.

The build prints the line, and a `Sitemap:` line for the pages. It never writes or edits a robots.txt, because that file belongs to the whole site.

## Checking bytes against a SAID

The check needs no knowledge of the document's format. It takes the bytes as served and the SAID that was expected:

1. The bytes must contain the expected SAID.
2. Replace every occurrence of it with 44 `#` characters. Call the result the hashed form.
3. Compute the Blake3-256 digest of the hashed form and encode it as a SAID. It must equal the expected SAID.
4. In the hashed form, replace every run of 44 `#` with the SAID, left to right. The result must equal the bytes as served.

**Encoding.** Put one zero byte in front of the 32 digest bytes, write the 33 bytes as base64url (44 characters, no padding) and replace the first character with `E`. Writing `E` followed by the base64url of the 32 bytes alone also gives 44 characters and is wrong. Worked value: the three bytes `abc` give `EGQ3s6w4RlEz_7Y7dSc6jbVIxVhGXXnbA_01nGzVvZ2F`.

**What counts as a SAID.** A string is a SAID here only if it matches `^E[A-P][A-Za-z0-9_-]{42}$`. Every SAID taken from a command line, a source document, a catalog or the inside of a definition is tested against that before it goes into an address, a file name or a page. Anything else, including KERI's other digest codes, is dropped and reported as unsupported. SAIDs are compared as exact strings; there is one text form.

**Octets, not text.** The check runs on a file read as binary, or on a response body with no content encoding. It never runs on decoded text, because decoding drops a leading byte-order mark and turns each invalid UTF-8 byte into U+FFFD, so several byte strings would pass for one SAID.

**Why step 4.** Without it the check is not one-to-one. A file whose SAID field still holds the 44 `#` passes for that SAID (measured on every test document), and so do other variants that differ in whether a slot holds the SAID or the `#`. With step 4 the served bytes can be rebuilt from what was hashed, so at most one byte string passes for a SAID. The cost is that a document whose own content holds 44 consecutive `#` cannot be served, because telling its SAID field from its content needs knowledge of its format. A category template (bpm-nq3.7) is such a document; it is derived from a definition, not served as one.

**How this relates to bpm-core.** This is the CESR specification's SAID verification, applied to served bytes wherever the SAID occurs. `bpm-core/src/bpm_core/said.py` applies the same step to a parsed document's `d` field. For a document that holds its SAID once, in `d`, and no run of 44 `#`, the two give the same answer. The byte check also covers what `said.py` cannot read, such as a KERI schema whose SAID is in `$id`.

Measured during the review, with scripts kept outside the repository:

- GLEIF's Qualified vLEI Issuer schema, exactly as served from `www.gleif.org`, verifies. It was written by KERI's own tooling and carries its SAID in `$id`.
- All 28 documents that gym-bp's `./rebuild.sh` freezes from a clean clone verify once the whitespace between their JSON tokens is removed. The maintainer's local store also held 8 earlier freezes; those verify too.
- None verifies as stored, because the store files are pretty-printed.
- A keripy inception event, which carries its SAID in both `d` and `i`, verifies. It is the one vector that tells "replace every occurrence" from "replace the first".

**A source serves the compact bytes.** The SAID was computed over a compact serialization, and the frozen store keeps only a pretty-printed copy, so the build recovers the compact bytes without interpreting them. An input that verifies as given is copied byte for byte. Otherwise the build removes the whitespace between JSON tokens, leaves every string and number exactly as written, and checks the result. It never parses a document and writes it out again, because that changes bytes: JavaScript moves integer-like property names to the front and rewrites numbers such as `1.0` and `1e-05`. In the review, parse-then-write changed 14 of 32 awkward documents that bpm-core can freeze; whitespace removal reproduced all 32. A file that still fails is refused by name. The check runs on every file the build is about to write, so a difference is caught on the operator's machine and never reaches a reader.

**Independence from the property-order ruling.** The check compares served bytes with a SAID and chooses no order, so it does not wait on bpm-nq3.1. It presumes one thing of that ruling: that MAD can write out the exact bytes a SAID was computed over. If property order is ruled presentation only, those bytes are in the canonical order, and the order an author arranged has to travel outside the definition; this design carries no record for it.

**What verified means.** These bytes have this SAID. It does not mean they are the one normal form of a definition. Making one meaning one SAID is MAD's work (bpm-nq3.1, bpm-nq3.3).

## SAIDs inside a definition

A SAID *appears* in a definition wherever its bytes hold 44 characters that match the SAID pattern, with no base64url character directly before or after them. That covers a SAID that is a whole string value, an object key, or part of a longer string such as an address. `refers` is the set of SAIDs that appear, other than the definition's own, each once, sorted as strings.

The scan runs on the same bytes as the check, on the operator's machine and on the reader's, and needs no parsing. When the bytes parse as JSON, a report adds the JSON Pointer of each string or key that holds the SAID, so a reader can see where it sits.

An appearance is not always a reference, and a reference is not a relationship. A KERI identifier has the same shape as a SAID, so a filled-in identity (mad/HANDOFF.md Ruling 8) will match. The tool does not know whether a field is a reliance, an issuance or a note, and adding a SAID to a document costs nothing. A report therefore says that a definition contains this SAID at this place. What that means is for tools that know the kind.

## Publications

A publication describes one exact definition for discovery. In MAD it is also its principal's endorsement.

```json
{ "target": "<SAID>", "name": "...", "description": "...", "tags": ["..."], "collection": "..." }
```

- The record takes the four things MAD's Publish form asks for (name, description, tags, collection), all required there and here, plus the target's SAID.
- **In this cut a publication names no principal and has no signature**, because no principal has a durable identifier yet (bpm-upm.25). MAD's endorsement belongs to a principal, and a retrieval host is not necessarily the signer. A reader therefore treats a publication as a description observed at a source address: claimed, never listed under an endorser, never counted.
- **A publication has no identifier of its own.** The same text at two addresses is two claims, and nothing infers that it is one publication or two. A SAID over the description alone could not tell them apart either: two parties who keep the Publish form's prefilled values would get the same one.
- **It does not bind MAD's signed publication.** What MAD signs is ruled under the `mad` label with bpm-nq3.5, and when it exists it replaces this record; the tool then reads one form, not two. When MAD designs its bundle, a source folder is the candidate format, so that there is one format and not two. That is decided there.
- **How it differs from MAD's `Publication` type** (`mad/src/views.ts`). `tags` is a list; MAD's form holds one comma-separated string. `target` is a SAID; in MAD today it is a prototype reference, until bpm-nq3.3. `endorser` is left out until it can be signed. `targetId` is left out because it is local to one MAD instance, `kind` because a reader takes it from the definition, and `components` because it belongs to assemblies.
- **Assemblies.** MAD's Publish screen has a fourth target, the assembly. It is not in this cut: a publication's target is a SAID, and whether an assembly gets one is bpm-nq3.6. If it does, an assembly is served and looked up like any definition.
- **Limits.** A name or a collection is at most 200 characters, a description 2,000, and there are at most 32 tags of 64 characters each. No field holds a control character. A publication that breaks a limit is dropped and counted. The numbers are proposals.

## Introductions

An introduction names another source's address and, when known, the SAIDs to look for there. `for` lists SAIDs the other source is expected to serve, carry a publication of, or serve a definition that contains.

Introductions are entries in the build's configuration file, typed by the operator. The reader records the address of the source document each introduction was found in. That is a retrieval observation. MAD's introducer is a principal, and it stays unknown until introductions are signed.

Introductions point mostly one way. An adopter knows where it got a definition and can introduce that source. The source it came from is told nothing, so it cannot introduce its adopters unless its operator hears of them and adds them by hand. A walk from an adopter therefore reaches the origin. A walk from the origin reaches only the sources its operator added, and misses later adopters.

This design has no announce or ping step by which an adopter tells a source. That would have every source run a service that accepts writes, and would make the first source to serve a definition the registry for it. A source here is static files. From an origin, adopters are found through a catalog and only through a catalog.

## Lineage

An edited definition is a new SAID. This cut connects it to the old one only when the new definition's bytes name the old SAID, as a bpm-core document's `supersedes` does when it was frozen as a SAID. The new one then appears among the definitions that contain the old one, and the place of the appearance is what tells a successor from a user.

Nothing else connects them. For MAD the predecessor is not expected to be inside the definition: `derivedFrom` is state on a draft, and MAD's vision calls supersession a claim. Whether a publication carries that claim is part of open question 5.

## The walk

`mad-discovery who <SAID> --from <source address> [--catalog <catalog address>]` runs on the reader's machine:

1. Fetch the source document at the given address.
2. If the source lists the SAID in `serves`, fetch the bytes and check them.
3. Collect the source's publications whose target is the SAID.
4. For each served definition whose `refers` lists the SAID, fetch that definition, check its bytes and confirm by the scan that the SAID appears in them.
5. Follow the source's introductions and repeat, within the limits in [Fetching safely](#fetching-safely). Visited addresses are remembered, so cycles end.

The walk is breadth-first: every source at one depth before any at the next. Within a depth, introductions that name the SAID in `for` come first. Among equals the walk takes one introduction from each introducing source in turn, introducing sources in address order, so one source cannot fill a level with its own.

With `--catalog`, the walk also reads `said/<SAID>.json` beside that `catalog.json` and treats the source addresses in it as introductions, checking each one the same way. When the row lists more sources than the walk's limit, it takes a random sample and says so, because a row is open to flooding and any fixed order can be occupied. Catalogs named in a source document are listed in the report and never fetched on a source's word.

The report is one JSON document on standard output:

```json
{
  "said": "<the SAID asked for>",
  "from": "<the starting source>",
  "serves":       [ { "source": "<address>", "via": ["<address>"] } ],
  "publications": [ { "source": "<address>", "via": [], "publication": { "target": "...", "name": "...", "description": "...", "tags": [], "collection": "..." } } ],
  "referrers":    [ { "source": "<address>", "via": [], "said": "<a definition that contains it>", "paths": ["/rely_on/0/said"] } ],
  "unresolved":   [ { "address": "<address>", "via": [], "reason": "failed-check" } ],
  "catalogs":     [ "<catalog address a visited source named>" ],
  "reached": 3
}
```

- `serves`: sources that serve the definition. Verified by the byte check.
- `publications`: publications of it. Claimed.
- `referrers`: definitions whose bytes contain it. The appearance is verified; its meaning is not interpreted.
- `unresolved`: everything the walk was pointed at and could not fetch or check, each with an outcome from [Outcomes](#outcomes).
- `via` is the chain of source addresses whose introductions led there, empty for the starting source.

The `referrers` list is the raw material for "who else issues or relies on this model". In MAD, responsibilities link only through shared models, so the responsibilities that contain a model's SAID are the candidates to interoperate over it.

The report says how many sources it reached. Reaching none is not evidence that nobody else uses the definition.

**The walk keeps nothing between runs.** Retaining what was learned, with its provenance, is MAD's (bpm-upm.21). A reader who wants the bytes uses `get`.

**Strangers' text.** Every string a source wrote is shown as a quoted JSON string beside that source's address, and the tool's own messages never contain one. The report is ASCII-only: every character outside printable ASCII is written as a `\u` escape, so a publication's name cannot redraw a terminal or issue a command to a CI runner. A model or tool that reads the report treats those strings as data.

**What a walk reveals.** Every source the walk visits sees the reader's network address, the tool's user agent and the time. A source learns which SAID the reader is asking about only when the walk requests that SAID's bytes, or a definition that contains it, from that source. The source document is always fetched whole and matched on the reader's machine, and the walk never sends a SAID to a source that does not list it. Requests carry no cookies, no credentials and no Referer. A catalog host sees each per-SAID file a reader requests. A source that wants to know who is interested in a SAID can list it; the reader cannot prevent that except by not fetching.

### Bringing a definition home

`mad-discovery get <SAID> --from <source address> --out <folder>` fetches the definition and, transitively, every SAID that appears in it: from that source first, then from sources its introductions name `for` a missing SAID. It checks each and writes `<SAID>.json`. It reports each SAID it could not find and where it looked.

HANDOFF's first success criterion is that an independent author can discover and reuse an exact definition. The walk and the pages are the discovering. `get` is the network half of the reusing: in the review, bpm-core refused to freeze a new responsibility until every document it pins was in the store. Landing the files in an authoring store is bpm-core's pull (bpm-n13.3) and MAD's import (bpm-upm.21, bpm-upm.22). The output folder has the shape `build` takes as input, so there is one folder shape.

## The catalog

`mad-discovery catalog build --out <folder> [--finder <name>]... [--from <source address>]...` is a batch:

1. Gather candidate source addresses: those named with `--from`, and those each finder returns.
2. Visit each source and follow introductions to more, breadth-first, within the limits.
3. For each definition a source serves, up to the limit, fetch the bytes, check them and scan them.
4. Write static files.

A catalog is a folder, and its address is the address of its `catalog.json`. That is what a source lists under `catalogs` and what `--catalog` takes. The other files sit beside it under fixed names:

```
catalog.json           how it was built: the tool's commit, the starting sources, the finders and
                       their public inputs by snapshot name, and the limits it ran with
index.json             every SAID that has a row, sorted; for each, the number of source addresses
                       that serve it and the names its publications give it, each beside the source
                       address that gave it
said/<SAID>.json       one row: the walk's report for that SAID without `from` and `via`
sources.json           every address tried: how it was found, its outcome, and a hex Blake3 digest
                       of the source document bytes read
pages/index.html       the same rows as pages (open question 2)
pages/<SAID>/index.html
```

No file holds the catalog's own address, so a copy on another host is byte-identical and two builds compare with a plain diff. `index.json` is the list of what exists. A catalog answers no queries: a reader fetches files.

A catalog returns introductions, in MAD's sense: a reader takes the addresses from it and checks everything again for themselves. A catalog assigns no identity and settles nothing.

### What a catalog row may say

A catalog is built from documents written by strangers, so:

- **A SAID has a row only when a visited source served bytes for it that passed the check.** A SAID that definitions contain but no source serves has no row and no file; it shows only in the rows of the definitions that contain it. No file name comes from a stranger's text. On a file system that ignores letter case (the macOS and Windows defaults), a file named from a stranger's string could replace a real SAID's file; a name the build computed cannot be made to collide that way.
- **Every statement is attributed to the source address it was fetched from.** Nothing in one source's files can create or change a row attributed to another source.
- **Publications are recorded as claimed**, and only in the row of a SAID that already has one.
- **A count of sources is a count of addresses**, which costs nothing to inflate. So is the list of definitions that contain a SAID. The catalog reports them as such. Which sources or principals to believe stays the reader's decision.
- **How a source was found can be checked on its own.** For a finder, `sources.json` gives the finder's name, the snapshot and the place in it (for the robots line, the archive file and the record's offset). For an introduction, it gives every introducing address.
- **Nothing is carried over from an earlier build.** A source that cannot be reached adds no rows and is listed with its outcome. A build cannot tell a source that is gone from one that was briefly down unless the host answers 404 or 410.
- **An empty build writes nothing.** A build in which no source ended `ok` writes nothing and exits non-zero, so a network fault on the builder's side cannot replace a catalog with an empty one.
- **The catalog repeats whatever names and descriptions strangers put in their publications**, unattended. This cut has no way to leave a source out.

### Repeatable

Repeatable means the same command over the same public inputs. Two parties who run it at the same time produce the same files if every source answered both alike. What a build includes is decided by counts and a fixed order, never by which answer arrived first: sources are taken breadth-first in the order given under [The walk](#the-walk), and every limit cuts in that order. A catalog build has no clock for the whole run. A build that cannot finish fails and writes nothing.

A source can answer two builders differently. `sources.json` records a digest of each source document as read, so two builds that differ can be compared source by source. A difference is information about that source, not evidence against either builder.

A reader who doubts one row can check it without rebuilding: fetch the place `sources.json` names, then the source it points to.

### Finding sources nobody linked

This is the hard part, and the review measured it. A walk cannot connect two authors who never met but arrived at the same definition, and `mad/HANDOFF.md` names discovery by an independent author first among its success criteria. Something has to notice a new source without being told.

A finder reads a public input that already exists and that the maintainer does not operate. Measured on 2026-11-09:

| Finder | What the operator emits | Public input | What the measurement showed |
|---|---|---|---|
| Robots line | The `Mad-Source:` line in a robots.txt they control | Common Crawl's robots.txt archive: 100,000 files and 0.15 TiB compressed per crawl, a crawl every four to five weeks, free over HTTPS with no account | It works end to end on a real analog: a 1% sample of the October 2026 crawl held 18 hosts carrying ARD's `Agentmap:` line, and 14 still served it. One scan reads every file, because no index holds robots.txt text: one to three hours on 16 connections, extrapolated from samples and not yet run in full. It reaches only hosts Common Crawl captures. None of 40 GitHub Pages sites created in March 2026 was in the crawl, and 18 of 60 small project sites on their own domain had a readable robots.txt there. About 5% of hosts refuse Common Crawl and are unreadable. A line appears 3 days to 7 weeks after it is added. |
| Certificate label | A host name whose first label is `mad-source`, under a certificate that names it exactly | Certificate Transparency logs, through a search service that accepts a leading label | It could see a host nobody linked. There is no dependable free search: crt.sh's public database answered the query, but it had stopped updating 19 days earlier and its operator has announced a rebuild. Merklemap offers the search for 49 euros a month. A wildcard certificate hides the label: about half of 138 subdomain hosts sampled, and every `github.io` site. It costs the operator a domain and a host name. |
| GitHub search | The topic `mad-source` on a public repository whose homepage is the source address | GitHub repository search: no token, 10 requests a minute, 1,000 results a query | It listed a new repository within a minute, and it reaches the `github.io` sites no other finder reaches. It is one company's index with no snapshot, so it is not repeatable, and it covers only operators with a public repository there. |
| Existing registries | AI Catalog entries | Registries that crawl AI Catalog files | The survey found none that picks up an unlisted domain without a request. |

Considered and set aside: a DNS TXT record (the open measurement datasets cover a few zones and fixed names); probing a ranked list of domains (the build becomes a crawler, and a new source is not on the list); search-engine queries (the programmatic routes are closing); IndexNow (submissions are listed nowhere); AT Protocol's collection listing (needs an account there, and directory hosts disagreed on the count).

**Recommendation.** Build the robots finder first, and state its reach. Its input is a named snapshot that never changes, it needs no account, and its analog was found end to end. It reaches parties who control a robots.txt on a website Common Crawl already captures, which is narrower than "anyone". Because the line may name a source on another host, the source itself can live anywhere.

Not covered: a party whose only website is new and unlinked. They are found through introductions only. What, if anything, covers them is open question 1.

Until a finder is proven on real hosts, a catalog covers only what is reachable from the addresses named with `--from`. A catalog built from those alone is a seeded crawl: its list of sources is somebody's hand-kept list, which Ruling 3 does not count as meeting the objective, and its `catalog.json` says so in those words.

### What a finder returns

A finder is a module in this package; no outside code is loaded. It returns candidate source addresses, each with where it was seen. A candidate is an introduction by the place it was seen, fetched and checked like any other.

- A finder reads all of its input, or the build stops without writing a catalog. A missing or partly read input never produces a smaller catalog.
- Each place seen contributes one candidate: the first `Mad-Source` line in a robots.txt. An operator with several sources names one, and that source introduces the others.
- Candidates that are not source addresses are dropped. The rest are de-duplicated and visited in sorted order.
- If more remain than the limit on sources per run, the build stops and reports the count.
- A finder whose input has no snapshot name saves its answer in the output, so another party can compare.

The robots finder reads responses with status 200 only and, for each host, the newest capture in the three most recent crawls. Common Crawl samples hosts afresh each crawl: of 300 hosts with a readable robots.txt in October 2026, 44 had no capture in either of the two crawls before. A source found only through its robots line drops out when the newest capture no longer carries the line, or after three crawls with no capture. The candidate list for one crawl depends only on that crawl's name, so a build may reuse the list it saved for a crawl it already scanned. Nothing else is kept between builds. The scan retries no faster than once a second when Common Crawl answers 503, and stops the build if any file cannot be read.

### Who runs a catalog

Nothing here requires the maintainer to run one. The objective is met when anyone can run the command, and a catalog he hosts is one copy among any number. Whether he does is open question 2. Two facts bear on it. A build reads about 165 GB for each crawl it has not already scanned: three crawls the first time, one for each new crawl after that. Few second copies will exist at that price, and until a second party runs the build his copy is the only one. And "anyone can run the same command" is true only once the tool is public (open question 4).

If he does, it is a scheduled job with three stages that share nothing but files:

1. **Find.** Runs the finders. It reads only the named public inputs and writes a list of candidates. It fetches no address a stranger chose.
2. **Build.** Fetches and checks. It holds no secret and no cloud credential. It writes only inside `--out`. The job continues only if it exits zero.
3. **Deploy.** Holds a credential that can write only under the catalog's own folder on the host, so it cannot touch his source document, definitions or pages. It runs no code over fetched data; it copies files with the expected names and refuses anything else.

Dependencies are installed from a committed lockfile with install scripts disabled, and CI actions are pinned to commit hashes.

## Readable pages

For each definition a source serves, the build writes one page at `pages/<SAID>/index.html`. It shows:

- the names and descriptions from this source's publications of it;
- the SAID, and the command that checks it;
- the definition's content as a readable outline, with each SAID inside it linked to that definition's page when this source serves it;
- the definitions on this source that contain it, each with the place of the appearance;
- the sources this source introduces for this SAID, shown by address and labelled as introductions;
- the catalogs this source introduces, each linked to that catalog's page for this SAID, or to its row if catalogs carry no pages.

`pages/index.html` lists what the source serves, by the names its publications give. A definition with no publication is titled by its SAID. A catalog's pages show its rows the same way: an index, and a page per SAID where each source is linked to its own page for that SAID when its source document says it has pages. The pages carry no order but SAID order, no ranking and no form.

**Shown text.** Everything a page says about a definition comes from the definition's bytes or from a publication, through one fixed template. The template's own words are its labels and the check command, the same on every page. The build composes no sentence, which is MAD's rule for shown text. This cut renders any JSON document generically. A renderer that knows MAD's kinds belongs with MAD's shared library (bpm-vfn.3).

**Every string on a page is a stranger's.** A source can serve definitions other parties wrote, and a catalog shows publications from every source. So:

- The page writer has one way to emit text, and it escapes `& < > " '`. It has no way to emit raw markup.
- No string from a definition or a publication becomes an element name, an attribute name, an `id`, a `class`, a `style` or a link target. An address inside a definition is shown as text.
- The only links are to other pages by SAID, written relative to the page and naming `index.html`, and to source and catalog addresses that passed the address rule.
- Pages contain no script. Each carries a Content-Security-Policy in a `<meta>` element (`default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'`), so the policy holds on hosts that cannot set headers.
- A source's pages are not served from an origin that also serves an application holding keys or drafts. MAD keeps its stores in the browser's localStorage, which any script on the same origin can read.

A page is a rendering and is evidence of nothing. The check runs on the bytes at the definition's address.

**Being found by a search engine.** The build writes `sitemap.xml` listing every page, and the SAID is in each page's title and visible text, because a crawler indexes only pages it can reach. Whether a search engine then returns a page for a business term or for a SAID has not been measured.

## AI Catalog entries

When a source sits at the root of a host, the build also writes `/.well-known/ai-catalog.json` in the Linux Foundation AI Catalog format, with one entry per served definition: `identifier` (the SAID), `type` (`application/json`) and `url` (the definition's address). A display name or description, when present, comes only from this source's own publication of that definition. Nothing in the file is copied from a definition's content.

The format's optional `digest` member, a sha-256 of the served bytes, is left out. Nothing here reads it, no surveyed entry carried one, and the SAID is the only digest this project writes.

This is an advertisement, not a foundation. The survey found about 200 to 250 domains serving such files. MCP's Server Cards extension reads this file for entries of its own type; no client or registry is known to read entries of another type from a domain nobody submitted. The fields are written against a named commit of the specification, which had no tagged release when surveyed, and a test validates the output against it. ARD's file (`/.well-known/ard.json`) is not written: the two formats have diverged, and ARD needs an identifier and a display name a bare definition does not have. Whether these entries ship in this cut at all is open question 6.

## Fetching safely

The walk, `get` and the catalog build fetch addresses chosen by strangers. All use one fetch routine:

- **HTTPS only, port 443 only, DNS names only.** An address written as an IP literal is refused. Certificate validation is set on explicitly, so no environment variable turns it off.
- **Redirects are not followed.** A 3xx answer is the outcome `redirected`, reported with the address it named. Every address the tool fetches names a file, so no static host needs a redirect to serve one.
- **The address check is made on the connection, not before it.** The routine resolves the name once, refuses unless every address returned is public, and connects only to an address it checked. Checking first and fetching second lets a hostile name answer differently the second time. In Node this means `node:https` with the routine's own lookup; the built-in `fetch` resolves again when it connects and cannot be told which address to use.
- **Refused addresses.** Loopback, private, link-local, carrier-grade NAT, unspecified, documentation, benchmarking and multicast ranges in IPv4; in IPv6 everything outside global unicast, plus the documentation, protocol-assignment and 6to4 ranges inside it. An IPv4 address carried inside an IPv4-mapped or NAT64 address is checked by the IPv4 list, so readers on IPv6-only networks still reach IPv4-only sources.
- **Name resolution is inside the time limit.** Names are resolved with a resolver whose queries can be timed out and abandoned. Node's `dns.lookup` cannot be cancelled and runs on four worker threads shared with file access, so four slow names would stall every other source.
- **Bytes on the wire are the bytes checked.** Requests ask for no content encoding, and an answer that carries one is refused. Size limits are enforced while reading, not from the stated length.
- **A JSON file must arrive as `application/json` or a type ending in `+json`.** Nothing fetched is executed.
- **The tool names itself**: `mad-discovery (+<address of this repository>)`. A catalog build obeys the robots.txt group for `mad-discovery`, or else the group for `*`, fetched once per host per build. A 4xx answer means no restrictions. A 5xx answer, no answer or a redirect means the host is skipped with the outcome `disallowed`. The walk is one person's own lookup and does not consult robots.txt.
- **Tests opt in to plain HTTP, other ports and loopback** through a parameter of the routine that only test code sets. No environment variable, configuration field or command-line flag does it.
- **Proxies.** A reader who can reach the web only through a proxy cannot run a walk in this cut, because the check above needs the connection.

Limits. The rows are what must exist; the numbers are proposals for the maintainer to change. They are constants in one module, and a catalog build writes the ones it ran with into `catalog.json`.

| Limit | Walk and `get` | Catalog build |
|---|---|---|
| One request, from before name resolution to the last byte | 10 s | 10 s |
| One fetched file: source document, definition, catalog file, robots.txt | 1 MB | 1 MB |
| JSON nesting depth of a source document or catalog file | 64 | 64 |
| Definitions fetched from one source, taken in SAID order | 50 | 2,000 |
| Introductions followed from one source | 10 | 10 |
| Depth of introductions from a starting source | 3 | 3 |
| Sources per run | 50 | 2,000 |
| Time for one source, all its requests | 60 s | 10 minutes |
| Bytes read from one source | 20 MB | 200 MB |
| Hosts in flight, one request at a time per host and per resolved address | 8 | 8 |
| The whole run | 120 s | no clock |

A count limit cuts in a fixed order, and the source is recorded as `truncated` with the limit that cut it. A source that uses up its time or its bytes is dropped whole. A walk that reaches a limit reports what it has and lists the rest as unresolved.

### Outcomes

Every address the walk or a build tries ends in exactly one outcome from a fixed list:

| Outcome | Meaning |
|---|---|
| `ok` | Read and used. |
| `truncated` | Read and used up to a count limit, which is named. |
| `not-found` | The host answered 404 or 410. |
| `unreachable` | No answer, a TLS failure or a 5xx. |
| `timed-out` | The request or the source used up its time. |
| `redirected` | A 3xx answer. The target is shown as text and not followed. |
| `refused-address` | The address rule or the connection check refused it. |
| `disallowed` | robots.txt forbids it (catalog build only). |
| `invalid` | Wrong content type, not JSON, too large, too deep, another 4xx, or a `source` that does not match. |
| `skipped` | Not tried, because a limit was reached first. |

Within a source, each definition it lists ends `verified`, `unreachable` or `failed-check`, and a `refers` entry that the scan does not find in verified bytes ends `not-contained`. Only verified definitions enter a row or an output folder; bytes that fail are discarded and counted. `failed-check` is the event a reader most needs to see: a source that lists a SAID and serves something else. Outcomes are names only. No error text and no timings enter a catalog's files.

## Trust: what is verified, claimed and unresolved

| State | What it covers |
|---|---|
| Verified | These bytes have this SAID. This definition's bytes contain that SAID. |
| Claimed | Everything a publication says; a publication names no endorser. What a source document says it serves or contains, until the reader has checked it. |
| Unresolved | A source that could not be read. Bytes that failed the check. A SAID a source says a definition contains that is not in the bytes. An introduction that was not followed because a limit was reached. |

These are MAD's three provenance states. Where and when each record was fetched is a retrieval observation kept beside every entry; it is not a fourth state. The states are the walk's labels for what it checked on this run. What MAD's provenance panel shows is decided there (bpm-upm.21).

Nothing else is known in this cut. In particular a source can serve, or carry a publication of, any SAID at no cost, so the number of sources doing either is not a vote.

**An address can change hands.** A domain lapses, a host account is released, a DNS record outlives the bucket it pointed to. Whoever holds the address then inherits every introduction that names it. A statement attributed to an address says who controlled that address when it was fetched and nothing about who controlled it before.

**What signatures will and will not change.** A signed publication names its endorsing principal and carries a signature by that principal's self-held key. A reader who can check it can confirm which principal made the statement, whatever address served it, and that survives a change of address. It does not make a count meaningful: a self-held key costs nothing to create, so a reader can count only the principals they already have a reason to believe. Third parties can then publish signed statements about a definition they did not write, which is how an assessment travels with a definition instead of living on a reference site. On KERI such a statement would be an untargeted ACDC (a signed credential addressed to no particular holder); the mapping is bpm-upm.26's to specify. That work waits on durable keys (bpm-upm.25) and MAD's signed publication (bpm-nq3.5). Serving, the walk and the catalog stay as they are; the publication record is replaced.

## The tool

One command, `mad-discovery`:

| Command | What it does |
|---|---|
| `build <folder> --config <file> --out <folder>` | Makes a source. |
| `verify <file or address> <SAID>` | Runs the byte check. The SAID is required: the tool does not look for one inside a document, which would need the name of the SAID field. |
| `who <SAID> --from <address> [--catalog <address>]` | The walk. |
| `get <SAID> --from <address> --out <folder>` | Fetches a definition and everything that appears in it. |
| `catalog build --out <folder> [--finder <name>]... [--from <address>]...` | The catalog build. With no finder it is a seeded crawl and says so. |

Every command prints JSON on standard output and exits 0 on success, 1 on failure and 2 on a usage error.

| Command | Fails when | What it does then |
|---|---|---|
| `build` | The configuration is unreadable or has an unknown member; an input is misnamed or does not verify; an output would exceed a size limit; `--out` is not empty | Names every failing file, writes nothing, exits 1 |
| `verify` | The bytes fail the check, or the fetch is refused | Prints the expected SAID, the computed one and the reason, exits 1 |
| `who`, `get` | The starting source cannot be read | Exits 1. Any later failure is an unresolved entry, and the command exits 0 |
| `catalog build` | A finder's input cannot be read in full; no source ended `ok`; more candidates than the limit | Writes nothing, exits 1. A single source that cannot be read is listed with its outcome and the build goes on |

`--out` must be absent or empty. `build` and `catalog build` check everything in memory first and write nothing unless every check passes.

**Inputs to `build`.** The input folder holds one file per definition, named `<SAID>.json`, which is the shape of a bpm-core store. The file name is the expected SAID; the build never reads a SAID out of a document, and a file with any other name is refused.

**The configuration file** is the operator's one authored input:

```json
{
  "source": "https://gym.example/.well-known/mad/source.json",
  "serve": ["<SAID>"],
  "publications": [ { "target": "<SAID>", "name": "...", "description": "...", "tags": ["..."], "collection": "..." } ],
  "introductions": [ { "source": "<source address>", "for": ["<SAID>"] } ],
  "catalogs": ["<catalog address>"]
}
```

`source` is required: it is the address the folder will be served at, and a folder is built for one address. The rest default to empty. The build computes what can be computed (`refers`, the pages) and the operator writes the rest by hand: one publication for each definition they want found by name, and one introduction for each source they know. That file is the whole cost to an operator.

**What a source serves.** The configuration names the SAIDs to serve; when it names none, every publication's target. `build` serves those and every definition that appears in them, transitively, that the input folder holds, and nothing else from the folder. A bpm-core store keeps superseded freezes beside current ones, so serving a whole folder would serve the leftovers. The build reports each SAID that appears in what it serves, that it does not serve, and that no introduction names in `for`. A publication may target a definition the source does not serve.

**Toolchain.** One TypeScript package, run from a checkout. Node 24, stated in `engines`. Source files are `.ts`, and Node runs them directly by stripping types, so there is no bundler and no build step. That limits the code to syntax that can be erased (`erasableSyntaxOnly`) and to relative imports that name the `.ts` extension, and it holds only while the tool runs from a checkout; an installable package would need a build step. TypeScript is a type check only (`tsc --noEmit`) and tests run with `node --test`, both as in `mad/`. Two dependencies, pinned exactly: `@types/node`, and a Blake3 implementation in plain JavaScript (`@noble/hashes` is the candidate), because Node's `crypto` has none. It must be plain JavaScript because the same check will move into MAD's shared library, and MAD ships as one bundled file for the browser.

**One implementation of the check.** The SAID check also belongs in MAD's shared library (bpm-vfn.3; its SAID code arrives with bpm-nq3.3). It lives here until that library has it; then this package imports it and deletes its own copy.

**Vocabulary.** The verb for making a source is `build`. "Publish" stays out of the command names while MAD's publish-versus-freeze ruling (bpm-nq3.2) is open, and the noun *publication* follows that ruling too.

## Tests

- **SAID check against outside vectors.** No expected value and no passing input is produced by the code under test.
  - Passing: gym-bp's 28 frozen documents, each as the store's pretty copy and as the compact bytes Python hashed, so the whitespace step has an outside expected output; GLEIF's schema, as the vLEI repository's pretty copy and as served; one keripy-written document with non-ASCII text, because the others are all ASCII; one keripy-written inception event; and documents frozen by bpm-core that hold an integer-like key, `1.0`, `1e-05` and an integer above 2^53.
  - Failing: one byte changed, a wrong SAID, pretty-printed bytes, a trailing newline, a leading byte-order mark, an invalid UTF-8 byte, the 44 `#` in place of the SAID, a document whose content holds 44 `#`, and two strings that do not match the pattern (one with `/`, one with another digest code).
- **Fixture handling.** Fixtures are made once: run `gym-bp/rebuild.sh`, write each store file compactly with bpm-core's own serializer, and commit both forms. They are committed as binary (`-text` in `.gitattributes`) and kept out of any formatter; a compact fixture has no final newline. gym-bp's store is gitignored, so these copies are the only committed ones. The KERI schema is taken from `WebOfTrust/vLEI` (Apache-2.0), whose bytes with whitespace removed equal what GLEIF serves; the fixture folder carries that attribution. The fixtures include a hand-written configuration with publications for gym-bp's three selections, because gym-bp's documents carry no description.
- **Build.** The output of a build verifies. A pretty-printed input comes out compact. Each `refers` equals the scan of the bytes. A misnamed file, an input that does not verify and a source document over the size limit are each refused by name. Two builds of the same input are byte-identical. Only the named SAIDs and what appears in them are served.
- **Walk.** Three local static servers stand for three origins. The first introduces the second, the second the third; a lookup from the first finds all three. Each of these ends in a named outcome and appears in `unresolved`, never as a crash or a hang: a cycle; a dead source; a 404; an oversized file; a redirect; a wrong content type; a source that lists a SAID and serves other bytes; a `refers` that names a SAID not in the bytes; a source document whose `source` is not its address; a byte-for-byte copy of one source served from a second origin; a depth limit and a source limit reached.
- **Hostile sources.** A name that answers public on the first lookup and loopback on the second; a name whose resolution never answers; a host written as an IP literal; a public IPv4 address returned in NAT64 form (accepted); a gzip-encoded answer; a body that arrives one byte per second; a `said` of `../../x`; a source document nested 100,000 deep; keys named `__proto__` and `constructor`; ten introductions from one source whose addresses sort ahead of the honest ones (the honest ones are still visited); a publication with a 1 MB description and with terminal escape sequences in its name.
- **Catalog.** Two builds over the same fixtures produce identical files. A source cannot create a row attributed to another source. A SAID that is only contained in other definitions gets no file. A definition that contains a letter-case variant of another SAID leaves that SAID's file unchanged. A source over the definitions limit is cut at the limit and reported. A build in which every source fails writes nothing. A robots rule that disallows the tool is obeyed.
- **The stranger case, by fixture.** Two sources that never link to each other, plus a fixture in the real shape of the finder's input: a small WARC file laid out like Common Crawl's robots.txt archive, holding 200 and non-200 responses and two captures of one host. The catalog lists both sources for the same SAID. This tests the join, not the finder's reach.
- **Pages.** Every SAID in `serves` has a page. A fixture whose strings are `</script><script>`, `"><img src=x onerror=...>`, `javascript:alert(1)` and bidirectional control characters renders as text: the test parses the page and finds no element, attribute or link other than the ones the writer emits. Every link resolves inside the output folder or is an address from the configuration.
- **AI Catalog.** The file validates against the specification at the named commit.

## Acceptance

This is the proposed `done_when` for the epic bpm-5g1. It replaces the one written before the design.

1. **Walk.** Three sources on three origins; the first introduces the second and the second the third. `who <SAID> --from <first>` lists all three as serving it, each verified by the byte check and shown with its chain, and lists what it could not resolve.
2. **Stranger, by fixture.** The test above passes.
3. **Stranger, live.** Two real sources that never link to each other and are named on no command line. Each has its `Mad-Source` line in a robots.txt that Common Crawl already captures. A catalog built by the documented command from named crawls lists both for the same SAID. Until this passes the finder is not proven, and the objective is not shown to be met for strangers. This clause waits on a third party's schedule, one or two crawls of 3 days to 7 weeks each, and can hold the epic open.
4. **Pages.** Every definition a source serves has a page. If catalogs carry pages, a person reaches each source's page for a SAID from a catalog's index page by links alone.
5. The maintainer has approved this design.

## Build order

0. Once open questions 3 and 4 are ruled: write two one-definition sources by hand, put a `Mad-Source` line naming each in a robots.txt that Common Crawl already captures, on two hosts that do not link to each other, and record the date. This needs no code, and it starts the clock on a public input that arrives every four to five weeks.
1. The SAID check, `build`, the readable pages and the source's index page, over gym-bp's frozen documents. No network.
2. Introductions, the walk and `get`, tested across local origins.
3. The catalog build from named sources, and its pages.
4. The robots finder against the fixture, then one full scan of a real crawl, which shows whether it fits the job it will run in.
5. The live check: the maintainer's own source deployed, and a catalog built with no source address on the command line.
6. AI Catalog entries, if open question 6 keeps them.

Steps 1 to 3 need no hosting, no domain and no cloud account. Step 4 downloads about 165 GB once. Each step is planned and reviewed before it starts, and nothing is deployed without the maintainer's say.

## What waits on other work

| Waiting | On |
|---|---|
| MAD's own definitions as content | SAIDs for MAD definitions (bpm-nq3.1, then bpm-nq3.3) and a way to write out, for each, exactly the bytes its SAID was computed over (bpm-nq3.5, or the shared store bpm-vfn.1). Display names and other annotations MAD keeps outside the committed definition travel in publications. |
| A renderer that knows MAD's kinds | MAD's shared library (bpm-vfn.3, after the format ruling bpm-vfn.1) |
| Signed publications and third-party assessments | A durable key bound to a principal (bpm-upm.25) and MAD's signed publication (bpm-nq3.5, after bpm-nq3.2). Their KERI form waits on bpm-upm.26. |
| Publications of assemblies, and a page for a MAD protocol as a set | Whether assemblies or selections get SAIDs (bpm-nq3.6) |
| Using and retaining what is found inside MAD | The provenance panel and Explore (bpm-upm.21, bpm-upm.22). How a report reaches MAD follows the store ruling (bpm-vfn.1). |
| Searching by business term or tag across sources | Tag search (bpm-nq3.7) and Explore (bpm-upm.22). Until then a catalog's index is the only cross-source list. |
| Finding similar, not identical, definitions | Structural category (bpm-nq3.7, bpm-upm.23) |
| Landing fetched definitions in an authoring store | bpm-core's pull (bpm-n13.3) or MAD's import (bpm-upm.21). bpm-core's open epic bpm-n13 designs the same serve-and-fetch layer for its own CLI, and a source is the HTTP provider it deferred (bpm-n13.4). Whether bpm-core keeps those commands is for its evaluation (mad/HANDOFF.md Ruling 5). |

## Open questions for the maintainer

Each leads with the decision and a recommendation. Approving the design accepts the recommendations unless he says otherwise.

1. **Is the robots line's reach enough for a first cut, and what covers a new website nobody linked?**
   Recommended: build the robots finder, state its reach, and add nothing for new unlinked hosts yet. They are found through introductions until there are real sources to justify more.
   Alternatives for new hosts: (a) the certificate label, which costs each operator a `mad-source.` host name and the builder a paid search at 49 euros a month; (b) GitHub repository search, free and current within a minute, but one company's index and not repeatable.

2. **Does the maintainer host a catalog of his own, and does a catalog carry pages a person can browse?**
   Recommended: yes to both, starting once the finder is proven on real hosts and the tool is public; one scheduled build per new crawl. Pages because otherwise nothing a person can open spans two sources until MAD's Explore exists (bpm-upm.22), and somebody would make a site over the JSON.
   The costs: about 165 GB read for each new crawl, and three times that for the first build; while it is the only catalog it is the index in practice; and his address shows strangers' claimed text, unattended, with no way in this cut to leave a source out.
   Alternatives: JSON only; or host none and leave every reader to build their own.

3. **Are these the names, paths and rules a source must follow?**
   Recommended as written: the source document at `/.well-known/mad/source.json`; definitions at `/.well-known/oobi/<SAID>/index.json`, derived and never declared; pages under `pages/`; a catalog's four file names; the robots line `Mad-Source:`; no cross-origin header required, because the walk runs in Node. The definition path reuses KERI's and GLEIF's convention; the rest are new. One cost: an operator whose files already sit at another path must copy them. All of it is cheap to change before anyone else runs a source and costly after.

4. **Going public: where does his source live, what does it serve first, and when is the repository public?**
   - *Where.* Recommended: at the root of a domain he controls, because the address goes into other parties' introductions. For acceptance clause 3 he needs two robots.txt files on websites Common Crawl already captures, on two hosts that do not link to each other; one request to the crawl's index says whether a host qualifies. The sources themselves can be anywhere. S3 behind CloudFront on its flat-rate free plan in the `personal` account has no overage charges, so a flood of requests cannot become a bill; what the plan does once its allowance is used up is to be confirmed before deploying. GitHub Pages is the cheaper second origin. Both need a setting to serve this layout: GitHub Pages skips dot-folders (a branch deploy needs an empty `.nojekyll`, an Actions deploy needs `include-hidden-files: true`), and CloudFront over a private bucket does not map a folder address to `index.html` below the root.
   - *What it serves.* Until MAD definitions have SAIDs (bpm-nq3.3) the only content is gym-bp's frozen documents: test data under Ruling 2, bpm-core documents and not MAD definitions, from a private repository. Recommended: a small set he picks, with publications whose descriptions say they are test data, because the finder can only be proven on a live source. The alternative is to hold the live check until bpm-nq3.3.
   - *When the tool is public.* Ruling 1 created the repository private. Until it is public nobody else can rebuild a catalog or run `verify`, so "anyone can rebuild" is true of the file formats and not of the tool. Recommended: make it public before step 5, and host no catalog before then. Others run it from a clone with Node 24.

5. **Is the first-cut publication record right?**
   Recommended: the four description fields and the target's SAID, with no endorser, no identifier of its own and no lineage claim. This does not decide MAD's signed publication (bpm-nq3.5).
   Alternatives: give it a SAID now, which fixes a field order here before bpm-nq3.1 is ruled; add an optional `supersedes` SAID, claimed like the rest, so a source can say what a definition replaced. The second answers "what replaced what" sooner, but supersession is the claim that most needs a known signer, and it adds a field MAD's Publish form does not collect.

6. **Do AI Catalog entries ship in this cut, and is ARD's file dropped?**
   Recommended: keep the AI Catalog entries as the last step and outside acceptance, without the digest; drop ARD's file. It is one small generated file and the only thing here that existing agent tooling could read. The case against: no known reader for entries of this type, and a specification with no tagged release.

## Defaults chosen here

Smaller choices this draft made. Each is cheap to change now; say so if one is wrong.

- The byte check refuses a document whose own content holds 44 consecutive `#`.
- `refers` is a scan of bytes for anything shaped like a SAID. It records appearances, not references.
- `verify` requires the SAID.
- `get` is in this cut. It is the network half of reuse, and bpm-core's pull is parked under mad/HANDOFF.md Ruling 5.
- The walk keeps nothing between runs. The first draft's local folder duplicated the retention the README assigns to `mad`.
- A robots line may name a source on another host, and a finder reads one line per robots.txt. Allowing another host widens the finder's reach to anyone who controls a robots.txt somewhere; the cost is that a robots.txt can send every builder one small request to an address of its choosing.
- The robots finder reads the three most recent crawls. Reading only the newest would drop and re-add about a fifth of sources from one build to the next.
- When a build has more candidates than its limit it stops and writes nothing, instead of writing a subset. Stopping lets someone with many captured hosts halt a build; a subset lets them crowd honest sources out. Neither is solved before signatures.
- Every limit in the table, and the field limits on a publication.
- A reader who can reach the web only through a proxy cannot run a walk.
- Pages carry no JSON-LD block. Nothing here reads one, and it would be the first public RDF terms for a definition, which MAD's own projection has not chosen.
- A SAID that no source serves gets no catalog row, even when definitions contain it.

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
