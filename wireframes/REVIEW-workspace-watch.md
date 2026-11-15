# Adversarial review: workspace watch (outside changes in the sidebar)

**Wireframe:** `wireframes/shell.md` (the Outside change state and the three new criteria)
**Branch:** `feat/workspace-watch` (PR 81)
**Verdict:** PASS WITH NOTES (re-review of b130924; the first review was FAIL)

The feature works in the normal case. A new note shows in about 330 ms, a deleted note leaves in about 325 ms, and dot folders stay hidden. Two defects in the dev server path block a PASS. A file that another program writes more often than every 300 ms stops all sidebar refreshes. Each closed `/api/fs/events` stream leaks one `fs.watch`.

## Criteria results

- [ ] A note that another program adds to the open folder appears in the tree within 5 seconds, with no reload, and opens with its content. FAIL in one case. In the normal case it passes: the note appears in 326 ms and opens with "Written by another program." A rename with `mv` shows in 328 ms. A new nested folder with a note shows in 321 ms. A burst of 200 notes shows in 441 ms with one `/api/fs/list` call. After 15 s of quiet, a new note shows in 379 ms. The failing case: a script appends a line to `build.log` in the workspace every 250 ms. A note added during that churn did not appear in 15 s. It appeared 82 ms after the churn stopped. The server debounce in `workspaceEvents` (`src/server.ts`) resets one timer on every event and has no maximum wait. Any non-dot file that changes more often than every 300 ms therefore blocks every refresh. A build log, a database file, or a sync client in the folder can do this.
- [x] A note that another program deletes leaves the tree within 5 seconds. PASS. A deleted note leaves in 322 ms. A deleted folder of 200 notes leaves in 354 ms. A folder moved out of the workspace leaves in 336 ms. The open note, when deleted, leaves the tree and stays in the editor, as the wireframe says. By code reading, the churn defect above blocks deletes in the same way.
- [x] A note that another program adds under a dot folder never appears in the tree. PASS. Notes in `.cache/`, `.git/objects/ab/`, and `sub/.deep/` stay hidden. Twenty writes to `.git/index` caused zero `/api/fs/list` calls. A visible note written after them appeared in 330 ms, so the refresh ran.

## Attacks tried

Dev server on port 3127, a temp workspace, Playwright Chromium, files changed with Node `fs` from the probe process.

- Burst of 200 notes in a new folder. One list call and 200 reads. All 200 show in 441 ms. Search finds text in note 199. `rm -rf` of the folder clears the tree in 354 ms.
- Rename with `mv`. The old name leaves and the new name shows in 328 ms.
- New nested folder `newdir/deeper/nested.md`. Shows in 321 ms, expanded.
- Folder moved out of the workspace. Its notes leave in 336 ms.
- Open note deleted, then typed into. The tree drops it, and the editor keeps the text. The autosave then writes the file again with no message, and the note comes back in the tree. The outside delete is undone without a word.
- Open note renamed outside (`orig.md` to `renamed-outside.md`). The new name shows, but no tree item is selected. The editor still points at `orig.md`. Typing saves to `orig.md`, so the folder now holds two copies of the note.
- Existing note edited outside, then **Search notes**. A word added to `alpha.md` from outside gives zero hits. The refresh reads only paths it has not seen, so the search index keeps the old text. A new note with the same word is found. The wireframe criteria cover add and delete only, but the search result is wrong.
- Dotfile note at the root, `.dotnote.md`. `collectFiles` lists it, because it skips dot folders but not dot files. `isWatchedChange` ignores dot files. Adding `.another.md` alone does not refresh the tree (not shown after 5 s). Deleting `.ghost.md` alone leaves a stale tree item. A click on it gives `HTTP 404 /api/fs/read`, two console errors, and "Error loading file" in the editor. The comments in `fsCore.ts` and `fs_core.rs` say the filter skips "the same entries collectFiles skips". It does not.
- Outside change during inline rename. An unrelated new note keeps the rename input, its value, and its focus. When another program removes the note being renamed, the input goes away. When the file comes back, the input comes back, because `renamingPath` was never cleared.
- Outside add during **Open Folder** with every `/api/fs/read` held for 2.5 s. The new note stays in the tree and search finds it after the load. No race seen. By code reading, a refresh that starts during a load is not marked stale, and the load's `setContents` can still drop the new note's text from the search cache.
- `.git` style churn: covered under criterion 3.
- Long quiet period: 15 s idle, then a new note shows in 379 ms. `server.timeout(req, 0)` works.
- Dev server killed and restarted with the page open. EventSource reconnects by itself. During the outage there is one `requestfailed GET /api/fs/events net::ERR_CONNECTION_REFUSED` and one `console.error: Failed to load resource`. A note written while the server was down did not show after the reconnect. It showed only after the next change. The client does not refresh on reconnect.
- Watcher leak. After 20 pages and 20 reloads were closed, the server held 42 open handles on the workspace root and none were released. Five `curl` streams to `/api/fs/events` that ended on the client side added five more, and they stayed after 5 s and after two writes. Neither `req.signal` abort nor `cancel()` closes the watch in this Bun version (1.3.6). Each page load in browser mode keeps one recursive watch for the life of the server. The E2E run shares one server, so the leak grows over the suite.

No console errors, failed requests, or responses >= 400 came from the feature in the normal paths. The only ones seen came from the ghost dotfile click and the server restart.

## Not tested

- The desktop app. I cannot run Tauri here. By reading `watch_workspace` and `set_workspace` in `src-tauri/src/lib.rs`:
  - `notify-debouncer-mini` 0.7.0 debounces per path and emits `AnyContinuous` for a path that keeps changing. The churn starvation above does not apply. A churning non-dot file instead causes a full re-list about every 300 to 600 ms for as long as it changes.
  - `is_watched_change` matches the TypeScript filter, so the dotfile gap is the same on desktop.
  - `set_workspace` drops the old `Debouncer` when it stores the new one, so the desktop does not leak watches. Open Folder calls `set_workspace` twice (`openFolder`, then `ensureWorkspace`), so it builds the watch twice. This is harmless.
  - `set_workspace` is a sync command. A recursive watch on a very large tree on Linux (inotify) runs on the main thread and can hit `max_user_watches`. On failure the folder still opens and only a log line says the live refresh is off. The user gets no sign.
  - `core:default` grants `core:event:default`, so `listen("motion://fs-changed")` is allowed.
- Windows paths for `isWatchedChange`.
- Two browser tabs on one workspace at once.

## Notes

- Gates: `bun run typecheck` is clean. `bun test src` gives 363 pass and 0 fail. `bunx playwright test e2e/workspace-watch.spec.ts` gives 2 passed. I did not run the full suite.

Required before PASS:

1. Give the server debounce a maximum wait (for example, fire at most 1 s after the first event of a burst), or debounce per path as the Rust side does. Add a unit or E2E case where a non-dot file changes every 100 ms and a new note still appears within 5 s.
2. Close the `fs.watch` when the SSE client goes away. One option is one shared watcher for the server with a set of subscribers. Then a closed stream only removes itself from the set, and an `enqueue` that throws removes the subscriber. Add a check that the watcher count goes back down after a page closes.

Recommended:

- Make the watch filter and `collectFiles` agree on dot files. Either list no dot files or watch them. Fix the comments that claim they agree.
- Refresh once when the EventSource opens again (`onopen` after an error), so changes made during an outage show.
- Re-read known notes whose modified time changed, so **Search notes** is not stale after an outside edit.
- Open note renamed or deleted outside: follow the rename, or show a short notice before the autosave writes the old path again. The current behavior silently duplicates or restores the file.
- Clear `renamingPath` when the note under rename leaves the list.

## Fixes after review

- **Churn starvation.** The dev server now throttles instead of debouncing. `createChangeHub` (`src/lib/changeHub.ts`) sends at most one signal per 300 ms window and does not restart the window on each event. A unit test sends an event every 10 ms and gets a signal in each window. The new E2E case "a note added while another file changes nonstop still shows" appends to a log file every 100 ms, and the note shows.
- **Watcher leak.** All event streams now share one `fs.watch`, started on the first request and closed on exit. A closed stream only removes its sender from the hub, and a sender that throws is dropped. With 10 streams open, then 20 streams opened and closed, the server holds one handle on the workspace root. A probe confirmed that Bun 1.3.6 does fire `abort` and `cancel` on a closed stream, but does not release a closed watch handle on macOS. The per-stream watch therefore leaked whatever the cleanup did.
- **Dot-named notes.** `isWatchedChange` and `is_watched_change` now skip a dot segment only when it is a folder, as `collectFiles` does. `.draft.md` at the root refreshes the tree. The contract case for `.DS_Store` is replaced by cases for `.draft.md` and a new `.cache` folder. The new E2E case "a dot-named note added outside shows" adds and deletes one.
- **Reconnect.** `HttpStorage.watch` refreshes on each `EventSource` open. The first version did not work, because `open` fired only with the first event. See the Re-review and Fixes after re-review sections.
- **Inline rename.** The refresh clears the rename field when its note leaves the list.
- **Filed, not fixed:** the open note deleted or renamed outside and then written back on save (`01M7G7N6W5H69DQWAGT72YKSRG`), and **Search notes** using old text after an outside edit (`01M7G7N6YAP1RX5K53YZF5WA72`). Both are part of the non-goal "reload the open note when another program changes it".
- **Not changed:** a refresh that starts during a folder load can lose the new note's text from the search cache, by code reading. The note itself stays listed.

## Re-review

Commit `b130924`. Same method: a dev server on port 3127, a temp workspace in the session scratchpad, and Playwright Chromium.

**Verdict:** PASS WITH NOTES. Both required items are fixed. The dotfile and inline rename findings are fixed. The reconnect fix does not work, and it adds one console error when the dev server stops. Both effects are in the dev server only.

- [x] Churn. A log file appended every 250 ms for 15 s: a new note shows in 411 ms (before: never). Appended every 100 ms: a new note shows in 166 ms. During 5 s of 100 ms churn the page makes 15 `/api/fs/list` calls, one per 300 ms window. This cost is expected.
- [x] Watcher leak. After 20 pages and 20 reloads were closed, the server held 43 file handles, the same as before the pages. The workspace root has one handle. Five `curl` streams that ended on the client side left it at one. A standalone Bun 1.3.6 probe of the same subscribe pattern shows that `abort` and `cancel` both fire for each closed stream, and the sender set goes back to 0.
- [x] Dot-named notes. `.another.md` added alone shows in 595 ms. Deleted alone, it leaves in 321 ms. A deleted `.ghost.md` no longer stays as a stale item.
- [x] Inline rename. When another program removes the note under rename, the field goes away. When the file comes back, the field stays closed and `alpha.md` is listed.
- [ ] Reconnect. FAIL. A note written while the server was down did not show in 30 s after the restart. It showed only after the next change. The cause: Bun sends the status line and headers of `/api/fs/events` but holds back the blank line that ends them until the first event. A raw socket read got `HTTP/1.1 200 OK ... Cache-Control: no-cache\r\n` and nothing more for 3 s. The browser therefore fires `open` only with the first event, not on connect. The trace shows the reconnect request at 6.1 s and the next `/api/fs/list` at 34.6 s, when a new file was written.
- [ ] New side effect. When the server stops, the browser finishes the held response, fires `open` and then `error`, and the `onopen` refresh calls `/api/fs/list` against the dead server. Seen: `requestfailed /api/fs/events net::ERR_INCOMPLETE_CHUNKED_ENCODING`, `requestfailed /api/fs/list net::ERR_CONNECTION_REFUSED`, two `console.error` lines, and the warning "Could not refresh the file list". The first review saw one failed request and one console error on a restart. Now there are two of each.

Gates: `bun test src` gives 368 pass and 0 fail. `bunx playwright test e2e/workspace-watch.spec.ts` gives 4 passed. No spec covers the reconnect.

Recommended fix for the reconnect: send an SSE comment such as `: open\n\n` in `start()` before any event. The headers then end at once, and `open` fires on connect. Add an E2E case that restarts the stream and writes a note during the outage. The "Reconnect" line under Fixes after review is not correct until this lands.

## Fixes after re-review

- **Reconnect.** `workspaceEvents` now sends the comment line `: open` in `start()`, before any event. The headers end at once, and `EventSource` fires `open` on each connect. A reconnect after a dev server restart therefore refreshes the tree. The refresh no longer fires when the server stops, so the two extra console errors are gone.
- **Test.** The new E2E case "the change stream opens at once, so a reconnect refreshes the tree" opens an `EventSource` and expects `open` within 2 s. Without the `: open` line it fails with `Received: false`. The case does not restart the dev server, because Playwright owns that process. It tests the cause that the re-review found.
