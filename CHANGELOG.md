# Changelog

All notable changes to Motion are recorded here. Dates are UTC.

## Unreleased

### Fixed

- **Insert Table no longer nests a table inside a cell.** Table cells accept
  block content, so **Insert Table** and `/tab` with the caret already in a
  table produced a table-in-a-table — a shape GFM cannot serialize, so the note
  stopped round-tripping. Both entry points now append a sibling table after the
  enclosing one (the outermost, so an already-nested document escapes fully).
- **A batch of AI edits now resolves against the document the model saw.**
  `DocCommands` applied each command to the result of the previous one, so a
  turn that emitted two edits located in the original note could fail the second
  with "was not found" or "matches 2 places". Every locator is now resolved
  against one snapshot; commands touching the same table fold into a single
  rewrite (so "do this to every row" works), and genuinely overlapping edits are
  refused by naming the pair instead of silently dropping one.
- **Save no longer writes the same document twice.** The 1.5s autosave and an
  explicit Save/⌘S could both put a `POST /api/fs/write` on the wire for
  identical content; the redundant one showed up as an aborted request when the
  page moved on before it landed.

### Changed

- **Ask AI defaults to a current-generation model.** `claude-opus-5` at `low`
  effort, rather than pinning a previous generation. `MOTION_AI_MODEL` and
  `MOTION_AI_EFFORT` override per install.
- **Publish requests time out.** Gist and Notion calls from the desktop app had
  no timeout, so an unanswered request left Share on "Publishing…" forever.
  Thirty seconds now.

## 0.6.0 — 2026-08-30

Native Mac app behaviour, Ask AI, GFM tables, and DocCommands on top of the
already-shipping tree sidebar, content search, and real browser filesystem. The
0.1.0 "Known issues" below are historical: fake `WebStorage`, the missing
production `index.html`, block round-trip, and the demo Query join were fixed
on `main` before this work.

### Added

- **DocCommands.** Ask AI can propose targeted edits (`replace_range`,
  `insert_after_block`, `table_add_row`, `table_update_cell`) as a preview list.
  **Apply N edits** commits the batch as one undo step. Text-only rewrites still
  use Replace / Insert below. Anthropic tool-use when a key is set; CLI fallback
  is a `doccommands` JSON fence.
- **GFM tables.** Toolbar **Insert Table** (or `/tab`) drops a 3×3 with a header
  row. Cells are editable; while the caret is in a table the toolbar shows Add
  / Delete row and column, and Delete table. Pipe tables round-trip through
  save/reload as real `<table>`s, not paragraphs of pipes.
- **Ask AI.** Select text in WYSIWYG/Split for a floating Ask AI, type `/ai` at
  the start of a line, or use toolbar Refine for the whole document. One
  pipeline (`buildAiContext` + `/api/ai/stream`) previews the reply; tokens
  stream into the panel. Replace / Insert below / Try again / Discard commit as
  a single undo step. Failures stay in the panel. Anthropic SDK when
  `ANTHROPIC_API_KEY` is set (prompt cache on system + document context), else
  the `claude` CLI. Packaged Tauri still one-shots via `run_llm_cli` until the
  sidecar.
- **Finder Open With.** Markdown file associations (`.md`, `.markdown`,
  `.mdown`, `.mkd`, `.mdx`). Opening a file sets the workspace to its parent
  directory and selects the file. Cold start buffers the path until React
  mounts (`take_pending_open`). Browser stand-in: `/?open=welcome.md`.
- **Packaging polish.** Product name **Motion**, identifier
  `com.spillwave.motion`, 1200×760 default window (720×480 minimum), macOS
  category and copyright. Last desktop workspace (and last file) is restored
  on launch. Unsigned-build recipe: [docs/macos.md](docs/macos.md).
- **Native chrome.** Overlay title bar with traffic lights over the header
  (drag region, no-drag on controls). Native File menu (New Note, Open Folder,
  Save, Share, Settings) plus the system Edit menu. Light tokens behind
  `prefers-color-scheme: light`.
- **Share → Gist / Notion.** Header Share menu publishes the current buffer.
  Tokens stay in localStorage. Desktop uses Tauri HTTP commands; browser uses
  `POST /api/publish/*` which always returns HTTP 200 `{ ok, url, error }`.

### Changed

- Slash menu is labeled **Slash commands** and lists **Ask AI** first, then
  **Table**. `/tab` inserts a table; `/mer` still inserts Mermaid. Toolbar
  insert buttons stay insert-only.
- README and the user guide now describe the directory tree, content search,
  Finder Open With, last-workspace restore, Share, and Ask AI.

### Known issues

- **Mac dogfood** of an unsigned `.app`, Finder Open With a real file, and
  overlay traffic-light padding still needs a Mac. Linux CI compiles the crate;
  it cannot click a `.app`.
- **Packaged Ask AI** is a one-shot `run_llm_cli` until a Bun sidecar hosts the
  shared TS service (streaming + tools).
- **Dictation** is not in this release.
- **Welcome demo data** (`sample-data.csv`, `sample-events.jsonl`) only loads
  when those files exist in the open workspace.
- Insert Table while the caret is already in a table can nest a table. A
  DocCommands batch whose later `replace_range` depends on the original
  document (not the post-first-edit document) can fail the later command.

## 0.1.0 — 2026-07-28

First tagged release. The application itself has existed since January 2026;
this release is the point at which it became possible to *know* whether it
works.

### Added — the validation loop

- **`bun run verify`** — one command answers "is the app OK?": typecheck →
  client-bundle guard → unit tests → end-to-end tests.
- **End-to-end testing with Playwright** (`e2e/`), running against the real Bun
  dev server rather than a separate test build. Locally it drives installed
  Chrome so no browser download is needed; CI uses Playwright's pinned Chromium.
- **A console/network gate every spec inherits** (`e2e/fixtures.ts`). A test
  fails on console errors, uncaught exceptions, failed requests, **and**
  responses with status >= 400. The last is not redundant: Playwright's
  `requestfailed` event does not fire for 404 or 500, because those are
  successful requests carrying an error status — and a 404 is exactly the
  signature of the missing-file bug fixed below.
- **A static client-bundle guard** (`bun run guard:client`) that walks the real
  import graph from `src/main.tsx` and rejects any use of `Bun.`. One root cause
  — code assuming a Bun process while running in a browser or webview — had been
  fixed four separate times in this repo. A runtime gate cannot close it: the
  four enrichment modules are unreachable from the UI, so no test executes them
  and they would stay green until the day they were wired to a button.
- **Tests for the workspace jail** in `src-tauri` — nine, where there were none,
  covering parent traversal, symlink escape, the sibling-prefix escape
  (`/x/ws` must not admit `/x/ws-evil`), and writing a file that does not exist
  yet. This is the security boundary for every filesystem command.
- **Real CI** (`.github/workflows/ci.yml`). The only prior workflow validated
  work-log JSONL and never installed Bun or Rust, so a pull request deleting
  `src/App.tsx` passed green. Now: typecheck, guards, unit, E2E, production
  build, `cargo test`, and `cargo clippy -D warnings`.
- **A Definition of Done** in a now-tracked `CLAUDE.md`, whose first rule is that
  "I looked at it in the browser" is not done.

### Fixed

- **Mermaid threw on every page load.** The welcome document serializes an unset
  diagram as `content: null`, which reached `mermaid.render()` as the
  4-character string `"null"` — truthy, so the render guard let it through.
  Three block extensions each carried their own copy of the `key: value` parser,
  so the defect existed in triplicate; they now share one parser that treats a
  serialized null or undefined as unset.
- **The dev server answered every missing file with `200` and a page of HTML.**
  Because `WebStorage.readFile` checks `res.ok`, a missing note was read
  *successfully* as HTML rather than failing, and missing files were
  structurally invisible to any network gate. Unknown `/api/*` routes and
  missing paths with a file extension now return 404; only extensionless routes
  fall through to the single-page-app shell.

### Changed

- Dropped the Google Fonts CDN links. An external font request makes the network
  gate flaky and fails offline CI; the stylesheet already carried complete native
  fallback stacks. On macOS the interface now renders in the system font.
- The git pre-commit hook runs a fast subset (typecheck, client guard, unit
  tests) and skips entirely for docs-only commits. CI is the authoritative gate.

### Known issues

- Web mode still fakes the filesystem: `WebStorage.writeFile` does not persist
  and `openFolder` returns a placeholder path. Replacing it with a real backend
  is the next milestone, and is what makes browser testing transfer to the
  desktop app.
- `bun run build` does not emit `index.html`, so the packaged desktop build has
  no entry point. Only `bun tauri dev` works today.
- Four of the five block types do not survive a save/reload cycle.
- The demo Query block returns no rows: the demo data disagrees on case in the
  join condition.
