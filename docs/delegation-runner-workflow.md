# Delegation + Runner Workflow

Use this workflow with delegation MCP enabled by default (the only MCP on by default). Disable it only when required by safety constraints. If older PRDs mention “disabled by default,” treat this guide and `AGENTS.md` as the current policy. Collab multi-agent mode is separate from delegation; for symbolic RLM subcalls that use collab tools, set `RLM_SYMBOLIC_COLLAB=1` and ensure a collab-capable Codex CLI. Collab tool calls are recorded in `manifest.collab_tool_calls`.

Symbolic RLM runs now enable auto-deliberation by default for context management. Tune with:
- `RLM_SYMBOLIC_DELIBERATION=1` (default)
- `RLM_SYMBOLIC_DELIBERATION_INTERVAL=2`
- `RLM_SYMBOLIC_DELIBERATION_MAX_RUNS=12`
- `RLM_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES=2048`
- `RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER=1`

## 0) Register the delegation server once (required)

You must register the delegation MCP server once so delegate tools are available:

```bash
codex mcp add delegation -- codex-orchestrator delegate-server --repo /path/to/repo
```

If you skip this, `delegate.*` tools will not be available even if the MCP is enabled.

### 0a) Enable delegate.spawn (server mode)

`delegate.spawn` is only exposed when the delegation server is registered in **full** mode. Re-register with a TOML-quoted override:

```bash
codex mcp remove delegation
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=delegate.mode="full"' \
  -- codex-orchestrator delegate-server --repo /path/to/repo
```

### 0b) Optional: raise RLM depth/time budgets

For deeper recursion and longer wall-clock budgets on delegated runs, register with RLM overrides:

```bash
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=rlm.max_subcall_depth=8;rlm.wall_clock_timeout_ms=14400000' \
  -- codex-orchestrator delegate-server --repo /path/to/repo
```

For the `rlm` pipeline specifically, set `RLM_MAX_MINUTES=240` (4 hours).

### 0c) delegate.spawn start-only (default)

- `delegate.spawn` defaults to `start_only=true` (requires `task_id`).
- The server spawns the child detached and polls for a new manifest under `.runs/<task-id>/cli/*/manifest.json`.
- It returns `{ run_id, manifest_path, events_path, log_path }` as soon as the manifest is detected.
- Use `start_only=false` for legacy synchronous behavior (waits for child exit) and beware tool-call timeouts.
- Adjust the spawn-start timeout with `CODEX_DELEGATION_SPAWN_START_TIMEOUT_MS` if needed.

## 1) Start a runner with a task id (short path)

Use the `--task` flag instead of exporting an env var:

```bash
codex-orch start diagnostics --format json --task <task-id>
```

This creates a run manifest under `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Use it as `parent_manifest_path` for `delegate.question.*`.
- Use it as `manifest_path` for `delegate.status/pause/cancel`.
- Child stage commands now inherit `MCP_RUNNER_TASK_ID=<manifest.task_id>` automatically, so `node scripts/delegation-guard.mjs` evaluates the delegated task stream correctly without extra env wiring.

If you plan to run multiple commands in the same task, you can still set the env var once:

```bash
export MCP_RUNNER_TASK_ID=<task-id>
```

### 1a) Guard profile for task-less runs

The built-in delegation-guard stage now runs through a package utility (`delegationGuardRunner`) that supports profile-based behavior:

- `strict`: enforce delegation guard requirements exactly (missing task id fails).
- `warn`: bypass delegation evidence checks when `MCP_RUNNER_TASK_ID` is missing.
- `auto` (default): strict for CO-style repos (`AGENTS.md` + `tasks/index.json` + `docs/TASKS.md`), warn otherwise.

Override per run when needed:

```bash
CODEX_ORCHESTRATOR_GUARD_PROFILE=warn codex-orch start diagnostics --format json
```

## 2) Background run when delegation tools are missing

When delegation tools are missing in the current session (MCP disabled), use a background run:

```bash
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Notes:
- `codex exec` does **not** create a manifest. If the child needs `delegate.question.*` or `delegate.status/pause/cancel`, pass a real manifest path (next step).
- Setting `MCP_RUNNER_TASK_ID` does not cause `codex exec` to emit `.runs/**` manifests; use a `codex-orchestrator start <pipeline> --task <id>` run when evidence is required.
- Add `-c 'features.skills=false'` for a minimal, deterministic background run.

### 2a) Pre-task triage (no task id yet)

When you need a fast answer before a task id exists, use a lightweight exec run and copy the summary into the spec once it’s created:

```bash
codex exec \
  -c 'mcp_servers.<your-mcp>.enabled=true' \
  "Answer the question and cite the relevant docs section names."
```

If a task id already exists, prefer delegation so the run is tied to a manifest. Use `codex exec` only when delegation is unavailable.

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

- Delegation MCP stays enabled by default (only MCP on by default); disable only when necessary.
- Prefer `--task <id>` over `export MCP_RUNNER_TASK_ID=...` for a human-friendly, agent-first workflow.
- Use `codex exec` only for pre-task triage (no task id yet) or when delegation is unavailable.
- Pass the manifest path whenever you need `delegate.question.*` or run control APIs.
- `delegate.status` enforcement: active runs still require a valid `control_endpoint.json`; terminal runs (`succeeded`/`failed`/`cancelled`) can be read from manifest state even when control endpoint files are gone.
