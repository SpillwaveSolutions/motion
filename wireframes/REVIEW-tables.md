# Adversarial Review: Tables

**Wireframe:** `wireframes/tables.md` (plus slash-menu.md, editor.md)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] Toolbar **Insert Table** creates a 3×3 with a header row. — PASS (`e2e/tables.spec.ts`)
- [x] Slash menu lists Table; `/tab` highlights Table; `/ai` still ranks Ask AI first; `/mer` still inserts Mermaid. — PASS (unit `insertBlock.test.ts` + slash e2e)
- [x] Cells are editable; Tab moves between them. — PASS WITH NOTES: typing into a cell is e2e-covered. Tab is Tiptap Table's default keymap, not separately asserted.
- [x] While the caret is in a table, Add/Delete row and Add/Delete column and Delete table are available and labeled. — PASS WITH NOTES: Add row is e2e-covered (3 rows → 4). The other four buttons share the same `inTable` chrome and Tiptap commands.
- [x] A pipe table in Markdown becomes a real table in WYSIWYG. — PASS
- [x] WYSIWYG table → markdown pipes → save → reload is still a table. — PASS
- [x] Sanitize keeps `table`/`thead`/`tbody`/`tr`/`th`/`td`. — PASS (`e2e/sanitize.spec.ts` legitimate-structure spec now includes a pipe table)
- [x] Markdown mode has no table chrome. — PASS (`inTable && viewMode !== "markdown"`)
- [x] **Insert Table** and `/tab` with the caret already in a table do not nest. — PASS (`e2e/tables.spec.ts` both entry points assert zero `table table`; unit tests on `enclosingTableEnd` + `shiftForDeletedRange`)

## Evidence
- `bun run typecheck`, `bun run guard:client`, `bun test src` (insertBlock helpers + table insert path)
- Playwright: existing table specs plus two new ones (toolbar and slash, caret already in a table)
- Screenshots: none on this green run
- Console / network issues: none on the table specs

## Notes / Recommended Fixes
- Column resize is deliberately off — colwidths cannot round-trip through GFM. Not a miss.
- Nested insert is closed: both entry points append a sibling after the outermost enclosing table, with a separating paragraph so two GFM tables do not re-parse as one. The slash path re-bases the insert position for the `/tab` deletion queued in the same transaction.
- Delete row / column / table and Tab-between-cells are not independently e2e'd. Not blocking; the chrome and commands are the same path as Add row.
