# Screen: App chrome (shell)

## Goal
Give the user a workspace of markdown notes they can find by **filename or contents**, create, synthesize, and edit.

## Layout

```
+-----------------------------------------------------------------+
| [logo] Motion | Search notes... | WYSIWYG Markdown Split |      |
|               |                 | Open Folder  New Note  Save  Synthesize |
+-----------------------------------------------------------------+
| (optional synthesis status banner + dismiss)                    |
+-----------------+-----------------------------------------------+
| FOLDER NAME     |                                               |
| note-a.md       |              Editor (see editor.md)           |
| note-b.md       |                                               |
| untitled-....md |                                               |
+-----------------+-----------------------------------------------+
```

Sidebar is a **flat** list of every .md under the workspace (not a directory tree). Sort is name-only.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Logo + Motion | brand | Always visible |
| Search notes | text input | Filters the list by basename **or file contents**. aria-label Search notes. ⌘/Ctrl+K focuses it. A content hit shows a one-line snippet under the basename. |
| View toggle | 3 buttons | WYSIWYG / Markdown / Split. role=group aria-label=Editor view mode. Each button has aria-pressed. |
| Open Folder | secondary | Desktop: native picker. Web: MOTION_WORKSPACE via storage. Errors via alert. |
| New Note | primary | Disabled until a folder is open. Creates untitled-ISO-timestamp.md with # New Note, selects it, clears search. |
| Save | primary when dirty | Header control, aria-label Save note. Disabled with no note selected or while saving. Label: Save / Saving… / Saved / Save failed. ⌘/Ctrl+S also saves. Auto-saves 1.5s after the last edit. |
| Synthesize | secondary | Disabled with no folder, or while a synthesis status is showing. See synthesize.md. |
| Synthesis banner | status | role=status aria-live=polite. Dismiss (x) with aria-label Dismiss synthesis status. |
| Sidebar heading | h3 | Workspace basename, or Documents if none |
| Empty list | copy | No folder opened or no markdown files found. |
| No match | copy | No notes match "{query}". |
| Note list | listbox | role=listbox aria-label=Notes. Each item is a button role=option with aria-selected. Shows basename only. A dirty selected note shows a • mark. |

## States
- **No folder**: Documents heading, empty copy, New Note and Synthesize disabled.
- **Folder, no .md**: Empty copy.
- **Folder with notes**: Flat list; selected row has active + aria-selected.
- **Filter miss**: No-match copy, list empty.
- **Synthesis in flight / done / failed**: Banner; Synthesize stays disabled until dismiss.
- **Open / create error**: window.alert (current).
- **Narrow (~390px)**: Sidebar hidden (existing). Header wraps: search goes full width; view toggle and Open / New Note / Synthesize stay reachable. No horizontal overflow.

## Acceptance Criteria
- [ ] Header, sidebar, and editor are all visible on a desktop viewport.
- [ ] Open Folder is always available; New Note and Synthesize require an open folder.
- [ ] Search filters by filename **or contents** and has aria-label Search notes.
- [ ] ⌘/Ctrl+K focuses the Search notes field.
- [ ] Note list is a listbox of real buttons (not clickable divs) with aria-selected.
- [ ] Selecting a note loads it in the editor.
- [ ] New Note writes untitled-{timestamp}.md, selects it, and appears in the list.
- [ ] Sidebar is flat (basenames only), not a tree.
- [ ] WYSIWYG / Markdown / Split toggle is a labelled group; the active mode has aria-pressed.
- [ ] Synthesis banner is dismissible and uses role=status.
- [ ] Save is a labeled header button (Save note). Disabled until a note is selected.
- [ ] A dirty note autosaves ~1.5s after the last edit and can be saved immediately with the button or ⌘S.

## Notes
- Source: src/App.tsx.
- Content search reads each note once when the folder opens and caches it.
