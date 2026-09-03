# Screen: Native Mac chrome

## Goal
Make the desktop window feel like a Mac editor (Typora / Obsidian / Craft):
traffic lights over the header, a real File menu, and a theme that follows the
system appearance. Browser mode is unchanged except for the new Share control
(see publish.md).

## Layout

```
+------------------------------------------------------------------+
|  ● ● ●   [logo] Motion | Search… | WYSIWYG Markdown Split | …   |
|  (overlay title bar, drag region)                                |
+--------+---------------------------------------------------------+
| tree   | editor                                                  |
+--------+---------------------------------------------------------+
```

Menu bar (desktop only):

```
Motion    File                         Edit                      View
 About    New Note          ⌘N         Undo / Redo / Cut / Copy   Zoom In        ⌘+
 Hide     Open Folder…      ⌘O         Paste / Select All         Zoom Out       ⌘-
 Quit     Save              ⌘S                                    Actual Size    ⌘0
          Copy All
          Share → Gist / Notion
          Settings…         ⌘,
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Overlay title bar | window | `titleBarStyle: Overlay`, `hiddenTitle`. Traffic lights inset over the header. |
| Drag region | header | `data-tauri-drag-region` on `.app-header`. CSS `-webkit-app-region: drag` on the header (Tauri only). Buttons, inputs, toggles are `no-drag`. A `.header-drag-gutter` flex spacer sits between the view toggle and the action buttons so packed controls cannot eat the grab strip. Left padding ~80px so content clears the lights. Browser: no extra padding. |
| File → New Note | menu | Same handler as the header button. |
| File → Open Folder… | menu | Same handler as Open Folder. |
| File → Save | menu | Same handler as Save / ⌘S. |
| File → Copy All | menu | Same handler as the header Copy All button. No accelerator (⌘⇧C is Inspect in Chromium). |
| View → Zoom In / Out / Actual Size | menu | ⌘+ / ⌘- / ⌘0. Same as the keyboard zoom in zoom.md. |
| Edit menu | predefined | System cut/copy/paste/select all — do not replace this. |
| Last workspace | session | Reopen the last folder (and last file if it still exists) on desktop launch. Finder-opened files win over the saved workspace. Browser does not auto-open (E2E depends on an explicit Open Folder). |
| System appearance | theme | Dark tokens remain the default. `@media (prefers-color-scheme: light)` swaps to a light set. |

## States
- **Cold launch, no last workspace**: empty sidebar, same as today.
- **Cold launch, last workspace exists**: sidebar populated, last file selected.
- **Cold launch from Finder**: workspace = parent of the opened file; that file selected.
- **App already running + Finder open**: existing window loads the file (no second window).
- **Light OS appearance**: light tokens; contrast still passes.
- **Browser**: no overlay padding, no native menu; header buttons remain the only chrome.

## Acceptance Criteria
- [x] Desktop window default size is at least 1200×760 with a ~720×480 minimum.
- [x] Overlay title bar is configured; header is a drag region with no-drag on controls.
- [x] Header sets `-webkit-app-region: drag` in Tauri and includes a grab strip so packed controls cannot eat the drag surface.
- [x] View menu Zoom In / Out / Actual Size fire the same zoom as ⌘+ / ⌘- / ⌘0.
- [x] File menu items fire the same actions as the header buttons.
- [x] Last desktop workspace is restored on launch.
- [x] `?open=` in browser mode opens the workspace and selects that note (E2E stand-in for Finder).
- [x] Light appearance does not keep the GitHub-dark palette.
- [x] productName is Motion; identifier is com.spillwave.motion.

## Notes
- Source: `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, `src/App.tsx`, `src/index.css`.
- Unsigned local builds: right-click → Open once. Documented in `docs/macos.md`.
