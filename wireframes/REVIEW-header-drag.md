# Adversarial Review: Restore header window drag

**Wireframe:** `wireframes/native-chrome.md` (Drag region / grab strip)
**Verdict:** PASS WITH NOTES

Linux cannot dogfood an overlay title bar. This pass checks markup, CSS, and
the browser stand-in. Actual `NSWindow` movement is a Mac dogfood item.

## Criteria Results

- [x] Header sets `-webkit-app-region: drag` in Tauri and includes a grab strip so packed controls cannot eat the drag surface. — PASS
  - `html[data-tauri="true"] .app-header` sets `-webkit-app-region: drag` / `app-region: drag`
  - buttons, inputs, anchors, and `[data-tauri-drag-region="false"]` are `no-drag`
  - `.header-drag-gutter` (`data-testid=header-drag-gutter`, `data-tauri-drag-region`) sits between the view toggle and the action buttons, `flex: 1 1 3rem; min-width: 2rem`
  - `e2e/smoke.spec.ts` asserts the gutter is visible
  - `main.tsx` sets `document.documentElement.dataset.tauri = "true"` when `isTauri()`
- [x] View menu Zoom In / Out / Actual Size fire the same zoom as ⌘+ / ⌘- / ⌘0. — PASS (Rust menu ids `zoom_in` / `zoom_out` / `zoom_reset`; `useZoom` listens on `motion-menu`). Not clicked in this environment.

## Evidence

- `bun run typecheck`
- `bun run guard:client`
- Playwright smoke: `getByTestId("header-drag-gutter")` visible

## Notes / Recommended Fixes

- Overlay + CSS `drag` is belt-and-suspenders with `data-tauri-drag-region`. Tauri 2 honors both on macOS. If a future WebKit build ignores one, the other still grabs.
- The gutter is also present in browser mode (harmless spacer) so E2E can see it without a webview.
- Mac dogfood: grab the strip between Split and Share/Copy All and move the window. Clicking Copy All / Search / view toggle must not start a drag.
