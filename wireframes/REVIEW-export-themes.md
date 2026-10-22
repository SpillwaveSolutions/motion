# Adversarial Review: Reload, themed export, theme settings

**Wireframe:** `wireframes/shell.md` (Reload note, Export PDF, Export Word, Themes)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] Reload note re-reads the open file and confirms when dirty. — PASS (`handleReload` confirms only if `dirty`; `reloadSignal` is a load-effect dep. `e2e/export.spec.ts` types `ZZZ-UNSAVED`, accepts the confirm, and the editor returns to the seeded Welcome text.)
- [x] Export PDF and Export Word are disabled until a note is selected, then open a themed dialog with a live preview and a real download. — PASS (buttons use those accessible names and `disabled={!currentFilePath}`. Preview iframe computed style: Clay body `rgb(250, 249, 245)` and h1 `rgb(20, 20, 19)`; Ice body `rgb(243, 246, 251)` and h1 `rgb(11, 31, 75)`. Downloaded PDF starts with `%PDF`; docx starts with `PK`.)
- [x] Ice Snowstorm is ice paper, black text, navy headings, blue accent. Clay is Anthropic ivory / ink / terracotta, with a serif heading. — PASS (theme constants plus the screenshots below. Clay heading font in the settings dialog is `serif`; the preview "Welcome" is a serif with a terracotta rule.)
- [x] Themes dialog can add a custom theme and save it. Builtins cannot be edited or deleted. — PASS (`e2e/export.spec.ts` creates Harbor, POST `/api/settings` returns ok, Harbor is in the list after reopen. Name/color fields are disabled on Clay. Delete is disabled on builtins.)
- [x] Choosing a theme in the export dialog becomes the default. — PASS (`onClose` writes `exportThemeId` when the chosen id differs. Settings merge keeps unknown keys and only writes `themes` / `exportThemeId` when those keys are in the partial.)
- [x] Header buttons stay icon-only with accessible names. — PASS (Reload note, Export PDF, Export Word, Themes).

## Evidence

- `CI=1 bunx playwright test` — 76 passed, including `e2e/export.spec.ts` (3).
- Screenshots: Clay preview (ivory, terracotta rule), Ice preview (ice page, navy heading, blue rule), Themes dialog (Clay hex `#FAF9F5` / `#3D3D3A` / `#141413` / `#D97757`, heading font serif, all fields visible).
- Unit tests in `src/lib/export.test.ts` assert theme sanitizing, HTML colors, PDF bytes containing the heading and Clay accent RGB, and a docx zip whose `document.xml` carries Ice `0B1F4B` / Calibri and Clay `D97757` / Georgia.

## Notes / Recommended Fixes

- PDF fonts are Helvetica / Times / Courier. Word is Calibri / Georgia / Consolas. The preview uses system-ui and Georgia, so it is closer to the brand than the PDF. Called out in the README. Not a blocker.
- The preview iframe is `sandbox="allow-scripts"` without `allow-same-origin`. An empty sandbox made Chromium log "Blocked script execution" for the frame (the page guard treats that as a failure). Markup is escaped; there is no script in the preview document.
- Export uses the in-memory note, including unsaved edits. Reload uses disk. That split is intentional.
- Desktop settings round-trip is in `src-tauri/src/lib.rs` (`exportThemeId`, `themes`). `cargo test --lib` did not link here (`pkg-config` / glib missing). A Mac build is still the place to open the downloaded PDF and docx.
- Custom themes do not expose muted or code colors. Those copy from the theme you duplicate. Fine until someone asks for them.
