# Traceability

_The evidence chain: plan → item → ticket → code → release, forward and backward. Generated from `docs/.index/_graph.json`; do not edit._

### Cut v0.6.2 release
`01M1M1F33TZPTS93ABPVACF7BY` · status: done
- targets: release/v0.6.2

### Copy All writes markdown and rich text so paste follows the destination
`01M1HYST3AR3HYSFABKN6C0V8B` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- lands-in: pr/52
- targets: release/v0.6.2

### Cut v0.6.1 release
`01M1FVGZH0V9MR9GVHDF99VXED` · status: done
- lands-in: pr/51
- targets: release/v0.6.1

### Syntax highlighting in Markdown and Split source
`01M1FRJ0NDQB3PG4107FR537KK` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- lands-in: pr/49
- targets: release/v0.6.1

### Dev-server publish handlers have no test of their own
`01M1ABZH2F573CM32N93NDMAGB` · status: todo
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups

### Ask AI does not say when a reply was cut off at max_tokens
`01M1ABZH14RJDDJ7M7HT3TZKYW` · status: todo
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.1

### Autosave races page teardown, so a write aborts and the E2E gate trips
`01M1ABYDSANE2N1W2HDTF350EV` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/49
- targets: release/v0.6.1

### Cut v0.6.0 release
`01M1A5MN90SK807JPBFKZCA5YW` · status: done
- lands-in: pr/47
- targets: release/v0.6.0

### DocCommands batch should resolve against the original document
`01M19Z6Z6X06VRZM95741Y2748` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/48
- targets: release/v0.6.0

### Insert Table nests when the caret is already in a table
`01M19Z6Z5DJ54227R1WYVVX2GF` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/48
- targets: release/v0.6.0

### Bun sidecar so packaged Tauri streams Ask AI
`01M19Z6Z3XQZ03EYNXKKBG5WK7` · status: todo
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.0

### buildAiContext, canned prompts, session log, unwrap reply
`01M18R79ZMSX2XFW3N4RG4X4DP` · status: done
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### AI editor: selection, /ai, preview
`01M18R79ZMN53CMV76JFHKVEFN` · status: todo
- lands-in: pr/43
- contains: DocCommands registry and tool-use loop
- contains: Dictation last
- contains: Wireframes for Ask AI bubble and pending preview
- contains: Selection bubble, /ai, preview panel on the CLI transport
- contains: Route Refine through the same pipeline
- contains: Tiptap tables + markdown round-trip
- contains: Shared TS AI service: stream, per-doc session, prompt cache
- contains: buildAiContext, canned prompts, session log, unwrap reply
- contains: Bun sidecar so packaged Tauri streams Ask AI
- contains: Insert Table nests when the caret is already in a table
- contains: DocCommands batch should resolve against the original document
- contains: Autosave races page teardown, so a write aborts and the E2E gate trips
- contains: Ask AI does not say when a reply was cut off at max_tokens
- produced-by: [[Plan-ai-editor]]

### Shared TS AI service: stream, per-doc session, prompt cache
`01M18R79ZMKBXK2PGWR6911MJQ` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/44
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Tiptap tables + markdown round-trip
`01M18R79ZMK0DX0PE2DPWMZ60D` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/45
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Route Refine through the same pipeline
`01M18R79ZMGXNJ9D8JJ5P4W96J` · status: done
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Selection bubble, /ai, preview panel on the CLI transport
`01M18R79ZMERNNHSH0KYY819SN` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/43
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Wireframes for Ask AI bubble and pending preview
`01M18R79ZMD6BCM0CQGSSAEM05` · status: done
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Dictation last
`01M18R79ZM90HJ0MBG3CX6VW7E` · status: todo
- belongs-to: AI editor: selection, /ai, preview
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### DocCommands registry and tool-use loop
`01M18R79ZM3BMYZ56C7P874YN1` · status: done
- belongs-to: AI editor: selection, /ai, preview
- lands-in: pr/46
- targets: release/v0.6.0
- produced-by: [[Plan-ai-editor]]

### Mac dogfood: unsigned .app, Finder Open With, overlay padding
`01M18Q560MPAYQJTA0W6F4DAW3` · status: todo
- targets: release/v0.6.0

### E2E still queries role=option after sidebar became a tree
`01M18NBZ8T4G92HM091NQ1Z4B5` · status: done
- targets: release/v0.6.0

### Behave like a native Mac app
`01M18MN19CSQ7PS762F7TWEXJC` · status: done
- lands-in: pr/42
- contains: Publish the current note to a Notion page
- contains: Native chrome: overlay title bar, menus, system appearance
- contains: Packaging polish: product name, identifier, metadata, window, last workspace
- contains: Finder Open With: associations, RunEvent::Opened, pending-open, parent-dir workspace
- contains: Publish the current note to a GitHub Gist
- contains: Fix stale README, changelog, and user-guide product claims
- produced-by: [[Plan-native-mac-app]]

### Fix stale README, changelog, and user-guide product claims
`01M18MN19CBNRDAYCJ0RTMWJV4` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Publish the current note to a GitHub Gist
`01M18MN19CBF3A5JXZHVANGT5Y` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Finder Open With: associations, RunEvent::Opened, pending-open, parent-dir workspace
`01M18MN19CA20B51FR0ND643M4` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Packaging polish: product name, identifier, metadata, window, last workspace
`01M18MN19C8FQKQ9NVNT4162CX` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Native chrome: overlay title bar, menus, system appearance
`01M18MN19C0WR6KZ3X63M1CX2R` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Publish the current note to a Notion page
`01M18MN19C0DPY7PXRGDRX6Y6G` · status: done
- belongs-to: Behave like a native Mac app
- targets: release/v0.6.0
- produced-by: [[Plan-native-mac-app]]

### Keep README feature list and known limitations current
`01KYQZ49A7NWRQZK83658CT4QT` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Update user guide for current behaviour and publish to wiki
`01KYQZ4963GCA86R8CP4P14DRV` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Write or update design docs for post-v0.1 dogfood work and publish to wiki
`01KYQZ491VF71K9KCDHAZYNE9S` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Search inside file contents (grep/glob UX)
`01KYQYYN3TKW93D9SVW07VKFZY` · status: todo
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Sidebar: sort by name or date
`01KYQYYN3TA69K8848E483HC82` · status: todo
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Land Playwright coverage for dataset/SQL install
`01KYQYYN3T8MXHSF7JS4MA57GJ` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### E2E: create a new note, edit, save, reload — content survives
`01KYQYYN3T7R1V9546Q5NTJRZE` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Require branch protection on main for verify + rust checks
`01KYQYYN3T731B57N8NXQ8C0FQ` · status: todo
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Sidebar: directory tree view alongside flat markdown list
`01KYQYYN3T5W49QH05WCCYX7CE` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Make the Save control discoverable
`01KYQYYN3T5RXZWBXWV9VNP3ZH` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Welcome / demo datasets resolve when the open folder is not Motion
`01KYQYYN3T3VB8RCTMJJ13FK2H` · status: done
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- lands-in: pr/50
- produced-by: [[Plan-save-ux-and-next]]

### Agent-browser final pass in Definition of Done
`01KYQYYN3T2SSGG33ESEWPXKH8` · status: todo
- belongs-to: Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
- produced-by: [[Plan-save-ux-and-next]]

### Save discoverability, new-note persistence E2E, and post-v0.1 follow-ups
`01KYQYYN3SBWDT25TC6H3G4EAA` · status: todo
- contains: Agent-browser final pass in Definition of Done
- contains: Welcome / demo datasets resolve when the open folder is not Motion
- contains: Make the Save control discoverable
- contains: Sidebar: directory tree view alongside flat markdown list
- contains: Require branch protection on main for verify + rust checks
- contains: E2E: create a new note, edit, save, reload — content survives
- contains: Land Playwright coverage for dataset/SQL install
- contains: Sidebar: sort by name or date
- contains: Search inside file contents (grep/glob UX)
- contains: Write or update design docs for post-v0.1 dogfood work and publish to wiki
- contains: Update user guide for current behaviour and publish to wiki
- contains: Keep README feature list and known limitations current
- contains: Dev-server publish handlers have no test of their own
- contains: Syntax highlighting in Markdown and Split source
- contains: Copy All writes markdown and rich text so paste follows the destination
- produced-by: [[Plan-save-ux-and-next]]

### README and user guide claimed markdown tables, which are not supported
`01KYQ9NBTQETCVSHC2X775CD14` · status: done
- belongs-to: Phase 3: fix what the loop exposes

### React flushSync error when opening a document containing block node views
`01KYQ9NBNXCBFA30Z4HD0W7HGQ` · status: done
- belongs-to: Phase 3: fix what the loop exposes

### Publish design doc, code walkthrough and user guide — resolve the three dangling wiki links
`01KYNMZ132M2NE1EYPHG2DCCAW` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it

### Dev server bound to 0.0.0.0, exposing filesystem writes and subprocess spawning to the local network
`01KYNKTZ6KPKZV24XWRZJZG04S` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it

### B14 fixed: list_markdown_files no longer re-roots the workspace jail
`01KYNKG3ZD866C3AGQS20T6H8J` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend

### First wiki publish for motion — v0.1.0 release, roadmap, snapshot, ticket index
`01KYNDC9CPK8314F6PWDZW1NC6` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it

### Refresh README for v0.1.0 — six months stale, documented broken features and omitted built ones
`01KYN85K57SRYK5WJFG98W5R6F` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it

### Demo Query block returns zero rows: case mismatch in the demo data JOIN
`01KYK7WZRS65D7DPP0D1DT58Z7` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline

### Dev server answered every missing file with 200 + index.html instead of 404
`01KYK7WZM5846FPAQZH84S5D38` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline

### Welcome doc's diagram-gen block sent the string "null" to mermaid.render on every cold load
`01KYK7WZFJXKTH14WKSZR7FQEE` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline

### Phase 3: fix what the loop exposes
`01KYK6NHSHZJNNCYMEW9ZG77NP` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: B8: route the four enrichment modules through llmClient
- contains: B4 and B7: block round-trip and multi-line serialization
- contains: B5: welcome doc paths resolve in both modes
- contains: B6: thread model through the run_llm_cli IPC signature
- contains: B13: save completion signal and file-load cancellation
- contains: B3: fix the broken desktop production build (dist has no index.html)
- contains: Backfill tests on the untested security boundaries
- contains: B9: contain the Mermaid parse-error graphic
- contains: React flushSync error when opening a document containing block node views
- contains: README and user guide claimed markdown tables, which are not supported
- produced-by: [[Plan-validation-loop]]

### Phase 4: desktop confidence without a WebDriver
`01KYK6NHSHZF8S0ZNGQ9ZAD05F` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: Add bin/smoke-desktop.sh building and launching the packaged app
- contains: Write the short release-only manual checklist
- produced-by: [[Plan-validation-loop]]

### B9: contain the Mermaid parse-error graphic
`01KYK6NHSHVZ2EZZH7NBRADW7E` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Delete the stale root index.html and generate dev and prod shells from one template
`01KYK6NHSHVJEFG9W6TZYWXNEF` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Backfill tests on the untested security boundaries
`01KYK6NHSHSASEERK1KJ7XVDPN` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### B3: fix the broken desktop production build (dist has no index.html)
`01KYK6NHSHRFPGDZXKE6EH4QRJ` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Write the short release-only manual checklist
`01KYK6NHSHRFE2KXPBTV76JR02` · status: done
- belongs-to: Phase 4: desktop confidence without a WebDriver
- produced-by: [[Plan-validation-loop]]

### B13: save completion signal and file-load cancellation
`01KYK6NHSHQZZQV7DJM5A64C6E` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### B6: thread model through the run_llm_cli IPC signature
`01KYK6NHSHKZ20DY8FBB5S1PP9` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Add bin/smoke-desktop.sh building and launching the packaged app
`01KYK6NHSHKXZNTXS3F3ANDYV9` · status: done
- belongs-to: Phase 4: desktop confidence without a WebDriver
- produced-by: [[Plan-validation-loop]]

### Replace WebStorage with a real HttpStorage
`01KYK6NHSHKCZWFNWZX3NATX04` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### B5: welcome doc paths resolve in both modes
`01KYK6NHSHD4NMT2QVMQD2HHBP` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Phase 2: E2E coverage of the journeys that have actually broken
`01KYK6NHSHBJ0SV2MM8N3A0KJR` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- produced-by: [[Plan-validation-loop]]

### B4 and B7: block round-trip and multi-line serialization
`01KYK6NHSH9BTQ4BND9DZEFAY7` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Add the language-neutral parity fixture run by both bun test and cargo test
`01KYK6NHSH8WXC8MEGFPFM8DYC` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Add resolveWorkspacePath so documents are portable between modes
`01KYK6NHSH2RMTJQ3SR7MGW7Q8` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Give each Playwright worker a seeded temp workspace
`01KYK6NHSH1PJ0YBJ1WEG3SZ4R` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### B8: route the four enrichment modules through llmClient
`01KYK6NHSH15H376EZGAMTZE9J` · status: done
- belongs-to: Phase 3: fix what the loop exposes
- produced-by: [[Plan-validation-loop]]

### Extract pure filesystem cores: src/lib/fsCore.ts and src-tauri/src/fs_core.rs
`01KYK6NHSGXDY0C5GZRQDVEQGC` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Phase 0: make the gates bite
`01KYK6NHSGSX8673FTZ7AY0CCB` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: Track CLAUDE.md (git add -f), add Definition of Done, fix its stale Bun/HMR claims
- contains: Append typecheck and bun test to hooks/pre-commit
- contains: Add .github/workflows/ci.yml that actually tests the application
- produced-by: [[Plan-validation-loop]]

### Add /api/fs/* routes to server.ts with an env-only workspace root
`01KYK6NHSGSAMNDS6CJ47YST2C` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Phase 0.5: accessibility pass so role-based locators are possible
`01KYK6NHSGPYHDTHG3T7Y80MAR` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- produced-by: [[Plan-validation-loop]]

### Phase 1: make web mode a real filesystem backend
`01KYK6NHSGP58Q6GQ3Z3HEMXXN` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: Implement the path jail with component-aware containment, not string startsWith
- contains: Add /api/fs/* routes to server.ts with an env-only workspace root
- contains: Extract pure filesystem cores: src/lib/fsCore.ts and src-tauri/src/fs_core.rs
- contains: Give each Playwright worker a seeded temp workspace
- contains: Add resolveWorkspacePath so documents are portable between modes
- contains: Add the language-neutral parity fixture run by both bun test and cargo test
- contains: Replace WebStorage with a real HttpStorage
- contains: Delete the stale root index.html and generate dev and prod shells from one template
- contains: B14 fixed: list_markdown_files no longer re-roots the workspace jail
- produced-by: [[Plan-validation-loop]]

### Add .github/workflows/ci.yml that actually tests the application
`01KYK6NHSGP45SAC43B5AYA91P` · status: done
- belongs-to: Phase 0: make the gates bite
- produced-by: [[Plan-validation-loop]]

### Measure the cold-load console and network baseline and record it
`01KYK6NHSGHYEM1GVBPVT14SS1` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline
- produced-by: [[Plan-validation-loop]]

### Phase 0: Rust tests for the workspace jail
`01KYK6NHSGHBG8EM467WQXQCR5` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- produced-by: [[Plan-validation-loop]]

### Add a data-app-ready signal set after first mount
`01KYK6NHSGGR1V5ACMDGZSJHF1` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline
- produced-by: [[Plan-validation-loop]]

### Phase 0: static Bun-in-client guard
`01KYK6NHSGFM7BEQF2MG6J7K8W` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- produced-by: [[Plan-validation-loop]]

### Phase 0: self-host fonts so the network gate is not flaky
`01KYK6NHSGDE4KJP64EW6JHQ9V` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- produced-by: [[Plan-validation-loop]]

### Write e2e/fixtures.ts failing on console errors, requestfailed, and status >= 400
`01KYK6NHSGAV4DHBNCJMXP086J` · status: done
- belongs-to: Phase 0: console/network failure fixture with a measured baseline
- produced-by: [[Plan-validation-loop]]

### Append typecheck and bun test to hooks/pre-commit
`01KYK6NHSG7TT2K13FNK8C74QE` · status: done
- belongs-to: Phase 0: make the gates bite
- produced-by: [[Plan-validation-loop]]

### Track CLAUDE.md (git add -f), add Definition of Done, fix its stale Bun/HMR claims
`01KYK6NHSG64GHM3NM9JCV1NJ3` · status: done
- belongs-to: Phase 0: make the gates bite
- produced-by: [[Plan-validation-loop]]

### Implement the path jail with component-aware containment, not string startsWith
`01KYK6NHSG0VG2NDWC3E7FRJFA` · status: done
- belongs-to: Phase 1: make web mode a real filesystem backend
- produced-by: [[Plan-validation-loop]]

### Add a smoke spec: app loads, editor present, zero console errors
`01KYK6NHSFYKSCFS0T31XBPHY1` · status: done
- belongs-to: Phase 0: add test/verify scripts and the Playwright harness
- produced-by: [[Plan-validation-loop]]

### Install Playwright and add playwright.config.ts with webServer, workers:1
`01KYK6NHSFW1K6739GPERY93QS` · status: done
- belongs-to: Phase 0: add test/verify scripts and the Playwright harness
- produced-by: [[Plan-validation-loop]]

### Phase 0: add test/verify scripts and the Playwright harness
`01KYK6NHSFMY34BQ4EVPH28D9M` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: Add test, test:e2e, tauri, and verify scripts to package.json
- contains: Install Playwright and add playwright.config.ts with webServer, workers:1
- contains: Add a smoke spec: app loads, editor present, zero console errors
- produced-by: [[Plan-validation-loop]]

### Validation loop: prove the UI works before the human launches it
`01KYK6NHSFJNG9XV6D8K5SHWCV` · status: done
- contains: Phase 0: console/network failure fixture with a measured baseline
- contains: Phase 0: add test/verify scripts and the Playwright harness
- contains: Phase 0: self-host fonts so the network gate is not flaky
- contains: Phase 0: static Bun-in-client guard
- contains: Phase 0: Rust tests for the workspace jail
- contains: Phase 1: make web mode a real filesystem backend
- contains: Phase 0.5: accessibility pass so role-based locators are possible
- contains: Phase 0: make the gates bite
- contains: Phase 2: E2E coverage of the journeys that have actually broken
- contains: Phase 4: desktop confidence without a WebDriver
- contains: Phase 3: fix what the loop exposes
- contains: Refresh README for v0.1.0 — six months stale, documented broken features and omitted built ones
- contains: First wiki publish for motion — v0.1.0 release, roadmap, snapshot, ticket index
- contains: Dev server bound to 0.0.0.0, exposing filesystem writes and subprocess spawning to the local network
- contains: Publish design doc, code walkthrough and user guide — resolve the three dangling wiki links
- produced-by: [[Plan-validation-loop]]

### Phase 0: console/network failure fixture with a measured baseline
`01KYK6NHSFD37YD6RN9KS2T4W8` · status: done
- belongs-to: Validation loop: prove the UI works before the human launches it
- contains: Write e2e/fixtures.ts failing on console errors, requestfailed, and status >= 400
- contains: Add a data-app-ready signal set after first mount
- contains: Measure the cold-load console and network baseline and record it
- contains: Welcome doc's diagram-gen block sent the string "null" to mermaid.render on every cold load
- contains: Dev server answered every missing file with 200 + index.html instead of 404
- contains: Demo Query block returns zero rows: case mismatch in the demo data JOIN
- produced-by: [[Plan-validation-loop]]

### Add test, test:e2e, tauri, and verify scripts to package.json
`01KYK6NHSF1KPVANBR2F76R20N` · status: done
- belongs-to: Phase 0: add test/verify scripts and the Playwright harness
- produced-by: [[Plan-validation-loop]]

### Mermaid's internal parse-error UI ('bomb' error graphic) injects into document.body instead of staying inside the failing block's container
`01KYJXSYEZ97M9638S91GYZWV0` · status: done
- belongs-to: Real diagram generation, and scope a real ImageGen backend

### sanitizeSvg strips Mermaid's HTML-based node labels (foreignObject), leaving diagrams with empty shapes and no text
`01KYJXSMV02C0PP9H8BKE1PNEZ` · status: done
- belongs-to: Real diagram generation, and scope a real ImageGen backend

### TopicRefiner/ContentInjector/TOCGenerator/SkillGenerator need llmClient.ts routing before UI wiring
`01KYJW5XJ5HTG7ESZ7DDDS8W0C` · status: done

### Manually verify mode-desync fix in browser (agent-browser)
`01KYJQ3WF4XJ4D1G7T9WQ3V0TV` · status: done

### Workspace-level topic clustering + auto TOC/SKILL generation
`01KYFZ8RGR06XBSG9CH4TEWYJY` · status: done

### Per-note "AI Refine"/"Generate Summary" toolbar action backed by ContentInjector
`01KYFZ6RBJZNYDT9AK2V0RA11T` · status: done
- belongs-to: Wire the per-note enrichment action into the UI
- produced-by: [[Plan-motion-next-phase]]

### Wire the per-note enrichment action into the UI
`01KYFZ6RBJV920SFW0MAN9MX9J` · status: done
- belongs-to: Motion next development phase
- contains: Per-note "AI Refine"/"Generate Summary" toolbar action backed by ContentInjector
- produced-by: [[Plan-motion-next-phase]]

### File picker for Dataset's source field, populated from storage.listFiles
`01KYFZ6RBJT7FG0G30WYS3YF6Q` · status: done
- belongs-to: Fix web/dev storage mock so Dataset/Query are testable outside Tauri
- produced-by: [[Plan-motion-next-phase]]

### Research spike: what a real ImageGen backend would require (candidate CLIs/APIs,
`01KYFZ6RBJEYPZ9RX0F86490TM` · status: done
- belongs-to: Real diagram generation, and scope a real ImageGen backend
- produced-by: [[Plan-motion-next-phase]]

### Real diagram generation via cliWrappers.callLLM + Mermaid-validate-before-accept,
`01KYFZ6RBJCWMMF7THJZFB6943` · status: done
- belongs-to: Real diagram generation, and scope a real ImageGen backend
- produced-by: [[Plan-motion-next-phase]]

### Fix web/dev storage mock so Dataset/Query are testable outside Tauri
`01KYFZ6RBJC07FEQ0FT0KQ302M` · status: done
- belongs-to: Motion next development phase
- contains: WebStorage.readFile/listFiles read real files via Bun.file instead of hardcoded branches
- contains: File picker for Dataset's source field, populated from storage.listFiles
- produced-by: [[Plan-motion-next-phase]]

### Real diagram generation, and scope a real ImageGen backend
`01KYFZ6RBJ5718M3GQPAB76RHS` · status: done
- belongs-to: Motion next development phase
- contains: Real diagram generation via cliWrappers.callLLM + Mermaid-validate-before-accept,
- contains: Research spike: what a real ImageGen backend would require (candidate CLIs/APIs,
- contains: sanitizeSvg strips Mermaid's HTML-based node labels (foreignObject), leaving diagrams with empty shapes and no text
- contains: Mermaid's internal parse-error UI ('bomb' error graphic) injects into document.body instead of staying inside the failing block's container
- produced-by: [[Plan-motion-next-phase]]

### WebStorage.readFile/listFiles read real files via Bun.file instead of hardcoded branches
`01KYFZ6RBJ18SB2ZCSFK06BNJ2` · status: done
- belongs-to: Fix web/dev storage mock so Dataset/Query are testable outside Tauri
- produced-by: [[Plan-motion-next-phase]]

### Toolbar buttons to insert each of the 5 block extensions, reusing the existing
`01KYFZ6RBHZQWH62SK631C3H1K` · status: done
- belongs-to: Give editor extensions a creation UX
- produced-by: [[Plan-motion-next-phase]]

### Verify and fix the claude CLI system-prompt contract in cliWrappers
`01KYFZ6RBHW4FJK9EGFAQ3XNJX` · status: done
- belongs-to: Motion next development phase
- contains: Rename/dedupe EnrichmentTools.test.ts to match what it actually tests (no matching
- contains: Verify and fix the claude CLI system-prompt argument in cliWrappers.callLLM
- produced-by: [[Plan-motion-next-phase]]

### Fix editor mode-desync between WYSIWYG, Markdown, and Split views
`01KYFZ6RBHDMXV57V4JZW3PS5K` · status: done
- belongs-to: Motion next development phase
- contains: Sync content on viewMode transitions in Editor/index.tsx, reusing the existing
- produced-by: [[Plan-motion-next-phase]]

### "/" slash-command popup wired to the same insertion actions (hand-rolled minimal popup,
`01KYFZ6RBHBTXGWG8HREAG8AG9` · status: done
- belongs-to: Give editor extensions a creation UX
- produced-by: [[Plan-motion-next-phase]]

### Verify and fix the claude CLI system-prompt argument in cliWrappers.callLLM
`01KYFZ6RBHBG53PG8SKVMMNCC4` · status: done
- belongs-to: Verify and fix the claude CLI system-prompt contract in cliWrappers
- produced-by: [[Plan-motion-next-phase]]

### Motion next development phase
`01KYFZ6RBHABFSC9K9NJ90168Q` · status: done
- contains: Give editor extensions a creation UX
- contains: Fix editor mode-desync between WYSIWYG, Markdown, and Split views
- contains: Verify and fix the claude CLI system-prompt contract in cliWrappers
- contains: Real diagram generation, and scope a real ImageGen backend
- contains: Fix web/dev storage mock so Dataset/Query are testable outside Tauri
- contains: Wire the per-note enrichment action into the UI
- produced-by: [[Plan-motion-next-phase]]

### Give editor extensions a creation UX
`01KYFZ6RBHA5DRP85QQ0EHTAJ6` · status: done
- belongs-to: Motion next development phase
- contains: "/" slash-command popup wired to the same insertion actions (hand-rolled minimal popup,
- contains: Toolbar buttons to insert each of the 5 block extensions, reusing the existing
- produced-by: [[Plan-motion-next-phase]]

### Sync content on viewMode transitions in Editor/index.tsx, reusing the existing
`01KYFZ6RBH7SW7J03FYN4XZ08J` · status: done
- belongs-to: Fix editor mode-desync between WYSIWYG, Markdown, and Split views
- produced-by: [[Plan-motion-next-phase]]

### Rename/dedupe EnrichmentTools.test.ts to match what it actually tests (no matching
`01KYFZ6RBH4J746JDANTQKYVSN` · status: done
- belongs-to: Verify and fix the claude CLI system-prompt contract in cliWrappers
- produced-by: [[Plan-motion-next-phase]]

### Install WikiTicket SDD worklog tooling
`01KYDZ4A5HN1AZ7BN8Q2WV3XVN` · status: done

