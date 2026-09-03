# Design tokens

**Source:** `src/index.css` — the `:root` block
**Applies to:** every screen. Other rubrics point here so they can say
*"surfaces use `--color-bg-secondary`"* instead of naming a hex.

Motion is **dark-mode-first** CSS custom properties — not Tailwind `@theme`.
A token added anywhere but `:root` is not part of the system.

## Palette

| Token | Value | Used for |
|---|---|---|
| `--color-bg-primary` | `#0d1117` | page canvas |
| `--color-bg-secondary` | `#161b22` | header, sidebar, raised panels |
| `--color-bg-tertiary` | `#21262d` | recessed fills, inputs |
| `--color-bg-elevated` | `#30363d` | hover/elevated chips |
| `--color-border-primary` | `#30363d` | hairlines |
| `--color-border-secondary` | `#21262d` | quieter borders |
| `--color-border-active` | `#58a6ff` | focus / active outline |
| `--color-text-primary` | `#e6edf3` | body text |
| `--color-text-secondary` | `#8b949e` | secondary labels |
| `--color-text-muted` | `#6e7681` | hints, placeholders |
| `--color-text-link` | `#58a6ff` | links |
| `--color-accent-blue` | `#58a6ff` | primary accent |
| `--color-accent-purple` | `#a371f7` | query / secondary accent |
| `--color-accent-green` | `#3fb950` | success |
| `--color-accent-orange` | `#f0883e` | warning |
| `--color-accent-red` | `#f85149` | errors / destructive |

## Type

| Token | Value |
|---|---|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace` |
| `--text-xs` … `--text-3xl` | `0.75rem` … `1.875rem` |

No webfont CDN — Inter / JetBrains Mono only when installed locally. **Font
rendering is always an Acceptable Difference.**

## Space, radius, layout

| Token | Value |
|---|---|
| `--space-1` … `--space-12` | `0.25rem` … `3rem` (4-based scale) |
| `--radius-sm` / `md` / `lg` / `xl` | `4` / `8` / `12` / `16` px |
| `--sidebar-width` | `280px` |
| `--header-height` | `56px` |

## Always-acceptable differences (reuse in every rubric)

- Font hinting, sub-pixel antialiasing, platform scrollbar width
- Any spacing or radius within one step of the token scale
- Icon glyph choice, provided the accessible name is unchanged
- Dynamic content: file names, note counts, synthesis progress text, save status
- Wireframe Salt geometry and monochrome fill
- Presence of a native OS title bar (web captures have none)

## Capture mode (related)

| Class | localStorage key | Effect |
|---|---|---|
| `.ui-freeze` | `motion-ui-freeze` | no animation/transition; transparent caret; hide `[data-volatile]` |
| `.ui-reveal` | `motion-ui-reveal` | force `[data-hover-reveal]` to full opacity |

DEV-only. See `src/lib/useCaptureMode.ts`.
