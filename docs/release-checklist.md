---
wiki_key: release-checklist
doc_type: guide
truth_state: current
title: Release Checklist
---

# Release checklist

Almost everything here is automated. This list is only the part a machine cannot
do — and it is deliberately short, because every item on it is a place where a
defect can reach a user unseen.

## Automated (do not repeat by hand)

`bun run verify` and CI already cover these. If they are green, do not re-check
them manually:

- typecheck, unit tests, Rust tests, clippy
- the storage contract, run against both implementations
- end-to-end journeys, with console errors, uncaught exceptions, failed requests
  and any response ≥ 400 failing the run
- no `Bun.` API reachable from the browser bundle
- the frontend bundle has an entry point (the B3 guard)

## Machine-run, needs a desktop session

```bash
bin/smoke-desktop.sh
```

Builds the frontend, asserts `dist/index.html` exists and references the built
assets, builds the packaged binary, launches it, and confirms it stays up. Not
in CI because it needs a GUI session.

## Human, per release

`tauri-driver` does not work on macOS, so the native shell is the one surface no
automated gate covers. Three minutes:

- [ ] **Open Folder** opens the native picker and the sidebar lists your notes.
      *(The browser has no picker, so this path is untested until now.)*
- [ ] Open a note, edit it, press ⌘S, quit the app, reopen, confirm the edit is
      there. *(Proves the real filesystem write, not the HTTP one.)*
- [ ] Insert a Mermaid block and confirm it renders. *(Proves the webview's
      CSP allows what the app needs.)*
- [ ] Confirm the window title, icon and menu bar look right.

If a generative block is part of the release, also:

- [ ] A Diagram gen or Image gen block produces output, or fails with a readable
      error when the CLI is absent. *(Proves the Tauri IPC transport, which the
      browser path does not exercise.)*

## If a human check fails

File it before fixing it, and say which automated gate should have caught it.
A desktop-only failure that the web suite structurally could not catch is the
trigger to reconsider an embedded WebDriver — see the Phase 4 note in the
validation-loop plan.
