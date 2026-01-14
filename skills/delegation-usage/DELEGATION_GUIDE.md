# Delegation Guide (Detailed)

Use this guide for deeper context on delegation behavior, tool surfaces, and troubleshooting.

## Mental model

- The delegation MCP server is a local stdio process (`codex-orchestrator delegate-server`; `delegation-server` is an alias).
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
- `codex exec` does **not** create `.runs/<task>/cli/<run>/manifest.json` on its own. If the child must call `delegate.question.*` or `delegate.status/pause/cancel`, pass a real manifest path (e.g., run `codex-orch start diagnostics --format json --task <task-id>` and reuse the manifest path; or `export MCP_RUNNER_TASK_ID=<task-id>` if you prefer env vars).

## Runner + task id (short form)

Prefer a direct task flag instead of an exported env var:

```
codex-orch start diagnostics --format json --task <task-id>
```

This produces `.runs/<task-id>/cli/<run-id>/manifest.json`, which you can reuse as `parent_manifest_path` for question queue calls.

## Minimal tool surface

- Use `delegate.mode=question_only` by default.
- Switch to `full` only when the child needs `delegate.spawn/pause/cancel` (nested delegation or run control).
- Keep `delegate.tool_profile` minimal; it must intersect the repo’s `delegate.allowed_tool_servers`.
- `github.*` tools are controlled by repo GitHub allowlists, not by `delegate.mode` or `delegate.tool_profile`.

## Delegate.spawn missing (most common pitfall)

`delegate.spawn` is exposed by the **delegation server** when its `delegate.mode` is `full`. If the MCP server was registered without that override, `codex exec -c 'delegate.mode=full'` will not reliably add `delegate.spawn`.

Fix by re-registering the server with a TOML-quoted override:

```
codex mcp remove delegation
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=delegate.mode="full"' \
  -- codex-orchestrator delegate-server --repo /path/to/repo
```

## Server mode vs child mode (don’t mix them up)

- `delegate.mode` controls which **delegate tools** the server exposes.
- `delegate_mode` is an **input to `delegate.spawn`** that controls the child run’s delegate tool surface.

Example: enable spawn on the server, but keep the child in question-only mode.

```
delegate.spawn({
  "pipeline": "rlm",
  "repo": "/path/to/repo",
  "delegate_mode": "question_only"
})
```

## RLM budget overrides (recommended defaults)

If you want deeper recursion or longer wall-clock time for delegated runs, set RLM budgets on the delegation server:

```
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=rlm.max_subcall_depth=8;rlm.wall_clock_timeout_ms=14400000' \
  -- codex-orchestrator delegate-server --repo /path/to/repo
```

For the `rlm` pipeline specifically, use:
- `RLM_MAX_MINUTES=240` for a 4-hour cap.

## delegate.spawn start-only (default)

- `delegate.spawn` defaults to `start_only=true` (requires `task_id`).
- The server spawns the child detached and polls for a new manifest under `.runs/<task-id>/cli/*/manifest.json`.
- It returns `{ run_id, manifest_path, events_path, log_path }` once the manifest is detected.
- Use `start_only=false` for legacy synchronous behavior (waits for child exit) and beware tool-call timeouts.

## Repo-scoped config

If you need delegation to respect a repo’s `.codex/orchestrator.toml` (e.g., sandbox.network caps), pass `--repo <path>` to the MCP server registration or MCP args.

## Version guard (JSONL handshake)

Delegation MCP expects JSONL. Use `codex-orchestrator >= 0.1.8`.

- Check: `codex-orchestrator --version`
- Update global: `npm i -g @kbediako/codex-orchestrator@0.1.8`
- Or pin via npx: `npx -y @kbediako/codex-orchestrator@0.1.8 delegate-server`

## Common failures

- **Handshake failed / connection closed**: Usually an older binary (0.1.5) or framed responses.
- **Unknown tool**: The delegation server only exposes `delegate.*` (and `github.*` if enabled).
- **Tool profile ignored**: The repo’s `delegate.allowed_tool_servers` may be empty, or names are invalid.
- **Missing control files**: delegate tools rely on `control_endpoint.json` in the run directory.
- **Run identifiers**: status/pause/cancel require `manifest_path`; question queue requires `parent_manifest_path`.
