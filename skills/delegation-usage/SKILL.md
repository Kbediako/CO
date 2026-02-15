---
name: delegation-usage
description: Use when operating the Codex delegation MCP server and tools (delegate.spawn, delegate.question.*, delegate.cancel, github.merge confirmation flow), or when configuring delegation mode/tool_profile with delegation MCP enabled by default.
---

# Delegation Usage

## Overview

Use this skill to operate delegation MCP tools with delegation enabled by default (the only MCP on by default). Disable it only when required by safety constraints, and keep other MCPs off unless they are relevant to the task.

`delegation-usage` is the canonical delegation workflow skill. If `delegate-early` is present, treat it as a compatibility alias that should redirect to this skill.

Collab multi-agent mode is separate from delegation. For symbolic RLM subcalls that use collab tools, set `RLM_SYMBOLIC_COLLAB=1` and ensure a collab-capable Codex CLI; collab tool calls are recorded in `manifest.collab_tool_calls`. If collab tools are unavailable in your CLI build, skip collab steps; delegation still works independently.

## Collab realities in delegated runs (current behavior)

- `spawn_agent` accepts one input style per call: either `message` (plain text) or `items` (structured input).
- Do not send both `message` and `items` in the same `spawn_agent` call.
- Spawn returns an `agent_id` (thread id). Current TUI collab rendering is id-based; do not depend on custom visible agent names.
- Subagents spawned through collab run with approval effectively set to `never`; design child tasks to avoid approval/escalation requirements.
- Collab spawn depth is bounded. Near/at max depth, recursive delegation can fail or collab can be disabled in children; prefer shallow parent fan-out.
- **Lifecycle is mandatory:** for every successful `spawn_agent`, run `wait` and then `close_agent` for that same id before task completion.
- Keep a local list of spawned ids and run a final cleanup pass so no agent id is left unclosed on timeout/error paths.
- If spawn fails with `agent thread limit reached`, stop spawning, close any known ids first, then surface a concise recovery note.

## Quick-start workflow (canned)

Use this when delegation tools are missing in the current run (MCP disabled) and you want a background Codex run to handle delegation:

```
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Optional (only if you need it):
- Add `--repo /path/to/repo` only when you want to pin the server to a repo even if Codex is launched outside that repo (default uses cwd).
- Add `-c 'features.skills=false'` for a minimal, deterministic background run.
- Add `-c 'delegate.mode=question_only'` when the child only needs `delegate.question.*` (and optional `delegate.status`).
- Add `-c 'delegate.mode=full'` when the child needs `delegate.spawn/pause/cancel` (nested delegation / run control).
- If the task needs external docs or APIs, enable only the relevant MCP server for that environment.
- If `delegate.spawn` is missing, re-register the MCP server with full mode (server config controls tool surface):
  - `codex mcp remove delegation`
  - `codex mcp add delegation --env 'CODEX_MCP_CONFIG_OVERRIDES=delegate.mode="full"' -- codex-orchestrator delegate-server`
- To raise RLM budgets for delegated runs, re-register with an override (TOML-quoted):
  - `codex mcp add delegation --env 'CODEX_MCP_CONFIG_OVERRIDES=rlm.max_subcall_depth=8;rlm.wall_clock_timeout_ms=14400000' -- codex-orchestrator delegate-server`

For deeper background patterns and troubleshooting, see `DELEGATION_GUIDE.md`.
For runner + delegation coordination (short `--task` flow), see `docs/delegation-runner-workflow.md`.

## Delegation‑first policy

- Default to delegation for top-level tasks and any non-trivial work.
- Delegate when the work spans >1 domain, touches more than ~2 files, needs verification/research, or is likely to run >10 minutes.
- Spawn one delegate per workstream with narrow scope and acceptance criteria.
- Keep delegation MCP enabled by default; enable other MCPs only when relevant to the task.
- Use `delegate.mode=question_only` unless the child truly needs full tool access.
- Ask delegates for short, structured summaries and to write details into files/artifacts instead of long chat dumps.
- Use `codex exec` only for pre-task triage (no task id yet) or when delegation is unavailable; copy outcomes into the spec once it exists.

## Workflow

### 0) One-time setup (register the MCP server)

- Register the delegation server once:
  - Preferred: `codex-orchestrator delegation setup --yes`
    - This wraps `codex mcp add delegation ...` and keeps wiring discoverable via `codex-orchestrator doctor`.
  - `codex mcp add delegation -- codex-orchestrator delegate-server`
  - Optional: append `--repo /path/to/repo` to pin the server to one repo (not recommended if you work across repos).
  - `delegate-server` is the canonical name; `delegation-server` is supported as an alias.
- Per-run `-c 'mcp_servers.delegation.enabled=true'` only works **after** registration.
- If `delegate.*` tools are missing mid-task, start a new run with:
  - `codex -c 'mcp_servers.delegation.enabled=true' ...`
  - Prefer using a background terminal (non-interactive) so you can continue without asking the user to relaunch.
- If delegation is unavailable and the user asked to delegate, **do not get stuck**:
  - Explain delegation is disabled or not registered in this run and give the enable command above.
  - Unless they explicitly want a delegation test, proceed locally using background tools (terminal commands or built-in tools) and deliver the result.

### 0a) Version guard (JSONL handshake)

- Delegation MCP uses JSONL; keep `codex-orchestrator` aligned with the current release line.
  - Check installed version: `codex-orchestrator --version`
  - Preferred update path: `npm i -g @kbediako/codex-orchestrator@latest`
  - Deterministic pin path (for reproducible environments): `npx -y @kbediako/codex-orchestrator@<version> delegate-server`
- Stock `codex` is the default path. If you use a custom Codex fork, fast-forward it regularly from `upstream/main`.
- CO repo checkout only (helper is not shipped in npm): `scripts/codex-cli-refresh.sh --repo /path/to/codex --align-only`
- CO repo checkout only (managed rebuild helper): `scripts/codex-cli-refresh.sh --repo /path/to/codex --force-rebuild`
- Add `--no-push` only when you intentionally want local-only alignment without updating `origin/main`.
- npm-safe alternative (no repo helper): `codex-orchestrator codex setup --source /path/to/codex --yes --force`

### 0b) Background terminal bootstrap (required when MCP is disabled)

When `delegate.*` is missing in the current session, immediately spawn a **background** Codex run with delegation enabled and hand it the narrow task. Use `codex exec` so it completes without interaction and you can capture output:

```
codex exec \
  -c mcp_servers.delegation.enabled=true \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Guidance for background runs:
- `codex exec` streams progress to `stderr` and prints the final message to `stdout`, so you can pipe or redirect safely.
- Use `--json` for JSONL events, or `-o <path>` to write the final message to a file while still printing to stdout.
- If you need a multi-step run, use `codex exec resume --last "<follow-up>"` to continue the same session.
- Non-interactive runs can still hit `confirmation_required`; approvals happen via the UI/TUI and the run resumes after approval.
- Use this only for non-manifest evidence; for manifest-required workflows, use `codex-orchestrator start ...`.
- `codex exec` does **not** create an orchestrator manifest. If the child must call `delegate.question.*` or `delegate.status/pause/cancel`, pass a real `.runs/<task>/cli/<run>/manifest.json` via `parent_manifest_path`/`manifest_path` (e.g., run `codex-orch start diagnostics --format json --task <task-id>` to get one; or use `export MCP_RUNNER_TASK_ID=<task-id>` if you prefer env vars).
- Setting `MCP_RUNNER_TASK_ID` does not cause `codex exec` to emit `.runs/**` manifests; use `codex-orchestrator start <pipeline> --task <id>` when manifest evidence is required.

### 1) Keep delegation enabled by default

- Set `mcp_servers.delegation.enabled = true` in `~/.codex/config.toml` (only MCP on by default).
- Disable delegation only when required by safety or environment constraints; re-enable per run with:
  - `codex -c 'mcp_servers.delegation.enabled=true' ...`
- Prefer `codex-orch start <pipeline> --format json --task <task-id>` over `export MCP_RUNNER_TASK_ID=...` for a shorter, explicit task id.

### 2) Spawn a delegate run (delegate.spawn)

- Use `delegate.spawn` when you want a child run with a reduced tool surface.
- Set `delegate.mode` explicitly: `question_only` or `full`.
  - `question_only`: only constrains the `delegate.*` namespace (question queue + optional status).
  - `full`: enables the full delegate tool surface, including nested delegation.
  - Use `full` only when the child needs `delegate.spawn/pause/cancel` (nested delegation or run control). Other tools (shell/web/filesystem/etc) are governed by `delegate.tool_profile` + repo allowlists and can be available in `question_only`.
  - Note: `github.*` registration is independent of `delegate.mode` and may still be available if repo-allowed.
- Set `delegate.tool_profile` separately to the minimum necessary tools.
  - Effective tool profile = intersection with repo `delegate.allowed_tool_servers`.
  - If the repo omits `delegate.allowed_tool_servers`, the cap defaults to `[]` and extra tools are ignored.
  - Names must match `^[A-Za-z0-9_-]+$`; invalid entries (e.g., `;`, `/`, `\n`, `=`) are ignored.
  - `github.*` tools are not gated by `delegate.tool_profile`; they are controlled by repo GitHub allowlists.
- If the child cannot access expected tools, recheck repo `delegate.allowed_tool_servers` (it may have changed).
- Keep `delegate.tool_profile` minimal; avoid networked tools unless required.
- Nested delegation is off by default; only use `full` when `delegate.allow_nested=true` and you intend recursion.
- **Important:** `delegate.mode` (server tool surface) is different from `delegate_mode` (input to `delegate.spawn` for the *child* run).
- **Note:** `delegate.spawn` defaults to `start_only=true` and returns once a new manifest is detected; set `start_only=false` for legacy synchronous behavior (waits for child exit), which is subject to tool-call timeouts.

#### Minimal-context delegate instruction template

```
Goal: <one sentence>
Scope: <files/areas to touch>
Allowed tools: <tool_profile list>
Constraints: <must/ must-not>
Output: <patch + short summary>
Evidence: write detailed notes to artifacts/<name>.md (no long logs in chat)
Acceptance: <3-5 bullets>
```

### 3) Ask the parent a question (delegate.question.enqueue / poll)

- Child calls `delegate.question.enqueue` to send an escalation to the parent run.
- The parent/human answers via the UI/approval channel.
- Child calls `delegate.question.poll` to fetch status/answer. `wait_ms` is capped to **10s** per call. If you need longer waits, loop with brief pauses:

```
repeat:
  poll(wait_ms=10000)
  if status in {answered, expired, dismissed}: stop
  sleep/backoff briefly (e.g., 250–500ms, with jitter)
```
- On `expired`, check `fallback_action` (from `delegate.question.expiry_fallback`) and follow it; default is pause.

### 4) Confirm‑to‑act behavior (delegate.cancel, github.merge)

- Do **not** supply `confirm_nonce`. The runner injects it after approval.
- If confirmation is required, you’ll receive `confirmation_required` and the run may pause.
- Confirmations are only retried on confirmation‑specific error codes; generic errors are surfaced directly.
- On `confirmation_required`, **do not** retry the action; wait for approval/resume. If it expires, re‑request with a fresh tool call.

### 5) Run identifiers (manifest paths)

- Stateful calls require `manifest_path` (delegate.status/pause/cancel) to locate the run.
- Question queue calls require `parent_manifest_path` for the same reason.

## Common pitfalls

- **Long waits:** `wait_ms` never blocks longer than 10s per call; use polling.
- **Long-running delegate.spawn:** Prefer `start_only=true` (default) to avoid tool-call timeouts. If you must use `start_only=false`, keep runs short or run long jobs outside delegation (no question queue).
- **Cloud run branch mismatch:** cloud-mode orchestration against a local-only branch can fail with `couldn't find remote ref ...`; set `CODEX_CLOUD_BRANCH` to a pushed branch (typically `main`) before cloud execution.
- **Tool profile mismatch:** child tool profile must be allowed by repo policy; invalid or unsafe names are ignored.
- **Confirmation misuse:** never pass `confirm_nonce` from model/tool input; it is runner‑injected only.
- **Secrets exposure:** never include secrets/tokens/PII in delegate prompts or files.
- **Missing control files:** delegate tools rely on `control_endpoint.json` in the run directory; older runs may not have it.
- **Collab payload mismatch:** `spawn_agent` rejects calls that include both `message` and `items`.
- **Collab UI assumptions:** agent rows/records are id-based today; use explicit stream role text in prompts/artifacts for operator clarity.
- **Collab lifecycle leaks:** missing `close_agent` calls accumulate open threads and can trigger `agent thread limit reached`; always finish `spawn -> wait -> close_agent` per id.
