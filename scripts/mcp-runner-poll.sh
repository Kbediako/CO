#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/mcp-runner-poll.sh <run-id> [--watch] [--interval N] [--format text|json]" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT}/scripts/lib/orchestrator-cli.sh"
CLI="$(resolve_orchestrator_cli "$ROOT")"

node "$CLI" status "$@"
