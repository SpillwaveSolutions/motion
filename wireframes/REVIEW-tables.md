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

## Evidence
- `bun run typecheck`, `bun run guard:client` (42 modules, no `Bun.`), `bun test src` (149), Playwright 44 passed including 3 table specs
- Screenshots: none on this green run
- Console / network issues: none on the table specs

## Notes / Recommended Fixes
- Column resize is deliberately off — colwidths cannot round-trip through GFM. Not a miss.
- Insert Table while the caret is already in a table can nest a table if the schema allows it. E2E always starts from a heading. DocCommands later can own "insert after this table".
- Delete row / column / table and Tab-between-cells are not independently e2e'd. Not blocking; the chrome and commands are the same path as Add row.
