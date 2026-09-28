# Adversarial Review: Note links

**Wireframe:** `wireframes/editor.md` (Note link row and the three new acceptance lines)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] Clicking a markdown link to a file in the open folder loads that note and selects it in the tree. — PASS (`e2e/links.spec.ts`: `getting-started.md` and `nested/deeper.md` from `scratch-links.md`; treeitem `aria-selected`)
- [x] Clicking a link that does not resolve to a file does not navigate away from the current note. — PASS (same spec clicks `does-not-exist.md`; still on `scratch-links.md`; page guard saw no 404)
- [x] A web link is not loaded as a note. — PASS as a classifier (`resolveNoteLink` returns `external` for `https:` and `mailto:`). Not clicked in Playwright, so a popup cannot fail the network gate.
- [x] Directory hrefs such as `nested/deeper.md` stay links. — PASS. TipTap's default `isAllowedUri` rejects a slash after a letter and the e2e snapshot showed "See Deeper." as plain text. `isNoteLinkUri` allows it; the nested click then passed.

## Evidence

- `bun run typecheck`
- `bun run guard:client` (59 modules, no `Bun.`)
- `bun test src` (288, then `noteLink.test.ts` 13 after the URI check)
- Playwright `CI=1`: `e2e/links.spec.ts` 3 passed

## Notes

- Markdown source mode is a textarea. Links there are not clickable. WYSIWYG and the editor half of Split are.
- An absolute markdown path outside the open folder is classified as `switch`. The desktop app calls `activateWorkspace`. Browser mode does not, because the dev server's workspace is fixed. That path is unit-tested only. A Mac `.app` has not clicked it.
- `javascript:` and `data:` are not opened.
- Cmd-click is treated as a normal click so a relative href cannot leave the webview.
