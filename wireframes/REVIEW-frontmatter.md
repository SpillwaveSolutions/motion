# Adversarial review: front matter and export spacing

**Wireframes:** `wireframes/editor.md` (two front matter lines) and `wireframes/themes.md` (two export lines)
**Verdict:** PASS WITH NOTES

## Criteria results

- [x] YAML front matter does not show in WYSIWYG. The Markdown view shows it unchanged. PASS (`e2e/frontmatter.spec.ts`: no `title:` text and no `hr` in `.ProseMirror`; the Markdown source starts with the original block; the note stays clean).
- [x] An edit to the body saves the file with the front matter unchanged on top. PASS (`e2e/frontmatter.spec.ts` reads the file back after the autosave). Before the fix, one keystroke wrote `* * *` and `## title: ...` to disk.
- [x] The export preview, PDF, and Word file do not show YAML front matter. PASS (`e2e/export.spec.ts`: one H1 in the preview, no `previous:` in the PDF or in `word/document.xml`).
- [x] Headings, paragraphs, and tables have space in PDF and Word. Two tables stay apart. PASS (`src/lib/export.test.ts`: Word `w:spacing` on headings and paragraphs and an empty paragraph after each table; PDF gaps under the title rule, above a heading, and between two tables).

## Attacks tried

- A rule on a line other than line 1 is not front matter. A `---` rule with no closing fence is not front matter (`src/lib/frontmatter.test.ts`).
- Change the front matter in the Markdown view, go back to WYSIWYG, and type. The file keeps the new block, once (`e2e/frontmatter.spec.ts`).

## Not tested

- Ask AI whole-document replies. From the code: a reply with no front matter keeps the stored block, and a reply with front matter replaces it. No test covers this.

## Notes

- The front matter is not editable in WYSIWYG. Use the Markdown view.
- `joinFrontmatter` writes a `---` closing fence, so a `...` closing fence becomes `---` after the first save.
- Copy All keeps the front matter in the markdown copy and drops it from the rich text copy.
