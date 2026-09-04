# Adversarial Review: Header window drag

**Wireframe:** `wireframes/native-chrome.md` (Drag region)
**Verdict:** PASS WITH NOTES

Linux cannot dogfood an overlay title bar. This pass checks the predicate,
markup, and the browser stand-in (no text selection on the logo). Actual
`NSWindow` movement is the Mac dogfood subtask and remains blocked here.

## Criteria Results

- [x] `isWindowDragTarget` is false for buttons, links, inputs, labels, interactive roles, no-drag subtrees. — PASS (`src/lib/windowDrag.test.ts`)
- [x] Logo / gutter / header chrome are grab targets. — PASS (unit)
- [x] `.header-drag-gutter` remains. — PASS (`e2e/smoke.spec.ts`)
- [x] Browser: mousedown on the logo does not start a text selection. — PASS (`e2e/layout.spec.ts`)
- [ ] Mac dogfood: drag from the logo and empty chrome, buttons still click, double-click toggles maximize. — NOT RUN (no Mac in this environment)

## Evidence

- `bun test src` (`windowDrag.test.ts`)
- Playwright smoke + layout

## Notes / Recommended Fixes

- Own handler calls `getCurrentWindow().startDragging()` behind `isTauri()`. Tauri
  2.9.5 is not upgraded. `-webkit-app-region` is documented as Chromium-only.
- Mac dogfood item `01M1MVB300KXXJPZ2XACH7A64K` stays blocked until a real `.app`.
