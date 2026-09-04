# Adversarial Review: Folder README (was SKILL.md)

**Wireframe:** `wireframes/synthesize.md`
**Verdict:** PASS

## Criteria Results

- [x] A run writes TOC.md and a generated README.md. — PASS (`e2e/synthesis.spec.ts`)
- [x] Generated set excludes README.md / README.motion.md / TOC.md / SKILL.md from input. — PASS (unit)
- [x] A hand-written README.md is left intact; the run writes README.motion.md and the status says so. — PASS (unit + e2e)
- [x] A README.md that carries `<!-- generated-by: motion-synthesize -->` is overwritten. — PASS (unit)
- [x] Cap at 40 notes still reported. — PASS (unit)
- [x] Banner is role=status and dismissible. — unchanged
- [x] Failure is shown, not a silent no-op. — PASS

## Evidence

- `bun test src` (`workspaceSynthesis.test.ts`, `ReadmeGenerator.test.ts`)
- Playwright: `e2e/synthesis.spec.ts` 3 passed

## Notes / Recommended Fixes

- SKILL.md is no longer generated. An old SKILL.md is still excluded from input.
