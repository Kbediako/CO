#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/run-local-mcp.sh [--repo PATH] [--no-log] [--dry-run] [--help] [-- CMD...]

Spawns a Codex MCP server pinned to this repository so agents can perform deterministic
edits and runs. By default the script records a run manifest stub under
.runs/local-mcp/<timestamp>/ and then execs `codex mcp-server`.

Options:
  --repo PATH   Explicit repository root (defaults to current git top-level)
  --no-log      Skip creating .runs/local-mcp artifacts; stream output to stdout only
  --dry-run     Verify prerequisites (codex CLI, repo path) without starting the server
  --help        Show this message

Arguments following a lone `--` are passed straight to `codex mcp-server`.
EOF
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
log_enabled=true
dry_run=false
extra_args=()

while (($#)); do
  case "$1" in
    --repo)
      shift
      repo_root="${1:-}"
      if [[ -z "$repo_root" ]]; then
        echo "Error: --repo requires a path." >&2
        exit 2
      fi
      ;;
    --no-log)
      log_enabled=false
      ;;
    --dry-run)
      dry_run=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      extra_args=("$@")
      break
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift || true
done

if ! command -v codex >/dev/null 2>&1; then
  echo "Error: codex CLI not found in PATH. Install the Codex CLI before running the MCP server." >&2
  exit 2
fi

if [[ ! -d "$repo_root" ]]; then
  echo "Error: repository root '$repo_root' does not exist." >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  log_enabled=false
  jq_missing=true
else
  jq_missing=false
fi

if [[ "$dry_run" == true ]]; then
  echo "codex CLI available: $(command -v codex)"
  echo "Repository root: $repo_root"
  if [[ "$jq_missing" == true ]]; then
    echo "Note: jq not found; run artifacts will be disabled." >&2
  fi
  exit 0
fi

timestamp="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
run_dir="${repo_root%/}/.runs/local-mcp/${timestamp}"

if [[ "$log_enabled" == true ]]; then
  mkdir -p "$run_dir"
  if [[ "$jq_missing" == true ]]; then
    echo "Warning: jq not available; skipping manifest generation." >&2
    log_enabled=false
  else
    jq -n --arg mode "mcp" --arg started "$timestamp" --arg repo "$repo_root" \
      --arg command "codex mcp-server" \
      '{mode: $mode, started_at: $started, repo: $repo, command: $command}' \
      >"${run_dir}/manifest.json" || {
        echo "Warning: failed to write manifest; continuing without run artifact." >&2
        log_enabled=false
      }
  fi
fi

cmd=(codex mcp-server --root "$repo_root")
if [[ ${#extra_args[@]} -gt 0 ]]; then
  cmd+=("${extra_args[@]}")
fi

if [[ "$log_enabled" == true ]]; then
  log_file="${run_dir}/mcp-server.log"
  echo "Launching Codex MCP server (logs: ${log_file})..."
  {
    set +e
    "${cmd[@]}" |& tee "$log_file"
    exit_code=${PIPESTATUS[0]}
    set -e
  }

  if [[ "$jq_missing" == false ]]; then
    jq -n --arg mode "mcp" \
        --arg started "$timestamp" \
        --arg ended "$(date -u +"%Y-%m-%dT%H-%M-%SZ")" \
        --arg status "${exit_code:-0}" \
        '{mode: $mode, started_at: $started, finished_at: $ended, exit_code: ($status|tonumber)}' \
        >"${run_dir}/result.json" || true
  fi

  exit "${exit_code:-0}"
else
  echo "Launching Codex MCP server..."
  exec "${cmd[@]}"
fi
