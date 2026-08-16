#!/usr/bin/env bash
# Spillwave UI Guard — CI check
# Fails when UI source changes land without a matching wireframes/ update.
# Soft-skip: commit message or PR title contains [skip-ui-guard]
# Env:
#   UI_GUARD_BASE  (default: origin/main or origin/master)
#   UI_GUARD_STRICT (default: 1 in CI)

set -euo pipefail

UI_PATTERNS='(src/.*\.(tsx?|jsx?|css|scss)$|web/.*\.(tsx?|jsx?|css|scss)$|components/|pages/|views/|app/)'
WIREFRAME_DIR="wireframes"
STRICT="${UI_GUARD_STRICT:-1}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not a git repository"
  exit 0
}

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="${UI_GUARD_BASE:-origin/main}"
elif git rev-parse --verify origin/master >/dev/null 2>&1; then
  BASE="${UI_GUARD_BASE:-origin/master}"
else
  BASE="${UI_GUARD_BASE:-HEAD~1}"
fi

CHANGED=$(git diff --name-only --diff-filter=ACM "${BASE}...HEAD" 2>/dev/null || git diff --name-only --diff-filter=ACM "${BASE}" || true)

if [ -z "$CHANGED" ]; then
  echo "UI Guard: no changed files vs ${BASE}"
  exit 0
fi

UI_CHANGED=$(echo "$CHANGED" | grep -E "$UI_PATTERNS" || true)
WIREFRAME_CHANGED=$(echo "$CHANGED" | grep -E "^${WIREFRAME_DIR}/" || true)

echo "UI Guard base: ${BASE}"
echo "UI files changed:"
echo "${UI_CHANGED:-  (none)}"
echo "Wireframe files changed:"
echo "${WIREFRAME_CHANGED:-  (none)}"

if [ -z "$UI_CHANGED" ]; then
  echo "UI Guard: no UI source changes — pass"
  exit 0
fi

MSG="$(git log --format=%s "${BASE}..HEAD" 2>/dev/null || true)"
if echo "$MSG" | grep -qi '\[skip-ui-guard\]'; then
  echo "UI Guard: skipped via [skip-ui-guard]"
  exit 0
fi

if [ -z "$WIREFRAME_CHANGED" ]; then
  echo ""
  echo "UI Guard FAIL: UI source changed without a wireframes/ update."
  echo "Create or update a wireframe under wireframes/ and re-run the adversarial reviewer."
  echo "To skip intentionally, include [skip-ui-guard] in the commit or PR title."
  if [ "$STRICT" = "1" ]; then
    exit 1
  fi
  echo "STRICT is off — warning only."
fi

echo "UI Guard: pass"
exit 0
