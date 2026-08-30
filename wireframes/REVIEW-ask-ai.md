# Adversarial Review: Ask AI

**Wireframe:** `wireframes/ask-ai.md` (also `slash-menu.md`, `editor.md`)
**Verdict:** PASS WITH NOTES

Reviewed against Playwright `e2e/ai.spec.ts` (5/5) plus `e2e/journeys.spec.ts`
slash-menu Mermaid, `bun test src` for `buildAiContext` / slash filter, and
`bun run verify` (40 e2e, 123 unit, typecheck, client-bundle guard). This
environment is Linux + Chromium, not a packaged Motion.app.

## Criteria Results

### ask-ai.md

- [x] Selecting text in WYSIWYG/Split shows an **Ask AI** bubble; Markdown mode never does. — PASS (`e2e/ai.spec.ts` selection + markdown specs)
- [x] `/` at the start of a block lists **Ask AI** first; `/ai` highlights Ask AI; `/mer` still inserts Mermaid. — PASS (unit `insertBlock.test.ts`, `journeys.spec.ts` `/mer`)
- [x] `/ai` (Enter or click) opens the prompt and consumes the slash query. — PASS
- [x] A reply is previewed before any document mutation. — PASS (preview region visible; editor still has original text until Replace/Insert)
- [x] Replace and Insert below each apply as a single undo step (⌘Z undoes the whole AI op). — PASS WITH NOTES: implementation is one `chain().run()` transaction; ⌘Z is not asserted in Playwright
- [x] Refine uses this panel, hides Insert below, and does not `alert()` on failure. — PASS (success + failure specs; HTTP 200 `{error}` envelope)
- [x] Escape / Discard leaves the document unchanged. — PASS WITH NOTES: Discard is in the failure spec; Escape is wired (`handleKeyDown`) but not driven in Playwright
- [x] Try again re-runs the same instruction. — PASS WITH NOTES: button is present on error/preview; the re-run path is unit-covered via `runAskAi`, not a second Playwright click
- [x] Failure copy is in the panel (no alert, no uncaught exception). — PASS
- [x] Markdown mode: Refine preview + Replace still work. — PASS

### slash-menu.md (delta)

- [x] Menu is a listbox labeled Slash commands. — PASS
- [x] Six commands, Ask AI first. — PASS
- [x] Toolbar insert buttons stay insert-only. — PASS (unit)

## Evidence

- `bun run verify` green: typecheck, `guard:client` (38 modules, no `Bun.`), 123 unit, 40 Playwright.
- Specs: `e2e/ai.spec.ts`, `e2e/journeys.spec.ts` (`/mer` → Mermaid).
- Failure path stubs `POST /api/llm` as HTTP 200 `{ error }` so the ≥400 gate does not fire.

## Notes / Recommended Fixes

- ⌘Z-after-Replace is the honest remaining dogfood check on a Mac.
- Bubble placement (`coordsAtPos`, above the selection) is not screenshot-baselined; Chromium e2e only asserts the button exists after a triple-click.
- Streaming, Anthropic SDK / sidecar, tables, DocCommands, and dictation are out of scope (P2/P3 on the same epic).
