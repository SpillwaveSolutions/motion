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

## Sources of truth

The reverse-engineered artifacts use these sources. If a source and the code
disagree, the artifacts follow the code and record the difference.

- `README.md` and `docs/user_guide/user-guide.md`: product surface.
- `docs/designs/current_design_doc.md` and `docs/designs/current_code_walkthrough.md`: architecture.
- `e2e/*.spec.ts`: executable user journeys. Each scenario in the REQ cites the spec that proves it.
- `src/**`, `src-tauri/src/**`, and `tests/contract/storage-cases.json`: behavior.
- `CLAUDE.md` and `AGENTS.md`: the working agreement and the Definition of Done.
