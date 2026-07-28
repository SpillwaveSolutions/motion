# Phase 0: make the gates bite

`01KYK6NHSGSX8673FTZ7AY0CCB` · task/feature · **done**

Pre-commit gets the fast subset only (typecheck + bun test); agents use
--no-verify freely, so CI is the authoritative gate.

## Hierarchy

- epic: [[Ticket-01KYK6NHSFJNG9XV6D8K5SHWCV]] Validation loop: prove the UI works before the human launches it — Motion has real features and no way to know whether they work.

## Subtasks

- [[Ticket-01KYK6NHSG64GHM3NM9JCV1NJ3]] Track CLAUDE.md (git add -f), add Definition of Done, fix its stale Bun/HMR claims — Track CLAUDE.md (git add -f), add Definition of Done, fix its stale Bun/HMR claims (done)
- [[Ticket-01KYK6NHSG7TT2K13FNK8C74QE]] Append typecheck and bun test to hooks/pre-commit — Append typecheck and bun test to hooks/pre-commit (done)
- [[Ticket-01KYK6NHSGP45SAC43B5AYA91P]] Add .github/workflows/ci.yml that actually tests the application — Add .github/workflows/ci.yml that actually tests the application (done)

Progress: 3/3 done
