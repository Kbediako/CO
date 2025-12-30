#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT}/scripts/lib/orchestrator-cli.sh"
CLI="$(resolve_orchestrator_cli "$ROOT")"

if [[ "${1:-}" == "--resume" ]]; then
  shift
  RUN_ID="${1:-}"
  if [[ -z "$RUN_ID" ]]; then
    echo "Usage: scripts/mcp-runner-start.sh --resume <run-id> [options]" >&2
    exit 2
  fi
  shift || true
  node "$CLI" resume --run "$RUN_ID" "$@"
else
  node "$CLI" start "$@"
fi
