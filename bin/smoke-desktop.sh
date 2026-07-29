#!/usr/bin/env bash
#
# Desktop smoke test: does the PACKAGED app actually start?
#
# tauri-driver does not work on macOS (no WKWebView driver), so this is not UI
# automation -- it is the narrow check that the packaging seam is intact. That
# seam is exactly what broke in B3: `bun build` emitted no index.html, so
# `frontendDist` pointed at a directory with no entry point and the packaged app
# opened a blank window. `bun tauri dev` never caught it, because dev mode loads
# devUrl from the dev server instead of the bundle.
#
# Checks, in order:
#   1. the frontend build emits an entry point, not just assets
#   2. index.html references the built asset names
#   3. `tauri build` produces a binary
#   4. that binary starts and stays up rather than exiting or crashing
#
# Usage: bin/smoke-desktop.sh [seconds-to-stay-up]   (default 8)

set -euo pipefail

cd "$(dirname "$0")/.."

ALIVE_SECONDS="${1:-8}"
fail() { echo "smoke-desktop: FAIL — $*" >&2; exit 1; }
step() { echo "smoke-desktop: $*"; }

step "building the frontend"
bun run build >/dev/null || fail "bun run build failed"

# 1 + 2. The B3 regression guard.
[ -f dist/index.html ] || fail "dist/index.html missing — frontendDist has no entry point (B3)"
grep -q 'src="./main.js"' dist/index.html || fail "dist/index.html does not reference the built JS"
[ -f dist/main.js ] || fail "dist/main.js missing"
step "dist/ has an entry point referencing the built assets"

step "building the desktop binary (this takes a few minutes)"
bunx tauri build --no-bundle >/dev/null 2>&1 || fail "tauri build failed"

BIN="src-tauri/target/release/app"
[ -x "$BIN" ] || fail "no executable at $BIN"
step "built $BIN"

# 4. A GUI binary that exits immediately proves nothing good. Start it, give it
#    time to create a window and load the webview, then confirm it is still up.
step "launching for ${ALIVE_SECONDS}s"
"$BIN" >/tmp/motion-smoke.log 2>&1 &
APP_PID=$!
cleanup() { kill "$APP_PID" 2>/dev/null || true; wait "$APP_PID" 2>/dev/null || true; }
trap cleanup EXIT

sleep "$ALIVE_SECONDS"

if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "--- app output ---" >&2
    cat /tmp/motion-smoke.log >&2 || true
    fail "app exited within ${ALIVE_SECONDS}s"
fi

step "app still running after ${ALIVE_SECONDS}s"
echo "smoke-desktop: PASS"
