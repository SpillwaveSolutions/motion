# Screen: Markdown source (highlighted)

## Goal
Edit (Markdown mode) or glance at (Split) the note's raw markdown with enough
syntax color that headings, emphasis, code, links, and lists are scannable —
without replacing the textarea with a second editor runtime.

## Layout

```
Markdown mode
+------------------------------------------------------------------+
| toolbar …                                                        |
| Find (optional)                                                  |
| Ask AI panel (optional)                                          |
+------------------------------------------------------------------+
|  highlight layer (aria-hidden, pointer-events: none)             |
|  textarea aria-label="Markdown source"  (caret, selection, type) |
|                                                                  |
|  # Heading            <- colored                                 |
|  A **bold** word      <- colored                                 |
+------------------------------------------------------------------+

Split
+----------------------------------+--------------------------------+
| TipTap (editable)                | highlighted source (read-only) |
|                                  | aria-label="Markdown preview"  |
+----------------------------------+--------------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Markdown source | textarea | `aria-label` **Markdown source**. The only editable control. Typing, Find's `setSelectionRange`, and Playwright `fill` all hit this. Transparent text, visible caret. |
| Highlight layer | pre | `aria-hidden`. Same font/padding/wrapping as the textarea. Headings, strong, emphasis, inline/fenced code, links, list markers colored. Scroll-synced with the textarea. |
| Split preview | pre | `aria-label` **Markdown preview**. Same highlighter, read-only. Not a second textarea. |
| Tokens | spans | Classes from the existing `lowlight` markdown grammar (`hljs-section`, `hljs-strong`, `hljs-emphasis`, `hljs-code`, `hljs-link`, `hljs-bullet`). Colors use theme tokens so light/dark both work. |

## States
- **Empty**: placeholder on the textarea; highlight layer blank.
- **Typed**: highlight updates with the value; caret stays in the textarea.
- **Find open**: match selection is still a textarea selection.
- **Markdown mode**: no slash menu, no Ask AI bubble, no table chrome. Refine still works.
- **Split**: left pane TipTap, right pane highlighted preview.
- **WYSIWYG**: this screen is not shown.

## Acceptance Criteria
- [ ] Markdown mode's accessible control is still a textbox named **Markdown source**.
- [ ] Headings, emphasis, strong, inline/fenced code, links, and list markers are colored in Markdown mode.
- [ ] Split's right pane uses the same highlighter and is labeled **Markdown preview**.
- [ ] Find in note still selects matches in the textarea (Enter cycles).
- [ ] Typing in Markdown mode still round-trips to WYSIWYG.
- [ ] Highlight layer is not in the accessibility tree (`aria-hidden`).
- [ ] No webfont CDN; colors follow light and dark tokens.
- [ ] Client bundle still has no `Bun.` (lowlight is already on the graph).

## Notes
- Source: `src/components/Editor/MarkdownSource.tsx`, `markdownHighlight.ts`.
- Grammar: `lowlight` `markdown` (same pack as Tiptap `CodeBlockLowlight`). Do not add CodeMirror / Monaco this slice.
- Related: [editor.md](./editor.md).
