# Architecture decision records

This folder holds the architecture decision records (ADRs) for Motion. ADR-001 to ADR-010 record decisions AD-1 to AD-10 from `docs/designs/current_design_doc.md` section 6. Each decision was already in the code. The ADRs record it after the fact.

| ADR | Title | Source | Status | Decided |
|-----|-------|--------|--------|---------|
| [ADR-001](ARC-001-ADR-001-v1.0.md) | Keep one storage contract for two filesystem implementations | AD-1 | Accepted | 2026-07-28 |
| [ADR-002](ARC-001-ADR-002-v1.0.md) | Check path containment by component, not by string prefix | AD-2 | Accepted | 2026-07-28 |
| [ADR-003](ARC-001-ADR-003-v1.0.md) | Take the dev server workspace root from the environment only | AD-3 | Accepted | 2026-07-28 |
| [ADR-004](ARC-001-ADR-004-v1.0.md) | Route runtime-only work through transport routers and a static guard | AD-4 | Accepted | 2026-07-27 |
| [ADR-005](ARC-001-ADR-005-v1.0.md) | Use one command as the validation gate | AD-5 | Accepted | 2026-07-27 |
| [ADR-006](ARC-001-ADR-006-v1.0.md) | Fail E2E tests on HTTP error status, not only on transport failure | AD-6 | Accepted | 2026-07-27 |
| [ADR-007](ARC-001-ADR-007-v1.0.md) | Enforce security in the shared cores of both backends | AD-7 | Accepted | 2026-07-28 |
| [ADR-008](ARC-001-ADR-008-v1.0.md) | Restrict document SQL by validation | AD-8 | Accepted | 2026-07-25 |
| [ADR-009](ARC-001-ADR-009-v1.0.md) | Use one shared parser for block attributes | AD-9 | Accepted | 2026-07-27 |
| [ADR-010](ARC-001-ADR-010-v1.0.md) | Store generated images inline as base64 data URIs | AD-10 | Accepted | 2026-07-27 |

Write a new ADR for each new architecture decision, and for each exception to a principle in `projects/000-global/ARC-000-PRIN-v1.0.md`. Use the next free number. Never reuse a number.
