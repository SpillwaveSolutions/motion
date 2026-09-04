# Adversarial Review: Zoom (content, not chrome)

**Wireframe:** `wireframes/zoom.md`
**Verdict:** PASS WITH NOTES

Reviewed against the browser stand-in (`bun run dev` + Playwright). View menu
accelerators are compiled in Rust and cannot be clicked here.

## Criteria Results

- [x] ⌘+ grows the editor paragraph (bounding box), not the header button. — PASS
  (`e2e/zoom.spec.ts`: Open Folder box unchanged; ProseMirror `p` grows; `--zoom` 1 → 1.1)
- [x] Root `html` font-size stays `16px` at every level. — PASS
- [x] ⌘- shrinks content by one step. — PASS
- [x] ⌘0 restores 100%. — PASS
- [x] Holding the key cannot go below 75% or above 200%. — PASS (`--zoom` 2 / 0.75)
- [x] The level survives a reload. — PASS (settings round-trip, `MOTION_SETTINGS_FILE`)
- [x] Overlay `role=status` `aria-label=Zoom level` shows 110% then 100%, then disappears. — PASS
- [x] Client bundle still has no `Bun.`. — PASS (`bun run guard:client`, 58 modules)

## Evidence

- `bun run typecheck`
- `bun run guard:client`
- `bun test src` (274, including `zoom.test.ts`, `settings.test.ts`)
- Playwright: `e2e/zoom.spec.ts` 4 passed (`CI=1`)

## Notes / Recommended Fixes

- CSS `zoom` on `.editor-zoom` and `.file-tree` is the path. Header rem tokens stay
  anchored at 16px. macOS 12 dogfood should confirm WKWebView honors `zoom`; the
  plan's token fallback is not wired unless that fails.
- View → Zoom In/Out/Actual Size still dispatch `motion-menu`. Not clicked here.
- HUD is not shown for the value restored from disk.
