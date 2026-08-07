# Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups

`01KYQYYN3SBWDT25TC6H3G4EAA` · epic/feature · **open**

Make Save findable after New Note, lock create to edit to save to reload in Playwright, land dataset and SQL install E2E, and file post-v0.1 product gaps.

## Children

- [[Ticket-01KYQYYN3T2SSGG33ESEWPXKH8]] Agent-browser final pass in Definition of Done — Keep Playwright as the CI hard gate. (open)
- [[Ticket-01KYQYYN3T3VB8RCTMJJ13FK2H]] Welcome / demo datasets resolve when the open folder is not Motion — In Tauri, opening an arbitrary project folder leaves welcome pointing at
sample-data.csv / sample-events.jsonl that are not in that folder → red
"Failed to load dataset" and SQL catalog errors. (done)
- [[Ticket-01KYQYYN3T5RXZWBXWV9VNP3ZH]] Make the Save control discoverable — Icon-only Save is why a user can create a note and not see how to keep edits. (done)
- [[Ticket-01KYQYYN3T5W49QH05WCCYX7CE]] Sidebar: directory tree view alongside flat markdown list — Flat list of all .md files is useful; also need a tree of directories so large
workspaces are navigable. (done)
- [[Ticket-01KYQYYN3T731B57N8NXQ8C0FQ]] Require branch protection on main for verify + rust checks — Human/ops: GitHub branch protection requiring the CI jobs
`typecheck, guards, unit, e2e` and `cargo test + clippy`. (open)
- [[Ticket-01KYQYYN3T7R1V9546Q5NTJRZE]] E2E: create a new note, edit, save, reload — content survives — Open folder → New Note → type a unique marker in the editor → click Save
(assert write 200) → full page reload → open the same untitled-* note →
marker present. (done)
- [[Ticket-01KYQYYN3T8MXHSF7JS4MA57GJ]] Land Playwright coverage for dataset/SQL install — Commit e2e/data.spec.ts and aligned seed (public/demo-shaped sample-data /
sample-events): welcome datasets show rows without error banners; welcome JOIN
returns rows; two-table JOIN in a real note; missing source surfaces an error
(not a silent empty table). (done)
- [[Ticket-01KYQYYN3TA69K8848E483HC82]] Sidebar: sort by name or date — Default name is fine; date (mtime) helps "what did I touch last?". (done)
- [[Ticket-01KYQYYN3TKW93D9SVW07VKFZY]] Search inside file contents (grep/glob UX) — Filename search already works. (done)
- [[Ticket-01KYQZ491VF71K9KCDHAZYNE9S]] Write or update design docs for post-v0.1 dogfood work and publish to wiki — Refresh docs/designs/current_design_doc.md (and code walkthrough if needed) for Save label, new-note persistence, dataset/SQL install coverage, and synthesis as shipped. (done)
- [[Ticket-01KYQZ4963GCA86R8CP4P14DRV]] Update user guide for current behaviour and publish to wiki — User guide must describe labeled Save, create-edit-save-reload, dataset/SQL behaviour, and accurate known limitations. (done)
- [[Ticket-01KYQZ49A7NWRQZK83658CT4QT]] Keep README feature list and known limitations current — README Features and Known limitations are the public feature list. (done)
- [[Ticket-01KYR4YYBRMXNSMKHKAYTN117F]] Save As / Rename: title-based filename and overwrite warning — macOS-style Save As: name from document title (New Note to new-note.md), Rename control, overwrite confirm when a new or renamed note would replace another file. (done)
- [[Ticket-01KYR5ARDSPKHYE6SAD9TS218F]] New Note is in-memory Untitled until first Save (macOS document model) — Stop writing untitled-timestamp.md on New Note. (done)
- [[Ticket-01KYR5ARJHQYGHNF1RW3RM8DHM]] Save As dialog component with title-derived default filename — SaveNameDialog + noteNaming helpers: New Note maps to new-note.md; user can edit name; Rename via toolbar document label. (done)
- [[Ticket-01KYR5ARQ76XTH5PJR0KRZXTPH]] Overwrite confirmation when Save As would replace another note — When target basename exists and is not the current file, confirm replace (window.confirm) before write. (done)
- [[Ticket-01KYR5ARW4T97QC3QGC104P2KQ]] Bundle welcome demo fixtures for sample-data.csv and sample-events.jsonl — demoFixtures.ts: when workspace read fails (Tauri no folder / other project), registerFile falls back to bundled welcome datasets so Data Analysis works cold. (done)
- [[Ticket-01KYR5AS1220C9RAG5T9KTATH0]] Surface real Tauri error strings on dataset load failures — asErrorMessage: Tauri invoke rejects with strings, not Error, which collapsed every failure to Failed to load dataset. (done)
- [[Ticket-01KYR5AS6481KPN2G2XJPW9SZY]] FileSidebar: Tree and Flat layout with folder expand/collapse — IDE-style project navigator built from path hierarchy (fileTree.ts + FileSidebar.tsx). (done)
- [[Ticket-01KYR5ASB3F3WDY91ZX70B0E3A]] FileSidebar: sort by name A-Z, Z-A, and session Recent — Sort control in sidebar; Recent uses last-opened timestamps for the session. (done)
- [[Ticket-01KYR5ASFTMP26NGW7HD202QJV]] FileSidebar: Find-in-Files content search with path:line hits — searchNotes.ts client-side walk via storage.readFile; results list opens the note. (done)
- [[Ticket-01KYR5ASMGEH266Q6YGXTRPGAG]] E2E coverage for Save As, rename overwrite, and Untitled new-note flow — e2e/persistence.spec.ts: Save As default new-note.md, custom name reload, overwrite dismiss. (done)
- [[Ticket-01KYR5ASSTQPK9SJWK7JVNP17C]] E2E coverage for tree, flat, name filter, and content search — e2e/sidebar.spec.ts locks IDE-style navigator behaviour. (done)
- [[Ticket-01KYR5ASZ5HH0KXQ4H36BNYEY0]] Unit tests for noteNaming, fileTree, searchNotes, and demoFixtures — bun test coverage for pure helpers introduced by Save As and project navigator. (done)
- [[Ticket-01KYR5AT4298KJRWG9V4HXYJ3N]] User guide and README: Save As and project navigator — Document Untitled Save As, Rename, Tree/Flat, sort, name filter, and content search. (done)
- [[Ticket-01KYR5AT8YEJ41CCREP2VCFMCV]] DuckDB query retries longer for cold WASM Dataset race on CI — executeQuery missing-table retries increased; journeys E2E asserts dataset preview then re-Run. (done)
- [[Ticket-01KYTHJBVWFB501A7T6BRPQNEY]] Tree sidebar collapses folders by default (click to expand) — User-requested folder navigator: default Tree view must show top-level folders and root notes only, not every nested file expanded. (done)
- [[Ticket-01KYTPYMXBTSVK5CBJ6T1N5JQ1]] Hide YAML front matter from WYSIWYG view — YAML front matter (--- ... (done)
- [[Ticket-01KYTQ67FJQ23NSC1GVH581216]] Path glob AND content grep compose together — Sidebar path glob and content grep must compose as AND: glob narrows which markdown files are candidates, then grep searches content only inside that set. (done)

Progress: 27/29 done
