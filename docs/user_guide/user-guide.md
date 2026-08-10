---
wiki_key: user-guide
doc_type: guide
truth_state: current
title: User Guide
slug: user-guide
---

# Motion User Guide

Motion is a local-first technical writing IDE. It edits markdown that lives on
your own disk, renders diagrams and runs SQL inline, and can generate both from
plain-language prompts.

This guide covers the app as it behaves **after the v0.1.0 validation loop and
the post-release dogfood fixes** (labeled Save, new-note persistence, dataset/SQL
install coverage). Where something is incomplete, it says so.

---

## Two ways to run, and why it matters

```bash
bun tauri dev   # desktop app
bun run dev     # browser at http://localhost:3000
```

**Desktop** is the real product. A native folder picker, and full read/write
access to any file inside the folder you open.

**Browser** runs against a fixed workspace directory instead of a folder picker,
set by the `MOTION_WORKSPACE` environment variable (defaulting to `public/demo`):

```bash
MOTION_WORKSPACE=~/notes bun run dev
```

Both modes now read and write real files through the same rules, so behaviour you
see in the browser is behaviour the desktop app is held to. Browser mode exists
so the interface can be driven by automated tests (Playwright E2E) before anyone
opens the app.

---

## Getting started

1. Click **Open Folder**. On desktop you pick a folder; in the browser it opens
   the configured workspace.
2. The sidebar is a normal project navigator:
   - **Tree** (default): folders start **collapsed** — you see the current folder’s
     subfolders and root-level notes; click a folder to open it and drill down.
     **Flat** lists every `.md` in the workspace at once.
   - **Sort**: Name A–Z, Z–A, or **Recent** (notes you opened this session).
   - **Glob** (header or sidebar): path pattern like `knowledge/**` or `**/index.md`, or a plain
     name fragment. Narrows which notes are listed and which are grepped.
   - **Grep**: search text *inside* those notes (path + line). **Glob then grep** — both apply
     together (AND), not either-or. Empty glob = all notes; empty grep = list only.
3. Click a note to open it.
4. Edit, then press **⌘S** (Ctrl+S) or click the labeled **Save** button in the
   editor toolbar. The status area shows **Saving…** / **Saved** / **Save failed**.

**New Note** opens an **Untitled** document in memory (like a new document on
macOS) with a starting `# New Note` heading. The first **Save** opens a **Save
As** sheet: the default filename is derived from the document title
(`New Note` → `new-note.md`). You can edit the name before confirming. If that
name already exists in the folder, Motion asks whether to **replace** it.

Click the document name in the toolbar (**Untitled** or the current `.md` name)
to **Rename** at any time — same sheet, same overwrite warning when the new
name collides with another file.

Motion cannot read or write anything outside the folder you opened. Paths are
resolved to their real location first, so a symbolic link pointing elsewhere is
refused rather than followed.

### Opening from the command line

```bash
motion                  # the current directory
motion ./docs           # that folder
motion docs/idea.md     # that note, with docs/ as the workspace
```

Naming a `.md` file opens it straight away, with its parent folder listed in
the sidebar. If the file does not exist yet it is created empty first, which
makes `motion notes/idea.md` a quick-capture command.

Only `.md` counts as a file argument. Anything else that is not a directory is
an error rather than a new note — otherwise a mistyped folder name would
quietly become an empty file.

### Unsaved changes

If you have edited a note and click a different one, Motion asks before moving:

| Choice | What happens |
|---|---|
| **Save** | Writes your edits, then opens the other note |
| **Discard** | Opens the other note; the edits are gone |
| **Cancel** | Stays put; your edits are still there, still unsaved |

Escape is the same as Cancel. A note with no unsaved edits switches straight
away with no prompt.

One exception: if the edited document is still **Untitled**, Save opens the
Save As sheet and leaves you there rather than jumping to the other note. Name
it, then click the note you wanted.

Closing the window or switching folders is **not** guarded yet — see Known
limitations.

### Zoom

**⌘+** / **⌘−** (Ctrl on Windows and Linux) change the text size, and **⌘0**
returns to 100%. The whole window scales — sidebar and toolbar included — and
the range is 75% to 200%.

The level is written to your settings file, so it survives a restart and is
the same in the browser and the desktop app.

---

## View modes

| Mode | What you get |
|---|---|
| **WYSIWYG** | Rendered editing — headings, lists, diagrams in place. YAML front matter (`---` … `---`) is hidden here. |
| **Markdown** | The raw source in a plain text area — including YAML front matter when present |
| **Split** | Rendered editor (no front matter) beside the full markdown source (with front matter) |

Switch freely; your edits carry across. Split view shows the markdown *source*,
not a second rendered preview.

---

## Content blocks

Five block types. Insert them from the toolbar, or type `/` at the start of an
empty line and pick from the menu.

### Mermaid

A diagram from [Mermaid](https://mermaid.js.org) source. Click it to edit; it
re-renders as you go. Invalid syntax shows an error in the block instead of
replacing your content.

### Dataset

Registers a local `.csv`, `.json` or `.jsonl` file as a named table:

```
source: data/sales.csv
name: sales
limit: 5
```

Use the file picker to choose a source. Store the path **relative to your
workspace** — a document written that way opens correctly on any machine.

### Query

SQL against the tables your Dataset blocks registered, run in-browser by
DuckDB-WASM:

```
sql: SELECT name, score FROM sales ORDER BY score DESC
```

Only `SELECT` and `WITH` are permitted, identifiers are validated, and the row
limit is clamped. The query box cannot modify your data — by construction, not
by convention.

### Image gen

Generates an image from a prompt using the `imagen` CLI, embedded as a data URI.

### Diagram gen

Generates a Mermaid diagram from a prompt using the `claude` CLI. The result is
validated as Mermaid before it is accepted, so a bad generation cannot corrupt
the document.

Both generative blocks need their CLI on your `PATH`. Without it the block
reports the failure rather than silently doing nothing.

---

## Workspace synthesis

**Synthesize** (next to New Note) reads every note in the workspace, summarizes
each one, clusters them by topic, and writes two documents back into the folder:

- **`TOC.md`** — a table of contents with a short summary under each note.
- **`SKILL.md`** — a synthesized guide to what the workspace is about.

Progress is reported in a bar under the header, and both files appear in the
sidebar when it finishes. It re-runs safely: its own output is excluded from the
input, so a second run summarizes your notes and not the index it just wrote.

Each note costs one call to the `claude` CLI, so this is slower and more
expensive than the other actions — and it processes at most 40 notes per run,
telling you when it has skipped some rather than silently truncating.

Needs `claude` on your `PATH`. Without it the status bar reports the failure.

---

## Known limitations

Stated here so you meet them on your terms:

- **Recent sort** is session-based (last opened in this app session), not disk
  mtime — yet.
- **Welcome demo data** (`sample-data.csv`, `sample-events.jsonl`) only loads when
  those files exist in the open workspace (they ship under `public/demo/`). Open
  an unrelated project folder and the welcome Dataset/Query blocks will error
  until you pick real files or open a folder that includes the samples.
- **No hot reload.** The dev server rebuilds when files change but does not
  refresh the page — reload manually.
- **Markdown tables are not supported.** Pipe-table syntax renders as plain
  text; no table extension is registered.
- **Synthesize / generative blocks** need `claude` and/or `imagen` on your
  `PATH`.
- **The unsaved-changes guard covers sidebar switching only.** Closing the
  window or tab, and opening a different folder, still discard unsaved edits
  without asking.
- **A note edited and then undone may still count as unsaved.** Motion compares
  the buffer against what it last wrote, and an edit-then-undo does not always
  reproduce the original text byte for byte. It errs toward asking.
- **`motion <file.md>` only accepts `.md`**, because that is the only extension
  the sidebar lists.

---

## Troubleshooting

**"Access denied: path is outside the opened workspace"** — you are reaching for
a file outside the folder you opened. Open the containing folder instead.

**A Dataset block cannot find its file** — check the `source:` path. Relative
paths resolve against the workspace root; a path that was absolute on another
machine will not exist on yours.

**Generative blocks fail immediately** — confirm `claude` or `imagen` is
installed and on your `PATH`.

**Saving appears to do nothing in the browser** — this was true before v0.1.0
and is fixed. If you see it now, it is a bug worth reporting.

---

See the [Changelog](https://github.com/SpillwaveSolutions/motion/blob/main/CHANGELOG.md)
for release history and the [[Roadmap]] for what is planned.
