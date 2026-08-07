# UI wireframe specs, capture recipes, and agent-judge loop

`01KZ42HH7AFDSY4E4F04F1Y4CR` · epic/feature · **done**

Adopt forge-notes/okf-forge/agent-brain-ui patterns: docs/ui specs with PlantUML Salt wireframes, capture recipes, check-vs-agent rubrics, layout E2E gates, and agent screenshot judgment so UI work needs less human eyeballing.

## Children

- [[Ticket-01KZ42HH7A4EDS0ZNPG2PKQ8PT]] Wireframes and screen specs for shell, sidebar, editor — PlantUML Salt + PNG for app-shell, sidebar, editor states; full rubrics with
check: and agent rows; capture recipes. (done)
- [[Ticket-01KZ42HH7AEFH7EKY1C8YFA8FJ]] ui-audit script for deterministic DOM/CSS chrome checks — scripts/ui-audit.mjs chrome-only contrast, structure, named controls at 1280 and 390. (done)
- [[Ticket-01KZ42HH7AJYC4AC3VC8VJ3WDT]] Playwright capture harness and layout Check gates — e2e/capture.spec.ts (CAPTURE=1); e2e/layout.spec.ts for topology, inventory,
view toggle, named toolbar, chrome viewport; shell height so only main scrolls. (done)
- [[Ticket-01KZ42HH7ASHAYV7TFM3RG3DE1]] Scaffold docs/ui, scripts, capture freeze mode — Add docs/ui README + TEMPLATE + tokens; package scripts ui:render/check/capture/audit;
motion-ui-freeze/reveal localStorage + CSS; .artifacts gitignore; gitattributes for PNGs. (done)
- [[Ticket-01KZ42HH7ASMGN1NW5MZN46C8Q]] Agent policy and design-ui skill — CLAUDE.md/AGENTS.md UI verification loop + DoD item; .grok/skills/design-ui adapted
for Motion CSS tokens (not Tailwind). (done)
- [[Ticket-01KZ42HH7BAPBM2Y19SBJPE1V3]] Optional CI: ui:check wireframe syntax only — Do not gate PNG bytes (PlantUML non-reproducible). (done)
- [[Ticket-01KZ42HH7BYM4S6V67BBN6TGYV]] Expand docs/ui for dialogs and blocks — SaveNameDialog, block types (mermaid, dataset, query, image-gen, diagram-gen)
with wireframes, capture recipes, and rubric rows. (done)

Progress: 7/7 done
