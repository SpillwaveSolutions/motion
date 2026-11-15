---
date: 2026-11-15
slug: workspace-watch
title: Refresh the file list when the workspace folder changes
epic: 01M7G62323WBZ2GKE42W294Q7W
items: [01M7G62324CPMT49A3TK5FHAT3, 01M7G62324ATG0NMRRGGCQSY6F, 01M7G62324XZJ1J3NRZS7RQR4V, 01M7G62324JEE4YPVSFMSY84P1, 01M7G6232437NHRFH5M392PDN9, 01M7G62324V378E3WD04P9R60H, 01M7G62324ASWXPNMA4D2YQGJN]
---

# Plan: refresh the file list when the workspace folder changes

## Context

You open a folder with `motion .`. If another program adds a file to that folder, the sidebar does not show it. The file list loads one time, in `activateWorkspace` (`src/App.tsx:352`), and nothing reloads it.

The goal: Motion uses operating system file events to find changes in the open workspace. The sidebar then shows added, deleted, and renamed notes without a reload. The change ships as v0.6.11.

## Approach

The backend watches the workspace root and sends one "changed" signal after a short debounce. The client then calls the existing `storage.listFiles()` again. The client does not apply individual events. A full re-list is correct for add, delete, and rename, and it uses the existing jail and dotdir rules in `collectFiles`.

| Runtime | Watcher | Signal to the client |
| --- | --- | --- |
| Tauri app | Rust `notify-debouncer-mini` crate (FSEvents on macOS) | `app.emit("motion://fs-changed")` |
| Browser dev server | `fs.watch(root, { recursive: true })` in `src/server.ts` (already used at line 133) | Server-Sent Events on `GET /api/fs/events` |

Both watchers ignore events inside dot directories (for example `.git`), which matches `collectFiles`.

## Steps

### File the work

1. Create a GitHub issue with `gh issue create`: "Show files added to the workspace folder outside Motion".
2. Add the work item: `worklog add` with `level:story kind:feature milestone:v0.6.11`, linked to the issue.
3. Run `worklog plan-capture` on this plan. It writes `docs/plans/2026-11-15-workspace-watch.md` and adds the steps as work items.
4. Create the branch `feat/workspace-watch` from `main`.

### Add the shared filter

1. Add `isWatchedChange(root, changedPath)` to `src/lib/fsCore.ts`. It returns false for any path with a dot-directory segment under the root.
2. Add the same rule as `is_watched_change` in `src-tauri/src/fs_core.rs`.
3. Add cases to `tests/contract/storage-cases.json` so both suites test the same rule.

### Watch in the Tauri app

1. Run `cargo add notify-debouncer-mini` in `src-tauri/`.
2. Add `watcher: Mutex<Option<Debouncer<...>>>` to `WorkspaceState` (`src-tauri/src/lib.rs:110`).
3. In `set_workspace`, replace the old watcher with a new one on the canonical root (recursive, 300 ms debounce). The callback filters with `is_watched_change` and emits `motion://fs-changed`.
4. Dropping the old debouncer stops the old watch. No other cleanup is needed.

### Watch in the browser dev server

1. In `src/server.ts`, add `GET /api/fs/events`. It returns a `text/event-stream` response.
2. Start one `fs.watch` on `WORKSPACE_ROOT` per open stream. Debounce 300 ms. Send `data: changed` for each watched change.
3. Close the watcher when the request aborts (`req.signal`).

### Subscribe in the client

1. Add `watch(onChange: () => void): () => void` to `StorageProvider` in `src/lib/storage/index.ts`.
   - `TauriStorage`: `listen("motion://fs-changed", onChange)`.
   - `HttpStorage`: `new EventSource("/api/fs/events")`.
2. In `App.tsx`, add one `useEffect` keyed on `workspacePath`. On a signal, it skips if `folderLoading` is true, calls `storage.listFiles(workspacePath)`, calls `setFiles`, and reads content only for new paths. It reuses the read loop from `cacheContents` (`src/App.tsx:313`) and merges into `contents`.
3. Leave the open note alone, even if its file was deleted.

### Test

1. Unit: `src/lib/fsCore.test` cases for `isWatchedChange` through the contract file.
2. Rust: a `cargo test --lib` test that starts the watcher on a `tempfile` directory, writes a file, and gets the callback within 2 seconds.
3. E2E: new `e2e/workspace-watch.spec.ts`.
   - Success path: write `external-note.md` into `MOTION_WORKSPACE` with Node `fs`. Expect `getByRole("treeitem", { name: /external-note/ })` to be visible without a reload.
   - Delete path: delete the file. Expect the tree item to go away.
   - Ignore path: write `.hidden/x.md`. Expect no tree item.
4. Run `bun run verify`, `cargo test --lib`, and `cargo clippy --all-targets -- -D warnings`.

### Update the docs

1. `docs/user_guide/user-guide.md`: the sidebar shows outside changes.
2. `README.md`: add to the feature list.
3. `docs/designs/current_design_doc.md`: describe the watch flow and the new endpoint and event.
4. Publish the wiki with `worklog wiki-add`.

### Ship

1. Commit, push the branch, and open the feature PR. Ask you before the merge.
2. After the merge, open the release PR, as in PR 78: bump to 0.6.11 in `Cargo.toml`, `Cargo.lock`, and `tauri.conf.json`. Update `CHANGELOG.md`, the roadmap snapshot, and the user guide version.
3. Close the work item, link the PR, and run `worklog roadmap-render`.

## Not in scope

- Reloading the open note when another program changes its text. File it as a follow-up item if you want it.
- Live refresh of the Dataset block's data-file picker. It already re-lists each time it opens.

## Verification

1. `bun run verify` passes. The E2E run has zero console errors and zero failed requests.
2. `cargo test --lib` and `cargo clippy` pass in `src-tauri/`.
3. Manual check in the desktop app: run `motion .`, then `touch new.md` in a terminal. `new.md` shows in the sidebar in under 1 second.

## Tasks

- [ ] (P1) Add the shared watch filter to fsCore.ts and fs_core.rs, with contract cases
- [ ] (P1) Watch the workspace in the Tauri app and emit motion://fs-changed
- [ ] (P1) Stream workspace changes from the dev server on GET /api/fs/events
- [ ] (P1) Re-list the sidebar files when the workspace changes
- [ ] (P1) Unit, Rust, and Playwright tests for the workspace watch
- [ ] (P2) Update the user guide, README, design doc, and wiki
- [ ] (P2) Release v0.6.11
