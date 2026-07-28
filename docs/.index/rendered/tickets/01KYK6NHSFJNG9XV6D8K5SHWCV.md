# Validation loop: prove the UI works before the human launches it

`01KYK6NHSFJNG9XV6D8K5SHWCV` · epic/feature · **open**

Motion has real features and no way to know whether they work.

## Children

- [[Ticket-01KYK6NHSFD37YD6RN9KS2T4W8]] Phase 0: console/network failure fixture with a measured baseline — The highest-leverage item in the plan. (done)
- [[Ticket-01KYK6NHSFMY34BQ4EVPH28D9M]] Phase 0: add test/verify scripts and the Playwright harness — There is no `test` script in package.json today, so `bun test` runs only when
someone remembers. (done)
- [[Ticket-01KYK6NHSGDE4KJP64EW6JHQ9V]] Phase 0: self-host fonts so the network gate is not flaky — The generated HTML fetches Inter and JetBrains Mono from Google Fonts. (done)
- [[Ticket-01KYK6NHSGFM7BEQF2MG6J7K8W]] Phase 0: static Bun-in-client guard — A console gate only proves what ran. (done)
- [[Ticket-01KYK6NHSGHBG8EM467WQXQCR5]] Phase 0: Rust tests for the workspace jail — ensure_within_workspace, resolve_path, symlink escape, .. (done)
- [[Ticket-01KYK6NHSGP58Q6GQ3Z3HEMXXN]] Phase 1: make web mode a real filesystem backend — The keystone. (open)
- [[Ticket-01KYK6NHSGPYHDTHG3T7Y80MAR]] Phase 0.5: accessibility pass so role-based locators are possible — Role and accessible-name locators are the right E2E strategy but are not
executable against today's DOM: sidebar file entries are clickable divs, slash
menu items are mouse-only divs, and the Markdown textarea has no label. (open)
- [[Ticket-01KYK6NHSGSX8673FTZ7AY0CCB]] Phase 0: make the gates bite — Pre-commit gets the fast subset only (typecheck + bun test); agents use
--no-verify freely, so CI is the authoritative gate. (done)
- [[Ticket-01KYK6NHSHBJ0SV2MM8N3A0KJR]] Phase 2: E2E coverage of the journeys that have actually broken — Nine specs, each locking a real past regression: open/list/read, save and reload,
New Note, view-mode round trip, block insertion from toolbar and slash menu twice
in a row, save/reload round trip for all five blocks asserting content is intact,
Dataset to Query, Mermaid error containment, and rapid file switching. (open)
- [[Ticket-01KYK6NHSHZF8S0ZNGQ9ZAD05F]] Phase 4: desktop confidence without a WebDriver — tauri-driver does not work on macOS, so the desktop check is a packaging smoke
rather than UI automation. (open)
- [[Ticket-01KYK6NHSHZJNNCYMEW9ZG77NP]] Phase 3: fix what the loop exposes — With gates in place, fix the backlog test-first, ordered by what blocks shipping. (open)

Progress: 6/11 done
