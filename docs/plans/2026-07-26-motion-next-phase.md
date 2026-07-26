---
date: 2026-07-26
slug: motion-next-phase
title: Motion next development phase
epic: 01KYFZ6RBHABFSC9K9NJ90168Q
items: [01KYFZ6RBHW4FJK9EGFAQ3XNJX, 01KYFZ6RBHBG53PG8SKVMMNCC4, 01KYFZ6RBH4J746JDANTQKYVSN, 01KYFZ6RBHDMXV57V4JZW3PS5K, 01KYFZ6RBH7SW7J03FYN4XZ08J, 01KYFZ6RBHA5DRP85QQ0EHTAJ6, 01KYFZ6RBHZQWH62SK631C3H1K, 01KYFZ6RBHBTXGWG8HREAG8AG9, 01KYFZ6RBJC07FEQ0FT0KQ302M, 01KYFZ6RBJ18SB2ZCSFK06BNJ2, 01KYFZ6RBJT7FG0G30WYS3YF6Q, 01KYFZ6RBJ5718M3GQPAB76RHS, 01KYFZ6RBJCWMMF7THJZFB6943, 01KYFZ6RBJEYPZ9RX0F86490TM, 01KYFZ6RBJV920SFW0MAN9MX9J, 01KYFZ6RBJZNYDT9AK2V0RA11T]
---

# Motion — Next Development Phase

## Context

Motion just went through a security/correctness hardening pass (Tauri detection, CLI spawn
handling, workspace-scoped filesystem, CSP, Markdown/Mermaid sanitization, SQL validation) and had
the WikiTicket SDD worklog system installed for tracking work going forward. With the plumbing
solid, the natural next question is: does the app actually deliver on its stated vision yet?

Motion's only documented vision (README.md): "a local-first technical writing IDE designed to
help you organize, edit, and visualize your documentation with ease." Exploring the current
codebase against that bar surfaced a consistent pattern — several real, working, well-tested
pieces of code exist with no way for a user to ever reach them — plus one pre-existing data-loss
bug that was deliberately deferred during the last fix pass. This plan sequences the work to close
those gaps, prioritizing reachability (a user can trigger the feature at all) and data safety over
new capability.

Two scope calls were made explicitly with the user rather than defaulted:
- ImageGen (currently fully mocked, no CLI wrapper can produce a real image): scope a real
  backend as its own task, rather than cutting the feature.
- Workspace-level topic clustering / auto-generated TOC & SKILL docs: deferred, filed as its own
  separate triage epic rather than built this round.

## Sequencing

1. Verify the `claude` CLI contract (landmine underneath everything else)
2. Fix editor mode-desync (silent data loss, already deferred once)
3. Give editor extensions a creation UX (prerequisite surface for later tasks)
4. Fix web/dev storage mock (rides alongside the creation UX)
5. Real diagram generation + scope ImageGen backend (needs the creation UX + CLI contract)
6. Wire the per-note enrichment action (needs the creation UX + CLI contract)

## Tasks

- [ ] (P1) Verify and fix the claude CLI system-prompt contract in cliWrappers
  `src/lib/cliWrappers.ts`'s `claude` case passes `--system <prompt>` with a comment admitting
  it's a guess. Confirm the real `claude -p` CLI flag for a system prompt and fix the branch if
  wrong (likely folding the system prompt into the main prompt string instead of a separate
  flag). One unverified assumption sits underneath every other CLI-backed task below — do this
  first so nothing downstream is built on a guess. kind:bug.
  - [ ] Verify and fix the claude CLI system-prompt argument in cliWrappers.callLLM
  - [ ] Rename/dedupe EnrichmentTools.test.ts to match what it actually tests (no matching
    EnrichmentTools.ts exists; the test re-tests TopicRefiner/SkillGenerator/TOCGenerator under a
    misleading name)

- [ ] (P1) Fix editor mode-desync between WYSIWYG, Markdown, and Split views
  `src/components/Editor/index.tsx` keeps two independent sources of truth — the TipTap editor
  document and the rawMarkdown string state — that only reconcile in handleSave and the
  file-load effect. Switching viewMode does not run either conversion, so edits made in one mode
  can be silently dropped when switching to another; the Split view's right-hand pane is a
  static, stale render of rawMarkdown until a save happens. Reuse the existing marked/turndown/
  sanitizeHtml conversions already in the file, no new libraries. kind:bug.
  - [ ] Sync content on viewMode transitions in Editor/index.tsx, reusing the existing
    marked/turndown/sanitizeHtml calls

- [ ] (P2) Give editor extensions a creation UX
  DatasetExtension, QueryExtension, MermaidExtension, DiagramGenExtension, and ImageGenExtension
  are real, working TipTap nodes with zero UI affordance to create one — no slash command, input
  rule, or toolbar button. The only way one appears today is hand-authored HTML or the hardcoded
  welcome-doc demo content. This is a prerequisite surface for the diagram-gen and enrichment
  tasks below. kind:feature.
  - [ ] Toolbar buttons to insert each of the 5 block extensions, reusing the existing
    ToolbarButton component pattern in Toolbar.tsx
  - [ ] "/" slash-command popup wired to the same insertion actions (hand-rolled minimal popup,
    not a new @tiptap/suggestion dependency, for 5 fixed commands)

- [ ] (P2) Fix web/dev storage mock so Dataset/Query are testable outside Tauri
  WebStorage.readFile only returns real content for three hardcoded demo paths; any other
  filename returns a placeholder string. WebStorage runs under `bun run dev` with real
  filesystem access, so there's no actual sandboxing reason for this to stay mocked — it just
  blocks iterating on Dataset/Query without a full Tauri build. kind:bug.
  - [ ] WebStorage.readFile/listFiles read real files via Bun.file instead of hardcoded branches
  - [ ] File picker for Dataset's source field, populated from storage.listFiles

- [ ] (P2) Real diagram generation, and scope a real ImageGen backend
  DiagramGenExtension and ImageGenExtension both fully mock generation with a setTimeout and
  keyword-matched fake output; no backend exists for either. Diagram generation is in scope now
  since it only needs text back (Mermaid syntax) via cliWrappers.callLLM, the same function
  TopicRefiner/TOCGenerator/SkillGenerator already use. Real image generation needs its own
  research pass first — none of the wrapped CLIs (claude/gemini/qwen/opencode) can produce a
  raster image, and a real backend raises a local-first scoping question that shouldn't be
  defaulted. kind:feature.
  - [ ] Real diagram generation via cliWrappers.callLLM + Mermaid-validate-before-accept,
    mirroring ContentInjector.verifyCodeBlocks()'s cheap-check-before-accept pattern
  - [ ] Research spike: what a real ImageGen backend would require (candidate CLIs/APIs,
    local-first implications, rough integration shape) — output is a decision/design doc, not code

- [ ] (P2) Wire the per-note enrichment action into the UI
  cliWrappers, TopicRefiner, TOCGenerator, SkillGenerator, and ContentInjector are all real,
  tested, working modules with zero imports from App.tsx or anything under src/components/ — only
  their own test files ever call them. Add an "AI Refine"/"Generate Summary" toolbar action
  backed by ContentInjector.refineChunk/generateSummary, writing the result back via
  storage.writeFile. This proves the pipeline reachable end-to-end without committing to the
  larger, unspecified workspace-level topic-clustering feature (filed separately, deferred).
  kind:feature.
  - [ ] Per-note "AI Refine"/"Generate Summary" toolbar action backed by ContentInjector
