# Changelog

All notable changes to Motion are recorded here. Dates are UTC.

## Unreleased

Native Mac app behaviour on top of the already-shipping tree sidebar, content
search, and real browser filesystem. The 0.1.0 "Known issues" below are
historical: fake `WebStorage`, the missing production `index.html`, block
round-trip, and the demo Query join were fixed on `main` before this work.

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
