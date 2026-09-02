# Adversarial Review: Markdown source highlighting

**Wireframe:** `wireframes/markdown-source.md` (plus editor.md)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] Markdown mode's accessible control is still a textbox named **Markdown source**. — PASS (`e2e/editor.spec.ts`, `e2e/journeys.spec.ts`)
- [x] Headings, emphasis, strong, inline/fenced code, links, and list markers are colored in Markdown mode. — PASS (`markdownHighlight.test.ts` collects `hljs-section/strong/emphasis/code/link/bullet`; e2e asserts `.hljs-section` is visible)
- [x] Split's right pane uses the same highlighter and is labeled **Markdown preview**. — PASS (e2e `getByLabel("Markdown preview")` + `.markdown-source-preview .hljs-section`)
- [x] Find in note still selects matches in the textarea (Enter cycles). — PASS (`e2e/journeys.spec.ts` find-in-note; textarea is unchanged as the control)
- [x] Typing in Markdown mode still round-trips to WYSIWYG. — PASS (`e2e/journeys.spec.ts` "edits made in the markdown pane reach the editor")
- [x] Highlight layer is not in the accessibility tree (`aria-hidden`). — PASS (`MarkdownSource.tsx` `aria-hidden="true"` on the pre)
- [x] No webfont CDN; colors follow light and dark tokens. — PASS (token-mapped CSS; no CDN)
- [x] Client bundle still has no `Bun.` — PASS (`bun run guard:client`, 46 modules)

## Evidence
- `bun run typecheck`
- `bun run guard:client` (46 modules, no `Bun.`)
- `bun test src` (200)
- Playwright: 3 new editor specs green; journeys markdown/find paths green; persistence including the previously-flaky new-note path green

## Notes / Recommended Fixes
- Grammar is highlight.js markdown via `lowlight`. GFM tables are not tokenized (pipes stay default color). Acceptable this slice; do not add CodeMirror.
- Overlay uses transparent textarea text + `caret-color`. Find's `setSelectionRange` still hits the textarea.
- Switching view modes on an unedited note is covered by the sibling editor dirty-baseline spec, not this wireframe.
