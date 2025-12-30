#!/usr/bin/env bash

resolve_orchestrator_cli() {
  local root="${1:-}"
  if [[ -z "$root" ]]; then
    root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  fi

  local cli="${root}/node_modules/.bin/codex-orchestrator"
  if [[ ! -x "$cli" ]]; then
    cli="${root}/dist/bin/codex-orchestrator.js"
  fi

  echo "$cli"
}
