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
RUN_DIR="${ROOT}/${ARTIFACT_ROOT}"
RESUME_TOKEN_PATH="${RUN_DIR}/.resume-token"

echo "Diagnostics run started."
echo "Run ID: ${RUN_ID}"
echo "Artifact root: ${ARTIFACT_ROOT}"
echo "Compatibility path: ${COMPAT_PATH}"
echo "Manifest: ${MANIFEST_PATH}"
echo

parse_status_payload() {
  local payload="${1:-}"
  node - "$payload" <<'NODE'
const input = process.argv[2] ?? '';
if (!input.trim()) {
  process.exit(1);
}
let data;
try {
  data = JSON.parse(input);
} catch (error) {
  console.error(error?.message ?? String(error));
  process.exit(1);
}
const heartbeat = data.heartbeat ?? {};
const fields = [
  data.status ?? '',
  data.status_detail ?? '',
  heartbeat.stale ? 'true' : 'false',
  String(heartbeat.age_seconds ?? ''),
];
console.log(fields.join('\n'));
NODE
}

monitor_heartbeat() {
  local poll_pid="${1:-}"
  while true; do
    local status_json
    if ! status_json="$(node "$RUNNER" poll "$RUN_ID" --format json 2>/dev/null)"; then
      sleep 5
      continue
    fi

    if [[ -z "${status_json//[[:space:]]/}" ]]; then
      sleep 5
      continue
    fi

    local parsed
    if ! parsed="$(parse_status_payload "$status_json")"; then
      sleep 5
      continue
    fi

    IFS=$'\n' read -r status status_detail heartbeat_stale heartbeat_age <<<"$parsed"

    if [[ "$status" == "succeeded" || "$status" == "failed" || "$status" == "cancelled" ]]; then
      break
    fi

    if [[ "$heartbeat_stale" == "true" ]]; then
      if [[ -n "$poll_pid" ]]; then
        kill "$poll_pid" 2>/dev/null || true
      fi
      echo
      echo "Warning: heartbeat stale for run ${RUN_ID} (age: ${heartbeat_age}s)."
      if [[ -z "${status_detail}" ]]; then
        status_detail="stale-heartbeat"
      fi
      echo "Status detail: ${status_detail}"
      if [[ -f "$RESUME_TOKEN_PATH" ]]; then
        local resume_token
        resume_token="$(tr -d '\r\n' < "$RESUME_TOKEN_PATH")"
        echo "Resume with: scripts/mcp-runner-start.sh --resume ${RUN_ID} --resume-token ${resume_token}"
      else
        echo "Resume with: scripts/mcp-runner-start.sh --resume ${RUN_ID}"
      fi
      echo "Heartbeat monitor exiting; investigate runner logs or resume the run."
      break
    fi

    sleep 10
  done
}

POLL_PID=""
MONITOR_PID=""

cleanup_background() {
  if [[ -n "${POLL_PID:-}" ]]; then
    kill "$POLL_PID" 2>/dev/null || true
  fi
  if [[ -n "${MONITOR_PID:-}" ]]; then
    kill "$MONITOR_PID" 2>/dev/null || true
  fi
}
trap cleanup_background EXIT

if [[ "$WATCH" == true ]]; then
  node "$RUNNER" poll "$RUN_ID" --watch --interval 10 &
  POLL_PID=$!
  monitor_heartbeat "$POLL_PID" &
  MONITOR_PID=$!
  wait "$POLL_PID" || true
  wait "$MONITOR_PID" 2>/dev/null || true
else
  echo "Use scripts/mcp-runner-poll.sh ${RUN_ID} to monitor progress."
  if status_json="$(node "$RUNNER" poll "$RUN_ID" --format json 2>/dev/null)"; then
    if [[ -z "${status_json//[[:space:]]/}" ]]; then
      exit 0
    fi
    parsed_status="$(parse_status_payload "$status_json")"
    IFS=$'\n' read -r status status_detail heartbeat_stale heartbeat_age <<<"$parsed_status"
    if [[ "$heartbeat_stale" == "true" && "$status" != "succeeded" && "$status" != "failed" && "$status" != "cancelled" ]]; then
      echo "Warning: heartbeat stale for run ${RUN_ID} (age: ${heartbeat_age}s)."
      if [[ -f "$RESUME_TOKEN_PATH" ]]; then
        resume_token="$(tr -d '\r\n' < "$RESUME_TOKEN_PATH")"
        echo "Resume with: scripts/mcp-runner-start.sh --resume ${RUN_ID} --resume-token ${resume_token}"
      else
        echo "Resume with: scripts/mcp-runner-start.sh --resume ${RUN_ID}"
      fi
    fi
  fi
fi
