# Screen: Native Mac chrome

## Goal
Make the desktop window feel like a Mac editor (Typora / Obsidian / Craft):
traffic lights over the header, a real File menu, and a theme that follows the
system appearance. Browser mode is unchanged except for the new Share control
(see publish.md). The header is the window drag surface.

## Layout

```
+------------------------------------------------------------------+
|  ● ● ●   [logo] Motion | Search… | WYSIWYG Markdown Split | ⋮   |
|  (overlay title bar; drag from logo, empty chrome, gutter)       |
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
| Drag region | header | Own handler, not a Tauri upgrade. On header mousedown (primary button), if `isWindowDragTarget` the target is not a button/link/input/textarea/select/label/contenteditable/interactive role/`data-tauri-drag-region=false` subtree, call `startDragging()` behind `isTauri()`. Double-click on a drag target toggles maximize. Keep `.header-drag-gutter`. `data-tauri-drag-region` may remain as a hint; Tauri 2.9.5 reads it from the **event target only**, so it is not sufficient. `-webkit-app-region` is Chromium/Electron; WKWebView ignores it. |
| File → New Note | menu | Same handler as the header button. |
| File → Open Folder… | menu | Same handler as Open Folder. |
| File → Save | menu | Same handler as Save / ⌘S. |
| File → Copy All | menu | Same handler as the header Copy All button. No accelerator (⌘⇧C is Inspect in Chromium). |
| View → Zoom In / Out / Actual Size | menu | ⌘+ / ⌘- / ⌘0. Same as the keyboard zoom in zoom.md. |
| Edit menu | predefined | System cut/copy/paste/select all — do not replace this. |
| Last workspace | session | Reopen the last folder (and last file if it still exists) on desktop launch. Finder-opened files win over the saved workspace. Browser does not auto-open (E2E depends on an explicit Open Folder). |
| System appearance | theme | Dark tokens remain the default. `@media (prefers-color-scheme: light)` swaps to a light set. |
| Header actions | icons | See shell.md. Accessible names unchanged. |

## States
- **Cold launch, no last workspace**: empty sidebar, same as today.
- **Cold launch, last workspace exists**: sidebar populated, last file selected.
- **Cold launch from Finder**: workspace = parent of the opened file; that file selected.
- **App already running + Finder open**: existing window loads the file (no second window).
- **Light OS appearance**: light tokens; contrast still passes.
- **Browser**: no overlay padding, no native menu, no `startDragging`; header buttons remain the only chrome. Mousedown on the logo must not start a text selection.

## Acceptance Criteria
- [x] Desktop window default size is at least 1200×760 with a ~720×480 minimum.
- [ ] Header mousedown on the logo, the Motion wordmark, empty header chrome, or the grab strip starts a window drag on desktop (own `startDragging` handler). Buttons, search, and the view toggle do not.
- [ ] Double-click on a drag target toggles maximize on desktop.
- [ ] `.header-drag-gutter` remains so packed controls cannot eat the grab strip.
- [ ] Browser: mousedown on the logo does not start a text selection.
- [x] View menu Zoom In / Out / Actual Size fire the same zoom as ⌘+ / ⌘- / ⌘0.
- [x] File menu items fire the same actions as the header buttons.
- [x] Last desktop workspace is restored on launch.
- [x] `?open=` in browser mode opens the workspace and selects that note (E2E stand-in for Finder).
- [x] Light appearance does not keep the GitHub-dark palette.
- [x] productName is Motion; identifier is com.spillwave.motion.
- [ ] **Mac dogfood (cannot run in Linux CI):** drag from the logo and from empty header chrome, confirm the window moves, confirm buttons still click, double-click the header to zoom the window.

## Notes
- Source: `src/lib/windowDrag.ts`, `src/App.tsx`, `src/index.css`, `src-tauri/tauri.conf.json`.
- Unsigned local builds: right-click → Open once. Documented in `docs/macos.md`.
- Do not bump Tauri to pick up the 2.11 `deep` drag-region walk. Own the handler instead.
