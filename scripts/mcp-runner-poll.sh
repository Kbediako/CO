#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/mcp-runner-poll.sh <run-id> [--watch] [--interval N] [--format text|json]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="${ROOT}/node_modules/.bin/codex-orchestrator"

if [[ ! -x "$CLI" ]]; then
  CLI="${ROOT}/dist/bin/codex-orchestrator.js"
fi

node "$CLI" status "$@"
