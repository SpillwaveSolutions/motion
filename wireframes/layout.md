# Screen: Resizable layout

## Goal
Let the user use the extra window width, and drag the boundary between the
directory listing and the editor (and, in Split, between the two editor
panes). Widths come back the next time they open Motion.

## Layout

```
+------------------------------------------------------------------+
| header                                                           |
+------------+--+--------------------------------------------------+
| tree       |<>|  editor (fills remaining width, no 900px cap)    |
|            |  |  Split:  [wysiwyg] |<>| [markdown]               |
+------------+--+--------------------------------------------------+
```

`<>` is a vertical separator. Sidebar default 280px, clamp 180–480px.
Split default 50/50, clamp 25–75% of the editor column.

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| Editor surface | main | `.editor-container` has **no** max-width. Split no longer forces 1400px. Extra window width goes to the note, not empty margin. |
| Sidebar trailing handle | separator | `role=separator` `aria-orientation=vertical` `aria-valuenow` in px. `data-testid=sidebar-resize`. Pointer drag writes `--sidebar-width`. Arrow keys ±16px, Home/End to the clamp. Hidden below 768px (drawer replaces the sidebar). |
| Split divider | separator | Same role/orientation. `data-testid=split-resize`. Pointer drag writes the left-pane ratio. Arrow keys ±0.02. Only in Split view. |
| Settings | config | `sidebarWidth` (px) and `splitRatio` (0–1) next to `zoom` in `settings.json`, through `settingsClient.ts`. Debounced 500ms. Unknown keys preserved. |

## States
- **Default**: sidebar 280px, split 50/50, editor fills the main column.
- **Dragging**: live CSS update; persist after debounce.
- **Reload**: last saved widths apply.
- **Narrow (~768px)**: sidebar column is 0; handle is not shown; Notes drawer is unchanged.
- **At a clamp**: further drag in that direction does nothing.

## Acceptance Criteria
- [ ] Widening the viewport widens the editor surface (no 900px / 1400px cap).
- [ ] Dragging the sidebar handle changes the tree column width, clamped ~180–480px.
- [ ] Dragging the Split divider changes the two pane widths, clamped ~25–75%.
- [ ] Both handles expose `role=separator`, `aria-orientation=vertical`, and `aria-valuenow`.
- [ ] Arrow keys move a focused handle.
- [ ] Sidebar width and split ratio survive a reload (settings file).
- [ ] Client bundle still has no `Bun.`.

## Notes
- Source: `src/lib/layout.ts`, `src/lib/useLayout.ts`, `src/components/PaneResizeHandle.tsx`, `src/index.css`, `src/App.tsx`, `src/components/Editor/index.tsx`.
- Unit-test clamp and ratio math; do not rely on Playwright for the arithmetic.
