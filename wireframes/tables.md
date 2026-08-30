# Screen: Tables

## Goal
Author a GFM pipe table in WYSIWYG the way a note app should: insert a 3×3,
edit cells, add or delete a row or column, and have the table survive
save/reload as a real table (not a paragraph of pipes).

## Layout

```
Toolbar
+------------------------------------------------------------------+
| … | Table |  [when caret is in a table:]                         |
|           |  Add row  Delete row  Add column  Delete column      |
|           |  Delete table                                        |
+------------------------------------------------------------------+
|  | Name        | Role      | Years |                             |
|  | ----------- | --------- | ----- |                             |
|  | Ada         | Engineer  | 12    |   <- editable cells         |
|  | Grace       | Architect | 20    |                             |
+------------------------------------------------------------------+

Slash (start of a block)
+-----------------------------+
| Table                       |
+-----------------------------+
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Insert Table | toolbar button | aria-label `Insert Table`. Inserts a 3×3 with a header row. Cursor lands in the first header cell. |
| Slash Table | option | kind=insert, nodeType=table. `/tab` uniquely matches. Ask AI stays first. |
| Cells | th / td | Click or Tab to move. Type to edit. Inline marks (bold/italic/code) are allowed inside a cell. |
| Add row | toolbar | Visible only when the caret is inside a table. Inserts a row after the current one. |
| Delete row | toolbar | Same visibility. Removes the current row. |
| Add column | toolbar | Inserts a column after the current one. |
| Delete column | toolbar | Removes the current column. |
| Delete table | toolbar | Removes the whole table. One undo step. |
| Markdown mode | textarea | Source is GFM pipes. No WYSIWYG table chrome. Refine still works. |

## States
- **Empty insert**: 3 columns, header row plus two body rows, blank cells.
- **Caret in table**: table chrome appears in the toolbar.
- **Caret outside table**: chrome hidden; Insert Table still available.
- **Persisted**: save/reload keeps a `<table>`, not a paragraph of `\| a \| b \|`.
- **Markdown mode**: chrome and slash menu absent; pipes are the source of truth.

## Acceptance Criteria
- [ ] Toolbar **Insert Table** creates a 3×3 with a header row.
- [ ] Slash menu lists Table; `/tab` highlights Table; `/ai` still ranks Ask AI first; `/mer` still inserts Mermaid.
- [ ] Cells are editable; Tab moves between them.
- [ ] While the caret is in a table, Add/Delete row and Add/Delete column and Delete table are available and labeled.
- [ ] A pipe table in Markdown becomes a real table in WYSIWYG.
- [ ] WYSIWYG table → markdown pipes → save → reload is still a table.
- [ ] Sanitize keeps `table`/`thead`/`tbody`/`tr`/`th`/`td`.
- [ ] Markdown mode has no table chrome.

## Notes
- Source: `src/components/Editor/` (`TableKit`, `insertBlock`, `Toolbar`, `markdown.ts`).
- DocCommands (`table_add_row`, `table_update_cell`) are a later slice — this chrome is the human equivalent, not the tool loop.
- No column resize (colwidths cannot round-trip through GFM).
- Related: [slash-menu.md](./slash-menu.md), [editor.md](./editor.md).
