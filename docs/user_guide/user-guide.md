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

This guide covers the app as it behaves **after v0.6.1** (native Mac chrome,
Ask AI, GFM tables, DocCommands, Markdown source highlighting, labeled Save,
new-note persistence, dataset/SQL install coverage). Where something is
incomplete, it says so.

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
   the configured workspace. On the Mac app you can also right-click a `.md` in
   Finder → **Open With → Motion** — the workspace becomes that file's parent
   folder and the note is selected. Desktop remembers the last folder.
2. The sidebar is a **collapsible directory tree** of every `.md` underneath
   the workspace. Use **Search notes** (⌘K / Ctrl+K) to filter by filename or
   by text inside the notes. A content hit shows a short snippet.
3. Click a note to open it.
4. Edit, then press **⌘S** (Ctrl+S) or click the labeled **Save** button in the
   header. The status area shows **Saving…** / **Saved** / **Save failed**.

**New Note** creates a timestamped `untitled-*.md` in the parent folder of the
selected file (or the workspace root) and writes a stub `# New Note`
immediately. **New Folder** prompts for a name and writes a `README.md` so the
tree can show it.

**Share** in the header publishes the current note (including unsaved edits) to
a GitHub Gist or a Notion page. Open **Settings…** from that menu to store a
gist-scoped GitHub token and/or a Notion integration token plus parent page.
Tokens never leave this machine.

**Copy All** copies the current note (including unsaved edits). Paste into a
markdown editor or a terminal to get markdown; paste into Docs, Word, Mail, or
Slack's rich field to get formatted text. The button reads **Copied** for a
moment after it works.

Motion cannot read or write anything outside the folder you opened. Paths are
resolved to their real location first, so a symbolic link pointing elsewhere is
refused rather than followed.

macOS packaging, Open With, and unsigned local builds:
[docs/macos.md](../macos.md).

---

## View modes

| Mode | What you get |
|---|---|
| **WYSIWYG** | Rendered editing — headings, lists, diagrams in place |
| **Markdown** | The raw source, syntax-highlighted, in a labeled text area |
| **Split** | Rendered editor beside the markdown source |

Switch freely; your edits carry across. Split view shows the markdown *source* (also highlighted),
not a second rendered preview. Switching views does not count as an edit.

---

## Content blocks

Five block types, plus GFM tables. Insert them from the toolbar, or type `/` at the start of an
empty line and pick from the menu. The same menu lists **Ask AI** first, then **Table** — see
below.

### Ask AI

Three ways to start, one preview:

1. **Select text** in WYSIWYG or Split — a floating **Ask AI** button appears.
2. **Type `/ai`** at the start of a line and choose Ask AI.
3. **Refine** in the toolbar — whole-document, no "Insert below".

Write an instruction or pick a canned chip (Rewrite, Tighten, Expand, Fix
grammar, Continue). Tokens stream into the preview as they arrive.
**Replace** swaps the target; **Insert below** adds the reply after it;
**Try again** re-runs; **Discard** (or Escape) applies nothing and cancels an
in-flight stream. Failures show in the panel, not an alert.

When the model proposes targeted edits (replace a unique span, insert after a
heading, add a table row, update a cell) the preview is a **Proposed edits**
list instead. **Apply N edits** commits the whole list as one undo step.

Markdown mode has no bubble and no slash menu; Refine still works.

Set `ANTHROPIC_API_KEY` to use the Anthropic API (with prompt caching on the
note context). Otherwise Motion shells out to `claude` on your `PATH`.

Two optional knobs: `MOTION_AI_MODEL` picks the model (default `claude-opus-5`)
and `MOTION_AI_EFFORT` sets how hard it thinks — `low` (the default, tuned for
short interactive edits) through `medium`, `high`, `xhigh`, `max`. An
unrecognised value falls back to `low` rather than failing the request.

Everything the model proposes in one turn is located in the note as it stood
when you asked. That is why a batch of edits applies as a unit: it will not
try to edit text an earlier edit in the same batch introduced, and if two
proposed edits overlap, Motion refuses the batch rather than silently applying
one of them. **Try again** re-asks against the current note.

### Tables

Insert a 3×3 from the toolbar (**Insert Table**) or type `/tab` at the start of
a line. Click a cell to edit; Tab moves to the next cell. While the caret is
inside a table, the toolbar shows **Add row**, **Delete row**, **Add column**,
**Delete column**, and **Delete table**.

Pipe tables in Markdown become real tables in WYSIWYG and round-trip through
save/reload.

Inserting a table while the caret is already inside one adds the new table
*after* the current one, with an empty paragraph between them — tables cannot
nest in Markdown, and two tables with nothing between them would re-read as a
single table.

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

- **Welcome demo data** (`sample-data.csv`, `sample-events.jsonl`) loads when
  those files exist in the open workspace (they ship under `public/demo/`). Open
  an unrelated project folder and the Dataset blocks say the demo data is not
  in this workspace — pick a local file or open the demo folder. No DuckDB
  catalog dump.
- **No hot reload.** The dev server rebuilds when files change but does not
  refresh the page — reload manually.
- **Ask AI** uses `ANTHROPIC_API_KEY` when set, otherwise `claude` on `PATH`.
  Synthesize / generative blocks still need `claude` and/or `imagen`.
- **Share** needs a GitHub PAT with gist scope, and/or a Notion internal
  integration that has been invited to the parent page.

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
