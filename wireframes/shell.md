# Screen: App chrome (shell)

## Goal
Give the user a workspace of markdown notes they can find by **filename or contents**, create, synthesize, and edit. Notes live in a real folder tree under the opened workspace.

## Layout

```
+-----------------------------------------------------------------+
| [logo] Motion | Search notes... | WYSIWYG Markdown Split |      |
|               |                 | Open Folder  New Note  Save  Synthesize |
+-----------------------------------------------------------------+
| (optional synthesis status banner + dismiss)                    |
+-----------------+-----------------------------------------------+
| FOLDER NAME     |                                               |
| ▾ docs/         |              Editor (see editor.md)           |
|   note-a.md     |                                               |
| ▾ src/          |                                               |
|   note-b.md     |                                               |
| untitled-....md |                                               |
+-----------------+-----------------------------------------------+
```

Sidebar is a **collapsible directory tree** of every .md under the workspace (not a flat list). Folders show relative path segments; files show basename. Sort is name-only within each folder.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Logo + Motion | brand | Always visible |
| Search notes | text input | Filters the tree by basename **or file contents**. aria-label Search notes. ⌘/Ctrl+K focuses it. A content hit shows a one-line snippet under the basename. Matching expands ancestor folders of hits. |
| View toggle | 3 buttons | WYSIWYG / Markdown / Split. role=group aria-label=Editor view mode. Each button has aria-pressed. |
| Open Folder | secondary | Desktop: native picker. Web: MOTION_WORKSPACE via storage. Errors via alert. |
| New Note | primary | Disabled until a folder is open. Creates untitled-ISO-timestamp.md with # New Note at the **workspace root**, selects it, clears search. |
| Save | primary when dirty | Header control, aria-label Save note. Disabled with no note selected or while saving. Label: Save / Saving… / Saved / Save failed. ⌘/Ctrl+S also saves. Auto-saves 1.5s after the last edit. |
| Synthesize | secondary | Disabled with no folder, or while a synthesis status is showing. See synthesize.md. |
| Synthesis banner | status | role=status aria-live=polite. Dismiss (x) with aria-label Dismiss synthesis status. |
| Sidebar heading | h3 | Workspace basename, or Documents if none |
| Empty list | copy | No folder opened or no markdown files found. |
| No match | copy | No notes match "{query}". |
| Note tree | tree | role=tree aria-label=Notes. Folders are expandable buttons (aria-expanded). Files are buttons with role=treeitem and aria-selected. Shows basename for files; relative folder segments for directories. A dirty selected note shows a • mark. |

## States
- **No folder**: Documents heading, empty copy, New Note and Synthesize disabled.
- **Folder, no .md**: Empty copy.
- **Folder with notes**: Collapsible tree; selected file has active + aria-selected. Folders default expanded.
- **Filter miss**: No-match copy, tree empty (or only empty folders collapsed away).
- **Synthesis in flight / done / failed**: Banner; Synthesize stays disabled until dismiss.
- **Open / create error**: window.alert (current).
- **Narrow (~390px)**: Sidebar hidden (existing). Header wraps: search goes full width; view toggle and Open / New Note / Synthesize stay reachable. No horizontal overflow.

## Acceptance Criteria
- [ ] Header, sidebar, and editor are all visible on a desktop viewport.
- [ ] Open Folder is always available; New Note and Synthesize require an open folder.
- [ ] Search filters by filename **or contents** and has aria-label Search notes.
- [ ] ⌘/Ctrl+K focuses the Search notes field.
- [ ] Note list is a **tree** (role=tree) of real buttons (not clickable divs) with aria-selected on files and aria-expanded on folders.
- [ ] Selecting a note loads it in the editor.
- [ ] New Note writes untitled-{timestamp}.md at workspace root, selects it, and appears in the tree.
- [ ] Sidebar is a collapsible folder tree (not a flat basename list).
- [ ] WYSIWYG / Markdown / Split toggle is a labelled group; the active mode has aria-pressed.
- [ ] Synthesis banner is dismissible and uses role=status.
- [ ] Save is a labeled header button (Save note). Disabled until a note is selected.
- [ ] A dirty note autosaves ~1.5s after the last edit and can be saved immediately with the button or ⌘S.

## Notes
- Source: src/App.tsx.
- Content search reads each note once when the folder opens and caches it.
- Tree is built from absolute paths returned by storage.listFiles; relative segments use the workspace root as base.
