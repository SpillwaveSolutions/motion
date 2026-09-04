# Screen: App chrome (shell)

## Goal
Give the user a workspace of markdown notes they can find by **filename or contents**, create, synthesize, and edit. Notes live in a real folder tree under the opened workspace.

## Layout

```
+-----------------------------------------------------------------+
| [logo] Motion | Search notes... | WYSIWYG Markdown Split |      |
|               |                 |  [share] [copy] [folder]      |
|               |                 |  [note] [new folder] [save]   |
|               |                 |  [synthesize]                 |
+-----------------------------------------------------------------+
| (optional synthesis status banner + dismiss)                    |
+--------+--+-----------------------------------------------------+
| FOLDER |<>|                                                     |
| ▾ docs/|  |              Editor (see editor.md)                 |
|   a.md |  |              fills the remaining width              |
| ▾ src/ |  |                                                     |
|   b.md |  |                                                     |
+--------+--+-----------------------------------------------------+
```

Header action buttons are **icon-only** with the same accessible names as
before (aria-label + title). WYSIWYG / Markdown / Split stay text.

Sidebar is a **collapsible directory tree** of every .md under the workspace (not a flat list). Folders show relative path segments; files show basename. Sort is name-only within each folder. Trailing edge is a resize handle (see layout.md).

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Logo + Motion | brand | Always visible. Part of the window drag surface on desktop. user-select none. |
| Search notes | text input | Filters the tree by basename **or file contents**. aria-label Search notes. ⌘/Ctrl+K focuses it. A content hit shows a one-line snippet under the basename. Matching expands ancestor folders of hits. |
| View toggle | 3 buttons | WYSIWYG / Markdown / Split. role=group aria-label=Editor view mode. Each button has aria-pressed. **Stay as text.** |
| Open Folder | icon button | Accessible name **Open Folder**. Desktop: native picker. Web: MOTION_WORKSPACE via storage. Errors via alert. |
| Share | icon button | See publish.md. Accessible name **Share**. Disabled until a note is selected. |
| Copy All | icon button | Accessible name **Copy all**. `data-testid=copy-all`. Disabled until a note is selected. `aria-live=polite`. Visible label is the icon; Copied / Copy failed move into `title` and `data-copy-state`. |
| New Note | icon button | Accessible name **New Note**. Disabled until a folder is open. Creates untitled-ISO-timestamp.md with # New Note. Placement is **tree-aware**: if a file is selected, the note is created in that file's parent folder; if no file is selected, it falls back to the workspace root. Selects the new note and clears search. |
| New Folder | icon button | Accessible name **New Folder**. Disabled until a folder is open. Prompts for a folder name, then writes `README.md` inside that folder so the tree can show it. Placement is the same tree-aware parent as New Note. Expands the new folder and selects the README. |
| Save | icon button | Accessible name **Save note**. `aria-live=polite`. Disabled with no note selected or while saving. Saving / Saved / Save failed live in `title` + `data-save-state`. ⌘/Ctrl+S also saves. Auto-saves 1.5s after the last edit. |
| Synthesize | icon button | Accessible name **Synthesize**. Disabled with no folder, or while a synthesis status is showing. See synthesize.md. |
| Synthesis banner | status | role=status aria-live=polite. Dismiss (x) with aria-label Dismiss synthesis status. |
| Sidebar heading | h3 | Workspace basename, or Documents if none |
| Sidebar resize | separator | See layout.md. `data-testid=sidebar-resize`. |
| Empty list | copy | No folder opened or no markdown files found. |
| No match | copy | No notes match "{query}". |
| Note tree | tree | role=tree aria-label=Notes. Folders are expandable buttons (aria-expanded). Files are buttons with role=treeitem and aria-selected. Shows basename for files; relative folder segments for directories. A dirty selected note shows a • mark. Clicking an already-selected file starts inline rename. Right-click → Rename. F2 on a selected file starts rename. New Note opens the created row in rename. See rename.md. |
| Notes (mobile) | button | Visible below 768px. Opens a left drawer (`data-testid=notes-drawer`, `role=dialog` `aria-modal`) with the same tree. Escape / backdrop / selecting a file close it. |

## States
- **No folder**: Documents heading, empty copy, New Note, New Folder, and Synthesize disabled.
- **Folder, no .md**: Empty copy.
- **Folder with notes**: Collapsible tree; selected file has active + aria-selected. Folders default expanded.
- **Filter miss**: No-match copy, tree empty (or only empty folders collapsed away).
- **Synthesis in flight / done / failed**: Banner; Synthesize stays disabled until dismiss.
- **Open / create error**: window.alert (current).
- **Narrow (~390px)**: Persistent sidebar hidden. **Notes** header button opens a drawer with the tree so notes stay reachable. Header wraps: search goes full width; view toggle and icon actions stay reachable. No horizontal overflow.

## Acceptance Criteria
- [ ] Header, sidebar, and editor are all visible on a desktop viewport.
- [ ] Open Folder is always available; New Note, New Folder, and Synthesize require an open folder.
- [ ] Search filters by filename **or contents** and has aria-label Search notes.
- [ ] ⌘/Ctrl+K focuses the Search notes field.
- [ ] Note list is a **tree** (role=tree) of real buttons (not clickable divs) with aria-selected on files and aria-expanded on folders.
- [ ] Selecting a note loads it in the editor.
- [ ] New Note writes untitled-{timestamp}.md **in the parent folder of the selected file** (or workspace root when nothing is selected), selects it, and appears in the tree.
- [ ] New Folder prompts for a name, writes `README.md` inside the new folder (same parent rule as New Note), expands it, and selects the README (`data-testid=new-folder`).
- [ ] Sidebar is a collapsible folder tree (not a flat basename list).
- [ ] WYSIWYG / Markdown / Split toggle is a labelled group; the active mode has aria-pressed.
- [ ] Synthesis banner is dismissible and uses role=status.
- [ ] Save is a header button whose accessible name is Save note. Disabled until a note is selected.
- [ ] Copy All is a header button whose accessible name is Copy all. Disabled until a note is selected. Click writes markdown + HTML to the clipboard and `data-copy-state` becomes copied.
- [ ] Every header action button (Share, Copy all, Open Folder, New Note, New Folder, Save note, Synthesize) has a non-empty accessible name.
- [ ] Header action buttons are icon-only (no visible Share / Copy All / Open Folder / … text), except the view-mode labels.
- [ ] New Note lands in inline rename; right-click → Rename and F2 do the same for an existing file.
- [ ] A dirty note autosaves ~1.5s after the last edit and can be saved immediately with the button or ⌘S.
- [ ] Below 768px a **Notes** button (`data-testid=open-notes`) opens a drawer with the same tree; Escape and selecting a file close it.

## Notes
- Source: src/App.tsx, src/components/icons.tsx.
- Icons are inline SVG from Lucide (ISC). No icon package.
- Content search reads each note once when the folder opens and caches it.
- Tree is built from absolute paths returned by storage.listFiles; relative segments use the workspace root as base.
