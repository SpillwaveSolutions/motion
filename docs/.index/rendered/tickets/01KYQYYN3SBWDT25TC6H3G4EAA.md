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
- [[Ticket-01KYQYYN3TA69K8848E483HC82]] Sidebar: sort by name or date — Default name is fine; date (mtime) helps "what did I touch last?". (open)
- [[Ticket-01KYQYYN3TKW93D9SVW07VKFZY]] Search inside file contents (grep/glob UX) — Filename search already works. (open)
- [[Ticket-01KYQZ491VF71K9KCDHAZYNE9S]] Write or update design docs for post-v0.1 dogfood work and publish to wiki — Refresh docs/designs/current_design_doc.md (and code walkthrough if needed) for Save label, new-note persistence, dataset/SQL install coverage, and synthesis as shipped. (done)
- [[Ticket-01KYQZ4963GCA86R8CP4P14DRV]] Update user guide for current behaviour and publish to wiki — User guide must describe labeled Save, create-edit-save-reload, dataset/SQL behaviour, and accurate known limitations. (done)
- [[Ticket-01KYQZ49A7NWRQZK83658CT4QT]] Keep README feature list and known limitations current — README Features and Known limitations are the public feature list. (done)
- [[Ticket-01M1ABZH2F573CM32N93NDMAGB]] Dev-server publish handlers have no test of their own — POST /api/publish/gist and /api/publish/notion in src/server.ts are the browser-mode transport, but no test executes them: the E2E specs intercept those routes in the page, and the unit tests cover the pure cores underneath. (open)
- [[Ticket-01M1FRJ0NDQB3PG4107FR537KK]] Syntax highlighting in Markdown and Split source — Markdown and Split currently show raw source as unstyled mono text. (done)

Progress: 9/14 done
