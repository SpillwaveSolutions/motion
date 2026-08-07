---
date: 2026-08-07
slug: cli-file-arg-dirty-zoom
title: CLI file argument, unsaved-changes guard, and editor zoom
epic: 01KZF796D647FD32J1W2452NWM
items: [01KZF796D6RNJ0Q40G0113QV8Q, 01KZF796D6VPDRQYR7N0F5JJZ5, 01KZF796D63FJCPA6FMJC6582E, 01KZF796D6SECSX92KFSQMRPN4, 01KZF796D6F9ZDTXF28PQBH969, 01KZF796D6FMZHDDXEX6D8TZ96, 01KZF796D6JZ2XPNGVFEGXJ9QR, 01KZF796D6SJFH8JAYQAAS98H8, 01KZF796D6BPZCFNVPWEGYSSA0, 01KZF796D6PYF8DQXHV67QRJDD, 01KZF796D7PP25PNYZ3003PJ74, 01KZF796D71ATP5ZX7XZY1FG7V, 01KZF796D72GZ2QWRAASHTNSRA, 01KZF796D7K6BR1ZQQ8SVC8YPH, 01KZF796D78HWFN79T9TNYVJPN, 01KZF796D725F72PYEAHRZZSKQ, 01KZF796D75MSG13JB0ZED5NQ1, 01KZF796D7SBPX52KF580NPAPW, 01KZF796D7X9DM9THYCNTFPH03, 01KZF796D7WSC35B41ZNQV9P5V, 01KZF796D7Y5RN6FRFXT6AKC11, 01KZF796D7K5T4BS7K4ZWVKFT1, 01KZF796D7H8F2PH7VJJDVCR9M, 01KZF796D715WDWPYE7DBVV7WZ, 01KZF796D71X3W53R1W9GRGDEC, 01KZF796D7ZGXJ30SD9QX6F2SW, 01KZF796D745F0RNS2QGV44EMK, 01KZF796D75QVQM6MQYPGVMSKE, 01KZF796D7ZQYQQPP1BX3H9HQB, 01KZF796D70MHWVDM1PZGFDCPN, 01KZF796D7T4MB8E1N5S9B3RJW, 01KZF796D8QZRGNVV5VS2VJKMH, 01KZF796D88VACJ230R487YY1K, 01KZF796D89YD00DR64VGVAJ1V, 01KZF796D88XT43Y4PTYPCKP7E, 01KZF796D8GRCQVQYQ8RM2J301, 01KZF796D8ZGMWVK04YJABXR6M, 01KZF796D86GET2MKXHP5AJRMQ, 01KZF796D8ARMVFVGRX3FGE262, 01KZF796D8B0Y62FBE775Q7PTR]
---

# CLI file argument, unsaved-changes guard, and editor zoom — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `motion note.md` open a file, warn before losing unsaved edits when switching notes, and add persistent `⌘+`/`⌘−`/`⌘0` zoom.

**Architecture:** Three independent features. The CLI file argument extends the existing `MOTION_WORKSPACE` bootstrap channel with one field rather than adding a mechanism. The unsaved guard derives dirty state from `rawMarkdown !== savedMarkdown` and lifts it to `App` so sidebar selection can intercept. Zoom rescales the root font size, which works because every size token in `index.css` is `rem`-anchored to `html { font-size: 16px }`, and persists through the existing settings transport.

**Tech Stack:** Bun, React 19, TipTap 3, Tauri 2, Playwright, PlantUML Salt.

**Design doc:** `docs/designs/2026-08-07-cli-file-arg-dirty-zoom-design.md`

## Global Constraints

- Bun only — `bun test src`, `bunx playwright test`, never npm/node/jest/vitest.
- `Bun.*` must never be reachable from `src/main.tsx`; `bun run guard:client` enforces this in CI.
- Markdown extension set is `["md"]` and nothing else (`src/lib/fsCore.ts:130`).
- Every user-visible feature ships **both** a unit test under `src/**` and a Playwright E2E under `e2e/**`. A feature with one layer is not done.
- Zero console errors, zero uncaught exceptions, zero responses >= 400 during E2E — enforced by `e2e/fixtures.ts`.
- Rust changes additionally pass `cargo test --lib` and `cargo clippy --all-targets -- -D warnings` in `src-tauri/`.
- Address elements by role and accessible name, never CSS trivia. Icon-only buttons get `aria-label`.
- Absolute paths everywhere for file identity — `collectFiles` returns absolute (`src/lib/fsCore.ts:112`).
- Docs stay truthful: update `docs/user_guide/user-guide.md` and the README feature list for user-visible behaviour.

## File Structure

**Feature A — CLI file argument**
- Modify `bin/motion` — classify the argument, create a missing `.md`, export `MOTION_OPEN_FILE`.
- Create `src/lib/cliPathArg.ts` — pure classifier, no filesystem side effects (predicates injected), mirroring `resolveWorkspaceArg` in `src/lib/settings.ts:38`.
- Create `src/lib/cliPathArg.test.ts`.
- Modify `src/server.ts:238` — add `openFile` to the `/api/fs/workspace` payload.
- Modify `src-tauri/src/lib.rs:306` — read `MOTION_OPEN_FILE`, add to `BootstrapInfo`.
- Modify `src/lib/storage/index.ts:69` — `BootstrapInfo.openFile`.
- Modify `src/App.tsx:62-76` — select the file after applying the workspace.
- Create `e2e/cli-open-file.spec.ts`.

**Feature B — unsaved guard**
- Create `src/lib/dirtyState.ts` + test — the pure predicate.
- Create `src/components/UnsavedChangesDialog.tsx` — modal, three outcomes.
- Modify `src/components/Editor/index.tsx` — `savedMarkdown` snapshot, `onDirtyChange`.
- Modify `src/App.tsx` — intercept `handleFileSelect`.
- Modify `e2e/layout.spec.ts` — `check:` rubric rows.
- Create `e2e/unsaved-guard.spec.ts`.
- Already written: `docs/ui/dialogs.md` § Unsaved Changes, `docs/ui/wireframes/dialogs-03-unsaved-changes.puml`.

**Feature C — zoom**
- Modify `src/lib/settings.ts` — `zoom` field, default, clamp in `mergeSettings`.
- Modify `src/lib/settings.test.ts`.
- Create `src/lib/zoom.ts` + test — pure scale reducer.
- Create `src/lib/useZoom.ts` — keydown listener, apply, debounced persist.
- Modify `src/App.tsx` — mount the hook.
- Create `e2e/zoom.spec.ts`.

---

## Tasks

- [ ] (P1) Pure CLI path-argument classifier
  Decide whether a command-line path is a workspace directory, a markdown file to open, or an error, without touching disk. Keeps the rule testable and stops a typo'd directory name from silently becoming a new file.
  - [ ] Write failing tests for directory, existing `.md`, missing `.md`, and non-markdown non-directory
  - [ ] Implement `classifyPathArg` in `src/lib/cliPathArg.ts`
  - [ ] Run `bun test src/lib/cliPathArg.test.ts` green and commit

- [ ] (P1) Teach `bin/motion` to accept a markdown file
  Make `motion notes/idea.md` open that note with its folder as the workspace, creating the file when it does not exist. Today the CLI exits 1 for anything that is not a directory.
  - [ ] Replace the `-d` check with file/directory classification
  - [ ] Create the file when missing, then export `MOTION_OPEN_FILE`
  - [ ] Verify by hand against a scratch directory and commit

- [ ] (P1) Carry `openFile` through the bootstrap payload
  Both the dev server and the Tauri app already tell the UI which folder to open at startup; add the file to that same message so web and desktop behave identically.
  - [ ] Add `openFile` to `/api/fs/workspace` in `src/server.ts`
  - [ ] Add `open_file` to `BootstrapInfo` in `src-tauri/src/lib.rs`
  - [ ] Extend `BootstrapInfo` in `src/lib/storage/index.ts`
  - [ ] Run `cargo test --lib` and `cargo clippy --all-targets -- -D warnings`, then commit

- [ ] (P1) Open the CLI-supplied file on boot
  Select the requested note in the editor once the workspace loads, so `motion note.md` lands the user in the note rather than an empty shell.
  - [ ] Extend the auto-open effect in `src/App.tsx` to select `openFile`
  - [ ] Write `e2e/cli-open-file.spec.ts` driving a server booted with the env var
  - [ ] Run the E2E green and commit

- [ ] (P1) Track unsaved editor changes
  Nothing in the app currently knows a note has unsaved edits. Derive it by comparing the live buffer against the last saved content so no future edit path can forget to flag it.
  - [ ] Write failing tests for the dirty predicate
  - [ ] Add the `savedMarkdown` snapshot and `onDirtyChange` to the Editor
  - [ ] Run `bun test src` green and commit

- [ ] (P1) Warn before switching notes with unsaved edits
  Show a Save / Discard / Cancel dialog when the user clicks another note with unsaved work, so edits are never lost silently. Matches the wireframe in `docs/ui/dialogs.md`.
  - [ ] Build `UnsavedChangesDialog` with the three documented actions
  - [ ] Intercept file selection in `src/App.tsx`
  - [ ] Write `e2e/unsaved-guard.spec.ts` covering all three outcomes plus the clean-switch case
  - [ ] Add the `check:` rubric rows to `e2e/layout.spec.ts` and commit

- [ ] (P2) Add a validated zoom level to settings
  Store the zoom level in the settings file so it survives restarts, clamped where every other setting is validated so a hand-edited file cannot make the app unreadable.
  - [ ] Write failing tests for `zoom` absent, out of range, and non-numeric
  - [ ] Add the field, default, and clamp to `src/lib/settings.ts`
  - [ ] Run `bun test src/lib/settings.test.ts` green and commit

- [ ] (P2) Zoom the app with ⌘+, ⌘− and ⌘0
  Let the user change text size from the keyboard and have Motion remember it. Every size token is already relative to the root font size, so one value rescales the whole window.
  - [ ] Write failing tests for the scale reducer
  - [ ] Implement `src/lib/zoom.ts` and the `useZoom` hook with debounced persistence
  - [ ] Mount it in `src/App.tsx` and apply the saved value at boot
  - [ ] Write `e2e/zoom.spec.ts` asserting the computed root font size and survival across reload
  - [ ] Run `bun run verify` and commit

- [ ] (P2) Update user-facing docs
  Keep the user guide and README honest about what ships, per the Definition of Done.
  - [ ] Document the file argument, the unsaved guard, and zoom in `docs/user_guide/user-guide.md`
  - [ ] Update the README feature list and known limitations
  - [ ] Commit

---

## Implementation detail

### Task 1 — `src/lib/cliPathArg.ts`

**Interfaces produced:** `classifyPathArg(raw, deps) => {kind: "dir", path} | {kind: "file", path, dir} | {kind: "error", error}` where `deps = {resolve, isDirectory}`.

Note there is deliberately **no** `exists` predicate: a missing `.md` classifies as a file exactly like an existing one, because the caller creates it. Existence never changes the decision, so taking it as input would be a parameter that cannot affect the result.

**Step 1 — failing test** (`src/lib/cliPathArg.test.ts`):

```ts
import { expect, test } from "bun:test";
import { classifyPathArg } from "./cliPathArg";

const deps = {
    resolve: (p: string) => (p.startsWith("/") ? p : `/cwd/${p}`),
    isDirectory: (p: string) => p === "/cwd/docs" || p === "/cwd",
};

test("a directory is a workspace", () => {
    expect(classifyPathArg("docs", deps)).toEqual({ kind: "dir", path: "/cwd/docs" });
});

test("an existing .md is a file to open", () => {
    expect(classifyPathArg("docs/a.md", deps)).toEqual({
        kind: "file", path: "/cwd/docs/a.md", dir: "/cwd/docs",
    });
});

test("a missing .md is still a file to open (created by the caller)", () => {
    expect(classifyPathArg("docs/new.md", deps)).toEqual({
        kind: "file", path: "/cwd/docs/new.md", dir: "/cwd/docs",
    });
});

test("a non-markdown path that is not a directory is an error", () => {
    const r = classifyPathArg("docs/data.csv", deps);
    expect(r.kind).toBe("error");
});

test(".markdown is NOT accepted — the sidebar only lists .md", () => {
    expect(classifyPathArg("docs/a.markdown", deps).kind).toBe("error");
});
```

**Step 2 — run it, expect failure:** `bun test src/lib/cliPathArg.test.ts` → FAIL, module not found.

**Step 3 — implement:**

```ts
/**
 * Classify a CLI path argument without touching disk (predicates injected, as
 * in resolveWorkspaceArg). `.md` only: MARKDOWN_EXTENSIONS is ["md"], and the
 * sidebar filters on that same constant — accepting .markdown here would open a
 * document the sidebar cannot list.
 */
export interface PathArgDeps {
    resolve: (p: string) => string;
    isDirectory: (abs: string) => boolean;
}

export type PathArg =
    | { kind: "dir"; path: string }
    | { kind: "file"; path: string; dir: string }
    | { kind: "error"; error: string };

export function classifyPathArg(raw: string | undefined, deps: PathArgDeps): PathArg {
    const arg = (raw ?? ".").trim() || ".";
    const abs = deps.resolve(arg).replace(/\/+$/, "") || "/";

    if (deps.isDirectory(abs)) return { kind: "dir", path: abs };

    if (/\.md$/i.test(abs)) {
        const dir = abs.slice(0, abs.lastIndexOf("/")) || "/";
        return { kind: "file", path: abs, dir };
    }

    return { kind: "error", error: `not a directory: ${arg}` };
}
```

**Step 4:** `bun test src/lib/cliPathArg.test.ts` → PASS.

**Step 5 — commit:**

```bash
git add src/lib/cliPathArg.ts src/lib/cliPathArg.test.ts
git commit -m "feat(cli): classify markdown file arguments"
```

### Task 2 — `bin/motion`

Replace the existing guard:

```bash
DIR_ARG="${DIR_ARG:-.}"
if [[ ! -d "$DIR_ARG" ]]; then
  echo "motion: not a directory: $DIR_ARG" >&2
  exit 1
fi
WORKSPACE="$(cd "$DIR_ARG" && pwd)"
```

with classification (same rule as `classifyPathArg`, in bash):

```bash
ARG="${DIR_ARG:-.}"
OPEN_FILE=""
if [[ -d "$ARG" ]]; then
  WORKSPACE="$(cd "$ARG" && pwd)"
elif [[ "$ARG" == *.md || "$ARG" == *.MD ]]; then
  parent="$(dirname "$ARG")"
  mkdir -p "$parent" || { echo "motion: cannot create $parent" >&2; exit 1; }
  [[ -e "$ARG" ]] || : >"$ARG" || { echo "motion: cannot create $ARG" >&2; exit 1; }
  WORKSPACE="$(cd "$parent" && pwd)"
  OPEN_FILE="$WORKSPACE/$(basename "$ARG")"
else
  echo "motion: not a directory: $ARG" >&2
  exit 1
fi
export MOTION_WORKSPACE="$WORKSPACE"
[[ -n "$OPEN_FILE" ]] && export MOTION_OPEN_FILE="$OPEN_FILE"
```

Manual verification before commit:

```bash
mkdir -p /tmp/mws && bin/motion --no-open --port 3999 /tmp/mws/new.md
curl -s http://127.0.0.1:3999/api/fs/workspace   # root=/tmp/mws, openFile=/tmp/mws/new.md
test -f /tmp/mws/new.md && echo "created"
```

### Task 3 — bootstrap payload

`src/server.ts`, beside the existing `AUTO_OPEN` constant:

```ts
/** Absolute path of a file the CLI asked us to open, or null. */
const OPEN_FILE = process.env["MOTION_OPEN_FILE"] || null;
```

and at line 238:

```ts
case "GET /api/fs/workspace":
    return Response.json({
        root: WORKSPACE_ROOT,
        autoOpen: AUTO_OPEN,
        openFile: OPEN_FILE,
    });
```

`src-tauri/src/lib.rs` — extend the struct near line 115:

```rust
#[serde(rename = "openFile")]
open_file: Option<String>,
```

and in `run()`, beside the existing `MOTION_WORKSPACE` read:

```rust
let open_file = std::env::var("MOTION_OPEN_FILE")
    .ok()
    .filter(|s| !s.trim().is_empty())
    .and_then(|s| fs::canonicalize(Path::new(&s)).ok())
    .filter(|p| p.is_file())
    .map(|p| p.to_string_lossy().into_owned());
```

`src/lib/storage/index.ts`:

```ts
export interface BootstrapInfo {
    root: string | null;
    autoOpen: boolean;
    /** Absolute path of a CLI-supplied file to open, or null. */
    openFile: string | null;
}
```

and in the fetch branch of `fetchBootstrap`:

```ts
const data = (await res.json()) as { root?: string; autoOpen?: boolean; openFile?: string | null };
return {
    root: data.root ?? null,
    autoOpen: Boolean(data.autoOpen),
    openFile: data.openFile ?? null,
};
```

Then `cd src-tauri && cargo test --lib && cargo clippy --all-targets -- -D warnings`.

### Task 4 — auto-open in `src/App.tsx`

Extend the existing effect (lines 62-76):

```ts
const boot = await fetchBootstrap();
if (cancelled || !boot.autoOpen || !boot.root) return;
await applyWorkspace(boot.root);
// A bad file argument must not cost the user the whole session.
if (!cancelled && boot.openFile) {
    try {
        await handleFileSelect(boot.openFile);
    } catch (error) {
        console.error("CLI file open failed:", error);
    }
}
```

`handleFileSelect` must be referenced before this effect and added to its dependency array. If it is defined below, wrap it in `useCallback` first.

**E2E** (`e2e/cli-open-file.spec.ts`) — follow the existing workspace-seeding fixture in `e2e/workspace.ts`; boot the server with `MOTION_OPEN_FILE` pointing at a seeded note, then:

```ts
test("motion <file.md> opens the note and lists its folder", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /welcome\.md/ })).toBeVisible();
    await expect(page.locator(".ProseMirror")).toContainText("Welcome to Motion");
});
```

### Task 5 — dirty tracking

`src/lib/dirtyState.ts`:

```ts
/** Derived, never assigned — no edit path can forget to set a flag. */
export function isDirty(current: string, saved: string | null): boolean {
    return saved !== null && current !== saved;
}
```

Tests: clean on load, dirty after edit, clean after save, clean when an edit is manually reverted, and not dirty when `saved` is null (nothing loaded yet).

In `src/components/Editor/index.tsx` add `const [savedMarkdown, setSavedMarkdown] = useState<string | null>(null)`, set it wherever the document content is loaded and inside `writeToPath` on success (line 270, beside `setSaveState("saved")`), then:

```ts
useEffect(() => {
    onDirtyChange?.(isDirty(rawMarkdown, savedMarkdown));
}, [rawMarkdown, savedMarkdown, onDirtyChange]);
```

### Task 6 — the dialog

`src/components/UnsavedChangesDialog.tsx`, following `SaveNameDialog.tsx` structure — `role="dialog"`, `aria-modal="true"`, labelled by its `h2`, Escape maps to Cancel:

```tsx
export interface UnsavedChangesDialogProps {
    currentName: string;
    incomingName: string;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}
```

In `src/App.tsx`, hold `pendingFile` state; `handleFileSelect` checks dirty first and defers. On **Save**, run the editor save; if it opened the name sheet, clear `pendingFile` and abandon the switch (the user is mid-naming). On **Discard**, proceed. On **Cancel**, clear `pendingFile` and leave the selection alone.

E2E must cover all three buttons **and** that a clean buffer switches with no dialog — a guard that fires when nothing is dirty gets clicked through blindly.

### Task 7 — settings field

In `src/lib/settings.ts`, add to the interface and default, then clamp inside `mergeSettings` beside the existing `port` clamp:

```ts
const zoomRaw = typeof p.zoom === "number" && Number.isFinite(p.zoom) ? p.zoom : DEFAULT_SETTINGS.zoom;
const zoom = Math.min(2, Math.max(0.75, zoomRaw));
```

Tests: absent → 1, `0.1` → 0.75, `99` → 2, `"big"` → 1, `NaN` → 1.

### Task 8 — zoom hook

`src/lib/zoom.ts`:

```ts
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_BASE_PX = 16;

export function nextZoom(current: number, direction: "in" | "out" | "reset"): number {
    if (direction === "reset") return 1;
    const raw = direction === "in" ? current + ZOOM_STEP : current - ZOOM_STEP;
    return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw)) * 100) / 100;
}

export function applyZoom(scale: number): void {
    document.documentElement.style.fontSize = `${ZOOM_BASE_PX * scale}px`;
}
```

`src/lib/useZoom.ts` — mirror the `⌘S` listener at `Editor/index.tsx:454`:

```ts
const onKeyDown = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const dir =
        e.key === "=" || e.key === "+" ? "in"
        : e.key === "-" || e.key === "_" ? "out"
        : e.key === "0" ? "reset"
        : null;
    if (!dir) return;
    e.preventDefault();   // also suppresses browser page zoom in web mode
    setScale((s) => nextZoom(s, dir));
};
```

Apply on change, and persist with a ~500ms debounce via `updateSettings({ zoom })` — key repeat while holding `⌘+` would otherwise write the settings file dozens of times.

**E2E must assert the computed value, not the intent**, because `preventDefault()` on browser page zoom is not guaranteed across browsers:

```ts
const rootPx = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
await expect.poll(rootPx).toBe("16px");
await page.keyboard.press("Meta+=");
await expect.poll(rootPx).not.toBe("16px");
await page.keyboard.press("Meta+0");
await expect.poll(rootPx).toBe("16px");
```

Then reload and assert the zoomed value persisted.
