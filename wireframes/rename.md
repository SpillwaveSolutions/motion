# Screen: Rename a note

## Goal
Give a newly created note a real name without leaving the tree, and let any
existing note be renamed the same way. Finder-like: inline, not a prompt.

## Layout

The tree row of the target file is replaced by an icon plus a text field:

```
▾ docs/
  [icon] [standup        ]   ← inline rename, contents selected
  note-b.md
```

Right-click on a file:

```
┌──────────┐
│ Rename   │
└──────────┘
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| New Note | existing | After the file is created and selected, the tree enters rename on that row. |
| Inline field | textbox | aria-label **Rename note**. `data-testid=rename-note`. Shows the stem (no `.md`). Select-all on focus. |
| Enter / blur | commit | Same folder, illegal path chars stripped. `.md` is added if the user omitted an extension. No-op if the name did not change. |
| Escape | cancel | Restores the previous basename. New notes keep `untitled-….md`. |
| Right-click | menu | `role=menu` with **Rename**. Selects the file first. `data-testid=note-context-menu`. |
| F2 | shortcut | Starts rename on the selected file. |
| Conflict | error | If that name already exists, stay in rename and `alert` a readable message. No silent overwrite. |

## States
- **Idle**: tree rows are buttons, as today.
- **Renaming**: the target row is an input; other rows still select/open.
- **Conflict / empty name**: conflict stays in rename and `alert`s. Empty Enter stays in the field. Empty blur or Escape cancels (untitled files keep their name).
- **No file selected**: F2 does nothing.

## Acceptance Criteria
- [ ] New Note lands in inline rename on the created file.
- [ ] Typing a name and Enter renames on disk; the tree and editor follow.
- [ ] Escape on a new note keeps the untitled filename.
- [ ] Right-click → Rename starts the same inline field.
- [ ] Omitting `.md` still writes a markdown file.
- [ ] Renaming onto an existing name is refused.
- [ ] A path that would leave the workspace is refused.

## Notes
- Source: `src/App.tsx`, `src/lib/renameNote.ts`, `src/lib/fsCore.ts`.
- Folders are not renamed this slice.
