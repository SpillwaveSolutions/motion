# Stakeholder drivers & goals analysis: Motion

> **Template Origin**: Official | **ArcKit Version**: 6.18.2 | **Command**: `/arckit:stakeholders`

## Document control

| Field | Value |
|-------|-------|
| **Document ID** | ARC-001-STKE-v1.0 |
| **Document Type** | Stakeholder Drivers and Goals Analysis |
| **Project** | Motion (Project 001) |
| **Classification** | PUBLIC |
| **Status** | DRAFT |
| **Version** | 1.0 |
| **Created Date** | 2026-10-21 |
| **Last Modified** | 2026-10-21 |
| **Review Cycle** | Quarterly |
| **Next Review Date** | 2027-01-21 |
| **Owner** | Rick Hightower, Spillwave Solutions (maintainer and product owner) |
| **Reviewed By** | [PENDING] |
| **Approved By** | [PENDING] |
| **Distribution** | Motion maintainers, Spillwave Solutions, AI agent contributors (through the repo) |

## Revision history

| Version | Date | Author | Changes | Approved By | Approval Date |
|---------|------|--------|---------|-------------|---------------|
| 1.0 | 2026-10-21 | ArcKit AI | Initial creation from `/arckit:stakeholders` command. Reverse-engineered from the repo at `56485be`. | PENDING | PENDING |

---

## Executive summary

### Purpose

This document identifies the stakeholders of Motion, their drivers, the goals that come from those drivers, and the measurable outcomes that show success. Motion is a local-first technical writing IDE. It edits Markdown files on the disk of the user.

This analysis is reverse-engineered. Nobody gave interviews. The evidence is the repository: `README.md`, `docs/user_guide/user-guide.md`, `docs/designs/current_design_doc.md`, `CLAUDE.md`, `CHANGELOG.md`, the E2E specs, the commit history, and the pull requests. Each driver states its evidence. A stakeholder must confirm each inferred driver before the status changes from DRAFT.

### Key findings

Motion has one primary human user, the Writer, and one accountable owner, the maintainer. Most code arrives through AI agent sessions that work under the rules in `CLAUDE.md`. The main tension is between the local-first promise and the features that send content off the machine: Ask AI, Share, and the generative blocks. The design resolves this tension with explicit user action, optional features, and tokens that stay on the machine.

Two governance gaps are real today. The repo has no `LICENSE` file, although `README.md` refers to one. GitHub does not require the CI jobs `typecheck, guards, unit, e2e` and `cargo test + clippy` before a merge to `main`.

### Critical success factors

- The workspace jail holds. Motion never reads or writes a file outside the folder that the Writer opened, in either runtime.
- The desktop app and browser mode behave the same for storage and settings, so the E2E gate proves the product and not a rehearsal.
- Every user-visible feature ships with a unit test, a Playwright journey, and truthful docs (the Definition of Done in `CLAUDE.md`).
- Output leaves Motion only when the Writer asks: Save, Export, Copy All, Share, or Ask AI.

### Stakeholder alignment score

**Overall Alignment**: HIGH

The maintainer, the Writer, and the agent contributors want the same product: a fast, local, trustworthy Markdown editor with good output. The conflicts are about scope and cost (DoD effort against agent speed, export fidelity against dependency size). They are not about direction. The missing license and the missing branch protection lower the score for external contributors, but those gaps are cheap to close.

---

## Stakeholder identification

### Internal stakeholders

| Stakeholder | Role/Department | Influence | Interest | Engagement Strategy |
|-------------|----------------|-----------|----------|---------------------|
| Rick Hightower | Maintainer, product owner, and release manager (Spillwave Solutions) | HIGH | HIGH | Owns every decision. Reviews design, not defects. |
| Spillwave Solutions | Owning company. Uses Motion for its documentation suite and as a showcase. | HIGH | MEDIUM | Roadmap input through the maintainer. |
| AI agent contributors | Claude Code, Codex, and Grok sessions that write most of the code under `CLAUDE.md` and `AGENTS.md` | MEDIUM | HIGH | Instructions in the repo, the `verify` gate, and work items in `.work/`. |
| Human reviewers | Pull request review on GitHub (today, the maintainer) | MEDIUM | MEDIUM | Pull request descriptions, code walkthroughs, and screenshots as artifacts. |
| CI pipeline owner | GitHub Actions workflow `.github/workflows/ci.yml` (the maintainer) | MEDIUM | MEDIUM | Keep the CI and the local `verify` command identical. |

### External stakeholders

| Stakeholder | Organization | Relationship | Influence | Interest |
|-------------|--------------|--------------|-----------|----------|
| Writers | Technical writers and developers who keep docs as Markdown in a folder or a git repo | Primary user | MEDIUM | HIGH |
| Readers of exported documents | People who get a PDF, a Word file, a Gist, or a Notion page from a Writer | Secondary beneficiary | LOW | MEDIUM |
| Anthropic | Claude API (`ANTHROPIC_API_KEY`) and the `claude` CLI | AI supplier | MEDIUM | LOW |
| Google | Imagen model behind the `imagen` CLI | AI supplier | LOW | LOW |
| GitHub | Hosting, Actions, wiki, and the Gist API for Share | Platform supplier | MEDIUM | LOW |
| Notion | Notion API for Share | Integration supplier | LOW | LOW |
| Apple | macOS, Finder Open With, and Gatekeeper for unsigned builds | Platform owner | MEDIUM | LOW |
| Upstream projects | Tauri, Tiptap, DuckDB-WASM, Bun, React, Mermaid, jsPDF, docx | Open-source dependencies | MEDIUM | LOW |
| Open-source contributors | People who find the public repo and want to use or change it | Potential contributor | LOW | MEDIUM |

### UK government digital roles (GovS 005)

Not applicable. Motion is a commercial open-source desktop product. It is not a UK Government service, so GovS 005 roles do not exist for it.

| Role | Responsibility | Typical Power/Interest | Engagement Strategy |
|------|---------------|----------------------|---------------------|
| Not applicable | No UK Government sponsor | Not applicable | Not applicable |

### UK government security roles (GovS 007)

Not applicable for the same reason. The security owner for Motion is the maintainer. Security controls are in the code (the workspace jail, SQL validation, and sanitization) and not in a security organization.

| Role | Responsibility | Typical Power/Interest | Engagement Strategy |
|------|---------------|----------------------|---------------------|
| Not applicable | Security is owned by the maintainer | Not applicable | Not applicable |

### Stakeholder Power-Interest Grid

```text
                          INTEREST
              Low                         High
        ┌─────────────────────┬─────────────────────┐
        │                     │                     │
        │   KEEP SATISFIED    │   MANAGE CLOSELY    │
   High │                     │                     │
        │  • Spillwave        │  • Maintainer       │
        │    Solutions        │                     │
        │  • Apple (platform) │                     │
 P      │                     │                     │
 O      ├─────────────────────┼─────────────────────┤
 W      │                     │                     │
 E      │      MONITOR        │    KEEP INFORMED    │
 R      │                     │                     │
   Low  │  • Anthropic        │  • Writers          │
        │  • Google, Notion   │  • AI agents        │
        │  • GitHub           │  • Reviewers        │
        │  • Upstream projects│  • Readers          │
        │                     │  • OSS contributors │
        └─────────────────────┴─────────────────────┘
```

| Stakeholder | Power | Interest | Quadrant | Engagement Strategy |
|-------------|-------|----------|----------|---------------------|
| Maintainer | HIGH | HIGH | Manage Closely | Decides scope, merges, and releases. |
| Spillwave Solutions | HIGH | MEDIUM | Keep Satisfied | Release notes and the GitHub wiki. |
| Apple (platform) | HIGH | LOW | Keep Satisfied | Track macOS and Gatekeeper changes before each release. |
| Writers | MEDIUM | HIGH | Keep Informed | README feature list, user guide, wiki, and changelog. |
| AI agent contributors | MEDIUM | HIGH | Keep Informed | `CLAUDE.md`, `AGENTS.md`, work items, and the `verify` gate. |
| Human reviewers | MEDIUM | MEDIUM | Keep Informed | Pull request bodies and code walkthroughs. |
| Readers of exported documents | LOW | MEDIUM | Keep Informed | Indirect, through the quality of the export and share output. |
| Open-source contributors | LOW | MEDIUM | Keep Informed | README, license (missing today), and contribution notes. |
| Anthropic, Google, Notion, GitHub | LOW to MEDIUM | LOW | Monitor | Track API and model changes. |
| Upstream projects | MEDIUM | LOW | Monitor | Dependency updates under the `verify` gate. |

**Quadrant Interpretation:**

- **Manage Closely** (High Power, High Interest): Key decision-makers that need active engagement
- **Keep Satisfied** (High Power, Low Interest): Influential stakeholders that need periodic updates
- **Keep Informed** (Low Power, High Interest): Engaged stakeholders that need regular communication
- **Monitor** (Low Power, Low Interest): Minimal engagement

---

## Stakeholder drivers analysis

### SD-1: Writers - Keep my files mine

**Stakeholder**: Writers (technical writers and developers)

**Driver Category**: RISK

**Driver Statement**: Writers want an editor that never moves, copies, or exposes their notes without a clear action from them. The files must stay plain Markdown on their own disk, under their own version control.

**Context & Background**: "Local-first" is the core promise in `README.md` and in section 2.1 of the design doc. Motion has no account, no sync service, and no server-side store. The workspace jail refuses `..` traversal, absolute paths outside the workspace, sibling folders that share a name prefix, and symlinks that point out. Evidence: `tests/contract/storage-cases.json`, `src/lib/fsCore.ts`, and `src-tauri/src/fs_core.rs`.

**Driver Intensity**: CRITICAL

**Enablers** (What would help):

- One storage contract that both runtimes run, so a fix in one runtime cannot leave a hole in the other
- Plain Markdown on disk, so git shows every change

**Blockers** (What would hinder):

- A feature that writes outside the workspace or keeps a hidden copy
- Network features that send content without a clear user action

**Related Stakeholders**:

- Maintainer (SD-4) shares this driver. Ask AI and Share (SD-2) pull against it.

---

### SD-2: Writers - Write, diagram, query, and publish in one tool

**Stakeholder**: Writers

**Driver Category**: OPERATIONAL

**Driver Statement**: Writers want to stop the switch between a text editor, a diagram tool, a SQL console, an image generator, and a word processor. They want one editor that does all of it and still saves plain Markdown.

**Context & Background**: Section 2.1 of the design doc names this switch as the problem that Motion solves. The product answers it with five block types (Mermaid, Dataset, Query, Image gen, and Diagram gen), GFM tables, Ask AI, Synthesize, Share, Copy All, and now themed PDF and Word export.

**Driver Intensity**: HIGH

**Enablers** (What would help):

- Blocks that survive save and reload as real blocks (`e2e/blocks.spec.ts`)
- Output that a non-Markdown reader can open: PDF, Word, rich-text paste, Gist, and Notion

**Blockers** (What would hinder):

- Lost content when the Writer switches view modes
- A feature that needs a CLI or token that the Writer does not have, with no clear error

**Related Stakeholders**:

- Readers of exported documents (SD-7) benefit from the output features.

---

### SD-3: Writers - AI help that I control

**Stakeholder**: Writers

**Driver Category**: CUSTOMER

**Driver Statement**: Writers want AI to rewrite, tighten, expand, and continue their text. They do not want the AI to change the note before they see and accept the change.

**Context & Background**: The repo description says "AI first". Ask AI streams a reply into a preview. The Writer then chooses **Replace**, **Insert below**, **Try again**, or **Discard**. Targeted edits show as a **Proposed edits** list, and **Apply N edits** commits them as one undo step. Overlapping edits make Motion refuse the batch. Evidence: `e2e/ai.spec.ts` and `e2e/doc-commands.spec.ts`.

**Driver Intensity**: HIGH

**Enablers** (What would help):

- A preview before every commit, and Escape to discard
- Use of the tools that the Writer already has: `ANTHROPIC_API_KEY` or the `claude` CLI

**Blockers** (What would hinder):

- An edit that applies without a preview
- An AI failure that shows as a browser alert or that the Writer cannot see

**Related Stakeholders**:

- Anthropic (SD-9) supplies the model. The maintainer (SD-4) sets the default model and effort.

---

### SD-4: Maintainer - A product I can trust to ship

**Stakeholder**: Rick Hightower, maintainer and product owner

**Driver Category**: OPERATIONAL

**Driver Statement**: The maintainer wants to review design, not defects. Every change must arrive with proof that it works: green `verify`, both test layers, and truthful docs.

**Context & Background**: `CLAUDE.md` says: "Not done means not handed over: the human reviews design, not defects." The E2E fixture fails a test on any console error, uncaught exception, failed request, or response with status 400 or above. The design doc records past defects that this gate now blocks (block round-trip loss, view-mode loss, and a broken packaged build).

**Driver Intensity**: CRITICAL

**Enablers** (What would help):

- One command (`bun run verify`) for typecheck, client-bundle guard, unit tests, and E2E
- CI that runs the same command, plus `cargo test --lib` and `clippy -D warnings`

**Blockers** (What would hinder):

- No branch protection on `main`, so a merge can skip the checks
- Desktop-only behavior (Rust settings, Finder Open With) that browser E2E cannot see

**Related Stakeholders**:

- AI agent contributors (SD-6) produce most changes and must meet this bar.

---

### SD-5: Maintainer and Spillwave - Show what an AI-first product team can do

**Stakeholder**: Maintainer and Spillwave Solutions

**Driver Category**: STRATEGIC

**Driver Statement**: Spillwave wants Motion to prove that a small team with AI agents can ship a real desktop product with real quality gates. Motion is both a product and a reference case for the method.

**Context & Background**: Inferred, and must be confirmed. The repo description says "Git first, AI first, Markdown manager because in the age of AI, natural language programming is king!" The repo holds agent rules, a work tracker (`worklog`), a UI guard, and a documentation policy that Spillwave skills enforce. Seven releases shipped from v0.1.0 (2026-07-28) to v0.6.5 (2026-09-10).

**Driver Intensity**: HIGH

**Enablers** (What would help):

- Public repo, public wiki, and a visible changelog
- Governance artifacts (this ArcKit baseline) that show traceability from need to test

**Blockers** (What would hinder):

- No license, so outside users cannot legally reuse the code
- A visible regression in a release

**Related Stakeholders**:

- Open-source contributors (SD-8) need the license to take part.

---

### SD-6: AI agent contributors - Clear rules and a fast, honest gate

**Stakeholder**: AI agent contributors (Claude Code, Codex, and Grok sessions)

**Driver Category**: OPERATIONAL

**Driver Statement**: Agents need exact instructions, one command that tells them if the app is OK, and facts that do not change between sessions. Without these, agents repeat old mistakes.

**Context & Background**: `CLAUDE.md` records that the `Bun`-in-the-browser mistake "has been made and re-fixed four times in this repo." The static `guard:client` check now blocks it. Agents also need to know that the root `index.html` is stale, that there is no hot reload, and that bare `bun test` fails. Two or more agent sessions can work on the same machine at the same time.

**Driver Intensity**: HIGH

**Enablers** (What would help):

- Repo-local rules that load into every session
- Port and worktree rules that prevent collisions between parallel sessions

**Blockers** (What would hinder):

- Docs that disagree with the code (for example, the design doc says Synthesize writes `SKILL.md`, but the code writes `README.md`)
- One dev server on port 3000 that two sessions both need

**Related Stakeholders**:

- Maintainer (SD-4) sets the rules. Reviewers check the output.

---

### SD-7: Readers - Documents that look finished

**Stakeholder**: Readers of exported and shared documents

**Driver Category**: CUSTOMER

**Driver Statement**: Readers want a document that opens in the tool they already use (Preview, Word, Pages, a browser, or Notion) and that looks deliberate, with consistent colors and fonts.

**Context & Background**: PR 63 adds themed PDF and Word export with two builtin themes (Ice Snowstorm and Clay) and custom themes. The PDF uses only the standard fonts Helvetica, Times, and Courier. Word uses Calibri, Georgia, and Consolas. The HTML preview uses system fonts, so it looks closer to the theme than the PDF.

**Driver Intensity**: MEDIUM

**Enablers** (What would help):

- A preview built from the same block list as the file
- Themes that the Writer can copy and edit

**Blockers** (What would hinder):

- A file that does not open, or that drops tables, code, or quotes
- A large gap between the preview and the file

**Related Stakeholders**:

- Writers (SD-2) choose the theme and send the file.

---

### SD-8: Open-source contributors - Permission and a path in

**Stakeholder**: Open-source contributors

**Driver Category**: COMPLIANCE

**Driver Statement**: An outside developer must know the license terms before they use, fork, or change the code. They also need a short path to a green local build.

**Context & Background**: The repo is public on GitHub. `README.md` ends with "See LICENSE", but the repo has no `LICENSE` file, and GitHub reports no license. Without a license, default copyright applies, and nobody outside Spillwave has the right to reuse the code.

**Driver Intensity**: MEDIUM

**Enablers** (What would help):

- A `LICENSE` file that matches the intent of Spillwave
- The existing README prerequisites and the `verify` command

**Blockers** (What would hinder):

- No license
- Desktop build steps that need Rust, Bun, and a Mac

**Related Stakeholders**:

- Spillwave Solutions (SD-5) chooses the license.

---

### SD-9: AI and integration suppliers - Correct use of their APIs

**Stakeholder**: Anthropic, Google (through `imagen`), GitHub, and Notion

**Driver Category**: COMPLIANCE

**Driver Statement**: Each supplier wants clients to use valid credentials, respect rate limits, and follow its terms. Each supplier can change its API or model names without notice to Motion.

**Context & Background**: Ask AI defaults to the model `claude-opus-5` (`src/lib/ai/service.ts`) and reads `MOTION_AI_MODEL` and `MOTION_AI_EFFORT`. Share calls the GitHub Gist API and the Notion API with tokens that the Writer stores in the webview `localStorage`. Every CLI call has a 120-second timeout.

**Driver Intensity**: LOW

**Enablers** (What would help):

- Model and effort overrides in the environment
- Clear errors in the panel when a call fails

**Blockers** (What would hinder):

- A model name that the supplier retires
- An API change in Notion or GitHub

**Related Stakeholders**:

- Writers (SD-3) feel any supplier change first.

---

### SD-10: Apple platform - A native Mac app that behaves like one

**Stakeholder**: Maintainer, with Apple as the platform owner

**Driver Category**: STRATEGIC

**Driver Statement**: The maintainer wants Motion to feel native on macOS: Finder Open With, an overlay title bar, a remembered last folder, and a drag region in the header.

**Context & Background**: `CLAUDE.md` says "Desktop is the product." Releases v0.6.0 to v0.6.5 added native chrome, Finder Open With, and a header-drag capability fix (PR 59). Builds are unsigned today. `docs/macos.md` explains how to open an unsigned local build.

**Driver Intensity**: MEDIUM

**Enablers** (What would help):

- Tauri 2 capabilities and the `bun tauri dev` loop

**Blockers** (What would hinder):

- Gatekeeper friction for unsigned builds
- Tauri capability changes that break window behavior without a test

**Related Stakeholders**:

- Writers on macOS (SD-2).

---

## Driver-to-Goal mapping

### Goal G-1: Hold the workspace jail in both runtimes

**Derived From Drivers**: SD-1, SD-4

**Goal Owner**: Maintainer

**Goal Statement**: Keep 100% of the storage contract cases green in both `bun test src` and `cargo test --lib` on every pull request, and record zero escapes from the workspace, through v1.0.

**Why This Matters**: The jail is the technical form of the local-first promise. If one runtime drifts, the E2E gate stops proving the desktop app.

**Success Metrics**:

- **Primary Metric**: Contract cases that pass in both suites, as a percentage of all cases
- **Secondary Metrics**:
  - Reported escapes from the workspace (target: 0)
  - New storage behavior added to `tests/contract/storage-cases.json` before it ships

**Baseline**: 22 contract cases. Both suites green at `56485be` (`cargo test --lib`: 12 of 12 passed on 2026-10-21).

**Target**: 100% of cases green on every merge to `main`. Zero escapes.

**Measurement Method**: CI jobs `typecheck, guards, unit, e2e` and `cargo test + clippy`.

**Dependencies**:

- Branch protection that requires both CI jobs (see G-3)

**Risks to Achievement**:

- A new file operation (for example, rename) added to one core only
- A settings key that the Rust side drops, which breaks parity in a way that the contract does not cover

---

### Goal G-2: Prove every shipped feature with a user journey

**Derived From Drivers**: SD-2, SD-4, SD-6

**Goal Owner**: Maintainer

**Goal Statement**: By v0.7.0 (target 2026-12-31), each feature in the `README.md` feature list maps to at least one Playwright journey that asserts the success path and, where the feature can fail in a visible way, the failure path.

**Why This Matters**: The DoD in `CLAUDE.md` says that a feature without both test layers is not done. A traceable map shows where coverage is thin.

**Success Metrics**:

- **Primary Metric**: README features with at least one E2E journey, as a percentage of all README features
- **Secondary Metrics**:
  - Scenarios in ARC-001-REQ-v1.0 marked "not covered"
  - E2E test count (baseline 76)

**Baseline**: 76 E2E tests and 258 unit tests at `56485be`. ARC-001-REQ-v1.0 lists the scenarios that have no E2E today. Examples: reload cancel, reload of a clean note, theme delete, and the export default.

**Target**: 100% of README features covered. Zero "not covered" scenarios for MUST requirements.

**Measurement Method**: The traceability matrix in ARC-001-REQ-v1.0, refreshed each release.

**Dependencies**:

- The REQ document stays current with the README feature list

**Risks to Achievement**:

- Desktop-only behavior (Finder Open With, Rust settings) cannot run in browser E2E

---

### Goal G-3: Make the quality gate mandatory on `main`

**Derived From Drivers**: SD-4, SD-5

**Goal Owner**: Maintainer

**Goal Statement**: By 2026-11-30, GitHub branch protection on `main` requires the CI jobs `typecheck, guards, unit, e2e` and `cargo test + clippy` to pass before a merge.

**Why This Matters**: Today the gate is a convention. The design doc lists "No branch protection on `main`" as a Medium risk.

**Success Metrics**:

- **Primary Metric**: Branch protection rule present with both required checks (yes or no)
- **Secondary Metrics**:
  - Merges to `main` with a red required check (target: 0)

**Baseline**: No branch protection (design doc section 0.2).

**Target**: Rule active. Zero red merges.

**Measurement Method**: `gh api repos/SpillwaveSolutions/motion/branches/main/protection`.

**Dependencies**:

- CI job names stay stable

**Risks to Achievement**:

- A flaky E2E test makes the maintainer turn the rule off

---

### Goal G-4: Keep every AI change behind a preview

**Derived From Drivers**: SD-3, SD-1

**Goal Owner**: Maintainer

**Goal Statement**: In every release, 100% of AI-proposed changes to a note need an explicit Writer action (**Replace**, **Insert below**, or **Apply N edits**) before they reach the document.

**Why This Matters**: Writers accept AI help only if they keep control of the text.

**Success Metrics**:

- **Primary Metric**: AI entry points with an E2E test that proves preview-before-commit
- **Secondary Metrics**:
  - AI failures that show in the panel and not in an alert

**Baseline**: Three entry points (selection, `/ai`, and **Refine**). All three have E2E tests in `e2e/ai.spec.ts`.

**Target**: Every new AI entry point ships with the same test.

**Measurement Method**: `e2e/ai.spec.ts` and `e2e/doc-commands.spec.ts`.

**Dependencies**:

- The single AI pipeline in `src/lib/ai`

**Risks to Achievement**:

- A new feature (for example, dictation, which is P3 on the roadmap) that bypasses the pipeline

---

### Goal G-5: Ship output that readers can open

**Derived From Drivers**: SD-2, SD-7

**Goal Owner**: Maintainer

**Goal Statement**: In v0.7.0, a Writer can export the open note to PDF and Word with a theme. 100% of export downloads in E2E have a valid file signature (`%PDF` for PDF and `PK` for Word), and a manual check opens each file in Preview and in Word or Pages before release.

**Why This Matters**: Readers do not use Markdown tools. The export is the point where a Writer's work reaches them.

**Success Metrics**:

- **Primary Metric**: Export formats with a valid-signature E2E test
- **Secondary Metrics**:
  - Block types that the export renders (heading, paragraph, list, quote, code, and table)
  - Manual open check per release (pass or fail)

**Baseline**: `e2e/export.spec.ts` checks both signatures at `56485be`. The manual open check is not recorded yet.

**Target**: Both formats proven in E2E and checked by hand for each release.

**Measurement Method**: `e2e/export.spec.ts` and the release checklist (`docs/release-checklist.md`).

**Dependencies**:

- PR 63 merged

**Risks to Achievement**:

- The PDF standard-font limit makes the PDF look different from the preview

---

### Goal G-6: Keep preferences across restarts and runtimes

**Derived From Drivers**: SD-2, SD-4, SD-10

**Goal Owner**: Maintainer

**Goal Statement**: Every setting (zoom, sidebar width, split ratio, export theme, and custom themes) survives a quit and relaunch in both runtimes. A save of one key never removes another key.

**Why This Matters**: A lost preference is a small defect that every Writer sees on every launch.

**Success Metrics**:

- **Primary Metric**: Settings keys with a round-trip test in TypeScript and in Rust
- **Secondary Metrics**:
  - Unknown keys kept on write (target: always)

**Baseline**: Five keys in `MotionSettings`. Rust `apply_settings_partial` copies all five. Rust stores the `themes` array as received, and TypeScript sanitizes it on read.

**Target**: Five of five keys with a test in both suites.

**Measurement Method**: Unit tests in `src/lib/settings*.test.ts`, Rust tests in `src-tauri/src/lib.rs`, and `e2e/zoom.spec.ts`.

**Dependencies**:

- One settings file, `~/.config/motion/settings.json`, for both runtimes

**Risks to Achievement**:

- A new key added in TypeScript but not in Rust (the PR 63 brief names this risk)

---

### Goal G-7: Release on a steady cadence

**Derived From Drivers**: SD-5, SD-4

**Goal Owner**: Maintainer

**Goal Statement**: Cut v0.7.0 by 2026-12-31, and after that release at least once every 45 days.

**Why This Matters**: Two features (PR 62 note links and PR 63 export) wait on open pull requests. The last release was v0.6.5 on 2026-09-10.

**Success Metrics**:

- **Primary Metric**: Days between releases
- **Secondary Metrics**:
  - Open feature pull requests older than 30 days

**Baseline**: 7 releases in 44 days (2026-07-28 to 2026-09-10). 41 days with no release at 2026-10-21. PR 62 is open since 2026-09-28.

**Target**: 45 days or less between releases.

**Measurement Method**: `CHANGELOG.md` dates and GitHub releases.

**Dependencies**:

- G-3, so that a release does not wait on manual checks

**Risks to Achievement**:

- Parallel work on long-lived branches

---

### Goal G-8: Close the open-source compliance gap

**Derived From Drivers**: SD-5, SD-8

**Goal Owner**: Spillwave Solutions (through the maintainer)

**Goal Statement**: By 2026-11-30, add a `LICENSE` file to the repo root and make the `README.md` license section match it.

**Why This Matters**: A public repo with no license gives no right of reuse. The README refers to a file that does not exist.

**Success Metrics**:

- **Primary Metric**: GitHub reports a license (yes or no)

**Baseline**: `licenseInfo: null` from `gh repo view` on 2026-10-21.

**Target**: A license that GitHub detects.

**Measurement Method**: `gh repo view SpillwaveSolutions/motion --json licenseInfo`.

**Dependencies**:

- A license decision by Spillwave

**Risks to Achievement**:

- Dependency licenses that limit the choice (check the copyleft summary first)

---

## Goal-to-Outcome mapping

### Outcome O-1: Writers trust Motion with their real notes

**Supported Goals**: G-1, G-4, G-6

**Outcome Statement**: Writers use Motion on real workspaces with zero data-loss or workspace-escape reports per release.

**Measurement Details**:

- **KPI**: Data-loss or escape issues per release
- **Current Value**: 0 open issues of this kind (no issue tracker data shows otherwise)
- **Target Value**: 0 per release
- **Measurement Frequency**: Per release
- **Data Source**: GitHub issues and dogfood notes
- **Report Owner**: Maintainer

**Business Value**:

- **Financial Impact**: None direct. Motion has no revenue model in the repo.
- **Strategic Impact**: Trust is the precondition for every other feature.
- **Operational Impact**: Fewer emergency fixes.
- **Customer Impact**: Writers keep their files under their own control.

**Timeline**:

- **Phase 1 (Months 1-3)**: Contract cases cover rename and settings parity.
- **Phase 2 (Months 4-6)**: Branch protection active. Zero red merges.
- **Phase 3 (Months 7-12)**: Signed desktop builds.
- **Sustainment (Year 2+)**: Contract-first rule for every new file operation.

**Stakeholder Benefits**:

- **Writers**: Files stay safe and plain.
- **Maintainer**: No data-loss incidents to fix under pressure.

**Leading Indicators** (early signals of success):

- New file operations land with contract cases first
- Settings round-trip tests in both suites

**Lagging Indicators** (final proof of success):

- Zero data-loss issues across three releases

---

### Outcome O-2: Writers finish documents inside Motion

**Supported Goals**: G-2, G-5

**Outcome Statement**: A Writer can go from a blank note to a themed PDF, Word file, Gist, or Notion page without another tool.

**Measurement Details**:

- **KPI**: Output paths with a passing E2E journey (PDF, Word, Copy All, Gist, and Notion)
- **Current Value**: 5 of 5 at `56485be` (export spec, copy spec, and publish spec)
- **Target Value**: 5 of 5, plus a manual open check of PDF and Word per release
- **Measurement Frequency**: Per release
- **Data Source**: E2E results and the release checklist
- **Report Owner**: Maintainer

**Business Value**:

- **Financial Impact**: None direct.
- **Strategic Impact**: Motion becomes a full authoring tool, not only an editor.
- **Operational Impact**: Writers stop the copy-and-reformat step.
- **Customer Impact**: Readers get documents that look finished.

**Timeline**:

- **Phase 1 (Months 1-3)**: PR 63 merged with all export scenarios covered.
- **Phase 2 (Months 4-6)**: Feedback on the gap between the PDF fonts and the preview.
- **Phase 3 (Months 7-12)**: Decide on embedded fonts if the gap matters.
- **Sustainment (Year 2+)**: Themes stay backward compatible in settings.

**Stakeholder Benefits**:

- **Writers**: One tool from draft to delivery.
- **Readers**: Consistent, readable documents.

**Leading Indicators** (early signals of success):

- Custom themes created during dogfood
- Export used in the Spillwave documentation suite

**Lagging Indicators** (final proof of success):

- No reader-facing defects reported against export

---

### Outcome O-3: Changes arrive done, and the maintainer reviews only design

**Supported Goals**: G-2, G-3, G-7

**Outcome Statement**: Every merged pull request has a green `verify`, both test layers, and updated docs. The maintainer does not find functional defects in review.

**Measurement Details**:

- **KPI**: Pull requests that need a defect-fix round after review, as a percentage of merged pull requests
- **Current Value**: Not measured. The repo does not record review rounds.
- **Target Value**: Under 10% per release
- **Measurement Frequency**: Per release
- **Data Source**: GitHub pull request reviews and follow-up commits
- **Report Owner**: Maintainer

**Business Value**:

- **Financial Impact**: Less maintainer time per feature.
- **Strategic Impact**: Evidence that the AI-first method works (SD-5).
- **Operational Impact**: Faster releases.
- **Customer Impact**: Fewer regressions reach Writers.

**Timeline**:

- **Phase 1 (Months 1-3)**: Start to record review rounds in pull request labels.
- **Phase 2 (Months 4-6)**: Baseline measured.
- **Phase 3 (Months 7-12)**: Target met.
- **Sustainment (Year 2+)**: Keep the DoD unchanged.

**Stakeholder Benefits**:

- **Maintainer**: Reviews design only.
- **AI agents**: Clear acceptance criteria.

**Leading Indicators** (early signals of success):

- `verify` green on the first CI run of a pull request

**Lagging Indicators** (final proof of success):

- Release cadence at or below 45 days with zero hotfix releases

---

### Outcome O-4: Outside users can adopt and contribute

**Supported Goals**: G-8, G-2

**Outcome Statement**: An outside developer can find the license, build Motion, and run `bun run verify` green from the README alone.

**Measurement Details**:

- **KPI**: License present, and the README build steps work on a clean machine
- **Current Value**: No license. Build steps not tested on a clean machine.
- **Target Value**: License present. One clean-machine build per release.
- **Measurement Frequency**: Per release
- **Data Source**: GitHub repo metadata and a clean CI checkout
- **Report Owner**: Maintainer

**Business Value**:

- **Financial Impact**: None direct.
- **Strategic Impact**: Public credibility for Spillwave.
- **Operational Impact**: Outside fixes become possible.
- **Customer Impact**: Writers can inspect and change the tool that touches their files.

**Timeline**:

- **Phase 1 (Months 1-3)**: License added.
- **Phase 2 (Months 4-6)**: Contribution notes added.
- **Phase 3 (Months 7-12)**: First outside contribution merged.
- **Sustainment (Year 2+)**: Keep the build steps current.

**Stakeholder Benefits**:

- **Open-source contributors**: Legal permission and a clear path.
- **Spillwave Solutions**: A visible, reusable reference product.

**Leading Indicators** (early signals of success):

- Forks and stars after the license lands

**Lagging Indicators** (final proof of success):

- Merged outside pull requests

---

## Complete traceability matrix

### Stakeholder → Driver → Goal → Outcome

| Stakeholder | Driver ID | Driver Summary | Goal ID | Goal Summary | Outcome ID | Outcome Summary |
|-------------|-----------|----------------|---------|--------------|------------|-----------------|
| Writers | SD-1 | Keep my files mine | G-1 | Jail holds in both runtimes | O-1 | Writers trust Motion |
| Writers | SD-1 | Keep my files mine | G-4 | AI behind a preview | O-1 | Writers trust Motion |
| Writers | SD-2 | One tool | G-2 | Every feature has a journey | O-2 | Writers finish in Motion |
| Writers | SD-2 | One tool | G-5 | Output readers can open | O-2 | Writers finish in Motion |
| Writers | SD-2 | One tool | G-6 | Preferences persist | O-1 | Writers trust Motion |
| Writers | SD-3 | AI help I control | G-4 | AI behind a preview | O-1 | Writers trust Motion |
| Maintainer | SD-4 | Ship with proof | G-1 | Jail holds in both runtimes | O-1 | Writers trust Motion |
| Maintainer | SD-4 | Ship with proof | G-2 | Every feature has a journey | O-3 | Changes arrive done |
| Maintainer | SD-4 | Ship with proof | G-3 | Gate mandatory on `main` | O-3 | Changes arrive done |
| Maintainer and Spillwave | SD-5 | Show the AI-first method | G-7 | Steady release cadence | O-3 | Changes arrive done |
| Maintainer and Spillwave | SD-5 | Show the AI-first method | G-8 | License present | O-4 | Outside users can adopt |
| AI agents | SD-6 | Clear rules, honest gate | G-2 | Every feature has a journey | O-3 | Changes arrive done |
| Readers | SD-7 | Documents that look finished | G-5 | Output readers can open | O-2 | Writers finish in Motion |
| OSS contributors | SD-8 | Permission and a path in | G-8 | License present | O-4 | Outside users can adopt |
| AI and integration suppliers | SD-9 | Correct API use | G-4 | AI behind a preview | O-1 | Writers trust Motion |
| Maintainer (Apple platform) | SD-10 | Native Mac behavior | G-6 | Preferences persist | O-1 | Writers trust Motion |

### Conflict analysis

**Competing Drivers**:

- **Conflict 1**: Writers want local-first (SD-1). The same Writers want AI help and publishing (SD-2, SD-3), and these features send note content to Anthropic, GitHub, or Notion.
  - **Resolution Strategy**: Content leaves the machine only after an explicit action (**Ask AI**, **Refine**, **Share**, a generative block). These features are optional. Tokens stay in local storage on the machine. Motion has no background network calls and no telemetry. ARC-001-REQ-v1.0 records this as conflict C-1.

- **Conflict 2**: Readers want the export to look like the preview (SD-7). The maintainer wants a small, simple export with no embedded fonts (SD-4).
  - **Resolution Strategy**: The PDF uses standard fonts. The README and the user guide state the limit. The preview is built from the same block list, so the content matches even when the fonts differ. Revisit if Writers report the gap.

- **Conflict 3**: Agents want to ship fast (SD-6). The maintainer requires unit tests, Playwright journeys, docs, and a wiki publish for each feature (SD-4).
  - **Resolution Strategy**: The DoD stays. The cost goes down through reuse of `e2e/fixtures.ts`, small tests, and generated docs where possible.

- **Conflict 4**: The maintainer says desktop is the product (SD-10). The E2E gate runs only in browser mode (SD-4).
  - **Resolution Strategy**: One storage contract and one settings shape for both runtimes, Rust unit tests for the IPC commands, and a manual desktop check before each release.

**Synergies**:

- **Synergy 1**: The workspace jail (SD-1) and the honest gate (SD-4) work together. The contract fixture proves the jail in both runtimes on every pull request.
- **Synergy 2**: The AI preview (SD-3) and the agent rules (SD-6) share one idea: no change lands without review.
- **Synergy 3**: This ArcKit baseline serves the Spillwave showcase (SD-5) and makes coverage gaps visible to agents (SD-6).

---

## Communication & engagement plan

### Stakeholder-Specific messaging

#### Writers

**Primary Message**: Your notes stay plain Markdown on your disk. Motion sends content out only when you ask.

**Key Talking Points**:

- The workspace jail and the shared contract
- Preview before every AI change
- Export, Copy All, and Share for readers who do not use Markdown

**Communication Frequency**: Per release

**Preferred Channel**: README, user guide, GitHub wiki, and changelog

**Success Story**: A Writer drafts, diagrams, queries, and exports a themed report in one session, and git shows a clean Markdown diff.

---

#### Maintainer and Spillwave Solutions

**Primary Message**: Every requirement traces to a stakeholder goal and to a test, and gaps are visible.

**Key Talking Points**:

- Coverage gaps from the REQ traceability matrix
- Governance gaps: license and branch protection
- Release cadence against the 45-day target

**Communication Frequency**: Per release and per quarterly review of this document

**Preferred Channel**: ArcKit artifacts in `projects/001-motion/` and the roadmap

**Success Story**: v0.7.0 ships with export, a license, and branch protection, and no review round finds a defect.

---

#### AI agent contributors

**Primary Message**: The rules in `CLAUDE.md` are the contract. `bun run verify` is the gate. The REQ scenarios say what to test.

**Key Talking Points**:

- Use one worktree and one port per session
- Add the contract case before the file operation
- Update docs in the same pull request

**Communication Frequency**: Every session (the rules load automatically)

**Preferred Channel**: `CLAUDE.md`, `AGENTS.md`, `.work/` items, and this ArcKit baseline

**Success Story**: A session ships a feature with green `verify` on the first CI run.

---

#### Open-source contributors

**Primary Message**: You can build Motion from the README and prove your change with one command.

**Key Talking Points**:

- License terms (after G-8)
- Prerequisites: Bun 1.3+, and Rust for the desktop app

**Communication Frequency**: As needed

**Preferred Channel**: README and GitHub

**Success Story**: An outside pull request merges with green CI and no rework.

---

## Change impact assessment

### Impact on Stakeholders

| Stakeholder | Current State | Future State | Change Magnitude | Resistance Risk | Mitigation Strategy |
|-------------|---------------|--------------|------------------|-----------------|---------------------|
| Writers | Copy Markdown into Word or a PDF tool to share it | Export a themed PDF or Word file from Motion | MED | LOW | Builtin themes that work without setup |
| Maintainer | Merges can skip CI | Branch protection blocks red merges | LOW | MED | Fix flaky tests first so the rule stays on |
| AI agents | Docs and code sometimes disagree | ArcKit baseline and docs checked against code | MED | LOW | Record differences in the REQ, then fix the docs |
| OSS contributors | No license | Clear license | LOW | LOW | Choose a license that fits the dependency licenses |

### Change readiness

**Champions** (Enthusiastic supporters):

- Maintainer: wrote the DoD and the validation loop

**Fence-sitters** (Neutral, need convincing):

- Writers who use another Markdown editor: need proof that Motion keeps files plain and safe

**Resisters** (Opposed or skeptical):

- Writers who reject any AI feature: concerned about content that leaves the machine. Strategy: keep AI optional and opt-in, and document what leaves the machine and when.

---

## Risk Register (Stakeholder-Related)

### Risk R-1: Single maintainer

**Related Stakeholders**: Maintainer, Spillwave Solutions, Writers

**Risk Description**: One person owns every decision, review, and release. If that person is not available, releases stop.

**Impact on Goals**: G-3, G-7

**Probability**: MEDIUM

**Impact**: HIGH

**Mitigation Strategy**: Keep decisions in the repo (CLAUDE.md, ArcKit artifacts, and the design doc) so another person or agent can continue.

**Contingency Plan**: Spillwave names a second maintainer with merge rights.

---

### Risk R-2: Parallel agent sessions collide

**Related Stakeholders**: AI agents, Maintainer

**Risk Description**: Two sessions on one machine share port 3000 and can share a branch. One session can stop the dev server of another session, or write to the same files. This happened on 2026-10-21 during the PR 63 dogfood.

**Impact on Goals**: G-2, G-7

**Probability**: HIGH

**Impact**: MEDIUM

**Mitigation Strategy**: One git worktree per session. A per-session port for the dev server and Playwright.

**Contingency Plan**: Rerun `verify` in a clean worktree.

---

### Risk R-3: Docs drift from the code

**Related Stakeholders**: AI agents, Writers, Maintainer

**Risk Description**: The design doc says Synthesize writes `SKILL.md`, and the code writes `README.md` or `README.motion.md`. The design doc says Motion has no API-key handling, and Ask AI now reads `ANTHROPIC_API_KEY`. Agents that trust the docs make wrong changes.

**Impact on Goals**: G-2

**Probability**: HIGH

**Impact**: MEDIUM

**Mitigation Strategy**: The REQ records each difference. The DoD requires a doc update in the same pull request as the feature.

**Contingency Plan**: A doc audit before each release.

---

### Risk R-4: No license on a public repo

**Related Stakeholders**: Spillwave Solutions, OSS contributors

**Risk Description**: Outside users have no right to reuse the code, and the README refers to a missing file.

**Impact on Goals**: G-8

**Probability**: HIGH (the gap exists now)

**Impact**: MEDIUM

**Mitigation Strategy**: Add a `LICENSE` file (G-8).

**Contingency Plan**: Make the repo private until a license is chosen.

---

### Risk R-5: Supplier change breaks AI or Share

**Related Stakeholders**: Writers, Anthropic, GitHub, Notion

**Risk Description**: A retired model name (default `claude-opus-5`) or an API change in GitHub or Notion breaks a feature.

**Impact on Goals**: G-4, G-5

**Probability**: MEDIUM

**Impact**: MEDIUM

**Mitigation Strategy**: Environment overrides (`MOTION_AI_MODEL`), errors shown in the panel, and stubbed E2E for Share.

**Contingency Plan**: Patch release with a new default.

---

### Risk R-6: Third-party brand in a theme name

**Related Stakeholders**: Spillwave Solutions, Anthropic

**Risk Description**: The Clay theme is described as "Clay (Anthropic)" and copies the Anthropic palette. A brand owner can object to the use of its name in a product.

**Impact on Goals**: G-5

**Probability**: LOW

**Impact**: LOW

**Mitigation Strategy**: Keep the theme name "Clay" in the UI. Describe the palette without a brand name in user-facing text if Spillwave decides so.

**Contingency Plan**: Rename the theme description in a patch release.

---

## Governance & decision rights

### Decision authority matrix (RACI)

| Decision Type | Responsible | Accountable | Consulted | Informed |
|---------------|-------------|-------------|-----------|----------|
| Feature priority and roadmap | Maintainer | Maintainer | Spillwave Solutions, Writers (issues) | AI agents (work items) |
| Architecture decisions (storage, jail, IPC) | AI agent or maintainer | Maintainer | Design doc, contract fixture | Reviewers |
| Merge to `main` | Maintainer | Maintainer | CI results | AI agents |
| Release cut | Maintainer | Maintainer | Release checklist | Writers (changelog) |
| License choice | Maintainer | Spillwave Solutions | Dependency license summary | OSS contributors |
| Security changes (jail, SQL, sanitize) | AI agent or maintainer | Maintainer | Contract fixture, `docs/designs` section 22 | Writers (changelog) |
| New AI provider or default model | Maintainer | Maintainer | Supplier terms | Writers (user guide) |
| New dependency | AI agent | Maintainer | Ponytail ladder in agent rules | Reviewers |

### Escalation path

1. **Level 1**: AI agent session. Decides inside the rules in `CLAUDE.md`. Stops and asks when a decision is the user's to make.
2. **Level 2**: Maintainer. Scope, design, merges, and releases.
3. **Level 3**: Spillwave Solutions. License, brand, and strategic direction.

---

## Validation & Sign-off

### Stakeholder review

| Stakeholder | Review Date | Comments | Status |
|-------------|-------------|----------|--------|
| Maintainer | PENDING | Confirm the inferred drivers SD-5 and SD-10, and goals G-3, G-7, and G-8 | PENDING |
| Spillwave Solutions | PENDING | Confirm the license and brand positions (G-8, R-6) | PENDING |

### Document approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | Spillwave Solutions | PENDING | PENDING |
| Business Owner | Rick Hightower | PENDING | PENDING |
| Enterprise Architect | Rick Hightower | PENDING | PENDING |

---

## Appendices

### Appendix a: stakeholder interview summaries

#### Evidence review in place of interviews - 2026-10-21

No interviews occurred. The analysis uses repo evidence.

**Key Points**:

- `CLAUDE.md`: "Desktop is the product." "The human reviews design, not defects."
- Repo description: "Git first, AI first, Markdown manager."
- Design doc section 2.1: Motion removes the switch between editor, diagram tool, SQL console, and image generator.

**Quotes**:

- "Not done means not handed over: the human reviews design, not defects." (`CLAUDE.md`)
- "This single mistake has been made and re-fixed four times in this repo." (`CLAUDE.md`, about `Bun` in the browser)

**Follow-up Actions**:

- Maintainer confirms drivers SD-5 and SD-10

---

### Appendix B: survey results

No surveys exist. Motion collects no telemetry by design, so usage data is not available. Adoption evidence is qualitative: dogfood sessions, GitHub issues, and pull requests.

---

### Appendix C: References

- `README.md` (feature list, known limitations)
- `docs/user_guide/user-guide.md`
- `docs/designs/current_design_doc.md` (sections 0, 1, 2, 3, 4, and 22)
- `CLAUDE.md` and `AGENTS.md`
- `CHANGELOG.md` (releases v0.1.0 to v0.6.5)
- Pull requests 59 to 63 on GitHub
- ARC-001-REQ-v1.0 (requirements, journeys, and scenarios)

---

## Revision history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-21 | ArcKit AI | Initial reverse-engineered draft |

## External references

> This section provides traceability from generated content back to source documents.
> Follow citation instructions in the project's citation reference guide.

### Document register

| Doc ID | Filename | Type | Source Location | Description |
|--------|----------|------|-----------------|-------------|
| *None provided* | None | None | None | No external documents. The sources are in the repo (see Appendix C). |

### Citations

| Citation ID | Doc ID | Page/Section | Category | Quoted Passage |
|-------------|--------|--------------|----------|----------------|
| None | None | None | None | None |

### Unreferenced documents

| Filename | Source Location | Reason |
|----------|-----------------|--------|
| None | None | None |

---

**Generated by**: ArcKit `/arckit:stakeholders` command
**Generated on**: 2026-10-21
**ArcKit Version**: 6.18.2
**Project**: Motion (Project 001)
**AI Model**: Claude Opus 5.5 (claude-opus-5-5)
