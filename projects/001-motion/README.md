# Project 001: Motion

| Field | Value |
|-------|-------|
| **Project ID** | 001 |
| **Project name** | Motion, a local-first technical writing IDE |
| **Created** | 2026-10-21 |
| **Mode** | Brownfield. The artifacts are reverse-engineered from the shipped code. |
| **Source baseline** | `feat/export-themes` at `56485be` (v0.6.5 plus PR 63: reload, themed PDF and Word export, themes) |
| **Repository** | <https://github.com/SpillwaveSolutions/motion> |

## Artifacts

| Document ID | Type | File |
|-------------|------|------|
| ARC-001-STKE-v1.0 | Stakeholder drivers and goals | `ARC-001-STKE-v1.0.md` |
| ARC-001-REQ-v1.0 | Business and technical requirements, user journeys, and scenarios | `ARC-001-REQ-v1.0.md` |
| ARC-000-PRIN-v1.0 | Architecture principles P-1 to P-19 (global) | `../000-global/ARC-000-PRIN-v1.0.md` |
| ARC-001-DIAG-001-v1.0 | C4 context | `diagrams/ARC-001-DIAG-001-v1.0.md` |
| ARC-001-DIAG-002-v1.0 | C4 container, browser mode and desktop mode | `diagrams/ARC-001-DIAG-002-v1.0.md` |
| ARC-001-DIAG-003-v1.0 | C4 component, client bundle | `diagrams/ARC-001-DIAG-003-v1.0.md` |
| ARC-001-DIAG-004-v1.0 | C4 component, both backends and the storage contract | `diagrams/ARC-001-DIAG-004-v1.0.md` |
| ARC-001-ADR-001-v1.0 to ARC-001-ADR-010-v1.0 | Architecture decisions AD-1 to AD-10 | `decisions/README.md` |

## Sources of truth

The reverse-engineered artifacts use these sources. If a source and the code
disagree, the artifacts follow the code and record the difference.

- `README.md` and `docs/user_guide/user-guide.md`: product surface.
- `docs/designs/current_design_doc.md` and `docs/designs/current_code_walkthrough.md`: architecture.
- `e2e/*.spec.ts`: executable user journeys. Each scenario in the REQ cites the spec that proves it.
- `src/**`, `src-tauri/src/**`, and `tests/contract/storage-cases.json`: behavior.
- `CLAUDE.md` and `AGENTS.md`: the working agreement and the Definition of Done.
