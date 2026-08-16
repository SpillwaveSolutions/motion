# Adversarial Review: Motion shell (running app)

**Wireframe:** `wireframes/shell.md`  
**Verdict:** PASS (after mobile header wrap)

Launched the Bun web server against `public/demo`. Walked every shell acceptance criterion in Chromium (1280×800 and 390×844).

## Criteria Results

- [x] Header, sidebar, and editor visible on desktop — PASS
- [x] Open Folder available; New Note / Synthesize require a folder — PASS
- [x] Search has aria-label Search notes — PASS
- [x] ⌘/Ctrl+K focuses Search notes — PASS
- [x] Note list is a listbox of option buttons with aria-selected — PASS
- [x] Selecting a note loads the editor — PASS
- [x] New Note writes untitled-{timestamp}.md — PASS
- [x] Sidebar is flat basenames — PASS
- [x] View toggle is a labelled group with aria-pressed — PASS
- [x] At ~390px header wraps; Open / New / Synthesize remain usable — PASS (failed on first pass: header was a single unwrapped flex row and the viewport showed only the far-right of Synthesize)

## Evidence

- No uncaught console errors on reviewed paths
- First-pass 390px overflow: `scrollWidth > clientWidth`
- After wrap: `scrollWidth === 390`, header height ~166px, all three actions visible

## Notes

- Sidebar still hides below 768px (as-built). Notes are unreachable on a phone until Open Folder is used on desktop or we add a drawer — out of scope for this pass.
- Synthesis banner not exercised (needs a live run).
