#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/mcp-runner-poll.sh <run-id> [--watch] [--interval N]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${ROOT}/scripts/agents_mcp_runner.mjs"

node "$SCRIPT" poll "$@"
