#!/usr/bin/env bash
set -euo pipefail

REPO_DEFAULT="$HOME/Code/codex"
REPO=""
PUSH=1
FORCE_REBUILD=0

usage() {
  cat <<'USAGE'
Usage: scripts/codex-cli-refresh.sh [--repo <path>] [--no-push] [--force-rebuild]

Sync upstream Codex, optionally push the fork, and rebuild the CO-managed Codex CLI.

Options:
  --repo <path>      Path to codex repo (default: $CODEX_REPO, $CODEX_CLI_SOURCE, or ~/Code/codex)
  --no-push          Do not push updates to origin/main
  --force-rebuild    Rebuild codex CLI even if no new upstream commits
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"
      shift 2
      ;;
    --no-push)
      PUSH=0
      shift
      ;;
    --force-rebuild)
      FORCE_REBUILD=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
 done

if [[ -z "$REPO" ]]; then
  if [[ -n "${CODEX_REPO:-}" ]]; then
    REPO="$CODEX_REPO"
  elif [[ -n "${CODEX_CLI_SOURCE:-}" ]]; then
    REPO="$CODEX_CLI_SOURCE"
  else
    REPO="$REPO_DEFAULT"
  fi
fi

if [[ ! -d "$REPO/.git" ]]; then
  echo "Codex repo not found at $REPO" >&2
  exit 1
fi

cd "$REPO"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  git checkout main
fi

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "Missing upstream remote; add it with: git remote add upstream <url>" >&2
  exit 1
fi

BEFORE=$(git rev-parse HEAD)

echo "[codex-cli-refresh] Fetching upstream..."
git fetch upstream --prune

echo "[codex-cli-refresh] Fast-forwarding to upstream/main..."
if ! git merge --ff-only upstream/main; then
  echo "Failed to fast-forward. Resolve manually." >&2
  exit 1
fi

AFTER=$(git rev-parse HEAD)

if [[ "$BEFORE" == "$AFTER" ]]; then
  echo "[codex-cli-refresh] No upstream changes."
else
  echo "[codex-cli-refresh] Updated: $BEFORE -> $AFTER"
fi

if [[ "$PUSH" -eq 1 ]]; then
  if git remote get-url origin >/dev/null 2>&1; then
    AHEAD=$(git rev-list --left-right --count origin/main...HEAD | awk '{print $2}')
    if [[ "$AHEAD" -gt 0 ]]; then
      echo "[codex-cli-refresh] Pushing to origin/main..."
      git push origin main
    else
      echo "[codex-cli-refresh] Fork is already up to date."
    fi
  else
    echo "[codex-cli-refresh] origin remote missing; skipping push."
  fi
fi

if [[ "$BEFORE" == "$AFTER" && "$FORCE_REBUILD" -eq 0 ]]; then
  echo "[codex-cli-refresh] Skipping rebuild (no new upstream commits)."
  exit 0
fi

echo "[codex-cli-refresh] Rebuilding CO-managed codex CLI..."
if command -v codex-orchestrator >/dev/null 2>&1; then
  codex-orchestrator codex setup --source "$REPO" --yes --force
else
  SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
  REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
  FALLBACK="$REPO_ROOT/dist/bin/codex-orchestrator.js"
  if [[ -x "$FALLBACK" ]]; then
    node "$FALLBACK" codex setup --source "$REPO" --yes --force
  else
    echo "codex-orchestrator not found on PATH and fallback binary missing." >&2
    exit 1
  fi
fi

CONFIG="$HOME/.codex/orchestrator/codex-cli/codex-cli.json"
if [[ -f "$CONFIG" ]]; then
  echo "[codex-cli-refresh] Updated config: $CONFIG"
fi
