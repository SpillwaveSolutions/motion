# Screen: Zoom

## Goal
Let the user enlarge or shrink the **notes** — editor text and the directory
listing — from the keyboard, without changing the size of header chrome.
The level comes back the next time they open Motion. A brief overlay names
the current percentage so 100% is obvious.

## Layout

No dedicated chrome except a transient overlay. Header, view toggle, and
action buttons stay at the root 16px size. Zoom is a multiplier (`--zoom`)
applied with the CSS `zoom` property on the file tree and the editor
surface only.

```
+------------------------------------------------------------------+
|  header chrome (fixed size)                                      |
+--------+---------------------------------------------------------+
| tree   |  editor text / markdown source   [  110%  ]  (1s hud)  |
| (zooms)|  (zooms)                                                |
+--------+---------------------------------------------------------+
```

View menu (desktop only):

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
| `--zoom` | CSS var | On `html`. Root `font-size` stays `16px`. Content roots use `zoom: var(--zoom)`. |
| Zoom HUD | status | `role=status` `aria-live=polite` `aria-label=Zoom level`. Rounded percentage. Shown on every step, hidden after ~1s. Timer resets on each step so holding a key shows one indicator. Not shown for the value loaded from disk. |
| Settings file | config | `~/.config/motion/settings.json` (`zoom` number). `MOTION_SETTINGS_FILE` redirects the path so tests never write a developer's real config. Clamped 0.75–2.0. Debounced 500ms on write. |

## States
- **Default**: 100%. Header buttons are the same pixel size as at any other level.
- **Zoomed in / out**: file tree and editor text grow; header / toolbar / view toggle do not.
- **At a bound**: further steps in that direction do nothing. HUD still flashes the bound (75% / 200%).
- **Reload**: last saved scale is applied before the first paint of content. HUD stays hidden for that restore.
- **macOS 12 fallback**: CSS `zoom` is the primary path (WebKit has supported it for years). If it misbehaves on the bundle minimum, fall back to `--content-text-*` tokens — not in this slice unless dogfood proves it.

## Acceptance Criteria
- [ ] ⌘+ (or Ctrl+) grows the editor paragraph (or its bounding box) by one step.
- [ ] The same shortcut does **not** change the bounding box of a header action button.
- [ ] Root `html` font-size stays `16px` at every level.
- [ ] ⌘- shrinks content by one step.
- [ ] ⌘0 restores content to 100%.
- [ ] Holding the key cannot go below 75% or above 200%.
- [ ] The level survives a reload (settings file round-trip, not just React state).
- [ ] A zoom keystroke shows a `role=status` overlay with the rounded percentage (110%, 100%, …) that disappears after about one second.
- [ ] Reset shows 100%. Holding a key does not stack overlays.
- [ ] Client bundle still has no `Bun.`.

## Notes
- Source: `src/lib/zoom.ts`, `src/lib/useZoom.ts`, `src/lib/settings.ts`.
- Header tokens stay rem-anchored to `html { font-size: 16px }`.
- Ship with pane resize (`layout.md`) so a zoomed tree is not trapped in 280px.
