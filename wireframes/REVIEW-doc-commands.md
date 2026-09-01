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
- [x] Every locator in one turn resolves against the document the model saw. — PASS (`commands.test.ts`: two `replace_range`s against the original note both apply; sequential-against-updated would fail the second)
- [x] Commands that touch the same table fold into one rewrite. — PASS (unit: two `table_update_cell`s on one table compose)
- [x] Genuinely overlapping edits error in the panel by naming the pair. — PASS (unit: overlapping `replace_range`s name the pair; not silently dropped)

## Evidence
- `bun run typecheck`, `bun run guard:client` (43 modules, no `Bun.` from `main.tsx`; `service.ts` stays off the graph)
- `bun test src` (new snapshot / overlap / fold cases in `commands.test.ts`)
- Playwright 48 passed (4 DocCommands specs + existing 44) on the previous green run; this slice does not add a new e2e for overlap (unit covers the planner)

## Notes / Recommended Fixes
- Voice/dictation dispatch is P3 and correctly not built. The registry (`dispatchDocCommands`) is the hook.
- Snapshot planning is closed: locators resolve against one document, same-table commands fold, overlaps are refused by naming the pair, edits apply right-to-left. Tool descriptions and the CLI trailer state the contract so the model does not chain onto an earlier command's output.
- Packaged Tauri still one-shots `run_llm_cli` until the sidecar. CLI path parses a `doccommands` fence; SDK path uses real tool_use. No second Rust LLM loop.
