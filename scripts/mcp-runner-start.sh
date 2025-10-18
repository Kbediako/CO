#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/agents_mcp_runner.mjs"

if [[ ! -x "$SCRIPT" ]]; then
  echo "Error: ${SCRIPT} not found or not executable." >&2
  exit 1
fi

if [[ "${1:-}" == "--resume" ]]; then
  shift
  RUN_ID="${1:-}"
  if [[ -z "$RUN_ID" ]]; then
    echo "Usage: scripts/mcp-runner-start.sh --resume <run-id> [options]" >&2
    exit 2
  fi
  shift || true
  node "$SCRIPT" resume --run-id "$RUN_ID" "$@"
else
  node "$SCRIPT" start "$@"
fi
