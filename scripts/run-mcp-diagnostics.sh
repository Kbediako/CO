#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'HELP'
Usage: scripts/run-mcp-diagnostics.sh [options]

Launches the Codex Orchestrator CLI diagnostics pipeline, executing the
standard build/lint/test/spec-guard sequence locally.

Options:
  --approval-policy VALUE   Override the Codex approval policy (default: never)
  --no-watch                Do not tail progress; print the run id and exit
  -h, --help                Show this message
HELP
}

APPROVAL_POLICY="never"
WATCH=true

while (($#)); do
  case "$1" in
    --approval-policy)
      shift
      APPROVAL_POLICY="${1:-}"
      if [[ -z "$APPROVAL_POLICY" ]]; then
        echo "Error: --approval-policy requires a value." >&2
        exit 2
      fi
      ;;
    --no-watch)
      WATCH=false
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help >&2
      exit 2
      ;;
  esac
  shift || true
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="${ROOT}/node_modules/.bin/codex-orchestrator"

if [[ ! -x "$CLI" ]]; then
  CLI="${ROOT}/dist/bin/codex-orchestrator.js"
fi

START_ARGS=(start diagnostics "--approval-policy" "$APPROVAL_POLICY" --format json)
START_OUTPUT="$(node "$CLI" "${START_ARGS[@]}")"

if [[ -z "$START_OUTPUT" ]]; then
  echo "Failed to start diagnostics run." >&2
  exit 1
fi

RUN_ID="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.run_id);' "$START_OUTPUT")"
MANIFEST_PATH="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.manifest);' "$START_OUTPUT")"
ARTIFACT_ROOT="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.artifact_root);' "$START_OUTPUT")"

echo "Diagnostics run started."
echo "Run ID: ${RUN_ID}"
echo "Artifact root: ${ARTIFACT_ROOT}"
echo "Manifest: ${MANIFEST_PATH}"
echo

if [[ "$WATCH" == true ]]; then
  node "$CLI" status --run "$RUN_ID" --watch --interval 10
else
  echo "Use scripts/mcp-runner-poll.sh ${RUN_ID} to monitor progress."
fi
