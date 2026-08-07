---
date: 2026-08-07
slug: cli-file-arg-dirty-zoom
title: CLI file argument, unsaved-changes guard, and editor zoom
---

# CLI file argument, unsaved-changes guard, and editor zoom

## Context

Three independent user-facing gaps surfaced while dogfooding the `motion` CLI
against a real workspace:

1. `motion path/to/note.md` exits 1. The CLI accepts only directories, so the
   natural "open this note" invocation fails.
2. Nothing in the app tracks unsaved edits. Switching notes in the sidebar
   discards in-flight changes with no warning. A grep for
   `isDirty|unsaved|hasChanges|beforeunload` across `src/` returns zero matches.
3. There is no way to change text size. The design system is fully `rem`-based
   but nothing drives the root font size.

**Save itself is already implemented and is explicitly out of scope.**
`src/components/Editor/index.tsx:287-307` performs macOS-style Save: a named
file on disk writes in place, a new/Untitled document opens the name sheet, and
`⌘S` is bound at line 454. The Toolbar carries a labelled Save button with a
live `Saving… / Saved / Save failed` status region. The only sharp edge is the
gate at line 479 — `canSave = Boolean(workspacePath) && (Boolean(filePath) ||
isNewDocument)` — which renders Save inert when no workspace is open.

Each feature below is independently shippable and gets its own work item, PR,
and Definition-of-Done pass.

---

## Feature A — `motion <file.md>` opens a file

### Behaviour

| Invocation | Workspace | Editor |
|---|---|---|
| `motion` / `motion .` / `motion dir/` | that directory | nothing selected (today's behaviour) |
| `motion dir/note.md` (exists) | `dir/` | `note.md` open |
| `motion dir/note.md` (missing) | `dir/` | `note.md` created empty, then open |
| `motion dir/note` (no md extension, not a directory) | — | exit 1, `not a directory` |

The extension test is what keeps a typo'd directory name from silently
becoming a file. Only `.md` is treated as a file argument; everything else
follows the existing directory rule.

`.md` and nothing else, deliberately: `MARKDOWN_EXTENSIONS` is `["md"]`
(`src/lib/fsCore.ts:130`). Accepting `.markdown` at the CLI would open a
document the sidebar cannot list, since the sidebar filters on that same
constant. The CLI must not admit files the workspace listing will not show.

Creating a missing file is deliberate — it makes `motion notes/idea.md` a
quick-capture command. The risk accepted is that a typo'd *markdown* path
creates an empty note rather than erroring.

### Data flow

The bootstrap channel already exists and carries `{root, autoOpen}`. This adds
one field rather than a new mechanism.

```
bin/motion
  MOTION_WORKSPACE=<parent dir>   (existing)
  MOTION_AUTO_OPEN=1              (existing)
  MOTION_OPEN_FILE=<absolute file path>   (new)
        │
        ├── web:     src/server.ts  → GET /api/fs/workspace → {root, autoOpen, openFile}
        └── desktop: src-tauri/src/lib.rs → get_bootstrap    → {root, autoOpen, openFile}
                    │
                    └── src/lib/storage/index.ts  BootstrapInfo.openFile: string | null
                              │
                              └── src/App.tsx  applyWorkspace(root) → handleFileSelect(openFile)
```

`openFile` is an **absolute** path. This is not arbitrary: `collectFiles`
returns absolute paths (`src/lib/fsCore.ts:112`, `full = join(dir, entry.name)`),
the sidebar passes those same absolute paths to `onSelectFile`
(`FileSidebar.tsx:110`), and `App.tsx` compares them with `currentFilePath ===
node.path`. An absolute `openFile` therefore feeds the existing handler with no
conversion and no new path convention.

### Components touched

- `bin/motion` — argument classification; create-if-missing; export `MOTION_OPEN_FILE`.
- `src/server.ts` — read env, add `openFile` to the `/api/fs/workspace` payload (line 238).
- `src-tauri/src/lib.rs` — same field on the `BootstrapInfo` struct (`#[serde(rename = "openFile")]`) and the `run()` env read at line 306.
- `src/lib/storage/index.ts` — `BootstrapInfo` gains `openFile: string | null`; both branches of `fetchBootstrap` populate it.
- `src/App.tsx` — the existing auto-open effect (lines 62-76) selects the file after applying the workspace.

### Error handling

- File outside the resolved workspace root → ignored, workspace still opens. The
  workspace jail (`fs_core.rs` / `fsCore.ts`) remains the authority; the CLI
  never widens it.
- File creation fails (permissions, read-only volume) → CLI exits 1 with the OS
  error before starting any server.
- `openFile` present but unreadable at boot → log and open the workspace anyway.
  A broken file argument must not cost the user the whole session.

### Tests

- Unit (`src/`): argument classification — directory vs `.md` file vs
  non-markdown non-directory. Extracted as a pure helper alongside
  `resolveWorkspaceArg` (`src/lib/settings.ts:38`), which already does this
  shape of work and takes its filesystem predicates as parameters so it stays
  testable without touching disk.
- E2E (`e2e/`): server booted with `MOTION_OPEN_FILE` set → the named note is
  the active document and its parent's notes are listed in the sidebar.

---

## Feature B — unsaved-changes guard on file switch

### Scope

Sidebar file switching only. Window/tab close and folder switching are
knowingly left unguarded in this change; see Deferred.

### Dirty tracking

The Editor already holds `rawMarkdown`. Add a `savedMarkdown` snapshot, set in
exactly two places: when a document loads, and on a successful `writeToPath`
(`Editor/index.tsx:265-279`).

```
isDirty = rawMarkdown !== savedMarkdown
```

Derived, never assigned. There is no `setDirty` call to forget at a new mutation
site, which is the usual way this class of feature rots.

Lift the value to `App` through an `onDirtyChange(boolean)` prop so
`handleFileSelect` (`App.tsx:236`) can intercept a switch.

### The dialog

A small component following the existing `SaveNameDialog` pattern, offering
**Save**, **Discard**, **Cancel**.

An in-app dialog is chosen over native `confirm()` for a testing reason, not an
aesthetic one: CLAUDE.md requires Playwright specs written against roles and
accessible names, and a native `confirm()` is not in the DOM to assert against.
Native `confirm()` also cannot express three outcomes — the user would have to
cancel, press `⌘S`, and re-click the target note.

Outcomes:

- **Save** → run the existing `handleSave`, then proceed to the requested file.
  If Save routes to the name sheet (Untitled), the pending switch is abandoned;
  the user is mid-naming and moving them is worse than making them re-click.
- **Discard** → proceed, losing the edits.
- **Cancel** → stay on the current document; selection does not move.

### Tests

- Unit: the dirty predicate — clean on load, dirty after edit, clean again after
  save, and clean when an edit is reverted by hand.
- E2E: edit a note, click a second note, assert the dialog appears; assert each
  of the three buttons produces its outcome, including that Cancel leaves the
  original document active and still dirty.

---

## Feature C — `⌘+` / `⌘−` / `⌘0` zoom

### Mechanism

Every size token in `src/index.css` is `rem`-based — `--text-xs` … `--text-3xl`
(lines 38-44) and `--space-1` … `--space-12` (lines 47-55) — all anchored to
`html { font-size: 16px }` at line 90. Setting the root font size therefore
rescales text and spacing together, proportionally, across the whole app.

```
document.documentElement.style.fontSize = `${16 * scale}px`
```

Scale steps 0.75× to 2.0×; `⌘0` resets to 1.0×.

### Persistence

Zoom persists to the settings file — `~/.config/motion/settings.json`, the same
file the `motion` CLI reads for `launchMode`/`port`/`openBrowser` — so it
survives restarts and carries across web and desktop mode.

`MotionSettings` gains `zoom: number` (`src/lib/settings.ts:9`), with
`DEFAULT_SETTINGS.zoom = 1`. The clamp to 0.75–2.0 goes in `mergeSettings`,
which is already the single validation choke point for every settings field —
`port` is clamped to 1-65535 in exactly the same place. Putting the bound
anywhere else would let a hand-edited settings file produce an unreadable app
with no way back except editing JSON.

No new transport is needed: `fetchSettings()` / `updateSettings(partial)`
(`src/lib/settingsClient.ts`) already handle both the Tauri `invoke` and the
`fetch("/api/settings")` paths, and `server.ts:307` already serves GET and POST.

Writes are **debounced ~500ms**. Holding `⌘+` fires key repeat, and one file
write per repeat would hammer the disk and can interleave into a torn write.
Reads happen once at boot, applied before first paint where possible to avoid a
visible reflow.

The CLI ignores the new field; it reads only `launchMode`, `port`, and
`openBrowser`, and unknown keys are already preserved on save.

**This zooms the entire window**, sidebar and toolbar included, in the manner of
browser zoom. Editor-text-only zoom was considered and rejected for now: the
editor's heading sizes use absolute `rem` tokens, so body text would grow while
headings stayed frozen until the editor type scale is converted to `em`. That
refactor is not justified by this request.

### Key handling

Follows the existing `⌘S` listener pattern (`Editor/index.tsx:454`): a
`window` keydown listener registered in an effect.

`⌘+` arrives as `"="` unshifted and `"+"` shifted; `⌘−` as `"-"` or `"_"`. All
four are matched.

### Known risk

In web mode `⌘+`/`⌘−` is also a browser shortcut. Chrome generally honours
`preventDefault()` for keyboard page zoom, but this is not guaranteed across
browsers; if it is not honoured the page zooms twice. The E2E must assert the
computed root font size after the keypress rather than assume interception
worked. Tauri's webview is under our control and is not subject to this.

### Tests

- Unit: the scale reducer — clamping at both ends, step direction, reset. Plus
  `mergeSettings` with `zoom` out of range, absent, and non-numeric, alongside
  the existing settings validation tests in `src/lib/settings.test.ts`.
- E2E: press `⌘+`, assert the computed `html` font size increased; `⌘−` returns
  it; `⌘0` restores exactly 16px; **the value survives a reload** — which is the
  assertion that actually proves the settings round-trip, not just the in-memory
  state.

---

## UI artifacts

The UI verification loop in CLAUDE.md requires a `docs/ui/<screen>.md` entry and
a Salt wireframe for every user-visible surface. The wireframes are what the
agent judge scores the built UI against, so a surface without one cannot be
judged — but a wireframe for a surface that gains no controls is a file to keep
in sync for no information. Each feature is therefore ruled on explicitly:

| Feature | Wireframe | Why |
|---|---|---|
| A · CLI file arg | **N/A** | Adds no control. `app-shell-02-workspace.puml` already depicts "workspace open, a note selected" — the exact end state. What changes is *when* it happens (boot rather than click), which a wireframe cannot express. |
| B · Unsaved guard | **`dialogs-03-unsaved-changes.puml`** | New modal, new controls, new inventory. Documented in `docs/ui/dialogs.md`. |
| C · Zoom | **N/A** | Changes scale only. Salt is authoritative for inventory, containment order, and ordinal sequence — and explicitly *not* for pixels or size, so a zoomed frame would assert nothing a judge could score. |

Numbering note: the new frame is `dialogs-03`, not `dialogs-02` — `dialogs.md`
already reserves `dialogs-02-settings` in the Settings capture recipe, though
that `.puml` is not yet drawn.

Render with `bun run ui:render`; `bun run ui:check` runs syntax-only in CI. Run
the syntax check *before* rendering: PlantUML will otherwise happily emit a
**picture of the error message**, which then gets committed and reviewed as
though it were a wireframe.

### Rubric method tags

Each rubric row in `dialogs.md` names the method that decides it. Deterministic
rows (`check:…`) are Playwright assertions in `e2e/layout.spec.ts` and are the
merge gate; `agent` rows are screenshot judgement and are PR commentary only.
Run the deterministic rows first and report their failures before any judgement
call — a failed `check:` row usually explains the aesthetic complaint, and a
review that leads with taste buries the real defect.

---

## Deferred

Explicitly not in this change:

- Unsaved guard on window/tab close (`beforeunload`, Tauri `close-requested`).
  Browsers restrict `beforeunload` to a generic, untranslatable message.
- Unsaved guard when switching folders via `handleOpenFolder` (`App.tsx:47`).
- Editor-text-only zoom, which requires converting the editor type scale to `em`.
- Non-markdown file arguments to the CLI.

## Discovered during design

`motion --desktop` run twice starts a second Tauri instance whose
`beforeDevCommand` dev server fails with `EADDRINUSE` on port 3000; the new
window then silently attaches to the *first* instance's server and displays the
wrong workspace with no error. Web mode has port-hunting logic for exactly this
case (`bin/motion`); desktop mode does not. Filed separately as a bug — not
addressed here.
