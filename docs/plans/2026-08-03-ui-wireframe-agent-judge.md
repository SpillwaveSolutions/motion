---
date: 2026-08-03
slug: ui-wireframe-agent-judge
title: UI wireframe specs, capture recipes, and agent-judge loop
epic: 01KZ42HH7AFDSY4E4F04F1Y4CR
items: [01KZ42HH7ASHAYV7TFM3RG3DE1, 01KZ42HH7A4EDS0ZNPG2PKQ8PT, 01KZ42HH7AJYC4AC3VC8VJ3WDT, 01KZ42HH7ASMGN1NW5MZN46C8Q, 01KZ42HH7AEFH7EKY1C8YFA8FJ, 01KZ42HH7BYM4S6V67BBN6TGYV, 01KZ42HH7BAPBM2Y19SBJPE1V3]
---

---
date: 2026-08-02
slug: ui-wireframe-agent-judge
title: UI wireframe specs, capture recipes, and agent-judge loop
---

# UI wireframe + agent-judge loop

## Context

Sibling Spillwave apps (forge-notes, okf-forge, agent-brain-ui) use a loop that
reduces human UI review: PlantUML Salt wireframes + per-screen specs with capture
recipes + rubrics, deterministic Playwright/layout checks for merge gates, and
multimodal agent judgment for visual rows. Motion already has strong behavioral
Playwright coverage but lacked `docs/ui/`, wireframes, freeze mode, and the agent
loop in the Definition of Done.

## This plan

Adopt the hybrid pattern: forge-notes structure for specs/wireframes/capture, plus
okf-style check vs agent rubric rows. Scaffold, first screens (shell/sidebar/editor),
layout gates, capture harness, design-ui skill, and DoD updates.

## Tasks

- [x] (P1) Scaffold docs/ui, scripts, capture freeze mode
  Add docs/ui README + TEMPLATE + tokens; package scripts ui:render/check/capture/audit;
  motion-ui-freeze/reveal localStorage + CSS; .artifacts gitignore; gitattributes for PNGs.

- [x] (P1) Wireframes and screen specs for shell, sidebar, editor
  PlantUML Salt + PNG for app-shell, sidebar, editor states; full rubrics with
  check: and agent rows; capture recipes.

- [x] (P1) Playwright capture harness and layout Check gates
  e2e/capture.spec.ts (CAPTURE=1); e2e/layout.spec.ts for topology, inventory,
  view toggle, named toolbar, chrome viewport; shell height so only main scrolls.

- [x] (P1) Agent policy and design-ui skill
  CLAUDE.md/AGENTS.md UI verification loop + DoD item; .grok/skills/design-ui adapted
  for Motion CSS tokens (not Tailwind).

- [x] (P2) ui-audit script for deterministic DOM/CSS chrome checks
  scripts/ui-audit.mjs chrome-only contrast, structure, named controls at 1280 and 390.

- [ ] (P2) Expand docs/ui for dialogs and blocks
  SaveNameDialog, block types (mermaid, dataset, query, image-gen, diagram-gen)
  with wireframes, capture recipes, and rubric rows.

- [ ] (P3) Optional CI: ui:check wireframe syntax only
  Do not gate PNG bytes (PlantUML non-reproducible). Agent judgment stays out of CI.
