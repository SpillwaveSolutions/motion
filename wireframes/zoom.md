# Screen: Zoom

## Goal
Let the user make the whole window larger or smaller from the keyboard, and
have that size come back the next time they open Motion.

## Layout

No dedicated chrome. Zoom rescales the root font size, so header, sidebar,
editor, and spacing all grow together. View menu (desktop only):

```
View
  Zoom In        ⌘+
  Zoom Out       ⌘-
  Actual Size    ⌘0
```

## Key Elements

| Element | Type | Behavior / Notes |
|---------|------|------------------|
| ⌘+ / Ctrl+ | shortcut | Zoom in 10%. Cmd+equals (unshifted) and Cmd+plus (shifted) both count. |
| ⌘- / Ctrl- | shortcut | Zoom out 10%. Cmd+underscore (shifted) also counts. |
| ⌘0 / Ctrl+0 | shortcut | Reset to 100%. |
| View menu | desktop | Same three actions, with accelerators. |
| Settings file | config | `~/.config/motion/settings.json` (`zoom` number). `MOTION_SETTINGS_FILE` redirects the path so tests never write a developer's real config. Clamped 0.75–2.0. Debounced 500ms on write. |

## States
- **Default**: 100% (`html` font-size 16px).
- **Zoomed in / out**: root font-size is `16px * scale`.
- **At a bound**: further steps in that direction do nothing.
- **Reload**: last saved scale is applied before the first paint of content.

## Acceptance Criteria
- [ ] ⌘+ (or Ctrl+) grows the computed root font size by one step.
- [ ] ⌘- shrinks it by one step.
- [ ] ⌘0 restores exactly 16px.
- [ ] Holding the key cannot go below 75% or above 200%.
- [ ] The level survives a reload (settings file round-trip, not just React state).
- [ ] Client bundle still has no `Bun.`.

## Notes
- Source: `src/lib/zoom.ts`, `src/lib/useZoom.ts`, `src/lib/settings.ts`.
- Tokens in `src/index.css` are rem-anchored to `html { font-size: 16px }`.
