---
date: 2026-09-03
slug: editor-surface-zoom-layout-icons
title: Editor surface, zoom scope, resizable layout, icon toolbar, and window drag
epic: 01M1MVB2ZZGP7FHW2TX6CNA6BE
items: [01M1MVB2ZZFQX90WHGB0CA99RW, 01M1MVB300TGVNPJBG8GJ6KG1T, 01M1MVB300WYDPA67T9FNDM51R, 01M1MVB300WHXWP5177D3BNDB2, 01M1MVB3005Z8WSN5R6KEW5BNN, 01M1MVB300EAR8PX5HKEACTKP1, 01M1MVB300KXXJPZ2XACH7A64K]
---

# Editor surface, zoom scope, resizable layout, icon toolbar, and window drag

## Context

Dogfood of Motion 0.6.3 on a Mac reported seven things. This plan turns each
one into a task with a root cause, a file list, and a verification step. Two of
the reports are regressions against work that shipped in 0.6.3 and was reviewed
only on Linux. The review file `wireframes/REVIEW-header-drag.md` records its
own gap: "Mac dogfood: grab the strip between Split and Share/Copy All and
move the window." Nobody ran that check on a Mac. It failed.

Do not implement from this plan until the matching files under `wireframes/`
are updated.

## What was reported

1. Keep the `TOC.md` that **Synthesize** writes.
2. `SKILL.md` makes no sense. Replace it with a brief `README.md` that explains
   what the folder is for.
3. Zoom scales the buttons along with the text. Only the text areas, the text
   inside them, and the directory listing should scale.
4. Stretching the window does not widen the Markdown or WYSIWYG views.
5. You cannot adjust the width of the editor panes or the directory listing.
6. Zoom gives no feedback, so you cannot tell when you are back at 100%.
7. The toolbar buttons should be standard icons for share, copy, open folder,
   new note, new folder, save, and synthesize.
8. You cannot drag the window by its top bar.

Window resizing itself works, so this plan changes nothing there.

## What the code actually does

Read from `main` at `2a4389e` (v0.6.3). Rechecked 2026-09-03: all six technical
claims still hold.

### Synthesis writes two files, and one of them is a template artifact

`src/lib/workspaceSynthesis.ts` runs four passes. It summarizes each note, asks
for topic labels, enriches a table of contents, and generates a skill document.
`SkillGenerator` prompts for a heading format this repository invented, with
Intent, Core Concepts, and Usage sections. That format is not the frontmatter
shape a Claude Code skill needs, so the file is neither a usable skill nor a
useful README.

### Zoom is anchored at the document root, so it scales everything

`applyZoom()` in `src/lib/zoom.ts` sets `document.documentElement.style.fontSize`
to `16 * scale` pixels. Every size token in `src/index.css` is rem-anchored, and
the file's own comment says this is deliberate: "one value rescales text and
spacing together." Buttons use the same tokens, so buttons scale. The behavior
is working as designed. The design is wrong for this product.

### A fixed maximum width caps the editor

`.editor-container` in `src/index.css:308` sets `max-width: 900px` with
`margin: 0 auto`. Split view overrides it inline to `1400px` in
`src/components/Editor/index.tsx:998`. Past those widths, extra window space
becomes empty margin.

### The sidebar is a fixed grid column

`src/index.css:76` sets `--sidebar-width: 280px`, and line 169 uses it as the
first column of `grid-template-columns`. Nothing lets you drag it.

### Window drag fails because of a Tauri attribute rule

The 0.6.3 build links Tauri 2.9.5 (`src-tauri/Cargo.lock`). That version injects
a check in `src/window/scripts/drag.js` that reads `data-tauri-drag-region`
from **the event target only**. It does not walk the ancestor chain.

In `src/App.tsx:705` the header carries a bare `data-tauri-drag-region`. Every
child that covers it, including the `.logo` div and its text, does not. A
mousedown on the logo has the logo as its target, the logo has no attribute, and
no drag starts. The only reliable grab targets today are `.header-drag-gutter`
(a leaf about 3rem wide) and whatever bare header padding is not covered by a
child.

Two related facts:

- The `-webkit-app-region: drag` rules at `src/index.css:1279` are a Chromium
  and Electron feature. WKWebView ignores them, so on macOS that CSS does
  nothing. The 0.6.3 review called the pair "belt-and-suspenders." On a Mac
  only the attribute path works.
- Tauri 2.11.5 replaced the target-only check with a walk over the composed
  path and added a `deep` attribute value. That is a smaller diff and a version
  constraint. This plan does not take it.

## Design decisions

- **Keep the accessible names identical when buttons become icons.** Specs
  select **Open Folder**, **New Note**, **Synthesize**, **Save note**,
  **Copy all**, and **Share** by name. Icon buttons keep today's text as
  `aria-label`.
- **Do not add an icon dependency.** Inline SVG, same as `Toolbar.tsx`.
- **Persist layout the way zoom is persisted.** Sidebar width and split ratio
  go in the settings file next to `zoom`, through `settingsClient.ts`.
- **Scale content, not chrome.** Zoom becomes a multiplier on two content
  roots. The root font size stays at 16px.

## Decisions settled 2026-09-03

1. **README collision.** Overwrite only a README that carries a generated
   marker comment. Otherwise write `README.motion.md` and say so in the
   status line. Never silently overwrite a README a person wrote.
2. **Window drag.** Own the handler: a pure `isWindowDragTarget` predicate plus
   `startDragging()` from `@tauri-apps/api/window`, gated on `isTauri()`. Do
   not upgrade Tauri for this. Keep `.header-drag-gutter`. Comment
   `-webkit-app-region` as Chromium-only, or delete it.
3. **Stale branch.** Leave `feat/ui-wireframe-sidebar-settings` parked (23+
   commits behind main; rewrites `src/index.css` and `src/App.tsx`). This work
   lands on a fresh branch off main.

## Risks

- CSS `zoom` on the editor and tree is unproven on macOS 12 (the bundle
  minimum). If it fails, Task 2 falls back to a second token set.
- Task 2 scales the tree inside a 280px column. Ship it with Task 4.
- Icon source and license go in a comment on the new module.

## Out of scope

- Window resizing, which already works.
- The `TOC.md` generator.
- The view mode toggle labels.
- Rebasing or merging `feat/ui-wireframe-sidebar-settings`.

## Tasks

- [ ] (P2) Replace SKILL.md with a generated folder README
  Synthesize keeps TOC.md. Retire SKILL.md. Write a short README.md (~150 words:
  heading, one-paragraph purpose, themes from topic labels). GENERATED must
  include README.md so a second run never summarizes it. Collision: overwrite
  only a README that carries a generated marker; otherwise write README.motion.md
  and say so in the status. Retire or repoint SkillGenerator. Wireframe
  synthesize.md first. Unit: generated set excludes README.md from input. E2E:
  TOC.md and README.md appear; a hand-written README survives.

- [ ] (P1) Scale content without scaling chrome
  Stop writing documentElement.style.fontSize. Set --zoom instead and leave the
  root at 16px. Prefer the CSS zoom property on the editor surface and the file
  tree (WebKit has supported it for years). If zoom misbehaves on macOS 12, fall
  back to --content-text-* tokens. Header buttons must not change size.
  Ship with the pane-resize task so the tree is not trapped in 280px.
  Replace the e2e root-font-size assertion: button box unchanged, editor
  paragraph grows.

- [ ] (P2) Show the zoom level briefly
  Transient overlay with the rounded percentage on every zoom change, hidden
  after ~1s. role=status aria-live=polite. Reset the timer on each step so
  holding a key shows one indicator. E2E: shortcut shows the percentage, then
  it disappears; reset shows 100%. No console.error (fixtures fail on it).

- [ ] (P1) Let the panes grow and be resized
  Remove max-width 900px from .editor-container and the inline 1400px split
  override. Drag handle on the sidebar trailing edge writes --sidebar-width,
  clamp ~180–480px, persist as sidebarWidth. Split view becomes a two-column
  grid with a draggable divider, persist splitRatio. Both handles:
  role=separator, aria-orientation, aria-valuenow, arrow keys. Unit-test clamp
  and ratio math. E2E: drag, assert widths, reload, persist; editor grows when
  the viewport widens.

- [ ] (P2) Replace header action labels with standard icons
  New src/components/icons.tsx with seven inline SVGs (share, copy, open folder,
  new note, new folder, save, synthesize) from a permissively licensed set;
  record source and license in a comment. Icon-only buttons keep today's text as
  aria-label and title so existing specs keep passing. Save and Copy all keep
  aria-live; move Saving/Saved/Copied into icon + title. Leave WYSIWYG /
  Markdown / Split as text. Wireframe native-chrome.md first. Full e2e suite
  unchanged; add one assertion that every header button has a non-empty
  accessible name.

- [ ] (P1) Make the header drag the window
  Regression against 0.6.3. Tauri 2.9.5 reads data-tauri-drag-region from the
  event target only, so header children swallow the drag. Own the handler rather
  than upgrading Tauri: isWindowDragTarget returns false for buttons, links,
  inputs, textareas, selects, labels, contenteditable, interactive roles, and
  no-drag subtrees. On header mousedown, if the predicate passes and the button
  is primary, call startDragging() behind isTauri(). Double-click toggles
  maximize. Keep .header-drag-gutter. Document or delete -webkit-app-region
  (Chromium only; WKWebView ignores it). Unit-test the predicate. Browser e2e:
  mousedown on the logo does not start a text selection.
  - [ ] (P1) Mac dogfood the header drag
    On a real Mac .app: drag from the logo and from empty header chrome, confirm
    the window moves, confirm buttons still click, double-click the header to
    zoom the window. This is the check 0.6.3 skipped.
