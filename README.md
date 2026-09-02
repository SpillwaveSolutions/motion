# Motion

> Manage your ocean of markdown.

Motion is a **local-first technical writing IDE**. It edits markdown on your own
filesystem, renders diagrams and queries inline, and can generate both from
natural-language prompts using CLI tools you already have installed.

## Features

### Editing

- **Three view modes** — WYSIWYG, syntax-highlighted Markdown, and Split, switchable at any time.
  Edits carry across modes without loss.
- **Workspace management** — open a folder and Motion lists every markdown file
  under it as a **collapsible directory tree**. **Search notes** filters by
  filename or file contents (⌘K / Ctrl+K). Nested folders keep their shape.
- **Finder Open With** (desktop) — right-click a `.md` in Finder → Open With
  Motion. The workspace is the file's parent directory; the note is selected.
  Last folder and last file are restored on the next desktop launch.
- **New Note** / **New Folder** — New Note writes `untitled-<timestamp>.md` in
  the parent of the selected file (or the workspace root). New Folder writes a
  `README.md` so the tree can show it.
- **Save** — labeled **Save** control in the toolbar, plus **⌘S** / **Ctrl+S**.
  Status shows Saving… / Saved / Save failed.
- **Share** — publish the current note to a **GitHub Gist** or a **Notion**
  page. Tokens stay on this machine (Settings in the Share menu).
- **Rich markdown** — headings, lists, blockquotes, code blocks with syntax
  highlighting, and **GFM tables**. Insert a 3×3 from the toolbar or `/tab`;
  edit cells; add/delete rows and columns while the caret is in the table.
  Pipe tables round-trip through save/reload.
- **Ask AI** — select text for a floating **Ask AI**, type `/ai` at the start of
  a line, or use toolbar **Refine** for the whole document. Replies stream into
  a preview (Replace / Insert below / Try again / Discard) before anything is
  committed. Targeted edits (`replace_range`, insert after a block, table row /
  cell) preview as a list; **Apply N edits** commits the batch. Uses the
  Anthropic API when `ANTHROPIC_API_KEY` is set, otherwise `claude` on `PATH`.

### Content blocks

Five block types, insertable from the toolbar or by typing `/` at the start of a
line (the slash menu also lists **Ask AI** first, then **Table**). Blocks survive save/reload as
real blocks (not plain code).

| Block | What it does |
|---|---|
| **Mermaid** | Renders a diagram from Mermaid source, editable in place |
| **Dataset** | Registers a local CSV/JSON/JSONL file as a queryable table |
| **Query** | Runs SQL against registered datasets via DuckDB-WASM, in-browser |
| **Image gen** | Generates an image from a prompt via the `imagen` CLI |
| **Diagram gen** | Generates a Mermaid diagram from a prompt via the `claude` CLI |

Dataset/Query need the data files inside the **open workspace** (demo files ship
under `public/demo/`). SQL is restricted to `SELECT`/`WITH` with validated
identifiers and a clamped row limit — the query box cannot modify your data.

### Workspace synthesis

**Synthesize** summarizes every note in the workspace, clusters them by topic,
and writes a generated `TOC.md` and `SKILL.md` back into the folder. Its own
output is excluded from the input, so re-running does not feed the index back to
itself. Capped at 40 notes per run, and it reports what it skipped. Needs
`claude` on `PATH`.

### Safety

- Filesystem access is jailed to the folder you opened. Paths are canonicalized,
  so `..` traversal and symlinks pointing outside the workspace are both refused.
- Rendered markdown and generated SVG are sanitized before insertion.
- Dev server binds to **localhost only**.

## Getting started

### Prerequisites

- [Bun](https://bun.com) 1.3+
- [Rust](https://www.rust-lang.org/tools/install) — only for the desktop build
- Optional, for Ask AI / generative blocks: `ANTHROPIC_API_KEY`, and/or the `claude` and `imagen` CLIs on `PATH`

```bash
bun install
```

### Running

Motion runs two ways, and the difference matters:

```bash
bun tauri dev   # desktop app — real filesystem access
bun run dev     # browser at http://localhost:3000
```

**Desktop (`bun tauri dev`)** is the real product: a native folder picker, and
reading and writing files anywhere inside the folder you open.

**Browser (`bun run dev`)** reads and writes real files too, against a workspace
directory set by `MOTION_WORKSPACE` (default `public/demo/`) instead of a folder
picker:

```bash
MOTION_WORKSPACE=~/notes bun run dev
```

Both modes go through the same rules, enforced by one shared contract that both
test suites run — so behaviour you see in the browser is behaviour the desktop
app is held to. That is what makes browser automation a meaningful gate rather
than a rehearsal. The server binds to `127.0.0.1`.

There is no hot reload. The dev server rebuilds the bundle when files change, but
the page does not refresh itself — reload manually.

Desktop packaging, Finder Open With, unsigned local builds, and the overlay
title bar are documented in [docs/macos.md](docs/macos.md).

## Testing

```bash
bun run verify   # typecheck → client-bundle guard → unit tests → end-to-end
```

That one command is the gate. Individually:

| Command | Covers |
|---|---|
| `bun run typecheck` | `tsc --noEmit`, strict |
| `bun run guard:client` | rejects any `Bun.` API reachable from the browser bundle |
| `bun test src` | unit tests |
| `bunx playwright test` | end-to-end against the real dev server |
| `cd src-tauri && cargo test --lib` | the workspace filesystem jail |

End-to-end specs fail automatically on console errors, uncaught exceptions,
failed requests, and any response with status 400 or above — so a broken UI
cannot pass quietly. See `CLAUDE.md` for the full definition of done.

## Known limitations

Recorded here rather than discovered later:

- **Welcome demo datasets** assume `sample-data.csv` / `sample-events.jsonl` exist
  in the open workspace. Opening an unrelated folder shows load errors for those
  blocks until those files are present or sources are re-pointed.
- **No hot reload.** The dev server rebuilds the bundle on change but the page
  does not refresh itself — reload manually.
- **Ask AI** uses `ANTHROPIC_API_KEY` when set, otherwise `claude` on `PATH`.
  Generative blocks and **Synthesize** still need `claude` / `imagen`.
- **Share** needs a GitHub PAT (gist scope) and/or a Notion internal
  integration token plus a parent page the integration can write to.

See [CHANGELOG.md](CHANGELOG.md) for release history and
[docs/roadmap.md](docs/roadmap.md) for what is planned.

## Tech stack

- **Runtime:** Bun
- **Frontend:** React 19, TypeScript, Tiptap 3
- **Desktop shell:** Tauri 2 (Rust)
- **Data:** DuckDB-WASM
- **Testing:** Playwright, `bun:test`, `cargo test`

## License

See [LICENSE](LICENSE).
