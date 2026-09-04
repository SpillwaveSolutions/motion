# Screen: Editor

## Goal
Edit one markdown note in WYSIWYG, raw Markdown, or Split without losing edits across modes. Format text, insert blocks, save with a visible status, and optionally AI-refine the document.

## Layout

```
+-----------------------------------------------------------------+
| B I S ` | H1 H2 H3 | lists quote | code hr | Table Mermaid      |
| Dataset Query AI Diagram AI Image | undo redo | status | Refine |
| Find                                                            |
| (when caret in a table: Add/Delete row, Add/Delete column,      |
|  Delete table)                                                  |
+-----------------------------------------------------------------+
| Ask AI panel (when open): prompt / preview / error              |
+-----------------------------------------------------------------+
| WYSIWYG: TipTap document (welcome or file)                      |
|   selection → floating Ask AI bubble                            |
|   tables are real <table> cells, not pipe text                  |
| Markdown: labeled highlighted source (textarea + color layer)   |
| Split: TipTap | highlighted read-only markdown (two columns)    |
+-----------------------------------------------------------------+
```

Slash menu overlays the viewport when / starts a block -- see slash-menu.md.
Ask AI bubble + preview -- see ask-ai.md.
Tables -- see tables.md.
DocCommands (proposed-edits list) -- see doc-commands.md.
Highlighted source -- see markdown-source.md.


## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Format buttons | icon toolbar | Bold, Italic, Strike, Inline Code. aria-label from title. aria-pressed when active. |
| Headings | H1 H2 H3 | Toggle |
| Lists / quote | icons | Bullet, numbered, blockquote |
| Code block / HR | icons | |
| Insert Table | labeled | 3×3 with header row. See tables.md. |
| Insert blocks | labeled | Table, Mermaid, Dataset, Query, AI Diagram, AI Image -- insert-only; Ask AI is slash/bubble, not a toolbar insert |
| Table chrome | labeled | Add/Delete row, Add/Delete column, Delete table. Visible only while the caret is inside a table. |
| Undo / Redo | icons | Cmd+Z / Cmd+Shift+Z |
| Save status | status | Saving / Saved / Save failed / empty. role=status aria-live=polite. The Save **button** lives in the shell header (see shell.md). |
| AI Refine | icon | Document-scoped Ask AI. Disabled while a call is in flight or the Ask AI panel is open. Preview before commit; no alert on failure. |
| Ask AI bubble | button | Non-empty WYSIWYG/Split selection. See ask-ai.md. |
| Save | — | Moved to the app header. Toolbar keeps status only. Disabled with no file. Cmd/Ctrl+S. Autosave 1.5s after last edit. View-mode switches on an unedited note do not dirty and do not autosave. |
| Welcome doc | default | Shown when no file selected: intro, mermaid, dataset, query, image-gen, diagram-gen demo blocks |
| Markdown source | textarea | aria-label Markdown source. Highlighted (headings, emphasis, code, links, lists). Placeholder Write your markdown here... See markdown-source.md. |
| Split preview | pre | Right pane is live highlighted markdown (read-only, aria-label Markdown preview). A `role=separator` divider between the panes is draggable; see layout.md. The editor surface has **no** max-width cap — it fills the main column. |
| Find in note | bar | ⌘/Ctrl+F opens. Matches the current note (WYSIWYG selection or markdown source). Enter next, Shift+Enter previous, Escape closes. aria-label Find in note. |
| Loading | copy | Loading editor... before TipTap mounts |

## States
- **No file**: Welcome document. Header Save is disabled.
- **Dirty**: header Save enabled (primary); selected note shows •. Autosave after 1.5s idle.
- **File loaded**: Content from disk, sanitized Markdown to HTML. Serializer hydration is adopted as the clean baseline so looking at the note is not an edit.
- **Dirty after save**: Saved flips back to idle on the next keystroke.
- **Save error**: Status Save failed plus alert.
- **Refine in flight**: Refine disabled; title Refining. Docked Ask AI panel shows Asking AI… and live tokens.
- **AI preview / error**: Docked panel. Replace (and Insert below on a selection) commit a markdown blob; a DocCommands reply uses Apply N edits. Discard / Escape apply nothing. Failure copy is in the panel, not an alert.
- **Markdown mode**: Highlighted source textarea only (no slash menu, no Ask AI bubble, no table chrome). Refine still opens the panel.
- **Split**: Two columns; slash menu, Ask AI bubble, and tables still work on the TipTap side.
- **Caret in table**: table chrome appears in the toolbar.

- **Find open**: bar above the document; current match is selected.

## Acceptance Criteria
- [ ] Toolbar is visible in all three view modes.
- [ ] Every icon-only control has an aria-label (not title alone).
- [ ] Save status is announced via role=status.
- [ ] Cmd/Ctrl+S saves the current file (header Save note is the visible control).
- [ ] Switching WYSIWYG / Markdown / Split does not drop edits.
- [ ] Switching WYSIWYG / Markdown / Split on an unedited note does not mark it dirty and does not autosave.
- [ ] Markdown textarea is labeled Markdown source and is syntax-highlighted.
- [ ] With no file selected, the welcome document (not a blank pane) is shown.
- [ ] A failed file load shows an error inside the editor, not a blank page.
- [ ] Insert buttons create Table, Mermaid, Dataset, Query, AI Diagram, and AI Image blocks.
- [ ] Slash menu includes Ask AI first, then Table; toolbar insert buttons do not include Ask AI.
- [ ] Refine previews before replacing the document; failure is in the panel, not an alert.
- [ ] Pipe tables render as real tables in WYSIWYG and round-trip through save/reload.
- [ ] ⌘/Ctrl+F opens Find in note; Enter cycles matches; Escape closes.

## Notes
- Source: src/components/Editor/index.tsx, Toolbar.tsx, MarkdownSource.tsx.
- Highlighted source: [markdown-source.md](./markdown-source.md).
- Blocks persist as real nodes (pre data-type), not as plain code, on save/reload.
- Tables persist as GFM pipe markdown; see [tables.md](./tables.md).
