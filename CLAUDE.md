# mad-discovery

Read the workspace instructions in `../CLAUDE.md` first. Design authority is `docs/design.md` (approved 2026-11-09) and the rulings in `README.md`. The plans are `docs/plans/source-build.md` (step 1), `docs/plans/walk-and-get.md` (step 2), `docs/plans/ai-catalog.md` (step 3) and `docs/plans/catalog-build.md` (step 5 of the second epic, current).

Three rules an agent must not break here:

- Never parse a definition and write it out again. The build serves bytes as given, or with whitespace between JSON tokens removed (`src/compact.ts`), and checks every output against its SAID (`src/said.ts`).
- Never put a string on a page except through `escapeHtml` in `src/pages.ts`, and never make a string from a definition or a publication a link target, except a SAID that this source serves, which `pageLink` alone turns into a link to its own page and which refuses anything that is not a SAID.
- Every byte from a stranger's address enters through `fetchJson` in `src/fetch.ts`, which resolves a name once, refuses any answer that is not public, connects only to the address it checked, follows no redirect and accepts no content encoding. Only one other module opens a socket (named at the end of this rule); the built-in `fetch` and the global agent are never used. The `test` option that admits plain HTTP, other ports and loopback is set by test code only, never by a flag, a configuration field or an environment variable. The finders (`src/finders/`) read their own public inputs, hosts fixed in code, through `src/finders/input.ts`, which keeps fetchJson's guarantees (a name resolved to public addresses only and the socket connected to the address checked, TLS verified, no redirect, no content encoding) and differs in having no overall size or time budget, an idle timeout instead, retries with backoff, and up to 16 kept-alive sockets to a host; it fetches no address a stranger chose.

Node 24 runs the `.ts` files directly; there is no build step. `npm run check` is the type check, `npm test` the tests. Dependencies are pinned exactly and there are three.
