#!/usr/bin/env bash
set -euo pipefail

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

if $needs_spec && ! $spec_touched; then
echo "❌ Spec guard: code/migrations changed but no spec updated under tasks/specs or tasks/index.json."
echo "Hint: create/update a mini-spec using .agent/task/templates/mini-spec-template.md"
exit 1
fi

echo "✅ Spec guard: OK"
