# Screen: DocCommands preview

## Goal
Let Ask AI propose **targeted document edits** (not a blob of markdown) and
preview them as a list before anything is committed. The same four commands
are the dispatch surface for slash/AI tools now and voice later.

## Layout

```
WYSIWYG / Split / Markdown Refine
+------------------------------------------------------------------+
| toolbar … | Refine                                               |
+------------------------------------------------------------------+
| Ask AI panel — preview                                           |
|   Proposed edits (list)                                          |
|     • Replace "quick brown fox" with "quicker fox"               |
|     • Add row to table 1                                         |
|     • Set table 1 r2c1 to "Architect"                            |
|   [ Apply 3 edits ] [ Try again ] [ Discard ]                    |
+------------------------------------------------------------------+
| document (unchanged until Apply)                                 |
+------------------------------------------------------------------+
```

A text-only rewrite (no tools) still uses the existing markdown preview
(Replace / Insert below). This screen is the **commands** branch of that
panel — same dock, same Discard/Escape, different body and primary action.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Proposed edits | list | `role="list"` `aria-label` **Proposed edits**. One row per planned command. Visible in preview when the model returned DocCommands. |
| Edit row | listitem | Human summary from the registry (`Replace "…" with "…"`, `Insert after "…"`, `Add row to table N`, `Set table N rRcC to "…"`). Mono/secondary text. |
| Apply N edits | button | Primary. Label is **Apply 1 edit** or **Apply N edits**. Commits the whole list as one undo step (markdown apply → one `setContent` / buffer replace). Hidden when there are no commands. |
| Replace / Insert below | buttons | Hidden when the preview is a command list. Commands already name their locations. |
| Try again / Discard | buttons | Same as ask-ai.md. Discard applies nothing and aborts an in-flight call. |
| Working | status | **Asking AI…**. If tool calls arrive before `done`, the list may fill in under the status. Document is not mutated. |
| Error | alert | Planning failure (span not unique, no such table, …) lands in the panel with Try again / Discard. No `window.alert`. HTTP 200 SSE. |
| Slash / Refine / bubble | entry | Unchanged. `/ai`, selection Ask AI, and Refine all go through the same pipeline; the model chooses markdown **or** tools. No new slash items for the four ops (too low-level). |

## States
- **Text preview**: no commands in the reply — existing ask-ai.md preview.
- **Commands preview**: list + Apply N edits. Insert below / Replace hidden.
- **Working**: Asking AI…; optional live list as `command` events arrive.
- **Plan error**: a tool call that cannot be applied to the current note.
- **Markdown mode**: Refine can still return commands; Apply rewrites the textarea.
- **Empty list**: treat as an empty reply (error), not a silent no-op.

## Acceptance Criteria
- [ ] A reply that is only markdown still previews as today (Replace / Insert below).
- [ ] A reply with DocCommands shows a **Proposed edits** list and **Apply N edits**.
- [ ] Apply commits every listed edit; the document is unchanged until then.
- [ ] Apply is one undo step (⌘Z reverts the whole batch).
- [ ] `replace_range` replaces a unique span; duplicate/missing spans error in the panel.
- [ ] `insert_after_block` inserts markdown after the unique matching block.
- [ ] `table_add_row` / `table_update_cell` mutate a GFM table (1-based table index).
- [ ] Discard / Escape applies nothing.
- [ ] Try again re-runs the same instruction (tools included).
- [ ] Failure copy is in the panel (no alert, no HTTP ≥400).
- [ ] No new slash commands for the four ops; `/ai` still opens Ask AI.

## Notes
- Registry: `src/lib/ai/commands.ts`. Four ops only this slice:
  `replace_range`, `insert_after_block`, `table_add_row`, `table_update_cell`.
- Transport: same `POST /api/ai/stream`. New SSE events: `{type:"command"}` and
  `done.commands`. Anthropic SDK `tools` when a key is set; CLI fallback is a
  `doccommands` JSON fence. Packaged Tauri still one-shots `run_llm_cli` until
  the sidecar — no second Rust LLM loop.
- Apply is markdown-level (then `markdownToHtml` / textarea), so unit tests
  need no Tiptap. Tables must already round-trip as pipes (tables.md).
- Dictation / voice dispatch is P3 and uses this registry later — do not build
  it here.
- Related: [ask-ai.md](./ask-ai.md), [tables.md](./tables.md), [slash-menu.md](./slash-menu.md).
