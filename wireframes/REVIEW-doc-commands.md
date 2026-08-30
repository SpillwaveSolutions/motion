# Adversarial Review: DocCommands

**Wireframe:** `wireframes/doc-commands.md` (plus ask-ai.md, editor.md, tables.md)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] A reply that is only markdown still previews as today (Replace / Insert below). — PASS (`e2e/ai.spec.ts` unchanged, all 6 green)
- [x] A reply with DocCommands shows a **Proposed edits** list and **Apply N edits**. — PASS (`e2e/doc-commands.spec.ts`)
- [x] Apply commits every listed edit; the document is unchanged until then. — PASS (Apply adds Grace/Architect; Discard leaves Ada only)
- [x] Apply is one undo step (⌘Z reverts the whole batch). — PASS WITH NOTES: apply is one `setContent` / buffer replace of the planned markdown. ⌘Z is the existing Tiptap/textarea undo of that write, not separately e2e'd.
- [x] `replace_range` replaces a unique span; duplicate/missing spans error in the panel. — PASS (unit `commands.test.ts`; missing/duplicate error copy)
- [x] `insert_after_block` inserts markdown after the unique matching block. — PASS (unit + `/ai` e2e INSERTED_OK)
- [x] `table_add_row` / `table_update_cell` mutate a GFM table (1-based table index). — PASS (unit both ops; e2e add-row)
- [x] Discard / Escape applies nothing. — PASS (Discard e2e)
- [x] Try again re-runs the same instruction (tools included). — PASS WITH NOTES: same `submitAskAi` path as markdown Try again; not independently e2e'd for commands.
- [x] Failure copy is in the panel (no alert, no HTTP ≥400). — PASS (`no table 9` alert in the panel)
- [x] No new slash commands for the four ops; `/ai` still opens Ask AI. — PASS (`insertBlock.test.ts` still 7 commands; `/ai` e2e)

## Evidence
- `bun run typecheck`, `bun run guard:client` (43 modules, no `Bun.` from `main.tsx`; `service.ts` stays off the graph)
- `bun test src` (175)
- Playwright 48 passed (4 new DocCommands specs + existing 44)

## Notes / Recommended Fixes
- Voice/dictation dispatch is P3 and correctly not built. The registry (`dispatchDocCommands`) is the hook.
- Commands apply sequentially against the updated markdown. A model that emits two `replace_range`s whose `old_text` only exists in the original document can fail the second; Try again is the recovery.
- Packaged Tauri still one-shots `run_llm_cli` until the sidecar. CLI path parses a `doccommands` fence; SDK path uses real tool_use. No second Rust LLM loop.
