#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/agents_mcp_runner.mjs"

if [[ ! -x "$SCRIPT" ]]; then
  echo "Error: ${SCRIPT} not found or not executable." >&2
  exit 1
fi

node "$SCRIPT" start "$@"
