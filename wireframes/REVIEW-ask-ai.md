# Adversarial Review: Ask AI (streaming)

**Wireframe:** `wireframes/ask-ai.md`
**Verdict:** PASS WITH NOTES

Reviewed against the P2 streaming contract (tokens in the working panel,
`POST /api/ai/stream` SSE always HTTP 200, SDK vs CLI in the shared TS
service, no second Rust loop). Builder was the P1 slice; this pass checks
the streaming amendment plus the original AC that still apply.

## Criteria Results

- [x] Selecting text in WYSIWYG/Split shows an **Ask AI** bubble; Markdown mode never does. — PASS (`e2e/ai.spec.ts` selection + markdown specs)
- [x] `/` at the start of a block lists **Ask AI** first; `/ai` highlights Ask AI; `/mer` still inserts Mermaid. — PASS (unit `insertBlock.test.ts` + journeys slash spec)
- [x] `/ai` (Enter or click) opens the prompt and consumes the slash query. — PASS
- [x] A reply is previewed before any document mutation. — PASS
- [x] Tokens appear in the panel while the call is in flight. — PASS WITH NOTES: the streaming spec asserts the settled preview contains the concatenated deltas. Playwright fulfills the SSE body in one shot, so the working-state flash is not screenshot-timed.
- [x] Discard during working cancels the request; the document is unchanged. — PASS WITH NOTES: abort is unit-covered on the client (`AbortError` → "cancelled") and Discard is present on the working panel; not a second Playwright click mid-stream.
- [x] Replace and Insert below each apply as a single undo step. — PASS WITH NOTES: one `chain().run()` / markdown-buffer replace. ⌘Z not e2e-asserted (same note as P1).
- [x] Refine uses this panel, hides Insert below, and does not `alert()` on failure. — PASS
- [x] Escape / Discard leaves the document unchanged. — PASS (failure spec leaves the fox sentence)
- [x] Try again re-runs the same instruction. — PASS WITH NOTES: button present; `packPromptParts` keeps context instruction-free so the SDK cache prefix is stable
- [x] Failure copy is in the panel (no alert, no uncaught exception, no HTTP ≥400). — PASS (`e2e/ai.spec.ts` Refine failure, 200 SSE error event)
- [x] Markdown mode: Refine preview + Replace still work. — PASS

## Evidence
- `bun run verify` (typecheck, `guard:client` 40 modules / no `Bun.` / service.ts not on the graph, 142 unit, Playwright including 6 Ask AI specs)
- Screenshots: Playwright failure artifacts only; none on this green run
- Console / network issues: none on the Ask AI specs. Failures are HTTP 200 SSE.

## Notes / Recommended Fixes
- Packaged Tauri still one-shots `run_llm_cli` until the sidecar. That is the P2 contract ("sidecar later, not a second Rust loop"), not a miss.
- Prompt cache breakpoints are set; Anthropic will no-op them under the 1k-token floor on short notes.
- Live working-state tokens would benefit from a delayed-SSE e2e if this starts to flake. Not blocking.
