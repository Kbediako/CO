#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'HELP'
Usage: scripts/run-mcp-diagnostics.sh [--config PATH]

Runs the standard build/lint/test/spec-guard commands through the local MCP
harness in sequence. Each command is executed via `npx @wong2/mcp-cli` with a
non-interactive `call-tool` request so manifests are captured automatically.

Options:
  --config PATH  Override the MCP client config path (default: ./mcp-client.json)
  -h, --help     Show this help message
HELP
}

CONFIG="./mcp-client.json"

while (($#)); do
  case "$1" in
    --config)
      shift
      CONFIG="${1:-}"
      if [[ -z "$CONFIG" ]]; then
        echo "Error: --config requires a path" >&2
        exit 2
      fi
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift || true
done

COMMANDS=(
  "npm run build"
  "npm run lint"
  "npm run test"
  "bash scripts/spec-guard.sh --dry-run"
)

for cmd in "${COMMANDS[@]}"; do
  echo "=== Running via MCP: $cmd" >&2
  payload=$(printf '{"approval_policy":"never","prompt":"Immediately run the exact shell command: %s. Do not read or modify any files, do not list directories, and do not plan additional steps. Execute the command once using the run tool, stream output until it finishes, then reply with the exit status and the manifest/log paths recorded. If the command fails, report the failure reason. Respond only after the command completes."}' "$cmd")
  npx --yes @wong2/mcp-cli --config "$CONFIG" \
    call-tool codex-local:codex --args "$payload"
done

echo "=== Diagnostics complete. Check the latest .runs/local-mcp/<timestamp>/manifest.json for results." >&2
