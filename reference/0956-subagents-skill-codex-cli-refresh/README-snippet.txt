   One-shot (templates + CO-managed Codex CLI):
   ```bash
   codex-orchestrator init codex --codex-cli --yes
   ```
2. Register the delegation MCP server (one-time per machine):
   ```bash
   codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
   ```
3. Optional (collab JSONL parity): set up a CO-managed Codex CLI:
   ```bash
   codex-orchestrator codex setup
   ```
4. Optional (fast refresh helper for downstream users):
   ```bash
   scripts/codex-cli-refresh.sh --repo /path/to/codex
   ```
   Repo-only helper (not included in npm package). Set `CODEX_REPO` or `CODEX_CLI_SOURCE` to avoid passing `--repo` each time.

## Delegation MCP server

Run the delegation MCP server over stdio:
```bash
codex-orchestrator delegate-server --repo /path/to/repo
```
Optional: add `--mode question_only` to disable `delegate.spawn/pause/cancel`, keeping only `delegate.question.*` + `delegate.status` in the delegate namespace. GitHub tools remain available when GitHub integration is enabled.

Register it with Codex once. Delegation MCP is enabled by default (the only MCP enabled by default). To override the default or re-enable after disabling:
```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
codex -c 'mcp_servers.delegation.enabled=true' ...
```
