#!/usr/bin/env bash
set -euo pipefail

show_help() {
  cat <<'HELP'
Usage: scripts/run-mcp-diagnostics.sh [options]

Launches the Agents SDK-based MCP diagnostics runner, which executes the
standard build/lint/test/spec-guard sequence via Codex with an extended timeout.

Options:
  --approval-policy VALUE   Override the Codex approval policy (default: never)
  --timeout SECONDS         Override MCP client session timeout (default: 3600)
  --no-watch                Do not tail progress; print the run id and exit
  -h, --help                Show this message
HELP
}

APPROVAL_POLICY="never"
TIMEOUT="3600"
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
    --timeout)
      shift
      TIMEOUT="${1:-}"
      if [[ -z "$TIMEOUT" ]]; then
        echo "Error: --timeout requires a numeric value." >&2
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
RUNNER="${ROOT}/scripts/agents_mcp_runner.mjs"

if [[ ! -x "$RUNNER" ]]; then
  echo "Error: agents MCP runner not found at ${RUNNER}" >&2
  exit 1
fi

START_OUTPUT="$(node "$RUNNER" start --approval-policy "${APPROVAL_POLICY}" --timeout "${TIMEOUT}" --format json)"

if [[ -z "$START_OUTPUT" ]]; then
  echo "Failed to start diagnostics runner." >&2
  exit 1
fi

RUN_ID="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.run_id);' "$START_OUTPUT")"
MANIFEST_PATH="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.manifest);' "$START_OUTPUT")"
ARTIFACT_ROOT="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.artifact_root);' "$START_OUTPUT")"
COMPAT_PATH="$(node -e 'const data = JSON.parse(process.argv[1]); console.log(data.compat_path);' "$START_OUTPUT")"

echo "Diagnostics run started."
echo "Run ID: ${RUN_ID}"
echo "Artifact root: ${ARTIFACT_ROOT}"
echo "Compatibility path: ${COMPAT_PATH}"
echo "Manifest: ${MANIFEST_PATH}"
echo

if [[ "$WATCH" == true ]]; then
  node "$RUNNER" poll "$RUN_ID" --watch --interval 10
else
  echo "Use scripts/mcp-runner-poll.sh ${RUN_ID} to monitor progress."
fi
