---
name: design-ui
description: >
  Design and build polished UI for Motion (React + CSS custom properties +
  Tauri). Use when creating or restyling any interface surface. Covers design
  tokens, layout, typography, the docs/ui wireframe+rubric loop, and anti-slop
  rules. Triggers on "design", "UI", "polish", "wireframe", "screenshot rubric".
metadata:
  short-description: "Motion UI: tokens, layout, wireframes, agent rubrics"
---

# Design & UI (Motion)

Motion is **not** a Tailwind/shadcn app. Tokens live in `src/index.css` `:root`.
Screen contracts live in `docs/ui/`. Follow that loop; do not invent a second system.

## 1. Tokens first

Read `docs/ui/tokens.md`. Use CSS variables (`var(--color-bg-secondary)`,
`var(--space-3)`, …). No raw hex in JSX. No ad-hoc `padding: 13px`.

## 2. UI change loop (required)

1. Read or write `docs/ui/<screen>.md` + Salt wireframe under `docs/ui/wireframes/`.
2. Implement against the **element inventory** / addressability table.
3. `bun run ui:render` after editing `.puml`.
4. `bun run ui:capture` (or follow the capture recipe).
5. Judge **agent** rubric rows against the screenshot (checklist, not pixel-diff).
6. Ensure **check:** rows pass under `bun run verify` / `e2e/layout.spec.ts`.
7. Report agent findings in the PR body; do not block merge on them alone.

Wireframes are authoritative for inventory, containment, and order only.

## 3. Addressability

- Prefer roles + accessible names (`getByRole`, `getByLabel`).
- Every icon-only button needs `aria-label`.
- Prefer one structural `data-*` carrying a variant over N enumerated testids.
- Capture seeds: `localStorage.motion-ui-freeze` / `motion-ui-reveal` (DEV-only).

## 4. Quantified rubric (cheap rules)

- ≤ 5 accent hues beyond the neutrals already in tokens.
- Consistent spacing scale (`--space-*`).
- Tap targets ≥ 44px where touch is intended; desktop chrome may be denser.
- When you override a background, override foreground too (contrast).
- Empty / loading / error states are part of the design.

## 5. Anti-slop

- No emoji-as-icons; use inline SVG or an icon set consistent with the shell.
- No gradient-blob filler as a substitute for hierarchy.
- No placeholder lorem in shipped UI.
- Match existing Motion dark-workbench language when editing in place.

## Finish checklist

- [ ] `docs/ui/<screen>.md` updated
- [ ] Wireframe rendered (`bun run ui:render`)
- [ ] Capture recipe still works
- [ ] Named Check E2E green
- [ ] Agent rows judged or marked N/A
- [ ] `bun run verify` green
