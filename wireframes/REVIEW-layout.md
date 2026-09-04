# Adversarial Review: Resizable layout

**Wireframe:** `wireframes/layout.md`
**Verdict:** PASS

## Criteria Results

- [x] Widening the viewport widens the editor surface (no 900px / 1400px cap). — PASS
  (`e2e/layout.spec.ts`: 1000 → 1400 grows `.editor-container` by >200px)
- [x] Dragging the sidebar handle changes the tree column, clamped 180–480px. — PASS
  (unit: `layout.test.ts`; e2e drag + persist through `/api/settings`)
- [x] Split divider is `role=separator` `aria-orientation=vertical` with `aria-valuenow`. — PASS
- [x] Arrow keys move a focused split handle. — PASS
- [x] Sidebar width survives a reload. — PASS
- [x] Client bundle still has no `Bun.`. — PASS

## Evidence

- `bun test src` (`layout.test.ts`)
- Playwright: `e2e/layout.spec.ts` 5 passed (`CI=1`)

## Notes / Recommended Fixes

- Handle uses window-level `mousemove` so a drag that leaves the 8px hit target still tracks.
- Below 768px the sidebar handle is hidden (drawer replaces the column).
