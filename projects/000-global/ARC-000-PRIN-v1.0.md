# Motion architecture principles

> **Template Origin**: Official | **ArcKit Version**: 6.18.2 | **Command**: `/arckit:principles`

## Document control

| Field | Value |
|-------|-------|
| **Document ID** | ARC-000-PRIN-v1.0 |
| **Document Type** | Architecture Principles |
| **Project** | Global (Project 000). Governs Motion (Project 001). |
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
| 1.0 | 2026-10-21 | ArcKit AI | Initial creation from `/arckit:principles` command. Reverse-engineered from design doc section 6 (AD-1 to AD-10) and the code at `56485be`. | PENDING | PENDING |

---

## Executive summary

This document states the principles that govern architecture decisions in Motion, a local-first technical writing IDE. Motion edits Markdown files on your disk. It runs in two modes: browser mode, where a local dev server owns the filesystem, and desktop mode, where a native backend owns it.

The principles are reverse-engineered. Most of them come from the ten architectural decisions in `docs/designs/current_design_doc.md` section 6 (AD-1 to AD-10). The rest come from the Definition of Done in `CLAUDE.md` and from rules that the code enforces but no document names. Each principle cites its evidence. A principle that the code does not enforce yet says so in its validation gates.

**Scope**: Motion and any future Spillwave project that reuses its runtime split, storage contract, or validation loop.

**Authority**: The maintainer approves principles and exceptions. Pull request review and CI enforce them.

**Compliance**: Mandatory unless an exception is approved through the process in [Exception process](#vi-exception-process).

**Philosophy**: Each principle statement is technology-agnostic. It describes a quality the architecture must have. The **Evidence in Motion** row of each principle names the current implementation, so you can check the principle against the code.

### How the principles map to the design decisions

| Design decision | Principles |
|-----------------|------------|
| AD-1 One storage contract, two implementations, one shared fixture | P-2, P-13 |
| AD-2 Component-aware path containment | P-4 |
| AD-3 The dev server's workspace root is environment-only | P-5 |
| AD-4 Transport routers and a static guard for runtime-only APIs | P-10, P-16 |
| AD-5 One command is the validation gate | P-15 |
| AD-6 The E2E gate inspects HTTP status | P-13, P-17 |
| AD-7 Security is enforced at the backend, in both backends | P-3 |
| AD-8 SQL is restricted by validation | P-9 |
| AD-9 One shared block-attribute parser | P-7 |
| AD-10 Generated images are inline | P-6 |

### Principle summary

| ID | Principle | Template category | Domain | Strength | Criticality |
|----|-----------|-------------------|--------|----------|-------------|
| P-1 | Local-first: your files are the system of record | Strategic | Business | MUST | CRITICAL |
| P-2 | One behavior contract across runtimes | Strategic | Application | MUST | CRITICAL |
| P-3 | Enforce security at each backend boundary | Strategic | Technology | MUST (non-negotiable) | CRITICAL |
| P-4 | Contain paths by structure, not by text | Strategic | Technology | MUST (non-negotiable) | CRITICAL |
| P-5 | The server owns the scope of every request | Strategic | Technology | MUST (non-negotiable) | CRITICAL |
| P-6 | A document is self-contained and portable | Data | Data | MUST | HIGH |
| P-7 | One parser per serialized format | Data | Data | MUST | HIGH |
| P-8 | Writes to shared state are partial and keep unknown keys | Data | Data | MUST | HIGH |
| P-9 | Validate and sanitize untrusted content before it runs or renders | Data | Data | MUST (non-negotiable) | CRITICAL |
| P-10 | Route runtime-specific capabilities through one router | Integration | Application | MUST | HIGH |
| P-11 | External services are optional and replaceable | Integration | Business | MUST | HIGH |
| P-12 | AI output is a proposal that you accept | Integration | Business | MUST | CRITICAL |
| P-13 | Failures are explicit and classified | Quality | Application | MUST | HIGH |
| P-14 | Docs stay truthful to the code | Quality | Business | MUST | MEDIUM |
| P-15 | One command answers "is it OK?" | Development | Technology | MUST | CRITICAL |
| P-16 | Guard statically what runtime tests cannot see | Development | Technology | MUST | HIGH |
| P-17 | The test gate fails on any unexpected error signal | Development | Technology | MUST | HIGH |
| P-18 | Every feature ships with a unit test and an end-to-end journey | Development | Application | MUST | HIGH |
| P-19 | All work is tracked and traceable | Development | Business | MUST | MEDIUM |

---

## I. Strategic principles

### P-1. Local-first: your files are the system of record

**Principle Statement**:
User content MUST live in plain files in a folder that you choose. The application MUST work without a network connection for every feature that does not call an external service. No feature may move your content to a remote store without an explicit action from you.

**Rationale**:
Writers keep notes for years. A file format that only one application reads, or a store that only one vendor hosts, puts that work at risk. Plain files also let you use other tools, such as version control, search, and other editors, on the same content.

**Implications**:

- The workspace folder is the only content store. The application keeps no hidden copy of a note.
- Application state that is not content, such as zoom or pane size, lives in a separate settings file, not in the workspace.
- Features that send content off the device, such as publishing or AI, start only from a user action and show where the content goes.
- A new feature that needs a server must explain why a local design cannot work.

**Validation Gates**:

- [ ] The feature reads and writes only through the storage interface and the workspace jail.
- [ ] The feature works offline, or it states which external service it needs.
- [ ] No content leaves the device without a user action.

**Example**:

- Good: Export writes a PDF to a path that you pick, and the note on disk does not change.
- Bad: A feature syncs notes to a hosted database in the background.

**Common Violations**:

- Caching note content in browser storage as a second source of truth.
- Starting a network call when a note opens.

**Evidence in Motion**: `src/lib/storage/index.ts` (`TauriStorage` and `HttpStorage` both write real files). Publish to Gist and Notion starts only from the **Publish** dialog. Settings live in `~/.config/motion/settings.json`.

**Traces to**: SD-1, G-1, BR-001, NFR-C-001.

---

### P-2. One behavior contract across runtimes

**Principle Statement**:
When the same behavior has more than one implementation, the implementations MUST share one written, language-neutral contract, and every implementation's test suite MUST run that contract. No implementation is the reference. The contract is the reference.

**Rationale**:
Motion's browser mode and desktop mode cannot share code. Before the contract existed, the two storage implementations drifted apart in seven ways. Code review did not catch the drift. A shared fixture turns a difference into a red build instead of a bug report.

**Implications**:

- A new storage behavior needs three edits: the contract, implementation A, and implementation B.
- A person writes the contract by hand. A generator would make one implementation the reference and add a third artifact that can drift.
- Contract cases assert an error class, not an error message, so each language can word its errors naturally.
- A case can record the incident it pins, so the reason survives after the people who knew it leave.

**Validation Gates**:

- [ ] Each behavior that exists in both runtimes has at least one contract case.
- [ ] Both test suites load the same contract file.
- [ ] A new case fails at least one suite until both implementations support it.

**Example**:

- Good: A relative path in a document resolves against the workspace root in both modes, and one contract case proves it.
- Bad: Browser mode resolves a relative path against the process directory, desktop mode rejects it, and nobody notices.

**Common Violations**:

- Generating the contract from one implementation.
- Adding behavior to one implementation with a comment such as "port later."

**Evidence in Motion**: `tests/contract/storage-cases.json` (22 cases), run by `src/lib/fsCore.contract.test.ts` and by `mod contract` in `src-tauri/src/fs_core.rs`. Design decision AD-1.

**Known gap**: Settings have two implementations, `src/lib/settingsIo.ts` and `apply_settings_partial` in `src-tauri/src/lib.rs`, but no shared contract. FR-038 in ARC-001-REQ records the gap.

**Traces to**: SD-4, SD-6, G-1, NFR-M-004, FR-038.

---

### P-3. Enforce security at each backend boundary (non-negotiable)

**Principle Statement**:
Every backend MUST treat input from the user interface as untrusted. Each backend MUST re-derive and re-check every path, identifier, and command argument at its own boundary. The security rules MUST live in the shared core that the contract tests, not in the thin command wrappers.

**Rationale**:
The user interface renders documents, AI output, and imported content. Any of that content can try to make the interface send a bad request. A check that runs only in the interface protects nothing. A second copy of the rules in a wrapper is how the two runtimes drifted in the past.

**Implications**:

- The interface's copy of a path is a hint. The backend resolves it again.
- Command wrappers call the core and convert its result. They hold no rules of their own.
- A platform permission system can add a layer, but it does not replace the explicit jail.

**Mandatory Controls**:

- [ ] Every filesystem operation goes through the jailed core.
- [ ] Every new backend command has a test that sends an outside path and expects a refusal.
- [ ] Secrets, such as API tokens, are not written into content files or logs.

**Validation Gates**:

- [ ] Each new command maps to a core function that the contract or a unit test covers.
- [ ] The E2E suite has a refusal case for each new filesystem route.

**Example**:

- Good: The dev server returns 403 for a path outside the workspace, and the E2E suite asserts the 403.
- Bad: The interface hides files outside the workspace, but the API still serves them.

**Common Violations**:

- Checking a path in the interface and trusting it in the backend.
- Copying a jail rule into a command wrapper.

**Evidence in Motion**: `src-tauri/src/lib.rs` commands delegate to `fs_core`. `e2e/persistence.spec.ts` asserts the 403. Design decision AD-7.

**Known gap**: Publish tokens are stored as plaintext in webview `localStorage`. Work item 01M5GQ20K7RQ0WTFF1973915BP tracks the decision.

**Exceptions**: None. A control's implementation can change if a compensating control gives the same protection.

**Traces to**: SD-1, SD-4, G-1, NFR-SEC-001 to NFR-SEC-005.

---

### P-4. Contain paths by structure, not by text (non-negotiable)

**Principle Statement**:
A containment check MUST compare path components after it resolves links and relative segments. A check MUST NOT compare paths as strings. For a path that does not exist yet, the check MUST resolve the parent folder and then add the file name.

**Rationale**:
For a workspace at `/x/ws`, the string `/x/ws-evil/planted.md` starts with `/x/ws`. A string-prefix check lets in a sibling folder. A symlinked parent folder can also let a new file escape if the check runs before resolution.

**Implications**:

- Resolve first, then contain.
- The workspace root counts as inside, because a top-level note's parent is the root.
- A test must plant bait, such as a sibling folder with the same name prefix, and expect a refusal.

**Validation Gates**:

- [ ] The containment function compares components.
- [ ] Contract cases cover parent traversal, an outside absolute path, a same-prefix sibling, and an escaping symlink for both read and write.

**Example**:

- Good: The check computes the relative path from the root and rejects any result that leaves the root.
- Bad: `candidate.startsWith(root)` on two strings.

**Common Violations**:

- A new code path that joins user input to the root and opens it without the core.

**Evidence in Motion**: `isInsideWorkspace()` and `resolveInWorkspace()` in `src/lib/fsCore.ts`. `is_inside_workspace()` and `resolve_in_workspace()` in `src-tauri/src/fs_core.rs`. Design decision AD-2.

**Traces to**: SD-1, SD-4, G-1, NFR-SEC-002.

---

### P-5. The server owns the scope of every request (non-negotiable)

**Principle Statement**:
The root of any scope that a backend enforces, such as the workspace folder, MUST come from configuration that the backend owns. A request MUST NOT set or change that root. A request can name a location inside the root only.

**Rationale**:
A jail around a folder that the caller picks is not a jail. If the dev server took the workspace root from a request, any page in the browser and any process on the machine could read any file that the server's user can read.

**Implications**:

- The dev server reads its root once, at startup, from its environment.
- The desktop app sets its root only through the folder dialog. No other command can re-root it.
- An interface method that takes a path for symmetry can ignore it when the backend owns the scope.
- Test runs point the root at a seeded scratch folder and never reuse a running server.

**Validation Gates**:

- [ ] No route or command accepts a root parameter.
- [ ] A test proves that a listing command cannot re-root the workspace.

**Example**:

- Good: `list_markdown_files` validates its argument as a location inside the open workspace.
- Bad: `list_markdown_files` sets the workspace root to its argument.

**Common Violations**:

- Adding a "workspace" query parameter to a dev server route for convenience.

**Evidence in Motion**: `WORKSPACE_ROOT` in `src/server.ts` from `MOTION_WORKSPACE`. `set_workspace` and `listing_cannot_re_root_the_workspace_and_refuses_outside_paths` in `src-tauri/src/lib.rs`. `reuseExistingServer: false` in `playwright.config.ts`. Design decision AD-3.

**Traces to**: SD-1, SD-4, G-1, NFR-SEC-001, NFR-SEC-002.

---

## II. Data principles

### P-6. A document is self-contained and portable

**Principle Statement**:
A note MUST be readable and complete as a plain file without the application. Content that a block produces, such as a generated diagram or image, MUST be stored in the note or in the workspace, never only in application memory or a remote store. A path inside a note MUST resolve against the workspace root, so the note means the same thing in every runtime.

**Rationale**:
You can move, copy, version, and share a workspace folder. If a note depends on hidden state, the copy is broken. If a relative path resolves against the process directory, the same note means different files in browser mode and desktop mode.

**Implications**:

- Generated images are stored inline in the note. The cost is about 1.3 times the image size in the file.
- Generated diagrams are stored as diagram source text, not as rendered output.
- A future design that writes images to a workspace `assets/` folder still follows this principle.

**Validation Gates**:

- [ ] A note that you copy to a new workspace renders the same.
- [ ] A contract case pins relative path resolution.

**Example**:

- Good: An image block stores the image data on the node, and the Markdown file carries it.
- Bad: An image block stores a temporary file path from the machine that generated it.

**Common Violations**:

- Storing an absolute path from one machine in a note.

**Evidence in Motion**: `generateImage()` in `src/lib/imageGen.ts` returns a `data:image/png;base64` URI. The contract case "resolves a relative path against the workspace root, not the cwd." Design decision AD-10.

**Revisit trigger**: Note files become too large to edit or diff. Move images to workspace files at that point.

**Traces to**: SD-1, SD-7, G-5, NFR-I-003, DR-002, DR-003.

---

### P-7. One parser per serialized format

**Principle Statement**:
Each serialized format MUST have exactly one parser and one serializer that every consumer shares. A new block type MUST reuse the shared parser instead of adding a copy.

**Rationale**:
Motion once had three copies of the block-attribute parser. An unset diagram was saved as `content: null`, which parsed to the four-character string `"null"`. A fix in one copy would have left the other two broken.

**Implications**:

- Edge cases, such as empty sentinels and values that contain the separator, are handled once.
- The shared parser has its own unit tests, including the regression that caused it.

**Validation Gates**:

- [ ] A search finds no second implementation of the format.
- [ ] The parser's tests cover empty sentinels and separators inside values.

**Example**:

- Good: The Dataset, ImageGen, and DiagramGen blocks all call `parseBlockAttrs()`.
- Bad: A new block splits its attributes on `:` inline.

**Common Violations**:

- Copying a parser to change one rule.

**Evidence in Motion**: `parseBlockAttrs()` and `EMPTY_SENTINELS` in `src/components/Editor/extensions/blockAttrs.ts`. Design decision AD-9.

**Known limitation**: The parser is line-oriented, so a value with a newline cannot round-trip (B7).

**Traces to**: SD-2, SD-4, NFR-I-003, DR-003.

---

### P-8. Writes to shared state are partial and keep unknown keys

**Principle Statement**:
A write to a shared state file, such as settings, MUST change only the keys that it names. It MUST keep keys that it does not know. Each value MUST be validated and clamped at the point of write, in every implementation.

**Rationale**:
More than one version of the application can read the same settings file. A newer version adds keys. A full-object write from an older version would delete them. Clamping at write time stops a bad value from breaking the next start.

**Implications**:

- A write sends a partial object.
- Unknown keys pass through untouched.
- Range rules, such as zoom from 0.75 to 2, live in the code that writes the file.

**Validation Gates**:

- [ ] A test writes one key and proves that an unknown key survives.
- [ ] A test writes an out-of-range value and proves that it is clamped.
- [ ] A test round-trips every key through every implementation.

**Example**:

- Good: Setting the zoom level writes only `zoom` and keeps `themes`.
- Bad: Setting the zoom level writes the whole settings object from memory.

**Common Violations**:

- Storing a list-valued key, such as themes, without validation in one implementation.

**Evidence in Motion**: `apply_settings_partial` and the test `settings_partial_clamps_and_preserves_unknown_keys` in `src-tauri/src/lib.rs`. `src/lib/settingsIo.ts` and `settingsIo.test.ts`.

**Known gap**: The Rust side stores `themes` as received, and no Rust test round-trips custom themes or `exportThemeId`. Work item 01M5GQ207P956J179YGENY9ERT tracks the test.

**Traces to**: SD-10, G-6, FR-038, INT-008, DR-005, DR-006.

---

### P-9. Validate and sanitize untrusted content before it runs or renders (non-negotiable)

**Principle Statement**:
Content that comes from a document, an AI model, or an imported file MUST be validated before it runs and sanitized before it renders. Validation MUST use allow rules where possible. A block list is only defense in depth.

**Rationale**:
A note can contain SQL, HTML, and diagram source. AI output can contain anything. Without these checks, a document can run script in the interface or change data that you did not mean to change.

**Implications**:

- Document SQL runs only if it is a single read statement. Identifiers match a strict pattern, and result size is clamped.
- HTML and SVG pass through a sanitizer before they reach the DOM.
- Error messages that echo input are escaped.
- The strength of each check matches the blast radius. A keyword block list is acceptable for an in-memory query engine over data that you already own. It is not acceptable if the engine gains write access.

**Validation Gates**:

- [ ] Each new render path calls the sanitizer.
- [ ] Each new execution path calls a validator with unit tests for refusal cases.

**Example**:

- Good: A Query block rejects `DROP TABLE` before it reaches the query engine.
- Bad: A block renders AI-generated HTML directly.

**Common Violations**:

- Rendering a "trusted" source, such as a generated diagram, without the sanitizer.

**Evidence in Motion**: `validateSelectSql()`, `validateIdentifier()`, and `clampLimit()` in `src/lib/data/sqlSafety.ts`. `sanitizeHtml()`, `sanitizeSvg()`, and `escapeHtmlText()` in `src/lib/sanitize.ts`. Design decision AD-8.

**Revisit trigger**: The query engine gains write access to the filesystem, or `ATTACH` becomes reachable. A parser-level check is needed at that point.

**Traces to**: SD-4, NFR-SEC-005, FR-019.

---

## III. Integration principles

### P-10. Route runtime-specific capabilities through one router

**Principle Statement**:
User interface code MUST NOT call an API that exists in only one runtime. It MUST call a router that picks the transport for the current runtime. Each router MUST have one destination per runtime, and each destination MUST run in a process that has the capability.

**Rationale**:
The interface runs in a browser tab in browser mode and in a webview in desktop mode. Neither has the runtime APIs that spawn processes or read the disk. Motion fixed this same mistake four times before the routers and the guard existed.

**Implications**:

- Interface code calls a client module, such as the LLM client or the image client.
- The client picks a native command in desktop mode or an HTTP route in browser mode.
- A type-only import from a server module is allowed, because the build removes it.

**Validation Gates**:

- [ ] Each new capability that needs a process has a router with both destinations.
- [ ] The static guard passes (P-16).

**Example**:

- Good: A diagram block calls `callLLMFromUI()`, which calls `invoke("run_llm_cli")` or `POST /api/llm`.
- Bad: A diagram block imports the CLI wrapper and spawns a process.

**Common Violations**:

- Assuming the desktop webview is a server process because a native process launched it.

**Evidence in Motion**: `src/lib/llmClient.ts`, `src/lib/imageClient.ts`, and `src/lib/settingsClient.ts`. Storage picks `TauriStorage` or `HttpStorage` with `isTauri()` in `src/lib/storage/index.ts`. Design decision AD-4.

**Traces to**: SD-4, SD-6, NFR-M-004, INT-002, INT-003.

---

### P-11. External services are optional and replaceable

**Principle Statement**:
A feature that calls an external service MUST degrade to a readable error when the service is missing or fails. The rest of the application MUST keep working. The integration MUST sit behind an interface that names the provider as a parameter, so you can change the provider without a change to callers.

**Rationale**:
Motion calls AI CLIs, an AI API, an image generator, and two publishing services. Each one can change its API, its model, or its price. Each one can be missing on a new machine. Writing must not stop because a service is down.

**Implications**:

- Each external call has a timeout.
- A failure shows in the panel that started it, as text, not as a crash or a blocking alert.
- Provider and model are settings or parameters, not constants in callers.

**Validation Gates**:

- [ ] An E2E or unit test covers the failure path of each external call.
- [ ] The application starts and edits notes with no external service configured.

**Example**:

- Good: Synthesis with a failing CLI shows "a readable failure" and the workspace does not change.
- Bad: A missing CLI throws an uncaught exception that blanks the editor.

**Common Violations**:

- A hard-coded model name in a component.

**Evidence in Motion**: `e2e/synthesis.spec.ts` "synthesis reports a readable failure instead of dying silently." The CLI timeout is 120 s. Provider is a parameter of `callLLMFromUI()`.

**Traces to**: SD-3, SD-9, R-5, INT-001 to INT-005.

---

### P-12. AI output is a proposal that you accept

**Principle Statement**:
An AI feature MUST NOT change your content until you accept a preview of the change. Discarding the preview MUST leave the content exactly as it was. An accepted change MUST apply as one undoable step.

**Rationale**:
AI output can be wrong. A writer must stay in control of every word. A change that applies without review, or that applies in parts, breaks that control and makes undo unreliable.

**Implications**:

- The reply streams into a preview panel, not into the note.
- Targeted edits apply as one batch.
- Errors show in the preview panel.

**Validation Gates**:

- [ ] An E2E test discards a preview and asserts that the note did not change.
- [ ] An E2E test accepts a preview and asserts one undo step restores the note.

**Example**:

- Good: **Ask AI** opens a preview, and **Discard** leaves the note unchanged.
- Bad: An AI action rewrites the selection as tokens arrive.

**Common Violations**:

- A "quick fix" AI action that skips the preview.

**Evidence in Motion**: `src/lib/ai/apply.ts` and `src/lib/ai/run.ts`. FR-023 and FR-024 in ARC-001-REQ.

**Traces to**: SD-3, G-4, FR-022 to FR-024.

---

## IV. Quality attributes

### P-13. Failures are explicit and classified

**Principle Statement**:
A failure MUST be reported as a failure, with a class that callers can test. A missing resource MUST NOT return a success status with fallback content. A shared error class MUST mean the same thing in every runtime.

**Rationale**:
The dev server once answered every unknown path with status 200 and the application shell. A missing note then read back as a page of HTML. No test and no user could see the bug.

**Implications**:

- Storage errors use a fixed set of classes: `ok`, `denied`, `not-found`, and `not-a-directory`.
- An unknown API route returns a JSON 404. A path that looks like a file returns 404. Only other paths return the application shell.
- A request that the browser makes without being asked, such as a favicon, gets a defined empty answer.

**Validation Gates**:

- [ ] Each new route returns a defined status for its missing and refused cases.
- [ ] Contract cases assert error classes, not message text.

**Example**:

- Good: Reading a missing note returns `not-found` in both runtimes.
- Bad: Reading a missing note returns empty content.

**Common Violations**:

- A catch block that returns a default value and hides the cause.

**Evidence in Motion**: `FsErrorCode` in `src/lib/fsCore.ts` and `src-tauri/src/fs_core.rs`. The 404 branches in `src/server.ts`. Design decisions AD-1 and AD-6.

**Traces to**: SD-4, G-2, NFR-A-003.

---

### P-14. Docs stay truthful to the code

**Principle Statement**:
A change that alters the product surface, a contract, or a major flow MUST update the design doc, the user guide, and the README feature list in the same change. When a doc and the code disagree, the code is the fact, and the doc MUST be fixed or the difference recorded.

**Rationale**:
AI agents and new contributors read the docs before the code. A wrong doc leads them to a wrong change. Motion's docs and code disagree in nine places today (ARC-001-REQ Appendix F).

**Implications**:

- Doc updates are part of the Definition of Done, not a later task.
- Docs cite files and function names. Line numbers drift, so docs use them only where needed.
- Architecture decisions have an ADR or a design doc section with a revisit trigger.

**Validation Gates**:

- [ ] The pull request changes the docs that describe the changed behavior.
- [ ] Each architecture decision has a revisit trigger.

**Example**:

- Good: A pull request that adds export updates the user guide and the README feature list.
- Bad: The design doc says Synthesize writes `SKILL.md`, but the code writes `README.md`.

**Common Violations**:

- "Docs to follow" in a pull request description.

**Evidence in Motion**: Definition of Done item 5 in `CLAUDE.md`. Work item 01M5GQ20H070MJFSM16QNX12TY tracks the nine differences.

**Traces to**: SD-6, SD-8, R-3, BR-006, NFR-M-002.

---

## V. Development practices

### P-15. One command answers "is it OK?"

**Principle Statement**:
The project MUST have one command that runs every automated check that does not need a separate toolchain: type check, static guards, unit tests, and end-to-end tests. CI MUST run the same command, plus the checks for each extra toolchain. A change is not done until the command passes.

**Rationale**:
Before this gate, the only CI job checked the work log and never installed the runtimes. A pull request that deleted the main component passed green. One command removes the question of which checks matter.

**Implications**:

- The end-to-end tests run against the real dev server, so a test run is a real application run.
- The native backend's tests and linter run in CI and in the Definition of Done.
- "I looked at it in the browser" is not a pass.

**Validation Gates**:

- [ ] `bun run verify` passes.
- [ ] `cargo test --lib` and `cargo clippy --all-targets -- -D warnings` pass for backend changes.
- [ ] Branch protection requires the CI checks before a merge. This gate is not enforced yet (G-3).

**Example**:

- Good: A pull request merges only after the `typecheck, guards, unit, e2e` and `cargo test + clippy` jobs pass.
- Bad: A pull request merges with a red unit test because the failure "is unrelated."

**Common Violations**:

- Running only the unit tests before handover.

**Evidence in Motion**: `verify` in `package.json`. `.github/workflows/ci.yml`. Design decision AD-5.

**Traces to**: SD-4, SD-6, G-2, G-3, BR-005, NFR-M-004.

---

### P-16. Guard statically what runtime tests cannot see

**Principle Statement**:
A rule that dormant code can break MUST have a static check over the real dependency graph. A runtime test MUST NOT be the only check for such a rule, because a runtime test observes only code that runs.

**Rationale**:
Four enrichment modules in Motion were dead code that used a runtime-only API. No end-to-end test would run them. Their unit tests passed because they ran inside the server runtime. They would have failed on the first day someone connected them to a button.

**Implications**:

- The guard walks imports from the real entry point.
- The guard ignores type-only imports and comment lines, so it does not report false failures.
- The guard runs in the validation command, in CI, and in the pre-commit hook.

**Validation Gates**:

- [ ] `bun run guard:client` passes.
- [ ] Each new rule of this kind has a guard or a lint rule, not only a test.

**Example**:

- Good: The guard fails when a client module imports a file that uses `Bun.spawn`.
- Bad: A team relies on review to find runtime-only calls in client code.

**Common Violations**:

- Adding a second entry point without adding it to the guard.

**Evidence in Motion**: `scripts/guard-client-bundle.ts`. Design decision AD-4.

**Revisit trigger**: The client bundle splits per runtime. The guard then needs one root per entry point.

**Traces to**: SD-6, NFR-M-004.

---

### P-17. The test gate fails on any unexpected error signal

**Principle Statement**:
The end-to-end harness MUST fail a test on any console error, uncaught exception, failed request, or response with status 400 or higher. The check MUST apply to every test automatically. An exception MUST name one expected signal for one test.

**Rationale**:
A transport-failure listener does not see an HTTP 404 or 500, because those requests succeed at the transport level. A 404 was the signature of a real bug in Motion, where a new note could not be read back.

**Implications**:

- Tests import the harness that applies the gate. They do not import the test runner directly.
- Warnings are recorded but do not fail a test.
- A probe that proves the gate still fails on known violations runs by hand. Its correct result is 3 failed and 1 passed.

**Validation Gates**:

- [ ] Each spec imports `test` from `e2e/fixtures.ts`.
- [ ] Each use of `PageGuard.allow()` names one specific pattern.

**Example**:

- Good: The persistence spec allows the one 403 that it asserts.
- Bad: A spec allows `/./` to make a flaky test pass.

**Common Violations**:

- Importing `test` from `@playwright/test` in a new spec.

**Evidence in Motion**: `e2e/fixtures.ts` with `auto: true`. `e2e/guard.proof.capture.spec.ts`. Design decision AD-6.

**Traces to**: SD-6, G-2, NFR-M-001.

---

### P-18. Every feature ships with a unit test and an end-to-end journey

**Principle Statement**:
A change to a user-visible feature MUST include a unit test for its logic and an end-to-end test that drives the journey the way a user does. The end-to-end test MUST assert the success path and, when the feature can fail visibly, the failure path. Tests MUST find elements by role and accessible name.

**Rationale**:
A unit test proves that the logic works. Only a journey test proves that a user can reach it. Role-based selectors also check that the feature is accessible.

**Implications**:

- A test that only mounts the shell does not count as coverage.
- Screenshots are artifacts for review, not assertions.
- Shared test state, such as a spy on a module function, MUST be restored after each test, so test files do not affect each other.

**Validation Gates**:

- [ ] The pull request adds or extends a spec in `e2e/`.
- [ ] The pull request adds or extends a unit test under `src/`.
- [ ] The test files pass in any order.

**Example**:

- Good: The export feature adds unit tests for the block conversion and a spec that exports a note.
- Bad: A feature merges with a unit test only, because the journey is "hard to test."

**Common Violations**:

- A spy that is not restored. In October 2026 an unrestored spy in `src/lib/workspaceSynthesis.test.ts` made tests in other files fail, depending on file order.

**Evidence in Motion**: "Every feature ships with tests" in `CLAUDE.md`. The scenario tables in ARC-001-REQ list the coverage of each journey. Nine MUST scenarios have no test (work item 01M5GQ20A1NSA2XAG232KJVGHK).

**Traces to**: SD-4, SD-6, G-2, BR-005, NFR-M-004, NFR-U-002.

---

### P-19. All work is tracked and traceable

**Principle Statement**:
Every change MUST reference a work item. You MUST file work that you find during a change before you do it. Generated status views MUST come from the work log, never from hand edits.

**Rationale**:
Motion has one maintainer and several parallel AI sessions. Without a log, two sessions can do the same work or undo each other's work. A commit with no work item cannot be traced to a reason.

**Implications**:

- The commit hook rejects a commit message that has no work item reference.
- The roadmap is rendered from the log by the repository's own renderer.
- Each plan ends with its steps captured as work items.

**Validation Gates**:

- [ ] The commit message names a work item.
- [ ] `docs/roadmap.md` matches the output of `bin/render_roadmap.py`.

**Example**:

- Good: A gap found during a review becomes an unplanned work item that names the item it came from.
- Bad: A gap goes into a code comment that says "TODO."

**Common Violations**:

- Rendering the roadmap with a different renderer than the hook uses.

**Evidence in Motion**: `hooks/commit-msg` and `hooks/pre-commit`. `.work/todo.jsonl`. The work tracking policy in `CLAUDE.md`.

**Traces to**: SD-6, R-2, G-7.

---

### Template principles that Motion does not adopt

The ArcKit template includes principles for server systems. Motion is a single-user desktop application with no production server, so these do not apply in their template form.

| Template principle | Decision | Reason |
|--------------------|----------|--------|
| Scalability and elasticity | Not adopted | No shared server. Workspace size limits, such as `MAX_NOTES = 40` for synthesis, are product limits, not capacity limits. |
| Resilience and fault tolerance | Covered by P-11 and P-13 | External calls have timeouts and readable failures. No failover exists to design. |
| Observability and operational excellence | Not adopted | No telemetry leaves the device, because of P-1. The E2E gate (P-17) is the main observation point. |
| Data sovereignty and governance | Covered by P-1 | Content stays in your folder. No residency question exists for local files. |
| Data quality and lineage | Not adopted | No data pipelines. |
| Single source of truth | Covered by P-1, P-2, and P-7 | The workspace, the contract, and the shared parser. |
| Loose coupling | Covered by P-10 | Runtime routers. |
| Asynchronous communication | Not adopted as a principle | Streaming AI replies are the only asynchronous flow. P-12 covers it. |
| Performance and efficiency | Requirement, not principle | Targets live in NFR-P-001 and NFR-P-002 in ARC-001-REQ. |
| Availability and reliability | Not adopted | No uptime target for a local application. |
| Infrastructure as code | Partly covered by P-15 | CI and hooks are in version control. No hosted infrastructure exists. |

### Tensions between principles

| Principles | Tension | Resolution |
|------------|---------|------------|
| P-1 and P-11 | Local-first against AI and publishing services that send content off the device. | External calls start only from a user action, and P-12 keeps you in control of the result. |
| P-6 and file size | Inline images make files large. | Accepted now. The revisit trigger in P-6 moves images to workspace files. |
| P-2 and delivery speed | Each storage change needs three edits. | Accepted. The cost is the intended pressure that keeps the runtimes the same. |

---

## VI. Exception process

### Request an architecture exception

A principle is mandatory unless the maintainer approves a written exception.

**Valid exception reasons**:

- A technical limit in one runtime that prevents compliance.
- A transition while a change lands across several pull requests.
- A spike or prototype with an end date.

**Exception request requirements**:

- [ ] An ADR in `projects/001-motion/decisions/` that names the principle, the reason, and the compensating control.
- [ ] A work item that tracks the remediation.
- [ ] An expiry date or a revisit trigger.

**Approval process**:

1. Write the ADR with status **Proposed**.
2. Link the ADR and the work item in the pull request.
3. The maintainer approves the ADR in the pull request review.
4. Review open exceptions at each quarterly principles review.

Principles P-3, P-4, P-5, and P-9 have no exceptions. Their implementation can change only if a compensating control gives the same protection.

---

## VII. Governance and compliance

### Architecture review gates

Motion has no separate review board. Review happens in the pull request.

**Before work starts**:

- [ ] The plan names the principles that the change touches.
- [ ] The plan steps are captured as work items (P-19).

**Pull request review**:

- [ ] The validation gates of each touched principle pass.
- [ ] Exceptions have an approved ADR.
- [ ] The pull request updates the docs (P-14).

**Before a release**:

- [ ] CI is green on `main`.
- [ ] Desktop dogfood covers the scenarios that the browser E2E suite cannot reach.

### Enforcement

| Mechanism | Principles enforced |
|-----------|---------------------|
| `tests/contract/storage-cases.json` in both test suites | P-2, P-4 |
| `bun run guard:client` in verify, CI, and pre-commit | P-10, P-16 |
| `e2e/fixtures.ts` automatic gate | P-13, P-17 |
| `bun run verify` and CI | P-15, P-18 |
| `hooks/commit-msg` and `hooks/pre-commit` | P-19 |
| Pull request review | P-1, P-3, P-5 to P-9, P-11, P-12, P-14 |

The repository does not protect `main` yet (G-3, target 2026-11-30). Until it does, a merge can skip a required check.

---

## VIII. Appendix

### Principle summary checklist

| Principle | Category | Criticality | Validation |
|-----------|----------|-------------|------------|
| P-1 Local-first | Strategic | CRITICAL | Storage interface only, offline check |
| P-2 One behavior contract | Strategic | CRITICAL | Contract run by both suites |
| P-3 Security at each backend | Strategic | CRITICAL | Refusal tests per command |
| P-4 Structural containment | Strategic | CRITICAL | Bait cases in the contract |
| P-5 Server owns scope | Strategic | CRITICAL | Re-root test |
| P-6 Self-contained documents | Data | HIGH | Copy test, path contract case |
| P-7 One parser per format | Data | HIGH | Parser unit tests |
| P-8 Partial writes | Data | HIGH | Round-trip and unknown-key tests |
| P-9 Validate and sanitize | Data | CRITICAL | Validator and sanitizer tests |
| P-10 Runtime routers | Integration | HIGH | Static guard |
| P-11 Replaceable services | Integration | HIGH | Failure-path tests |
| P-12 AI preview | Integration | CRITICAL | Discard and accept E2E tests |
| P-13 Explicit failures | Quality | HIGH | Status and error-class tests |
| P-14 Truthful docs | Quality | MEDIUM | Pull request review |
| P-15 One gate command | Development | CRITICAL | `bun run verify` and CI |
| P-16 Static guards | Development | HIGH | `bun run guard:client` |
| P-17 Error-signal gate | Development | HIGH | Gate probe, 3 failed and 1 passed |
| P-18 Unit and E2E per feature | Development | HIGH | Pull request contents |
| P-19 Tracked work | Development | MEDIUM | Commit and pre-commit hooks |

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-21 | ArcKit AI | Initial draft, reverse-engineered |

## External references

> This section provides traceability from generated content back to source documents.

### Document register

| Doc ID | Filename | Type | Source Location | Description |
|--------|----------|------|-----------------|-------------|
| DD | `current_design_doc.md` | Design doc | `docs/designs/` | Section 6, AD-1 to AD-10 |
| CM | `CLAUDE.md` | Working agreement | Repository root | Testing, Definition of Done, work tracking |
| STKE | `ARC-001-STKE-v1.0.md` | ArcKit artifact | `projects/001-motion/` | Drivers SD-x, goals G-x, risks R-x |
| REQ | `ARC-001-REQ-v1.0.md` | ArcKit artifact | `projects/001-motion/` | Requirements FR, NFR, INT, and DR |

### Citations

| Citation ID | Doc ID | Page/Section | Category | Quoted Passage |
|-------------|--------|--------------|----------|----------------|
| DD-C1 | DD | 6.1.2 | Contract | "generating it from TypeScript would make TS the source of truth" |
| DD-C2 | DD | 6.3 | Security | "accepting a directory from the request would turn the dev server into an arbitrary-filesystem read API" |
| DD-C3 | DD | 6.4 | Guard | "a runtime gate can only observe code that runs, and the dangerous code is dormant" |
| DD-C4 | DD | 6.6 | Testing | "Playwright's `requestfailed` event does NOT fire for HTTP 404 or 500" |
| CM-C1 | CM | Testing | Testing | "A feature without both is **not done**" |

### Unreferenced documents

| Filename | Source Location | Reason |
|----------|-----------------|--------|
| None | None | None |

---

**Generated by**: ArcKit `/arckit:principles` command
**Generated on**: 2026-10-21
**ArcKit Version**: 6.18.2
**Project**: Global (Project 000), governs Motion (Project 001)
**AI Model**: Claude Opus 5.5 (claude-opus-5-5)
