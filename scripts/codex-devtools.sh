#!/usr/bin/env bash
set -euo pipefail

exec codex -c 'mcp_servers.chrome-devtools.enabled=true' "$@"
