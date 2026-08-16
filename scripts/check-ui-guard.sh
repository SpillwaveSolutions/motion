#!/usr/bin/env bash
# Spillwave UI Guard — CI / local check
#
# 1. Structure: a UI app must have real wireframes with Goal/Screen + Acceptance.
# 2. Diff: UI source changes must land with a matching wireframes/ update.
#
# Soft-skip: commit message or PR title contains [skip-ui-guard]
# Env:
#   UI_GUARD_BASE      (default: origin/main or origin/master)
#   UI_GUARD_STRICT    (default: 1)
#   UI_GUARD_PR_TITLE  (optional; set from the GitHub Actions PR title)

set -euo pipefail

WIREFRAME_DIR="wireframes"
STRICT="${UI_GUARD_STRICT:-1}"
UI_PATTERNS='((^|/)(src|web|app)/.*\.(tsx?|jsx?|css|scss)$|(^|/)(components|pages|views)/)'

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not a git repository"
  exit 0
}

fail() {
  echo ""
  echo "UI Guard FAIL: $*"
  echo "Create or update a wireframe under ${WIREFRAME_DIR}/ and re-run the adversarial reviewer."
  echo "To skip intentionally, include [skip-ui-guard] in the commit or PR title."
  if [ "$STRICT" = "1" ]; then
    exit 1
  fi
  echo "STRICT is off — warning only."
}

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  BASE="${UI_GUARD_BASE:-origin/main}"
elif git rev-parse --verify origin/master >/dev/null 2>&1; then
  BASE="${UI_GUARD_BASE:-origin/master}"
else
  BASE="${UI_GUARD_BASE:-HEAD~1}"
fi

skip_requested() {
  local msg
  msg="$(git log --format=%s "${BASE}..HEAD" 2>/dev/null || true)"
  if echo "${msg} ${UI_GUARD_PR_TITLE:-}" | grep -qi '\[skip-ui-guard\]'; then
    return 0
  fi
  return 1
}

if skip_requested; then
  echo "UI Guard: skipped via [skip-ui-guard]"
  exit 0
fi

# --- structure --------------------------------------------------------------

has_ui_source=0
if git ls-files | grep -E "$UI_PATTERNS" >/dev/null 2>&1; then
  has_ui_source=1
fi

if [ ! -d "$WIREFRAME_DIR" ]; then
  if [ "$has_ui_source" = "1" ]; then
    fail "UI source exists but ${WIREFRAME_DIR}/ is missing."
  fi
  echo "UI Guard: no UI app in this repo — pass"
  exit 0
fi

CONTRACTS=$(find "$WIREFRAME_DIR" -type f -name '*.md' \
  ! -name '_template.md' ! -name 'README.md' ! -name 'REVIEW.md' | sort || true)

if [ -z "$CONTRACTS" ]; then
  fail "${WIREFRAME_DIR}/ has no contract files (only template/README)."
fi

missing=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if ! grep -qiE '^#+[[:space:]]*(Goal|Screen)\b' "$f"; then
    echo "  missing Goal/Screen heading: $f"
    missing=1
  fi
  if ! grep -qiE 'Acceptance' "$f"; then
    echo "  missing Acceptance criteria: $f"
    missing=1
  fi
done <<EOF
$CONTRACTS
EOF

if [ "$missing" = "1" ]; then
  fail "One or more wireframes are missing required sections (Goal/Screen + Acceptance)."
fi

count=$(printf '%s\n' "$CONTRACTS" | grep -c . || true)
echo "UI Guard structure: ${count} contract file(s) OK"

# --- diff -------------------------------------------------------------------

CHANGED=$(git diff --name-only --diff-filter=ACM "${BASE}...HEAD" 2>/dev/null \
  || git diff --name-only --diff-filter=ACM "${BASE}" \
  || true)

if [ -z "$CHANGED" ]; then
  echo "UI Guard: no changed files vs ${BASE} — structure pass"
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

if [ -z "$WIREFRAME_CHANGED" ]; then
  fail "UI source changed without a ${WIREFRAME_DIR}/ update."
fi

echo "UI Guard: pass"
exit 0
