# Adversarial Review: Zoom

**Wireframe:** `wireframes/zoom.md`
**Verdict:** PASS WITH NOTES

Reviewed against the browser stand-in (`bun run dev` + Playwright). View menu
accelerators are compiled in Rust and cannot be clicked here.

## Criteria Results

- [x] ⌘+ (or Ctrl+) grows the computed root font size by one step. — PASS (`src/lib/zoom.ts` `nextZoom` + `useZoom` window listener; `e2e/zoom.spec.ts` asserts 16px → 17.6px → 19.2px)
- [x] ⌘- shrinks it by one step. — PASS (same spec, 19.2px → 17.6px)
- [x] ⌘0 restores exactly 16px. — PASS
- [x] Holding the key cannot go below 75% or above 200%. — PASS (20× in → 32px; 30× out → 12px; unit test clamps at 0.75 / 2.0)
- [x] The level survives a reload (settings file round-trip, not just React state). — PASS (`POST /api/settings` then reload; computed font-size still 19.2px). `MOTION_SETTINGS_FILE` redirects so the suite never writes `~/.config/motion/settings.json`.
- [x] Client bundle still has no `Bun.`. — PASS (`bun run guard:client`, 53 modules)

## Evidence

- `bun run typecheck`
- `bun run guard:client` (53 modules, no `Bun.`)
- `bun test src` (248, including `zoom.test.ts`, `settings.test.ts`, `settingsIo.test.ts`)
- Playwright: `e2e/zoom.spec.ts` 3 passed (`CI=1`)

## Notes / Recommended Fixes

- Actual window drag and View → Zoom In/Out/Actual Size are desktop-only. Linux CI cannot click a `.app`. Mac dogfood should: ⌘+, ⌘-, ⌘0, then quit and relaunch and confirm the scale is still there.
- `settingsIo.ts` is Bun/Node-only; the client talks `settingsClient.ts` (fetch / `invoke`). Unknown JSON keys (`launchMode`, `port`, …) are preserved on write.
- Debounced persist is 500ms. Holding the key does not write per repeat. E2E polls `/api/settings` rather than sleeping.
- Web mode `preventDefault`s the browser's own page-zoom. Chromium E2E asserts CSS `html` font-size, not visual zoom.
