# Adversarial Review: Native Mac chrome + Share

**Wireframe:** `wireframes/native-chrome.md`, `wireframes/publish.md`
**Verdict:** PASS WITH NOTES

Reviewed against the browser stand-in (`bun run dev` + Playwright). The
packaged `.app` cannot be clicked in this Linux environment; Finder Open With
and the overlay title bar are asserted via config + unit tests + `?open=`.

## Criteria Results

### native-chrome.md

- [x] Desktop window default size is at least 1200×760 with a ~720×480 minimum. — PASS (`src-tauri/tauri.conf.json`)
- [x] Overlay title bar is configured; header is a drag region with no-drag on controls. — PASS (config + `data-tauri-drag-region` + CSS). Not visually confirmed on macOS.
- [x] File menu items fire the same actions as the header buttons. — PASS (Rust menu emits `motion://menu`; App maps to the same handlers). Native menu bar itself is desktop-only.
- [x] Last desktop workspace is restored on launch. — PASS (unit-tested `workspaceMemory`; restore is Tauri-only so E2E still clicks Open Folder).
- [x] `?open=` in browser mode opens the workspace and selects that note. — PASS (`e2e/open.spec.ts`)
- [x] Light appearance does not keep the GitHub-dark palette. — PASS (`prefers-color-scheme: light` tokens in `src/index.css`). Not screenshot-compared on a light Mac.
- [x] productName is Motion; identifier is com.spillwave.motion. — PASS

### publish.md

- [x] Share is a real button in the header with accessible name Share. — PASS
- [x] Share is disabled until a note is selected. — PASS (smoke / open specs)
- [x] The menu exposes Publish to Gist, Publish to Notion, and Settings. — PASS
- [x] Gist publish of the current buffer returns a URL the user can copy. — PASS (`e2e/publish.spec.ts`, mocked `/api/publish/gist`)
- [x] Notion publish creates a child page under the configured parent. — PASS (mocked `/api/publish/notion`; converter unit-tested)
- [x] Missing tokens open Settings rather than firing a 401. — PASS
- [x] Tokens are not shown as plaintext placeholders after save (password inputs). — PASS
- [x] Browser E2E mocks `/api/publish/*` without hitting the real APIs. — PASS
- [x] Failure is a 200 `{ ok: false, error }` envelope. — PASS (refused Gist spec; network gate stayed green)

## Evidence

- Playwright: 35 passed (`CI=1 bunx playwright test`), including `e2e/open.spec.ts` and `e2e/publish.spec.ts`.
- Unit: `bun test src` 91 passed.
- Typecheck + client-bundle guard green.
- `cargo test --lib` / clippy not run here: this sandbox cannot install GTK/WebKit. CI rust job has those deps.

## Notes / Recommended Fixes

- Unsigned `.app` / Gatekeeper path is documented in `docs/macos.md` and still needs a human Open-once on a Mac.
- Overlay padding (`88px`) is a guess for traffic-light inset; verify on macOS 14/15 with the default scale.
- Four existing view-mode specs allow Tiptap/React 19 `flushSync` console errors when markdown→WYSIWYG `setContent` mounts dataset/query node views under a warm suite. Isolated those specs are clean. Follow-up: move node-view mounts fully off the React commit.
