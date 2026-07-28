---
date: 2026-07-28
slug: validation-loop
title: Validation loop: prove the UI works before the human launches it
epic: 01KYK6NHSFJNG9XV6D8K5SHWCV
items: [01KYK6NHSFMY34BQ4EVPH28D9M, 01KYK6NHSF1KPVANBR2F76R20N, 01KYK6NHSFW1K6739GPERY93QS, 01KYK6NHSFYKSCFS0T31XBPHY1, 01KYK6NHSFD37YD6RN9KS2T4W8, 01KYK6NHSGHYEM1GVBPVT14SS1, 01KYK6NHSGGR1V5ACMDGZSJHF1, 01KYK6NHSGAV4DHBNCJMXP086J, 01KYK6NHSGFM7BEQF2MG6J7K8W, 01KYK6NHSGDE4KJP64EW6JHQ9V, 01KYK6NHSGHBG8EM467WQXQCR5, 01KYK6NHSGSX8673FTZ7AY0CCB, 01KYK6NHSG7TT2K13FNK8C74QE, 01KYK6NHSGP45SAC43B5AYA91P, 01KYK6NHSG64GHM3NM9JCV1NJ3, 01KYK6NHSGPYHDTHG3T7Y80MAR, 01KYK6NHSGP58Q6GQ3Z3HEMXXN, 01KYK6NHSGXDY0C5GZRQDVEQGC, 01KYK6NHSG0VG2NDWC3E7FRJFA, 01KYK6NHSGSAMNDS6CJ47YST2C, 01KYK6NHSHKCZWFNWZX3NATX04, 01KYK6NHSH2RMTJQ3SR7MGW7Q8, 01KYK6NHSH8WXC8MEGFPFM8DYC, 01KYK6NHSH1PJ0YBJ1WEG3SZ4R, 01KYK6NHSHVJEFG9W6TZYWXNEF, 01KYK6NHSHBJ0SV2MM8N3A0KJR, 01KYK6NHSHZJNNCYMEW9ZG77NP, 01KYK6NHSHRFPGDZXKE6EH4QRJ, 01KYK6NHSH9BTQ4BND9DZEFAY7, 01KYK6NHSHD4NMT2QVMQD2HHBP, 01KYK6NHSH15H376EZGAMTZE9J, 01KYK6NHSHQZZQV7DJM5A64C6E, 01KYK6NHSHKZ20DY8FBB5S1PP9, 01KYK6NHSHVZ2EZZH7NBRADW7E, 01KYK6NHSHSASEERK1KJ7XVDPN, 01KYK6NHSHZF8S0ZNGQ9ZAD05F, 01KYK6NHSHKXZNTXS3F3ANDYV9, 01KYK6NHSHRFE2KXPBTV76JR02]
---

# Validation loop: prove the UI works before the human launches it

## Context

Motion has real features and no way to know whether they work. The web mode that
was designed as the browser-automation test surface never became real: WebStorage
fakes writes (a console.warn that reports success) and fakes openFolder (returns
the string "web-mock-folder"), so testing saves against it proves nothing. One
root cause — code assuming a Bun process while running in a browser/webview — has
been re-fixed four times and is open a fifth time. Nothing automated makes any
claim about the app: no test renders a component, and CI never installs Bun or
Rust, so a PR deleting src/App.tsx passes green.

This plan builds the validation loop first, then fixes what the loop exposes, so
the human's role becomes design feedback rather than debugging.

Reviewed by the planning council (Codex and Grok, independently).

## Tasks

- [ ] (P1) Phase 0: add test/verify scripts and the Playwright harness
  There is no `test` script in package.json today, so `bun test` runs only when
  someone remembers. Add `test`, `test:e2e`, `tauri`, and `verify` (typecheck +
  test + e2e) so one command answers "is the app OK?". Install Playwright with a
  webServer that boots `bun run dev` itself.
  - [ ] (P1) Add test, test:e2e, tauri, and verify scripts to package.json
  - [ ] (P1) Install Playwright and add playwright.config.ts with webServer, workers:1
  - [ ] (P1) Add a smoke spec: app loads, editor present, zero console errors

- [ ] (P1) Phase 0: console/network failure fixture with a measured baseline
  The highest-leverage item in the plan. A wrapped Playwright test that fails on
  console errors and on failed requests. Two traps the council caught: Playwright's
  requestfailed event does NOT fire for HTTP 404/500 (those are successful requests
  carrying error statuses, and 404 is exactly bug B2's signature), so the fixture
  must also inspect response status; and the gate must be written against a measured
  baseline because the welcome doc mounts DuckDB-WASM and Mermaid on load.
  - [ ] (P1) Measure the cold-load console and network baseline and record it
  - [ ] (P1) Add a data-app-ready signal set after first mount
  - [ ] (P1) Write e2e/fixtures.ts failing on console errors, requestfailed, and status >= 400

- [ ] (P1) Phase 0: static Bun-in-client guard
  A console gate only proves what ran. The four enrichment modules are dead code,
  so no E2E spec would ever execute them and no runtime gate would catch their
  Bun.spawn calls until the day they are wired to a button. A static check that no
  module reachable from src/main.tsx references Bun is what actually closes this
  bug class. It must fail today, on those four modules.

- [ ] (P1) Phase 0: self-host fonts so the network gate is not flaky
  The generated HTML fetches Inter and JetBrains Mono from Google Fonts. Any
  network gate would be flaky on a slow CDN and would fail outright on offline CI.
  Fix the cause rather than allowlisting the symptom.

- [ ] (P1) Phase 0: Rust tests for the workspace jail
  ensure_within_workspace, resolve_path, symlink escape, .. traversal, writing a
  not-yet-existing file, and the no-workspace-opened error have zero tests today.
  Also pin the B14 re-rooting behaviour before deciding whether to keep it.

- [ ] (P1) Phase 0: make the gates bite
  Pre-commit gets the fast subset only (typecheck + bun test); agents use
  --no-verify freely, so CI is the authoritative gate. New ci.yml installs Bun and
  Rust and Playwright browsers and runs typecheck, unit tests, cargo test, clippy
  -D warnings, E2E, and the build. Branch protection to require it is a human step.
  - [ ] (P1) Append typecheck and bun test to hooks/pre-commit
  - [ ] (P1) Add .github/workflows/ci.yml that actually tests the application
  - [ ] (P2) Track CLAUDE.md (git add -f), add Definition of Done, fix its stale Bun/HMR claims

- [ ] (P1) Phase 0.5: accessibility pass so role-based locators are possible
  Role and accessible-name locators are the right E2E strategy but are not
  executable against today's DOM: sidebar file entries are clickable divs, slash
  menu items are mouse-only divs, and the Markdown textarea has no label. This is
  real user-facing accessibility work, which is why it is worth doing properly
  instead of sprinkling test IDs.

- [ ] (P1) Phase 1: make web mode a real filesystem backend
  The keystone. Everything else depends on a test surface that can actually fail.
  Extract pure testable cores on both sides first, because Rust commands take
  tauri::State and server.ts starts a listener at import time, so neither is
  directly testable as written.
  - [ ] (P1) Extract pure filesystem cores: src/lib/fsCore.ts and src-tauri/src/fs_core.rs
  - [ ] (P1) Implement the path jail with component-aware containment, not string startsWith
  - [ ] (P1) Add /api/fs/* routes to server.ts with an env-only workspace root
  - [ ] (P1) Replace WebStorage with a real HttpStorage
  - [ ] (P2) Add resolveWorkspacePath so documents are portable between modes
  - [ ] (P1) Add the language-neutral parity fixture run by both bun test and cargo test
  - [ ] (P1) Give each Playwright worker a seeded temp workspace
  - [ ] (P2) Delete the stale root index.html and generate dev and prod shells from one template

- [ ] (P1) Phase 2: E2E coverage of the journeys that have actually broken
  Nine specs, each locking a real past regression: open/list/read, save and reload,
  New Note, view-mode round trip, block insertion from toolbar and slash menu twice
  in a row, save/reload round trip for all five blocks asserting content is intact,
  Dataset to Query, Mermaid error containment, and rapid file switching. Screenshots
  captured as artifacts for human review, never as pass/fail gates.

- [ ] (P1) Phase 3: fix what the loop exposes
  With gates in place, fix the backlog test-first, ordered by what blocks shipping.
  - [ ] (P1) B3: fix the broken desktop production build (dist has no index.html)
  - [ ] (P1) B4 and B7: block round-trip and multi-line serialization
  - [ ] (P2) B5: welcome doc paths resolve in both modes
  - [ ] (P2) B8: route the four enrichment modules through llmClient
  - [ ] (P2) B13: save completion signal and file-load cancellation
  - [ ] (P3) B6: thread model through the run_llm_cli IPC signature
  - [ ] (P3) B9: contain the Mermaid parse-error graphic
  - [ ] (P2) Backfill tests on the untested security boundaries

- [ ] (P2) Phase 4: desktop confidence without a WebDriver
  tauri-driver does not work on macOS, so the desktop check is a packaging smoke
  rather than UI automation. Must use bun tauri build, not cargo build, since only
  the former exercises the frontendDist embedding that B3 broke.
  - [ ] (P2) Add bin/smoke-desktop.sh building and launching the packaged app
  - [ ] (P3) Write the short release-only manual checklist
