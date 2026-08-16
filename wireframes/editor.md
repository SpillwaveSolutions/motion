# Screen: Editor

## Goal
Edit one markdown note in WYSIWYG, raw Markdown, or Split without losing edits across modes. Format text, insert blocks, save with a visible status, and optionally AI-refine the document.

## Layout

```
+-----------------------------------------------------------------+
| B I S ` | H1 H2 H3 | lists quote | code hr | Mermaid Dataset    |
| Query AI Diagram AI Image | undo redo | status | Refine | Save  |
+-----------------------------------------------------------------+
| WYSIWYG: TipTap document (welcome or file)                      |
| Markdown: labeled textarea                                      |
| Split: TipTap | read-only markdown preview (two columns)        |
+-----------------------------------------------------------------+
```

Slash menu overlays the viewport when / starts a block -- see slash-menu.md.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Format buttons | icon toolbar | Bold, Italic, Strike, Inline Code. aria-label from title. aria-pressed when active. |
| Headings | H1 H2 H3 | Toggle |
| Lists / quote | icons | Bullet, numbered, blockquote |
| Code block / HR | icons | |
| Insert blocks | labeled | Mermaid, Dataset, Query, AI Diagram, AI Image -- same set as slash menu |
| Undo / Redo | icons | Cmd+Z / Cmd+Shift+Z |
| Save status | status | Saving / Saved / Save failed / empty. role=status aria-live=polite |
| AI Refine | icon | Disabled while refining. Needs claude on PATH. Alert on failure. |
| Save | labeled button | Visible Save / Saving / Saved / Save failed. Disabled while saving or if no file. Cmd/Ctrl+S. |
| Welcome doc | default | Shown when no file selected: intro, mermaid, dataset, query, image-gen, diagram-gen demo blocks |
| Markdown source | textarea | aria-label Markdown source. Placeholder Write your markdown here... |
| Split preview | pre-wrap | Right pane is live raw markdown (read-only). |
| Find in note | bar | ⌘/Ctrl+F opens. Matches the current note (WYSIWYG selection or markdown source). Enter next, Shift+Enter previous, Escape closes. aria-label Find in note. |
| Loading | copy | Loading editor... before TipTap mounts |

## States
- **No file**: Welcome document. Save is a no-op (no filePath).
- **File loaded**: Content from disk, sanitized Markdown to HTML.
- **Dirty after save**: Saved flips back to idle on the next keystroke.
- **Save error**: Status Save failed plus alert.
- **Refine in flight**: Refine disabled; title Refining.
- **Markdown mode**: Textarea only (no slash menu).
- **Split**: Two columns; slash menu still works on the TipTap side.

- **Find open**: bar above the document; current match is selected.

## Acceptance Criteria
- [ ] Toolbar is visible in all three view modes.
- [ ] Every icon-only control has an aria-label (not title alone).
- [ ] Save has a visible text label, not an icon only.
- [ ] Save status is announced via role=status.
- [ ] Cmd/Ctrl+S saves the current file.
- [ ] Switching WYSIWYG / Markdown / Split does not drop edits.
- [ ] Markdown textarea is labeled Markdown source.
- [ ] With no file selected, the welcome document (not a blank pane) is shown.
- [ ] A failed file load shows an error inside the editor, not a blank page.
- [ ] Insert buttons create Mermaid, Dataset, Query, AI Diagram, and AI Image blocks.
- [ ] Pipe tables are **not** required (unsupported; render as text).
- [ ] ⌘/Ctrl+F opens Find in note; Enter cycles matches; Escape closes.

## Notes
- Source: src/components/Editor/index.tsx, Toolbar.tsx.
- Blocks persist as real nodes (pre data-type), not as plain code, on save/reload.
