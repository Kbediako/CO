#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/spec-guard.sh [--dry-run]

Ensures that implementation changes adhere to Codex-Orchestrator spec guardrails.
Checks include:
  • Code/migration edits must accompany a spec update under tasks/specs or tasks/index.json
  • Mini-spec last_review dates must be ≤30 days old

Options:
  --dry-run   Report failures without exiting non-zero
  -h, --help  Show this help message
EOF
}

dry_run=false
while (($#)); do
  case "$1" in
    --dry-run)
      dry_run=true
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
  shift
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "Spec guard requires python3 for freshness checks." >&2
  exit 2
fi

BASE="${BASE_SHA:-origin/main}"
if ! git rev-parse --verify "$BASE" >/dev/null 2>&1; then
  BASE="$(git rev-list --max-parents=0 HEAD | tail -n1)"
fi

CHANGED="$(git diff --name-only "$BASE"...HEAD || true)"
if [ -z "$CHANGED" ]; then
  CHANGED="$(git diff --name-only HEAD~1..HEAD || true)"
fi

needs_spec=false
spec_touched=false

while IFS= read -r f; do
  [[ -z "${f:-}" ]] && continue
  case "$f" in
    src/*|app/*|server/*|migrations/*|db/migrations/*|prisma/migrations/*)
      needs_spec=true
      ;;
  esac
  case "$f" in
    tasks/specs/*|tasks/index.json)
      spec_touched=true
      ;;
  esac
done <<< "$CHANGED"

failures=()

if $needs_spec && ! $spec_touched; then
  failures+=("code/migrations changed but no spec updated under tasks/specs or tasks/index.json")
fi

spec_files=()
while IFS= read -r spec; do
  [[ -z "${spec:-}" ]] && continue
  spec_files+=("$spec")
done < <(find tasks/specs -maxdepth 1 -type f -name '*.md' -print 2>/dev/null | sort)

if ((${#spec_files[@]})); then
  stale_output="$(
    python3 - "${spec_files[@]}" <<'PY'
import sys
from datetime import datetime, timedelta

paths = sys.argv[1:]
today = datetime.utcnow().date()
messages = []

for path in paths:
    review = None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("last_review:"):
                    review = line.split(":", 1)[1].strip()
                    break
    except FileNotFoundError:
        messages.append(f"{path}: file missing during freshness check")
        continue

    if not review:
        messages.append(f"{path}: missing last_review field")
        continue

    try:
        review_date = datetime.strptime(review, "%Y-%m-%d").date()
    except ValueError:
        messages.append(f"{path}: invalid last_review date '{review}'")
        continue

    age_days = (today - review_date).days
    if age_days > 30:
        messages.append(f"{path}: last_review {review} is {age_days} days old (must be ≤30 days)")

if messages:
    print("\n".join(messages))
PY
  )"
  if [ -n "$stale_output" ]; then
    while IFS= read -r line; do
      [[ -z "${line:-}" ]] && continue
      failures+=("$line")
    done <<< "$stale_output"
  fi
fi

if ((${#failures[@]})); then
  echo "❌ Spec guard: issues detected"
  for msg in "${failures[@]}"; do
    echo " - $msg"
  done
  if $dry_run; then
    echo "Dry run: exiting successfully despite failures."
    exit 0
  fi
  exit 1
fi

echo "✅ Spec guard: OK"
