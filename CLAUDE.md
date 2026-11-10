# mad-discovery

Read the workspace instructions in `../CLAUDE.md` first. Design authority is `docs/design.md` (approved 2026-11-09) and the rulings in `README.md`. The current plan is `docs/plans/source-build.md`.

Two rules an agent must not break here:

- Never parse a definition and write it out again. The build serves bytes as given, or with whitespace between JSON tokens removed (`src/compact.ts`), and checks every output against its SAID (`src/said.ts`).
- Never put a string on a page except through `escapeHtml` in `src/pages.ts`, and never make a string from a definition or a publication a link target.

Node 24 runs the `.ts` files directly; there is no build step. `npm run check` is the type check, `npm test` the tests. Dependencies are pinned exactly and there are three.
