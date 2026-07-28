
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
| `bunx playwright test` | E2E against the real dev server |
| `cd src-tauri && cargo test --lib` | the workspace jail |

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
- Storage is swapped at module load by `isTauri()`: `TauriStorage` (real
  filesystem, jailed to the opened workspace) vs `WebStorage` in a browser.

### `Bun` is not available in the browser or the webview

`Bun.spawn` / `Bun.file` only work in a real Bun process — never in
browser-executed React code, and never in the packaged Tauri app (its UI is a
webview too). This single mistake has been made and re-fixed four times in this
repo. Route UI-initiated CLI work through `src/lib/llmClient.ts` or
`src/lib/imageClient.ts`, which pick `invoke()` or `fetch("/api/...")` for you.

`bun run guard:client` enforces this statically over the import graph from
`src/main.tsx`. It is not optional and it runs in CI.

## Definition of Done

A change is done only when **all** of these hold:

1. `bun run verify` passes (typecheck + client-bundle guard + unit + E2E).
2. An E2E spec in `e2e/` covers the new or fixed behaviour.
3. Zero console errors, zero uncaught exceptions, zero failed requests and zero
   responses >= 400 during E2E — enforced automatically by `e2e/fixtures.ts`.
4. Rust or storage changes additionally pass `cargo test --lib` and
   `cargo clippy --all-targets -- -D warnings` in `src-tauri/`.
5. Anything discovered along the way is filed via `worklog add --unplanned`.

**"I looked at it in the browser" is not done.** Not done means not handed over:
the human reviews design, not defects. If you cannot demonstrate it green, say
so plainly rather than reporting success.

Write specs against roles and accessible names (`getByRole`, `getByLabel`), not
screenshots — screenshots are captured as artifacts for human review, never as
pass/fail assertions.

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
