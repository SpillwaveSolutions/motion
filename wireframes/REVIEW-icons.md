# Adversarial Review: Icon header actions

**Wireframe:** `wireframes/shell.md`
**Verdict:** PASS

## Criteria Results

- [x] Share, Copy all, Open Folder, New Note, New Folder, Save note, Synthesize
  each have a non-empty accessible name. — PASS (`e2e/layout.spec.ts`)
- [x] WYSIWYG / Markdown / Split stay text. — PASS
- [x] Copy all accessible name is unchanged; Copied lives in `data-copy-state`. — PASS (`e2e/copy.spec.ts`)
- [x] Save note accessible name is unchanged; Saved lives in `data-save-state`. — PASS
- [x] Full e2e suite still selects those names. — PASS (72 tests)

## Evidence

- Playwright: layout + copy + the rest of the suite
- Icons: `src/components/icons.tsx` (Lucide paths, ISC, no package)

## Notes / Recommended Fixes

- None. Visible labels are gone on purpose.
