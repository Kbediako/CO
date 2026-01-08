#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Expect the Oracle repo next to this repo by default, or override with ORACLE_ROOT.
ORACLE_ROOT="${ORACLE_ROOT:-$REPO_ROOT/../oracle}"
DIST="$ORACLE_ROOT/dist/bin/oracle-cli.js"

if [[ ! -f "$DIST" ]]; then
  echo "oracle-local.sh: missing built CLI at $DIST" >&2
  echo "Set ORACLE_ROOT to your oracle repo root or clone it next to this repo." >&2
  exit 1
fi

needs_build=false

# Rebuild if any source/config is newer than the built CLI.
if find "$ORACLE_ROOT/src" "$ORACLE_ROOT/bin" "$ORACLE_ROOT/scripts" \
  "$ORACLE_ROOT/package.json" "$ORACLE_ROOT/tsconfig.build.json" \
  -type f -newer "$DIST" -print -quit | grep -q .; then
  needs_build=true
fi

if [[ "$needs_build" == "true" ]]; then
  pnpm -C "$ORACLE_ROOT" build
fi

node "$DIST" "$@"
