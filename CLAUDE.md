# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` is a symlink to this file. Edit this one.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

`bun run verify` is the one command that answers "is the app OK?" — typecheck,
client-bundle guard, unit tests, then E2E.

| Command | What it covers |
|---|---|
| `bun run verify` | everything below, in order — use this before handing over |
| `bun run typecheck` | `tsc --noEmit`, strict |
| `bun run guard:client` | no `Bun.` reachable from `src/main.tsx` |
| `bun test src` | unit tests (scoped to `src` — unscoped, Bun would try to run the Playwright specs and fail) |
| `bunx playwright test` | **end-to-end** against the real dev server (Playwright *is* the E2E harness) |
| `cd src-tauri && cargo test --lib` | the workspace jail |
| `bun run ui:render` / `ui:check` | PlantUML Salt wireframes → `docs/ui/wireframes/png/`; **`ui:check` runs in CI** (syntax only) |
| `bun run ui:capture` | `CAPTURE=1` screenshot every `docs/ui` state → `.artifacts/screenshots/ui/` |
| `bun run ui:audit` | deterministic DOM/CSS audit (needs `bun run dev`) |

### Run one test

| Goal | Command |
|---|---|
| one unit file | `bun test src/lib/zoom.test.ts` |
| one unit test by name | `bun test src -t "clamps at both ends"` |
| one E2E spec | `bunx playwright test e2e/zoom.spec.ts` |
| one E2E test by title | `bunx playwright test -g "survives a reload"` |
| one E2E spec, visible browser | `bunx playwright test e2e/zoom.spec.ts --headed` |

Playwright boots its own dev servers (`reuseExistingServer: false`), so stop
`bun run dev` first or the port fight looks like a test failure.

### Every feature ships with tests — no exceptions

When you add or change a **user-visible feature** (UI control, workflow, block
type, storage behaviour, synthesis, etc.), the PR must include **both**:

1. **Unit / focused tests** under `src/**` via `bun test src` — pure logic,
   serialization, path resolution, duckdb helpers, synthesis orchestration,
   etc. If the change is UI-only wiring with no extractable logic, still prefer
   a small unit test for any new pure helper you introduce.
2. **Playwright end-to-end** under `e2e/` — a real browser journey against the
   real dev server that exercises the feature the way a user would (roles and
   accessible names, not CSS trivia). Extend an existing spec file when the
   journey fits; add a new `e2e/<area>.spec.ts` when it does not.

A feature without both is **not done**, even if `verify` is green for unrelated
reasons. "Covered by an old smoke that only mounts the shell" does not count —
the new behaviour itself must be asserted (success path and the failure path
when the feature can fail observably).

Optional dogfood (not a CI gate): a final `agent-browser` pass against
localhost before human handoff for milestone work — see the open work item on
agent-browser in the Definition of Done.

Two probes are excluded from the suite and run by hand with `BASELINE=1`:
`e2e/baseline.capture.spec.ts` re-measures the console/network baseline, and
`e2e/guard.proof.capture.spec.ts` proves the gate still bites — **3 failed / 1
passed is its correct result.** If all four pass, the gate is broken.

## Frontend — how this app ACTUALLY runs

Ignore the generic Bun "HTML imports with Bun.serve()" advice for this repo; it
is not what Motion does, and following it will send you down a dead end.

- `bun run dev` runs `src/server.ts`, a hand-written Bun.serve on **port 3000**.
  It generates its HTML in memory (`generateHTML()`), inlines `src/index.css`,
  and serves the bundle at `/bundle.js`.
- The root `index.html` is **stale and unused** — it points at `/src/main.tsx`,
  a path the server does not serve. Do not "fix" a bug by editing it.
- **There is no HMR.** A file watcher rebuilds the bundle on change, but the
  browser is never notified. Reload the page manually.
- `bun tauri dev` runs the same server inside the Tauri webview via `devUrl`.
- Storage is swapped at module load by `isTauri()`: `TauriStorage` (Tauri
  commands) vs `HttpStorage` (the dev server's `/api/fs/*`). Both are real
  filesystems now, jailed to the workspace, and both delegate to a shared core
  (`src/lib/fsCore.ts` / `src-tauri/src/fs_core.rs`) held together by
  `tests/contract/storage-cases.json`, which both test suites run.

### `Bun` is not available in the browser or the webview

`Bun.spawn` / `Bun.file` only work in a real Bun process — never in
browser-executed React code, and never in the packaged Tauri app (its UI is a
webview too). This single mistake has been made and re-fixed four times in this
repo. Route UI-initiated CLI work through `src/lib/llmClient.ts` or
`src/lib/imageClient.ts`, which pick `invoke()` or `fetch("/api/...")` for you.

`bun run guard:client` enforces this statically over the import graph from
`src/main.tsx`. It is not optional and it runs in CI.

## Architecture

One React app (`src/main.tsx` → `src/App.tsx`) runs in two hosts: a browser
against the Bun dev server, and a Tauri webview. Everything host-specific hides
behind three modules, and nothing else in `src/` may branch on the host.

| Concern | Browser path | Tauri path | The seam |
|---|---|---|---|
| files, workspace, bootstrap | `fetch("/api/fs/*")` | `invoke()` commands | `src/lib/storage/index.ts` |
| LLM calls | `POST /api/llm` | `run_llm_cli` | `src/lib/llmClient.ts` |
| image generation | `POST /api/image` | `run_image_cli` | `src/lib/imageClient.ts` |
| settings | `GET/POST /api/settings` | `get_settings` / `set_settings` | `src/lib/settingsClient.ts` |

`storage` picks its implementation once at module load from `isTauri()`. Both
implementations enforce the same workspace jail through a duplicated core:
`src/lib/fsCore.ts` for the server and `src-tauri/src/fs_core.rs` for the
desktop app. `tests/contract/storage-cases.json` is the shared truth. Add a case
there when you change path resolution, and both suites pick it up.

`src/App.tsx` owns all cross-cutting state: workspace root, file list, current
file, dirty flag, pending file switch, view mode, and synthesis output. The
editor components take props. Do not add a store.

`src/shell.ts` is the single HTML template. The dev server inlines the CSS, the
production build links it. The root `index.html` is dead. Never edit it.

Editor blocks (Mermaid, Dataset, Query, Image gen, Diagram gen) are TipTap node
extensions under `src/components/Editor/extensions/`. They persist as fenced
code bodies through one shared serializer, `blockAttrs.ts`. Never hand-roll a
second parser. Multi-line values need its block-scalar form.

Query blocks run DuckDB-WASM in the browser (`src/lib/data/duckdb.ts`).
`src/lib/data/sqlSafety.ts` restricts SQL to `SELECT` and `WITH`, validates
identifiers, and clamps the row limit.

### Environment variables

| Variable | Effect |
|---|---|
| `MOTION_WORKSPACE` | the jailed root the dev server serves (default `public/demo/`) |
| `MOTION_AUTO_OPEN` | open that workspace without a click |
| `MOTION_OPEN_FILE` | also open this note on boot (`motion <file.md>`) |
| `MOTION_SETTINGS_FILE` | redirect `~/.config/motion/settings.json`; tests must set it |
| `PORT`, `MOTION_HOST` | dev server bind (default 3000, localhost) |

`bin/motion` is a bash launcher. It sets those variables, then runs `bun run
dev` or `bun tauri dev` per the saved launch mode.

## UI verification loop (wireframes + agent judge)

Any change under `src/components/**`, `src/App.tsx`, or `src/index.css` that
affects a user-visible surface follows this loop. Index: **`docs/ui/README.md`**.

1. **Read** `docs/ui/<screen>.md` — spec, addressability, capture recipe, rubric.
   No doc for the surface? Copy `docs/ui/TEMPLATE.md` and write one first.
2. **Implement.** The element inventory / addressability table is a contract:
   adding or removing a control means updating the doc (and wireframe) in the
   same change.
3. **Wireframe.** Edit the matching `.puml` under `docs/ui/wireframes/`, then
   `bun run ui:render`. Salt is authoritative for inventory, containment order,
   and ordinal sequence — **never** for pixels or colour.
4. **Capture.** `bun run ui:capture` (or follow the recipe with Playwright /
   agent-browser). Seed `localStorage.motion-ui-freeze=1` before load. Output
   lands in `.artifacts/screenshots/ui/` (gitignored).
5. **Judge** rows marked `agent` against the screenshot + an a11y snapshot;
   console errors fail. **Never pixel-diff** the Salt PNG. Write a short report
   under `.artifacts/ui-review/` on UI PRs when practical.
6. **Verify.** `bun run verify` — every rubric row marked `check:…` must pass
   (see `e2e/layout.spec.ts`). Those are the merge gate; `agent` rows are PR
   commentary only.
7. **Iterate** from 2.

`docs/ui/**` is outside the worklog IA (no frontmatter). Do not put screen specs
under `docs/designs/` — that namespace is for dated design docs / walkthroughs.

Addressability rules for new code: every icon-only button gets `aria-label`;
prefer roles and names over testids; prefer one structural `data-*` variant over
N enumerated ids.

## Definition of Done

A change is done only when **all** of these hold:

1. `bun run verify` passes (typecheck + client-bundle guard + unit + E2E).
2. **Feature work includes both layers of tests** (see Testing above):
   - unit coverage under `src/` for new or changed logic, and
   - a Playwright E2E in `e2e/` that drives the new or fixed user journey.
3. Zero console errors, zero uncaught exceptions, zero failed requests and zero
   responses >= 400 during E2E — enforced automatically by `e2e/fixtures.ts`.
4. Rust or storage changes additionally pass `cargo test --lib` and
   `cargo clippy --all-targets -- -D warnings` in `src-tauri/`.
5. **Docs stay truthful for features that change product surface:**
   - update `docs/designs/current_design_doc.md` (and/or the code walkthrough)
     when architecture, contracts, or major flows change;
   - update `docs/user_guide/user-guide.md` when a user-visible behaviour is
     added, fixed, or removed;
   - update the **feature list** in `README.md` (and known limitations there)
     so it matches what actually ships;
   - register/publish to the GitHub wiki (`worklog wiki-add` / the wiki publish
     flow under `.work/wiki-checkout`) so the wiki is not stale relative to
     `docs/`.
6. **User-visible UI work also completes the UI verification loop** (above):
   matching `docs/ui/<screen>.md` + wireframe, capture recipe still works,
   `check:` rows green, agent rows judged or explicitly N/A.
7. Anything discovered along the way is filed via `worklog add --unplanned`.

**"I looked at it in the browser" is not done.** Not done means not handed over:
the human reviews design, not defects. If you cannot demonstrate it green, say
so plainly rather than reporting success.

Write behavioral specs against roles and accessible names (`getByRole`,
`getByLabel`), not screenshots. Screenshots are artefacts for human **or agent**
rubric review — never pixel-diff pass/fail assertions in CI.

<!-- worklog:policy:start -->
## Work tracking policy

- Every plan MUST end by running `worklog plan-capture` — it writes
  `docs/plans/<date>-<slug>.md` and appends the plan's steps as work items.
- Work discovered mid-flight that wasn't in the plan: run
  `worklog add --unplanned --discovered-during <item>` BEFORE doing the work.
- Never hand-edit `.work/*.jsonl` (use `worklog`) or `docs/roadmap.md`
  (it is generated; change the work items instead).
- After changing work items, run `worklog roadmap-render` and commit the log
  and roadmap together.
<!-- worklog:policy:end -->

<!-- worklog:taxonomy:start -->
## Work taxonomy

Every work item sits on four independent axes:

| Axis | Field | Values | Answers |
|---|---|---|---|
| Level | `level` | epic / story / task / subtask | size & place in the parent tree |
| Kind | `kind` | feature / bug / ops / triage | nature of the work |
| Milestone | `milestone` | free string (e.g. v0.6.0) or null | what ships together |
| Planned | `unplanned` + `discovered_during` | bool + ULID | deliberate vs discovered |

Rules (the validator enforces these; apply them when proposing items):
1. Kind is free at story/task/subtask.
2. Epics are `feature` or `ops` only — a bug is never epic-sized.
3. `kind` defaults to `triage` when omitted — never silently default to feature.
4. `bug.parent` is optional; bugs may float free of any epic.
5. `milestone` lives on leaves (story and below); an epic's milestone derives from its children.
6. `triage` and `ops` both trend down: triage shrinks by classifying, ops by automating.

When trackable work surfaces in conversation, propose an item inline as part of
the normal response — "want me to file this? `level:story kind:feature
parent:<ulid> milestone:v0.6.0`" — and create it only on assent, via the
work-track or plan-capture skill. When unsure of the kind, propose `kind:triage`
with the open question stated — triage is the honest default, never a confident
guess. This inline path is the default; the flag-gated classifier (`classifier:`
in `.work/config.yml`, off by default) is the escape hatch for teams where work
keeps escaping the log.
<!-- worklog:taxonomy:end -->
