# UI specs, wireframes & rubrics

Ground truth for what each Motion screen should look like, in a form an agent can check.

The loop: read a screen's doc, follow its **capture recipe** to reach the state,
screenshot the running app, then compare against the wireframe and the four rubric
lists — reporting per-item pass/fail with a reason. It is an LLM checklist review,
not a pixel diff.

Wireframes are PlantUML Salt: authoritative for **element inventory**, **containment
order**, and **ordinal sequence** only — never pixels, spacing, colour, or density.

## Layout

```
docs/ui/README.md              this file
docs/ui/TEMPLATE.md            copy this to start a new screen
docs/ui/tokens.md              shared colour/type vocabulary
docs/ui/<screen>.md            spec + addressability + capture recipe + rubric
docs/ui/wireframes/*.puml      PlantUML Salt sources
docs/ui/wireframes/png/*.png   rendered, committed
```

One document per screen **family**, not per state. Spec and rubric live in the same
file because they are read together and rot together.

`docs/ui/**` is **outside the worklog IA** on purpose (no frontmatter, no wiki_key).
`docs/designs/` is reserved for dated design docs and code walkthroughs.

## Commands

```bash
bun run ui:render   # all .puml -> wireframes/png/
bun run ui:check    # syntax only, no output written
bun run ui:capture  # screenshot every documented state -> .artifacts/screenshots/ui/
bun run ui:audit    # deterministic [dom]/[css] checks (needs running dev server)
```

`ui:capture` runs `e2e/capture.spec.ts`. It is skipped unless `CAPTURE=1`, because
it produces artefacts and asserts nothing — a CI job that passes without checking
anything is worse than no job.

**Capturing is half the loop. The other half is judgement**: read a screen's doc,
look at the matching screenshot, and report per-item pass/fail against the four
rubric lists. Rows marked `check:…` are also gated by Playwright (merge blockers).
Rows marked `agent` are reported in the PR body and never block alone.

Requires `plantuml` and `graphviz` (`brew install plantuml graphviz`).

**PNGs are committed** — agents and GitHub's markdown preview need them. Marked
`binary -diff` in `.gitattributes`. There is no PNG byte-freshness gate: PlantUML
embeds version metadata, so bytes are not reproducible across installs.

## Capture mode

Seed via `localStorage` **before** the page loads (works with Playwright, agent-browser,
or any tool that can set storage):

| Key | Effect |
|---|---|
| `motion-ui-freeze` | Stops animations/transitions, blanks caret, hides `[data-volatile]` |
| `motion-ui-reveal` | Forces `[data-hover-reveal]` affordances visible |

DEV-only — production builds ignore both flags.

Viewport defaults: **1280×800** desktop, **390×844** mobile where a recipe says so.

## Screens

Read [tokens.md](tokens.md) first.

| Screen | Doc | States | Wireframes |
|---|---|---|---|
| Design tokens | [tokens.md](tokens.md) | — | — |
| App shell | [app-shell.md](app-shell.md) | welcome / workspace open / synthesis | 3 |
| Sidebar | [sidebar.md](sidebar.md) | empty / tree / filter empty | 3 |
| Editor + toolbar | [editor.md](editor.md) | wysiwyg / markdown / split | 3 |
| Dialogs | [dialogs.md](dialogs.md) | Save As | 1 |
| Blocks | [blocks.md](blocks.md) | welcome multi-block + per-type cards | 5 |

## Writing an honest rubric

**Acceptable Differences is the load-bearing list.** Any judge with a comparison
instinct reports every pixel delta as a finding; a rubric that cries wolf is ignored
inside a week. Name what does *not* matter — spacing, colour, icon choice, wireframe
proportion, dynamic data. Wireframes are Salt: *every* proportion is approximate.

Keep **Must Match** to 6–10 items, all structural. Mark each row `check:<e2e>` or
`agent`. **Must NOT Appear** catches rest-state hover leaks. **Failure Criteria** is
for the unarguable: clipped content, unreadable contrast, a control off-screen.

## The agent loop (summary)

1. Read `docs/ui/<screen>.md` (+ wireframe PNG).
2. Implement against the element inventory.
3. `bun run ui:capture` (or follow the capture recipe by hand).
4. Judge **agent** rows against the screenshot + a11y tree; console errors fail.
5. Never pixel-diff the Salt wireframe.
6. `bun run verify` — every **check:** row must pass.
7. Report agent-row findings in the PR body.
