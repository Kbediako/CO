# Delegation + Runner Workflow

Use this workflow to keep delegation MCP off by default while still enabling short, reliable delegated runs with clear manifests.

## 0) Register the delegation server once (required)

You must register the delegation MCP server once before per-run enabling works:

```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
```

If you skip this, `-c 'mcp_servers.delegation.enabled=true'` will not activate tools.

## 1) Start a runner with a task id (short path)

Use the `--task` flag instead of exporting an env var:

```bash
codex-orch start diagnostics --format json --task <task-id>
```

This creates a run manifest under `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Use it as `parent_manifest_path` for `delegate.question.*`.
- Use it as `manifest_path` for `delegate.status/pause/cancel`.

If you plan to run multiple commands in the same task, you can still set the env var once:

```bash
export MCP_RUNNER_TASK_ID=<task-id>
```

## 2) Delegate only when needed (background run)

When delegation is required and MCP is off in the current session, use a background run:

```bash
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Notes:
- `codex exec` does **not** create a manifest. If the child needs `delegate.question.*` or `delegate.status/pause/cancel`, pass a real manifest path (next step).
- Add `-c 'features.skills=false'` for a minimal, deterministic background run.

## 3) Wire parent/child manifest paths (questions + status)

You must provide the *literal* parent manifest path to the delegated run (the model will not read shell env vars on its own):

```bash
codex exec -c 'mcp_servers.delegation.enabled=true' \
  "Use parent_manifest_path=.runs/<task-id>/cli/<run-id>/manifest.json when calling delegate.question.*. Use manifest_path=.runs/<task-id>/cli/<run-id>/manifest.json when calling delegate.status/pause/cancel."
```

You can still store the path in a shell variable for your own convenience, but pass the literal value in the prompt or tool parameters.

## 4) Optional: repo-scoped config for delegation server

If you registered without `--repo` and want delegation to respect repo config (network caps, tool allowlists, etc.), re-register with `--repo`:

```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
```

## 5) Summary

- Prefer `--task <id>` over `export MCP_RUNNER_TASK_ID=...` for a human-friendly, agent-first workflow.
- Use `codex exec` for delegation only when needed.
- Pass the manifest path whenever you need `delegate.question.*` or run control APIs.
