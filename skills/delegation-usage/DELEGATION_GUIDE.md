# Delegation Guide (Detailed)

Use this guide for deeper context on delegation behavior, tool surfaces, and troubleshooting.
`delegation-usage` is the canonical delegation workflow; `delegate-early` should be treated as a compatibility alias.

## Mental model

- The delegation MCP server is a local stdio process (`codex-orchestrator delegate-server`; `delegation-server` is an alias).
- It does **not** provide general tools itself; it only exposes `delegate.*` + optional `github.*` tools.
- Child runs get tools based on `delegate.mode` + `delegate.tool_profile` + repo caps.
- Delegation MCP stays enabled by default (only MCP on by default); disable it only when required by safety constraints.
- Multi-agent (collab tools) mode is separate from delegation; for symbolic RLM subcalls, set `RLM_SYMBOLIC_MULTI_AGENT=1` (legacy alias: `RLM_SYMBOLIC_COLLAB=1`) and ensure your Codex CLI has `features.multi_agent=true` (`collab` is a legacy alias/name in some keys). Collab tool calls are recorded in `manifest.collab_tool_calls`. If collab tools are unavailable in your CLI build, skip collab steps; delegation still works independently.

## Background-run pattern (preferred)

When delegation tools are missing in the current session (MCP disabled), spawn a background run:

```
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Notes:
- `codex exec` is non-interactive; progress goes to stderr, final message to stdout.
- Add `-c 'features.skills=false'` for minimal background runs.
- If the task needs external docs/APIs, enable only the relevant MCP server for your environment.
- Use `-o /path/to/output.txt` if you want the final summary captured in a file.
- If the run needs `delegate.spawn/pause/cancel`, add `-c 'delegate.mode=full'`.
- If it only needs `delegate.question.*` (and optional `delegate.status`), add `-c 'delegate.mode=question_only'`.
- Non-interactive runs can still require approvals; resolve them via the UI/TUI and the run will resume.
- `codex exec` does **not** create `.runs/<task>/cli/<run>/manifest.json` on its own. If the child must call `delegate.question.*` or `delegate.status/pause/cancel`, pass a real manifest path (e.g., run `codex-orch start diagnostics --format json --task <task-id>` and reuse the manifest path; or `export MCP_RUNNER_TASK_ID=<task-id>` if you prefer env vars).
- Setting `MCP_RUNNER_TASK_ID` does not make `codex exec` emit `.runs/**` manifests; use `codex-orchestrator start <pipeline> --task <id>` when manifest evidence is required.

## Pre-task triage (no task id yet)

If you need a fast answer before a task id exists, use `codex exec` directly and copy the summary into the spec once it’s created. Once a task id exists, prefer delegation so the work is tied to a manifest.

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

```bash
codex mcp remove delegation
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=delegate.mode="full"' \
  -- codex-orchestrator delegate-server
```

## Server mode vs child mode (don’t mix them up)

- `delegate.mode` controls which **delegate tools** the server exposes.
- `delegate_mode` is an **input to `delegate.spawn`** that controls the child run’s delegate tool surface.

Example: enable spawn on the server, but keep the child in question-only mode.

```json
delegate.spawn({
  "pipeline": "rlm",
  "repo": "/path/to/repo",
  "delegate_mode": "question_only"
})
```

## Multi-agent (collab tools) lifecycle hygiene (required)

When using collab tools (`spawn_agent` / `wait` / `close_agent`):

- Treat each spawned `agent_id` as a resource that must be closed.
- `spawn_agent` falls back to `default` when `agent_type` is omitted; always set `agent_type` explicitly.
- Prefix spawned prompts with `[agent_type:<role>]` on line one for auditable role routing.
- For every successful spawn, run `wait` then `close_agent` for the same id.
- Keep an `open_agent_ids` ledger and append each successful spawn id immediately.
- Remove ids from `open_agent_ids` only after successful `close_agent`.
- Run a final close-sweep before returning: close every id still in `open_agent_ids`, then clear it.
- On timeout/error paths, run the same close-sweep before reporting failure.
- If you see `agent thread limit reached`, stop spawning immediately, run close-sweep, retry once, and if still blocked continue in degraded mode (no further collab spawns).

## Playwright stream hygiene

- Run Playwright-heavy steps in a dedicated child stream; keep browser output out of parent chat.
- Prefer artifact-first reporting (paths/manifests/screenshots) and a short synthesis instead of raw logs.
- Keep lifecycle strict for browser streams too: `spawn_agent` -> `wait` -> `close_agent`.

## RLM budget overrides (recommended defaults)

If you want deeper recursion or longer wall-clock time for delegated runs, set RLM budgets on the delegation server:

```bash
codex mcp add delegation \
  --env 'CODEX_MCP_CONFIG_OVERRIDES=rlm.max_subcall_depth=8;rlm.wall_clock_timeout_ms=14400000' \
  -- codex-orchestrator delegate-server
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

Delegation MCP expects JSONL. Keep `codex-orchestrator` aligned with the current release line.

- Check: `codex-orchestrator --version`
- Update global: `npm i -g @kbediako/codex-orchestrator@latest`
- Or pin via npx: `npx -y @kbediako/codex-orchestrator@<version> delegate-server`
- Stock `codex` is the default path. If using a custom Codex fork, fast-forward from `upstream/main` regularly.
- CO repo checkout only (helper is not shipped in npm): `scripts/codex-cli-refresh.sh --repo /path/to/codex --align-only`
- CO repo checkout only (managed rebuild helper): `scripts/codex-cli-refresh.sh --repo /path/to/codex --force-rebuild`
- Managed routing is opt-in: `export CODEX_CLI_USE_MANAGED=1` (without this, stock/global `codex` remains active).
- Add `--no-push` only when you intentionally want local-only alignment without updating `origin/main`.
- npm-safe alternative (no repo helper): `codex-orchestrator codex setup --source /path/to/codex --yes --force`

## Agent role guard (recommended)

- Built-in agent roles are `default`, `explorer`, `worker`; `researcher` is user-defined.
- `spawn_agent` omission defaults to `default`; require explicit `agent_type` for every spawn.
- For symbolic collab runs, include a first-line role tag in spawned prompts: `[agent_type:<role>]`.
- Built-in `explorer` may map to an older model profile unless overridden in `~/.codex/config.toml`.
- Recommended baseline:
  - `model = "gpt-5.3-codex"`
  - `model_reasoning_effort = "xhigh"`
  - `[agents] max_threads = 8` (consider 12 only after stability checks)
  - Set `[agents.explorer]` with no `config_file` so explorer inherits top-level `gpt-5.3-codex`.
  - Add optional `[agents.explorer_fast]` for `gpt-5.3-codex-spark` (text-only caveat).
  - Add `[agents.worker_complex]` for high-risk edits (`gpt-5.3-codex`, `xhigh`).

## Common failures

- **Handshake failed / connection closed**: Usually an older binary (0.1.5) or framed responses.
- **Unknown tool**: The delegation server only exposes `delegate.*` (and `github.*` if enabled).
- **Tool profile ignored**: The repo’s `delegate.allowed_tool_servers` may be empty, or names are invalid.
- **Missing control files**: delegate tools rely on `control_endpoint.json` in the run directory.
- **Run identifiers**: status/pause/cancel require `manifest_path`; question queue requires `parent_manifest_path`.
- **Collab payload mismatch**: `spawn_agent` calls fail if they include both `message` and `items`.
- **Collab role routing drift**: if symbolic collab lifecycle validation reports missing/disallowed spawn roles, set explicit `agent_type` and add first-line `[agent_type:<role>]` tags.
- **Collab depth limits**: recursive collab fan-out can fail near max depth; prefer shallow parent fan-out.
- **Collab lifecycle leaks**: missing `close_agent` calls can exhaust thread slots and block future spawns (`agent thread limit reached`).
