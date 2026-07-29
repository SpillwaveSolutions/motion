---
date: 2026-07-29
slug: save-ux-and-next
title: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
epic: 01KYQYYN3SBWDT25TC6H3G4EAA
items: [01KYQYYN3T5RXZWBXWV9VNP3ZH, 01KYQYYN3T7R1V9546Q5NTJRZE, 01KYQYYN3T8MXHSF7JS4MA57GJ, 01KYQYYN3T3VB8RCTMJJ13FK2H, 01KYQYYN3T5W49QH05WCCYX7CE, 01KYQYYN3TA69K8848E483HC82, 01KYQYYN3TKW93D9SVW07VKFZY, 01KYQYYN3T2SSGG33ESEWPXKH8, 01KYQYYN3T731B57N8NXQ8C0FQ]
---

---
date: 2026-07-29
slug: save-ux-and-next
title: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
---

# Save UX, new-note E2E, and post-v0.1 follow-ups

## Context

v0.1.0 closed with a full validation loop (Playwright, client-bundle guard, real
web filesystem, desktop build). Dogfooding immediately exposed product gaps:

1. **Save is hard to find.** After **New Note**, the file is created on disk with
   a stub `# New Note`, but further edits require **Save**. The control is an
   icon-only floppy button (`aria-label` / tooltip "Save (⌘S)") — no visible
   "Save" text. Users who create a note cannot see how to keep edits.
2. **E2E covers create OR save, not create → edit → save → reload.**
   `persistence.spec.ts` creates a note and asserts it opens; another test edits
   an existing seeded file and saves. The journey a human just failed is untested.
3. **Dataset/SQL install** failed in Tauri when the open folder lacked
   `sample-data.csv` / `sample-events.jsonl`. Playwright now locks install when
   those files exist in the workspace (uncommitted `e2e/data.spec.ts`); welcome
   still assumes demo files live in every workspace.
4. Sidebar is a **flat** markdown list; users want tree + sort + in-file search.
5. Definition of Done is Playwright-only; a final **agent-browser** pass is still
   manual discipline, not scripted.
6. **Branch protection** still does not require CI checks on `main`.

## How save works today (truth for the UI)

| Step | What happens |
|---|---|
| Open Folder | Sets workspace; **New Note** / **Synthesize** enable. |
| New Note | Immediately `writeFile`s `untitled-<timestamp>.md` with `# New Note\n\n`, selects it. |
| Edit | WYSIWYG updates `rawMarkdown` via turndown on every change. |
| Save | Toolbar floppy icon or **⌘S** / **Ctrl+S** → `writeFile(filePath, rawMarkdown)`. Status: Saving… / Saved / Save failed. |
| No path | Save is a no-op (`if (!filePath) return`) — welcome doc before any file is selected cannot be saved. |

## This plan

Immediate (build now): make Save discoverable, add the missing E2E, land the
dataset/SQL Playwright coverage already drafted, leave everything else as open
follow-ups so the roadmap is not empty again.

## Tasks

- [ ] (P1) Make the Save control discoverable
  Icon-only Save is why a user can create a note and not see how to keep edits.
  Show a visible "Save" label (or text button) next to the icon; keep ⌘S /
  Ctrl+S; keep the live status region (Saving… / Saved / Save failed). Accessible
  name must stay matchable as /^Save/.

- [ ] (P1) E2E: create a new note, edit, save, reload — content survives
  Open folder → New Note → type a unique marker in the editor → click Save
  (assert write 200) → full page reload → open the same untitled-* note →
  marker present. Locks the path the human just could not complete by eye.
  Extend e2e/persistence.spec.ts (or adjacent).

- [ ] (P1) Land Playwright coverage for dataset/SQL install
  Commit e2e/data.spec.ts and aligned seed (public/demo-shaped sample-data /
  sample-events): welcome datasets show rows without error banners; welcome JOIN
  returns rows; two-table JOIN in a real note; missing source surfaces an error
  (not a silent empty table).

- [ ] (P2) Welcome / demo datasets resolve when the open folder is not Motion
  In Tauri, opening an arbitrary project folder leaves welcome pointing at
  sample-data.csv / sample-events.jsonl that are not in that folder → red
  "Failed to load dataset" and SQL catalog errors. Fix options: ship demo
  fixtures as app resources with a known source path, or degrade welcome demo
  blocks when files are missing with a clear "demo data not in this workspace"
  message and no false Catalog Error.

- [ ] (P2) Sidebar: directory tree view alongside flat markdown list
  Flat list of all .md files is useful; also need a tree of directories so large
  workspaces are navigable. Toggle or split pane acceptable.

- [ ] (P2) Sidebar: sort by name or date
  Default name is fine; date (mtime) helps "what did I touch last?". Persist the
  choice in local UI state for the session at minimum.

- [ ] (P2) Search inside file contents (grep/glob UX)
  Filename search already works. Add content search: query + optional glob,
  results list with path + line snippet, open file on select. Prefer workspace
  jail APIs (no shelling out from the webview); web can use server-side walk,
  desktop Tauri command.

- [ ] (P2) Agent-browser final pass in Definition of Done
  Keep Playwright as the CI hard gate. Add bin/agent-pass.sh (or documented
  agent-browser dogfood steps) and a DoD line in Agents.md/CLAUDE.md: before
  handoff, run agent-browser against localhost welcome + one real workspace.
  Not required in CI (flake risk).

- [ ] (P3) Require branch protection on main for verify + rust checks
  Human/ops: GitHub branch protection requiring the CI jobs
  `typecheck, guards, unit, e2e` and `cargo test + clippy`. Until then anyone
  can merge red. Document exact check names from a green run.

- [ ] (P2) Write or update design docs for post-v0.1 dogfood work and publish to wiki
  Refresh `docs/designs/current_design_doc.md` (and code walkthrough if flows
  changed) for Save label, new-note persistence, dataset/SQL install E2E, and
  synthesis as shipped. Publish via the wiki pipeline so
  https://github.com/SpillwaveSolutions/motion/wiki/Design-Doc matches `docs/`.

- [ ] (P2) Update user guide for current behaviour and publish to wiki
  Save is a labeled button (not icon-only); create → edit → save → reload works;
  dataset/SQL install behaviour and known gaps (demo files only in workspaces
  that contain them). Publish User-Guide wiki page from
  `docs/user_guide/user-guide.md`.

- [ ] (P2) Keep README feature list and known limitations current
  README.md Features + Known limitations must match shipped behaviour (blocks
  round-trip, desktop build, demo SQL, labeled Save, Synthesize). This is the
  public feature list; do not leave fixed bugs listed as open limitations.

## Out of scope this plan

- Replacing Playwright with agent-browser in CI.
- Full redesign of the toolbar.
- Real ImageGen backend (already scoped elsewhere historically).

## Done when

1. A person can create a note, see how to save, save, and find the content after reload.
2. Playwright proves that path and the dataset/SQL install path.
3. Follow-ups exist as open work items on the roadmap (not only chat history).
4. Design docs, user guide, and README feature list match the product; wiki pages
   are published from those sources.
5. CLAUDE.md / AGENTS.md require unit + Playwright E2E for every feature (policy).
