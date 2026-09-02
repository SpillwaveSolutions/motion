# Adversarial Review: Copy All

**Wireframe:** `wireframes/shell.md` (plus native-chrome.md)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] Copy All is a labeled header button (Copy all). — PASS (`src/App.tsx` `aria-label="Copy all"`, `data-testid=copy-all`; `e2e/smoke.spec.ts` `getByRole("button", { name: "Copy all" })`)
- [x] Disabled until a note is selected. — PASS (`disabled={!currentFilePath}`; `e2e/copy.spec.ts` "disabled until a note is selected"; File menu no-ops via `currentFilePathRef`)
- [x] Click writes markdown + HTML to the clipboard. — PASS (`copyNote.ts` writes `text/plain` markdown and `text/html` wrapped, sanitized HTML; unit tests both MIME types and the writeText fallback; e2e stubs ClipboardItem and asserts both types)
- [x] Label becomes Copied. — PASS (visible text `Copied` for 1.5s; `aria-live="polite"` so AT hears it; e2e asserts via `getByTestId("copy-all")` because the accessible name stays **Copy all**)
- [x] Live buffer, unsaved edits included. — PASS (`liveMarkdownRef` is updated on every editor change; e2e fills markdown source then copies `# Pasted later` / `**bold live edit**` and sees `<h1>` + `<strong>`/`<b>`)
- [x] File menu has the same action, no accelerator. — PASS (`src-tauri/src/lib.rs` `MenuItemBuilder::with_id("copy_all", "Copy All")` with no accelerator; `motion-menu` `copy_all` calls the same handler)
- [x] Client bundle still has no `Bun.` — PASS (`bun run guard:client`, 48 modules)

## Evidence
- `bun run typecheck`
- `bun run guard:client` (48 modules, no `Bun.`)
- `bun test src` (220, including 6 in `copyNote.test.ts`)
- Playwright: 57 passed (`e2e/copy.spec.ts` 3 + smoke visibility)

## Notes / Recommended Fixes
- The OS paste target picking MIME (VS Code vs Word/Mail) is not e2e'd. Linux CI has no host pasteboard; the stub asserts Motion *handed* both types to `clipboard.write`. Mac dogfood should paste once into a markdown editor and once into Notes/Mail.
- Native File → Copy All is not disabled when no note is selected (Tauri menus don't bind `disabled` here). The handler no-ops. Fine this slice; do not add an accelerator (⌘⇧C is Inspect).
- `aria-live` on a button is a compromise so the accessible name can stay **Copy all**. A separate `role=status` would be more textbook; not worth a second control this slice.
- HTML is sanitized with DOMPurify after `marked`. Unit tests inject a passthrough/fake sanitizer because DOMPurify is not a function under bun (same as `security.test.ts`); the e2e path runs the real sanitizer.
