#!/usr/bin/env bash
# Spillwave UI Guard — pre-commit check
# Soft enforcement: warns (and can be made hard) when UI-related files change
# without a corresponding wireframe update.

set -euo pipefail

UI_PATTERNS='((^|/)(src|web|app)/.*\.(tsx?|jsx?|css|scss)$|(^|/)(components|pages|views)/)'
WIREFRAME_DIR="wireframes"

STAGED=$(git diff --cached --name-only --diff-filter=ACM || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

UI_CHANGED=$(echo "$STAGED" | grep -E "$UI_PATTERNS" || true)
WIREFRAME_CHANGED=$(echo "$STAGED" | grep -E "^${WIREFRAME_DIR}/" || true)

if [ -n "$UI_CHANGED" ] && [ -z "$WIREFRAME_CHANGED" ]; then
  echo ""
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  Spillwave UI Guard — reminder                             ║"
  echo "╠════════════════════════════════════════════════════════════╣"
  echo "║  UI source files are staged, but no wireframe changes.     ║"
  echo "║  For non-trivial UI work, update wireframes/ first and     ║"
  echo "║  run the adversarial reviewer before committing.           ║"
  echo "║                                                            ║"
  echo "║  To bypass this warning intentionally:                     ║"
  echo "║    SKIP_UI_GUARD=1 git commit ...                          ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""

  if [ "${UI_GUARD_STRICT:-0}" = "1" ] && [ -z "${SKIP_UI_GUARD:-}" ]; then
    echo "UI_GUARD_STRICT=1 is set — blocking commit."
    exit 1
  fi
fi

exit 0
