---
date: 2026-10-22
slug: pdf-tables
title: Themed tables in PDF export
epic: 01M5JJZFC11HAXZHJJ6N10S79G
items: [01M5JJZFC1Y253JZSTV70R3S3P, 01M5JJZFC136XTFWX2GB74JF2W, 01M5JJZFC1GTE6MWBQE89529RQ, 01M5JJZFC14JQC2NNTQKG2B4GV, 01M5JJZFC1QWPY3EV9WCNZVC01, 01M5JJZFC1MD61SVP5QBX9Q9JR, 01M5JJZFC1B9P22KTJF6JS378H]
---

# Add themed table support to PDF export, clean up v0.6.6, and release v0.6.7

## Context

The PDF export does not draw tables. In `src/lib/exportPdf.ts:125`, the PDF exporter writes each table row as one line of text, with the cells joined by three spaces. Word export (`src/lib/exportDocx.ts:166`) and the HTML preview (`src/lib/exportHtml.ts:38`) draw real tables. Their colors are borrowed from `codeBg`, `heading`, and `muted`. No theme field controls table style.

The v0.6.6 release notes list this defect as work item `01M5FSD7MA4Z0KY4ZRWRV0XJZ3` ("draws tables with no borders"). This plan closes that item.

The outcome:

- PDF export draws real tables with a header row, cell borders, alternating row colors, and text that wraps inside each cell.
- `ExportTheme` gets table fields. You can edit them in the **Themes** dialog.
- Ice Snowstorm and Clay both ship with header and alternating row styles.
- PDF, Word, and the preview all read the same table fields, so the preview still matches the downloaded file.
- The open items from the v0.6.6 release are closed or filed.
- v0.6.7 ships with the release process that v0.6.6 used.

## Set up the worktree

v0.6.6 is on `main` at `5358991` and includes all of the theme work. Branch from `origin/main`:

```bash
git fetch origin
git worktree add ../motion-pdf-tables -b feat/pdf-tables origin/main
cd ../motion-pdf-tables && bun install
```

Open the PR against `main`.

## Add table fields to the theme

File: `src/lib/themes.ts`.

1. Add five color fields to `ExportTheme`:

   | Field | Use |
   | --- | --- |
   | `tableHeaderBg` | Header row fill |
   | `tableHeaderText` | Header row text, bold |
   | `tableRowBg` | Odd body row fill |
   | `tableRowAltBg` | Even body row fill (the alternating stripe) |
   | `tableBorder` | Cell border lines |

   Body cell text uses the existing `text` field.

2. Set the builtin values:

   | Field | Ice Snowstorm | Clay |
   | --- | --- | --- |
   | `tableHeaderBg` | `#1D4E89` (accent) | `#D97757` (clay) |
   | `tableHeaderText` | `#FFFFFF` | `#141413` |
   | `tableRowBg` | `#FFFFFF` | `#FAF9F5` |
   | `tableRowAltBg` | `#E4EDF7` | `#F0EEE6` |
   | `tableBorder` | `#B8C7DB` | `#E8E6DC` |

   The header text contrast is 8.4:1 on Ice and 5.9:1 on Clay. Both pass WCAG AA.

3. In `sanitizeTheme`, read the new fields with `colorOf`. For a field that is missing, fall back to the theme's own colors, not to `CLAY`: `codeBg`, `heading`, `page`, `codeBg`, and `muted`. A custom theme saved by v0.6.6 then exports exactly as it does today. Keep `colorOf` and `parseHex` as the only validation.

## Draw tables in the PDF

File: `src/lib/exportPdf.ts`. Do not add a dependency. `jspdf-autotable` is not installed, and the drawing code is about 60 lines with the existing `jsPDF` calls.

Replace the fallthrough table branch at line 125 with `drawTable(cursor, block)`:

1. Find the column count from the widest row. Pad short rows with empty cells.
2. Give each column a width in proportion to its longest cell text, clamped to 4 to 40 characters, across `PAGE_W - 2 * MARGIN`. Mark this with a `ponytail:` comment. The comment names the ceiling (a character count, not a measured width) and the upgrade path (`doc.getTextWidth`).
3. For each row, wrap each cell with `doc.splitTextToSize(text, colWidth - 2 * PAD)`. The row height is the tallest cell plus padding.
4. Call the existing `ensure(cursor, rowHeight)`. If `ensure` adds a page before a body row, draw the header row again at the top of the new page.
5. Fill the row background with `tableHeaderBg`, `tableRowBg`, or `tableRowAltBg`. Draw each cell border with `rect(..., "S")` in `tableBorder` at 0.5 pt. Draw the text with the existing `PDF_FONT` mapping, bold for the header.
6. Use 10 pt text, matching the current table size. Reuse `hexToRgb` for all colors.

A single cell that is taller than one page overflows the page. Mark it with a `ponytail:` comment. The fix is to split the cell lines across pages, if a real note needs it.

## Use the fields in Word and the preview

- `src/lib/exportDocx.ts`, `table()`: header shading `tableHeaderBg` and header text `tableHeaderText`. Even body rows get `tableRowAltBg` shading, and odd body rows get `tableRowBg`. Set the table `borders` (top, bottom, left, right, insideHorizontal, insideVertical) to `tableBorder`. Keep `hexBare`.
- `src/lib/exportHtml.ts`, the `<style>` block: `th` uses the header fields. `td` uses `tableRowBg`. `tbody tr:nth-child(even) td` uses `tableRowAltBg`. The `th, td` border uses `tableBorder`.

## Add the fields to the Themes dialog

File: `src/components/Themes/dialogs.tsx`. Under the **Accent** field, add a **Tables** subheading and five `ColorField` rows: **Table header**, **Table header text**, **Table row**, **Table alternate row**, and **Table border**. Each row reuses `update()` and the builtin `disabled` rule. **New theme** copies every field already, so new themes get table colors with no extra code.

No theme wireframe exists. Add `wireframes/themes.md` with the form and its new **Tables** group before you change the form. This follows the UI Guard rule in `.claude/UI_GUARD.md`. The change is five fields that reuse an existing control, so one review pass is enough.

## Add tests

Unit tests in `src/lib/export.test.ts`:

1. Both builtins define all five table fields as valid hex values.
2. `sanitizeCustomThemes` with a legacy theme that has no table fields gets `codeBg`, `heading`, `page`, `codeBg`, and `muted` as the fallbacks. A bad hex in one table field falls back the same way.
3. PDF: a three-row table with Ice gives uncompressed output that contains each cell as its own text object (`(Ada) Tj`). It contains the header fill `0.114 0.306 0.537 rg` and the alternate row fill for `#E4EDF7`. It does not contain the old joined line `Ada   Engineer`.
4. PDF: a table with 80 body rows spans two or more pages. The header text appears once on each page.
5. Word: `document.xml` contains the header fill, the alternate row fill, and the border color for Clay.
6. Preview HTML contains the `nth-child(even)` rule with the theme's `tableRowAltBg`.

End-to-end tests in `e2e/export.spec.ts`:

1. Seed `export-table.md` in `e2e/workspace.ts` with a heading and a table of four body rows.
2. Open the note and select **Export PDF**. Pick **Clay**. Check that the preview `th` background is `rgb(217, 119, 87)`. Check that the second body row `td` background is `rgb(240, 238, 230)`. Download the PDF and check that the bytes contain a cell value and the Clay header fill.
3. In the **Themes** dialog, select **New theme**, set **Table header hex** to a new value, and save. Reopen the dialog and check that the value persists.

## Update the docs

- `docs/user_guide/user-guide.md`: in the export section, describe table styling and the five theme fields.
- `README.md`: in the feature list (line 33), state that PDF and Word export themed tables. In known limitations (line 165), add the column width rule and the tall cell limit.
- `docs/designs/current_design_doc.md`: add the table fields to the export theme contract.
- `CHANGELOG.md`: add the PDF table entry under **Unreleased**.
- Publish to the GitHub wiki with the `worklog wiki-add` flow.

## Track the feature work

1. Run `worklog plan-capture` to write `docs/plans/2026-10-22-pdf-tables.md` and add the steps as work items with `milestone:v0.6.7`.
2. Put `01M5FSD7MA4Z0KY4ZRWRV0XJZ3` on `milestone:v0.6.7`. Close it when the PR merges.
3. Run `worklog roadmap-render`. Commit the log and the roadmap together.
4. Run `bun run verify`. Open the PR, run `worklog link-pr`, and merge with a squash merge after CI passes.

## Clean up the v0.6.6 open items

1. Close the release work item `01M5J4C2142M28BJZPBSWJ4Y04` with `worklog close`. Put this change in the v0.6.7 release PR, so no extra PR is necessary.
2. File the DMG failure with `worklog add --unplanned --kind bug`: `bun tauri build` fails at `bundle_dmg.sh`, and the `.app` is not affected. Read the build log during the release build. If the cause is a leftover mounted volume or a Finder automation permission, fix it. If not, release the `.app` only and leave the bug open.
3. Delete the merged branches. Check first that PR 63 and PR 66 show `MERGED` with `gh pr view`. Squash merges do not show in `git branch --merged`, so use the PR state.
   1. Switch the primary checkout from `feat/export-themes` to `main`. The untracked `.arckit/` directory stays.
   2. Delete the local branches `feat/export-themes` and `chore/release-0.6.6`.
   3. Delete the remote branches `origin/feat/export-themes` and `origin/chore/release-0.6.6`.
4. The other three known export defects stay open. They are not in the scope of this plan.

## Release v0.6.7

Use the same steps as the v0.6.6 release commit `5358991` and `docs/release-checklist.md`.

1. Create a release work item `level:task kind:ops milestone:v0.6.7`.
2. On branch `chore/release-0.6.7` from the updated `main`:
   1. Move the **Unreleased** entries in `CHANGELOG.md` to `## 0.6.7, <date>`. Remove the PDF table line from **Known issues**.
   2. Change the version to 0.6.7 in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json`.
   3. Freeze the roadmap snapshot with `worklog roadmap-snapshot` and render the index again.
   4. Close `01M5J4C2142M28BJZPBSWJ4Y04` (cleanup step 1).
3. Run `bun run verify` and `cargo test --lib` in `src-tauri/`. Open the PR and merge it with a squash merge after all CI checks pass.
4. Tag `v0.6.7` on the merge commit. Create the GitHub release with the 0.6.7 changelog section as its notes.
5. Run `bin/smoke-desktop.sh`.
6. Back up `/Applications/Motion.app` to `~/Applications-backup/Motion-0.6.6.app`. Install the new build and check that it reports 0.6.7. Do not change `~/.config/motion/settings.json`.
7. Ask you to do the human checks in `docs/release-checklist.md`. Also ask you to export one note with a table to PDF in the desktop app.
8. Close the v0.6.7 release work item in a small follow-up PR, or in the next PR that touches `.work/`. The item cannot close in the release PR, because the tag and the install come after the merge.

## Verify the change

1. `bun run verify` passes in the feature worktree and on the release branch.
2. Open a PDF that the E2E test downloads for each builtin theme. Check the header fill, the stripes, the borders, and a header that repeats after a page break. The screenshots are for human review only, not assertions.
3. Export the same note to Word and compare the colors with the PDF.
4. `gh release view v0.6.7` shows the release as **Latest**, and the installed app reports 0.6.7.

## Tasks

- [ ] (P1) Add the five table color fields to ExportTheme and both builtins
  Legacy custom themes fall back to their own codeBg, heading, page, and muted colors.
- [ ] (P1) Draw PDF tables with borders, a header row, stripes, wrapping, and a repeated header
  Hand-written with jsPDF. No new dependency.
- [ ] (P2) Use the table fields in the Word export and the HTML preview
- [ ] (P2) Add a Tables group to the Themes dialog with a wireframe
- [ ] (P1) Unit and Playwright tests for themed tables
- [ ] (P2) Update the user guide, README, design doc, changelog, and wiki
- [ ] (P2) Clean up the v0.6.6 branches and file the DMG build failure
