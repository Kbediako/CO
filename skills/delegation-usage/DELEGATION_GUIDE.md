# Delegation Guide (Detailed)

Use this guide for deeper context on delegation behavior, tool surfaces, and troubleshooting.

## Mental model

- The delegation MCP server is a local stdio process (`codex-orchestrator delegation-server`).
- It does **not** provide general tools itself; it only exposes `delegate.*` + optional `github.*` tools.
- Child runs get tools based on `delegate.mode` + `delegate.tool_profile` + repo caps.

## Background-run pattern (preferred)

When delegation is disabled in the current session, spawn a background run:

```
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Notes:
- `codex exec` is non-interactive; progress goes to stderr, final message to stdout.
- Add `-c 'features.skills=false'` for minimal background runs.
- Use `-o /path/to/output.txt` if you want the final summary captured in a file.
- If the run needs `delegate.spawn/pause/cancel`, add `-c 'delegate.mode=full'`.
- If it only needs `delegate.question.*` (and optional `delegate.status`), add `-c 'delegate.mode=question_only'`.
- Non-interactive runs can still require approvals; resolve them via the UI/TUI and the run will resume.

## Minimal tool surface

- Use `delegate.mode=question_only` by default.
- Switch to `full` only when the child needs `delegate.spawn/pause/cancel` (nested delegation or run control).
- Keep `delegate.tool_profile` minimal; it must intersect the repo’s `delegate.allowed_tool_servers`.
- `github.*` tools are controlled by repo GitHub allowlists, not by `delegate.mode` or `delegate.tool_profile`.

## Repo-scoped config

If you need delegation to respect a repo’s `.codex/orchestrator.toml` (e.g., sandbox.network caps), pass `--repo <path>` to the MCP server registration or MCP args.

## Version guard (JSONL handshake)

Delegation MCP expects JSONL. Use `codex-orchestrator >= 0.1.8`.

- Check: `codex-orchestrator --version`
- Update global: `npm i -g @kbediako/codex-orchestrator@0.1.8`
- Or pin via npx: `npx -y @kbediako/codex-orchestrator@0.1.8 delegation-server`

## Common failures

- **Handshake failed / connection closed**: Usually an older binary (0.1.5) or framed responses.
- **Unknown tool**: The delegation server only exposes `delegate.*` (and `github.*` if enabled).
- **Tool profile ignored**: The repo’s `delegate.allowed_tool_servers` may be empty, or names are invalid.
- **Missing control files**: delegate tools rely on `control_endpoint.json` in the run directory.
- **Run identifiers**: status/pause/cancel require `manifest_path`; question queue requires `parent_manifest_path`.
