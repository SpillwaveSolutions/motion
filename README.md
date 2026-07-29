# Motion

> Manage your ocean of markdown.

Motion is a **local-first technical writing IDE**. It edits markdown on your own
filesystem, renders diagrams and queries inline, and can generate both from
natural-language prompts using CLI tools you already have installed.

## Features

### Editing

- **Three view modes** — WYSIWYG, raw Markdown, and Split, switchable at any time.
- **Workspace management** — open a folder and Motion lists every markdown file
  under it, recursively. Search filters the list as you type.
- **Rich markdown** — headings, lists, blockquotes, and code blocks with syntax
  highlighting across the common languages. (Tables are not supported yet — no
  table extension is registered, so pipe-table syntax renders as text.)

### Content blocks

Five block types, insertable from the toolbar or by typing `/` at the start of a
line:

| Block | What it does |
|---|---|
| **Mermaid** | Renders a diagram from Mermaid source, editable in place |
| **Dataset** | Registers a local CSV/JSON/JSONL file as a queryable table |
| **Query** | Runs SQL against registered datasets via DuckDB-WASM, in-browser |
| **Image gen** | Generates an image from a prompt via the `imagen` CLI |
| **Diagram gen** | Generates a Mermaid diagram from a prompt via the `claude` CLI |

### Workspace synthesis

**Synthesize** summarizes every note in the workspace, clusters them by topic,
and writes a generated `TOC.md` and `SKILL.md` back into the folder. Its own
output is excluded from the input, so re-running does not feed the index back to
itself. Capped at 40 notes per run, and it reports what it skipped.

SQL is restricted to `SELECT`/`WITH` with validated identifiers and a clamped
row limit — the query box cannot modify your data.

### Safety

- Filesystem access is jailed to the folder you opened. Paths are canonicalized,
  so `..` traversal and symlinks pointing outside the workspace are both refused.
- Rendered markdown and generated SVG are sanitized before insertion.

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

- `bun run build` does not emit an entry HTML file, so the **packaged desktop
  build does not work yet** — use `bun tauri dev`.
- Dataset, Query, Image gen and Diagram gen blocks do not survive a save/reload
  cycle; they degrade into plain code blocks. Mermaid blocks round-trip fine.
- The bundled demo query returns no rows — the demo data disagrees on case in
  its join condition.

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
