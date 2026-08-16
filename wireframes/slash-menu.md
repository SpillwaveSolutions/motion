# Screen: Slash menu

## Goal
Insert a content block from the keyboard the way Notion does: type / at the **start of a block**, filter by label, confirm with Enter or click.

## Layout

```
| /mer                        |
+-----------------------------+
| Mermaid                     |
| (filtered list)             |
| No matches                  |
+-----------------------------+
```

Popup is position:fixed under the caret (coordsAtPos). Overlay, not inline.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Trigger | typing | Only when / is the first character of the current block, then a whitespace-free query. Mid-sentence and/or does not open it. |
| Menu | listbox | role=listbox aria-label=Insert block |
| Items | options | role=option aria-selected on the highlighted row. Labels: Mermaid, Dataset, Query, AI Diagram, AI Image |
| Empty | copy | No matches |
| Keyboard | keys | Escape closes. ArrowUp/Down cycle. Enter inserts selected. |
| Mouse | mousedown | preventDefault so the editor selection stays valid, then insert |

## States
- **Closed**: Default.
- **Open**: Filter shrinks the list as the query grows.
- **No matches**: Empty copy; Enter does not insert.
- **Markdown mode**: Menu does not appear (textarea, not TipTap).

## Acceptance Criteria
- [ ] / at the start of a block opens the menu; / mid-sentence does not.
- [ ] Menu is a listbox labeled Insert block.
- [ ] Five commands: Mermaid, Dataset, Query, AI Diagram, AI Image.
- [ ] Escape closes without inserting.
- [ ] Enter inserts the highlighted command and consumes the /query text.
- [ ] Inserted block is followed by an empty paragraph (cursor after the atom).
- [ ] Menu is absent in Markdown-only mode.

## Notes
- Source: src/components/Editor/index.tsx (detectSlashTrigger), insertBlock.ts.
