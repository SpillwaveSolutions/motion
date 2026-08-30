# Screen: Slash menu

## Goal
Insert a content block — or start Ask AI — from the keyboard the way Notion
does: type / at the **start of a block**, filter by label, confirm with Enter or
click.

## Layout

```
| /ai                         |
+-----------------------------+
| Ask AI                      |
| AI Diagram                  |
| AI Image                    |
| (filtered list)             |
| No matches                  |
+-----------------------------+
```

Popup is position:fixed under the caret (coordsAtPos). Overlay, not inline.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Trigger | typing | Only when / is the first character of the current block, then a whitespace-free query. Mid-sentence and/or does not open it. |
| Menu | listbox | role=listbox aria-label=Slash commands |
| Items | options | role=option aria-selected on the highlighted row. Ask AI is first, then Mermaid, Dataset, Query, AI Diagram, AI Image |
| Ask AI | option | kind=ai. Consumes the /query and opens the Ask AI prompt at the cursor (see ask-ai.md). Not an atom insert. |
| Empty | copy | No matches |
| Keyboard | keys | Escape closes. ArrowUp/Down cycle. Enter runs the selected command. |
| Mouse | mousedown | preventDefault so the editor selection stays valid, then run |

## States
- **Closed**: Default.
- **Open**: Filter shrinks the list as the query grows. `/ai` → Ask AI first; `/mer` → Mermaid only.
- **No matches**: Empty copy; Enter does not insert.
- **Markdown mode**: Menu does not appear (textarea, not TipTap).
- **Ask AI panel open**: Menu does not appear.

## Acceptance Criteria
- [ ] / at the start of a block opens the menu; / mid-sentence does not.
- [ ] Menu is a listbox labeled Slash commands.
- [ ] Six commands, Ask AI first: Ask AI, Mermaid, Dataset, Query, AI Diagram, AI Image.
- [ ] `/ai` highlights Ask AI; `/mer` still inserts Mermaid.
- [ ] Escape closes without inserting.
- [ ] Enter on an insert command inserts the block (trailing empty paragraph) and consumes the /query text.
- [ ] Enter on Ask AI opens the Ask AI prompt and consumes the /query text.
- [ ] Menu is absent in Markdown-only mode.

## Notes
- Source: src/components/Editor/index.tsx (detectSlashTrigger), insertBlock.ts (`SLASH_COMMANDS`).
- Toolbar insert buttons stay insert-only (`INSERT_COMMANDS`); they do not include Ask AI.
- Ask AI prompt / preview: [ask-ai.md](./ask-ai.md).
