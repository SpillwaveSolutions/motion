# Motion

> Manage your ocean of markdown.

Motion is a **local-first technical writing IDE**. It edits markdown on your own
filesystem, renders diagrams and queries inline, and can generate both from
natural-language prompts using CLI tools you already have installed.

## Features

### Editing

- **Three view modes** — WYSIWYG, raw Markdown, and Split, switchable at any time.
  Edits carry across modes without loss.
- **Workspace management** — open a folder; sidebar **Tree** (default: folders
  collapsed, click to expand) or **Flat** (all notes at once), sort by name or
  recent, **path glob** then **content grep** (both apply together).
- **New Note** — creates `untitled-<timestamp>.md` in the open workspace.
- **Save** — labeled **Save** control in the toolbar, plus **⌘S** / **Ctrl+S**.
  Status shows Saving… / Saved / Save failed.
- **Unsaved-changes guard** — switching notes with unsaved edits asks
  **Save / Discard / Cancel** instead of discarding silently.
- **Zoom** — **⌘+** / **⌘−** / **⌘0** rescale the whole window (75%–200%),
  remembered in your settings file across restarts and across web/desktop.
- **Rich markdown** — headings, lists, blockquotes, and code blocks with syntax
  highlighting across the common languages. (Tables are not supported yet — no
  table extension is registered, so pipe-table syntax renders as text.)
- **AI Refine** — per-document refine action (needs `claude` on `PATH`).

### Content blocks

Five block types, insertable from the toolbar or by typing `/` at the start of a
line. Blocks survive save/reload as real blocks (not plain code).

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
- Optional, for the generative blocks: the `claude` and `imagen` CLIs on `PATH`

```bash
bun install
```

### Running

Motion runs two ways, and the difference matters:

```bash
bun tauri dev   # desktop app — real filesystem access
bun run dev     # browser at http://localhost:3000
```

#### CLI: `motion <dir | file.md>`

Open a folder — or a single note — from the terminal (same idea as `code .`):

```bash
# once, from this repo
bun link
# or: ln -sf "$(pwd)/bin/motion" ~/.local/bin/motion

motion .          # open the current directory
motion ./docs     # open a relative folder
motion /path/to   # absolute path
motion docs/idea.md # open that note, with docs/ as the workspace
motion --desktop .  # force Tauri instead of the browser
```

A `.md` argument opens that note with its parent folder in the sidebar, and
creates the file first if it is not there yet. Only `.md` counts as a file;
anything else that is not a directory is an error, so a mistyped folder name
cannot quietly become an empty note.

The launcher sets `MOTION_WORKSPACE`, `MOTION_AUTO_OPEN=1`, and (for a file
argument) `MOTION_OPEN_FILE`, so the UI opens that folder and note without an
extra click. Prefer **web** or **desktop** in
**Settings → CLI launcher** (stored in `~/.config/motion/settings.json`).

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

- **Content grep is substring** — not full regex; path glob supports `*`, `**`, `?`.
- **Welcome demo datasets** assume `sample-data.csv` / `sample-events.jsonl` exist
  in the open workspace. Opening an unrelated folder shows load errors for those
  blocks until those files are present or sources are re-pointed.
- **Markdown tables are not supported.** Pipe-table syntax renders as plain text.
- **No hot reload.** The dev server rebuilds the bundle on change but the page
  does not refresh itself — reload manually.
- Generative blocks and **Synthesize** need the relevant CLI (`claude`, `imagen`)
  on `PATH`.
- **The unsaved-changes guard covers sidebar file switching only** — closing the
  window and switching folders are still unguarded. An edit that is undone by
  hand may also still register as unsaved; the guard errs toward asking.
- **`motion --desktop` run twice** silently attaches the second window to the
  first instance's dev server and shows the wrong workspace. Web mode hunts for
  a free port; desktop mode does not.

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
