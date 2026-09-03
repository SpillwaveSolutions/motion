# Adversarial Review: Rename a note

**Wireframe:** `wireframes/rename.md` (plus `shell.md` tree row)
**Verdict:** PASS WITH NOTES

## Criteria Results

- [x] New Note lands in inline rename on the created file. — PASS (`setRenamingPath(path)` after write; `e2e/rename.spec.ts` + persistence spec Escape out of the field)
- [x] Typing a name and Enter renames on disk; the tree and editor follow. — PASS (POST `/api/fs/rename` 200; treeitem `${name}.md` selected; editor still shows New Note)
- [x] Escape on a new note keeps the untitled filename. — PASS (selected `untitled-*` treeitem; shared workspace may already contain other untitled notes from persistence)
- [x] Right-click → Rename starts the same inline field. — PASS (`role=menuitem` Rename; field value is the stem)
- [x] Omitting `.md` still writes a markdown file. — PASS (first spec types a stem; dest gains `.md`. Unit: `renameDestPath`)
- [x] Renaming onto an existing name is refused. — PASS (contract `exists`; HTTP 409). Not e2e'd: fixtures fail on ≥400.
- [x] A path that would leave the workspace is refused. — PASS (contract `denied`; typed `/` and `..` are stripped to a same-folder name). Folders are not renamed this slice.

## Evidence

- `bun run typecheck`
- `bun run guard:client` (53 modules, no `Bun.`)
- `bun test src` (248, including `renameNote.test.ts` and the five rename contract cases)
- Playwright: `e2e/rename.spec.ts` 5 passed; persistence New Note still green after Escape
- Rust contract runner not executed here (no glib in this sandbox). CI `cargo test --lib` is the gate.

## Notes / Recommended Fixes

- Finder/VS Code second-click-to-rename is implemented, but a double-click (`detail > 1`) and a right-click (`button !== 0`) do not start rename, so a habitual double-click does not steal the row. F2 is the keyboard path.
- Empty Enter stays in the field; empty blur / Escape cancels. Conflict `alert`s and stays in rename. The OS `prompt` is not used.
- Dirty buffer is written to the old path, then renamed. Autosave could theoretically POST the old path during that await; not observed in E2E. If it flakes, gate autosave while `renamingPath` is set.
- Collision is unit/contract only. A Playwright `guard.allow(/409/)` spec would make the refusal visible; skipped this slice so the network gate stays strict.
- Folder rename is explicitly out of scope.
