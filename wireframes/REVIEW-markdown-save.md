# Adversarial review: markdown save and folder load

**Wireframe:** `wireframes/editor.md` (the File loaded state and the last two criteria) and `wireframes/shell.md` (the New Note and New Folder rows and the two new criteria)
**Verdict:** PASS WITH NOTES

## Criteria results

- [x] File loaded state: the serializer writes `- item` and `1. item` lists with no blank line between one-paragraph items, `## 1. Title` headings with no escape, `snake_case` words with no escape, and one final newline. PASS. A probe of 45 inputs through `htmlToMarkdown` and `markdownToHtml` gives these forms. Nested lists, `10.` and higher numbers, `start="0"`, `start="9"`, a bullet list in a numbered list, a quote in an item, and a hard break in an item all come back unchanged. In the real editor, a note with front matter, a quote in an item, or a hard break in an item saves unchanged after an edit to one line.
- [x] An edit to one line saves `- item` lists, `1. item` lists, nested lists, `## 1. Title` headings, and `snake_case` words unchanged. PASS (`e2e/markdown-save.spec.ts`, first test, compares the full file). Five probe notes in the real editor agree for these forms. Other forms change. See Attacks tried.
- [x] The Markdown view shows those lists and headings as written. PASS (`e2e/markdown-save.spec.ts`, second test). The view shows the serializer output, not the bytes on disk. A loose list therefore shows as a tight list.
- [x] New Note and New Folder are disabled while a folder loads. A note made right after the load stays open and listed. PASS in the app, with a test gap. A probe with slow reads saw both buttons disabled after the list response and enabled after the last read. No spec asserts the disabled state. The spec "a new note made while the folder loads stays open and listed" clicks New Note, but Playwright waits until the button is enabled. The click therefore comes after the load, and the spec name is not correct. New Folder has no test for this criterion.
- [x] A note opened from the tree while a folder loads stays open when the load ends. PASS (`e2e/persistence.spec.ts`, last test). A probe also typed into the note while the load was in flight. The text stayed in the editor and the autosave wrote it to disk.

## Attacks tried

Markdown, unit probe and real editor (`?open=` on a note written through `/api/fs/write`, one edit, read the file back):

- Loose list `- a\n\n- b`. Saved as `- a\n- b`. The wireframe allows this, but the HTML changes (`<li><p>a</p></li>` becomes `<li>a</li>`).
- Nested numbered list, `9.` to `11.`, `10.` with a nested bullet, `start="0"`. Unchanged.
- Code block in a list item. The list form is unchanged. The fence gets one new blank line before the closing fence. A top-level code block gets the same blank line. The `fencedCodeBlock` rule did not change, so this is not new. After the first save the file is stable.
- Quote in a list item, hard break in a list item, table in a list item. Unchanged.
- Headings `## 10. Ten`, `## + plus`, `## 1) paren`, `## #hashtag`. Unchanged. `## * star` and `## > quote` keep the escape (`## \* star`). The HTML is the same.
- Paragraphs `1\. x`, `\- x`, `\+ x`, `\* x`, `\# x`. They keep the escape and stay paragraphs.
- Paragraph `1\) not a list`. Saved as `1) not a list`. The next load shows a numbered list. The same happens on `main`, so this is not new. The same input inside a list item (`- 1\) x`) becomes a nested list.
- Underscores: `foo_bar.`, `(foo_bar)`, `naïve_café`, `日本_語`, `a_b_c`, `_emphasis_`, `[a_b](x)`, `` `a_b` ``. Unchanged. `foo_bar_` gets `foo_bar\_`. `x__y` gets `x\_\_y`. `__bold__` becomes `**bold**`. The HTML is the same in each case.
- Italic inside a word (`<p>foo<em>bar</em>baz</p>`). Saved as `foo_bar_baz`. CommonMark does not read an underscore inside a word as emphasis, so the italic is lost on the next load. The same happens on `main`.
- Two adjacent lists (`<ul>…</ul><ul>…</ul>` or two `<ol>`). Saved as one loose list. The second numbered list is renumbered. The same happens on `main`.
- Empty list item, `- a`, Enter, `c`. Saved as `- a\n- b\n- c`. While the item is empty, the save drops it and writes `- a\n\n- b`. The same happens on `main`.
- `<ol start="">` gives `0. a`. `<ol start="x">` gives `NaN. a`, which is not a list. `main` gave `1.`. TipTap does not make these attributes from Markdown, so only pasted HTML can reach this.
- Empty note gives an empty file. A note with only front matter gives `---\ntitle: x\n---\n`. A body with only spaces gives an empty file.
- Open a note with no final newline and do not edit it. No write. The Save button shows All changes saved.

Folder load, real browser with slow reads:

- `/api/fs/list` returns 500. The alert shows, and both buttons are enabled again.
- `/api/fs/workspace` returns 500. The alert shows, and the buttons are enabled again.
- One read never answers. Both buttons stay disabled with no time limit and no message. Before the change they were enabled.
- Menu `new_note` (the `motion-menu` event) while the folder loads. The app writes no file and shows no message.
- Startup `?open=welcome.md` plus Open Folder at the same time. Both loads end, the buttons are enabled, and `welcome.md` stays selected.
- Type into a note opened during the load. The text stays and is saved.

## Not tested

- The desktop app. The `motion://open-file` event and the cross-folder link switch call `activateWorkspace` without a `shown` value. By code reading, two loads that overlap can confuse each other. Load 1 (shown A, select F1) ends first and opens F1. Load 2 (shown A, select F2) then sees F1, not A, and treats F1 as a user choice. F2 does not open. Before the change, F2 opened. Opening two files from Finder at once can cause this.
- Rename during a folder load. The load replaces `contents` at the end, so the search index can keep the old path.
## Notes

- Gates: `bun run typecheck` is clean. `bun test src` gives 352 pass and 0 fail. The full Playwright suite on port 3123 gives 93 passed.

- Test gap: add an assertion that New Note and New Folder are disabled while reads are slow, and rename or change the spec that clicks New Note "while the folder loads". The project Definition of Done needs the new behaviour asserted.
- The disabled New Note and New Folder buttons keep the title "Create a new markdown note" during a load. A user does not see why the button is disabled. The menu path does nothing and gives no message.
- A read that never ends disables New Note and New Folder until the app reloads. A time limit or a per-file timeout prevents this.
- Pre-existing serializer defects that the new rules do not fix: `1)` paragraphs become lists, code blocks get a blank line, italic inside a word is lost, adjacent lists merge, and task list checkboxes are lost (already filed in the work log).

## Fixes after review

- The race spec now checks that New Note and New Folder are disabled during the load, with the title Loading folder…, and enabled after it (`e2e/persistence.spec.ts`).
- Overlapping loads: each load takes a number from `folderLoadGenRef`. A load that a newer load replaced returns before it sets the file list or the open note, so the newest load opens its own file.
- The disabled buttons show the title Loading folder….
- `start=""` and `start="x"` number the list from 1 (`markdown.test.ts`).
- A fenced code block no longer gains a blank line before its closing fence, at the top level or in a list item (`markdown.test.ts`).
- A paragraph that starts with `1) ` keeps its escape. A heading that starts with `1) ` does not get one (`markdown.test.ts`).
- Filed `01M74H3ZDA95Y2VHVB95EJWWV1` for italic inside a word, adjacent lists, empty list items, and `__bold__`. Task list checkboxes stay filed as `01M74DWNZTZX9SX23VCBYMCZ46`.
- Not changed: a `/api/fs/read` that never answers keeps New Note and New Folder disabled. The editor cannot load notes in that state either. A reload of the app clears it.

