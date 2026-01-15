---
name: delegation-usage
description: Use when enabling or operating the Codex delegation MCP server and tools (delegate.spawn, delegate.question.*, delegate.cancel, github.merge confirmation flow), or when configuring delegation mode/tool_profile to delegate work while keeping MCP disabled by default.
---

# Delegation Usage

## Overview

Use this skill to enable and operate delegation MCP tools without leaving the MCP server on by default. It focuses on safe, minimal‑context use: only enable delegation when you intend to delegate work.

## Quick-start workflow (canned)

Use this when delegation is off in the current run and you want a background Codex run to handle delegation:

```
codex exec \
  -c 'mcp_servers.delegation.enabled=true' \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Optional (only if you need it):
- Add `--repo /path/to/repo` to the MCP args when registering the server or when you need repo-scoped config.
- Add `-c 'features.skills=false'` for a minimal, deterministic background run.
- Add `-c 'delegate.mode=question_only'` when the child only needs `delegate.question.*` (and optional `delegate.status`).
- Add `-c 'delegate.mode=full'` when the child needs `delegate.spawn/pause/cancel` (nested delegation / run control).
- If `delegate.spawn` is missing, re-register the MCP server with full mode (server config controls tool surface):
  - `codex mcp remove delegation`
  - `codex mcp add delegation --env 'CODEX_MCP_CONFIG_OVERRIDES=delegate.mode="full"' -- codex-orchestrator delegate-server --repo /path/to/repo`
- To raise RLM budgets for delegated runs, re-register with an override (TOML-quoted):
  - `codex mcp add delegation --env 'CODEX_MCP_CONFIG_OVERRIDES=rlm.max_subcall_depth=8;rlm.wall_clock_timeout_ms=14400000' -- codex-orchestrator delegate-server --repo /path/to/repo`

For deeper background patterns and troubleshooting, see `DELEGATION_GUIDE.md`.
For runner + delegation coordination (short `--task` flow), see `docs/delegation-runner-workflow.md`.

## Delegation‑first policy

- Default to delegation unless the task is trivial.
- Delegate when the work spans >1 domain, touches more than ~2 files, needs verification/research, or is likely to run >10 minutes.
- Spawn one delegate per workstream with narrow scope and acceptance criteria.
- Use `delegate.mode=question_only` unless the child truly needs full tool access.
- Ask delegates for short, structured summaries and to write details into files/artifacts instead of long chat dumps.
- Skip delegation only for tiny single‑file edits or when delegation overhead outweighs the work.

## Workflow

### 0) One-time setup (register the MCP server)

- Register the delegation server once:
  - `codex mcp add delegation -- codex-orchestrator delegate-server`
  - Optional (recommended for repo-scoped config): append `--repo /path/to/repo` to the args.
  - `delegate-server` is the canonical name; `delegation-server` is supported as an alias.
- Per-run `-c 'mcp_servers.delegation.enabled=true'` only works **after** registration.
- If `delegate.*` tools are missing mid-task, start a new run with:
  - `codex -c 'mcp_servers.delegation.enabled=true' ...`
  - Prefer using a background terminal (non-interactive) so you can continue without asking the user to relaunch.
- If delegation is unavailable and the user asked to delegate, **do not get stuck**:
  - Explain delegation is disabled in this run and give the enable command above.
  - Unless they explicitly want a delegation test, proceed locally using background tools (terminal commands or built-in tools) and deliver the result.

### 0a) Version guard (JSONL handshake)

- Delegation MCP uses JSONL; ensure the server binary is **0.1.8+**:
  - `codex-orchestrator --version` should be `>= 0.1.8`
- If not, update global install: `npm i -g @kbediako/codex-orchestrator@0.1.8`
- Alternative: pin the MCP server to `npx -y @kbediako/codex-orchestrator@0.1.8` for deterministic behavior.

### 0b) Background terminal bootstrap (required when MCP is disabled)

When `delegate.*` is missing in the current session, immediately spawn a **background** Codex run with delegation enabled and hand it the narrow task. Use `codex exec` so it completes without interaction and you can capture output:

```
codex exec \
  -c mcp_servers.delegation.enabled=true \
  -c mcp_servers.openaiDeveloperDocs.enabled=true \
  "Use delegate.* tools to <task>. Return a short summary and any artifacts."
```

Guidance for background runs:
- `codex exec` streams progress to `stderr` and prints the final message to `stdout`, so you can pipe or redirect safely.
- Use `--json` for JSONL events, or `-o <path>` to write the final message to a file while still printing to stdout.
- If you need a multi-step run, use `codex exec resume --last "<follow-up>"` to continue the same session.
- Non-interactive runs can still hit `confirmation_required`; approvals happen via the UI/TUI and the run resumes after approval.
- `codex exec` does **not** create an orchestrator manifest. If the child must call `delegate.question.*` or `delegate.status/pause/cancel`, pass a real `.runs/<task>/cli/<run>/manifest.json` via `parent_manifest_path`/`manifest_path` (e.g., run `codex-orch start diagnostics --format json --task <task-id>` to get one; or use `export MCP_RUNNER_TASK_ID=<task-id>` if you prefer env vars).

### 1) Enable delegation only for the run you need

- Keep `mcp_servers.delegation.enabled = false` in `~/.codex/config.toml`.
- Enable per run:
  - Example: `codex -c 'mcp_servers.delegation.enabled=true' ...`
- Using `-c` keeps your default config unchanged, so delegation is off again next run.
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
- **Tool profile mismatch:** child tool profile must be allowed by repo policy; invalid or unsafe names are ignored.
- **Confirmation misuse:** never pass `confirm_nonce` from model/tool input; it is runner‑injected only.
- **Secrets exposure:** never include secrets/tokens/PII in delegate prompts or files.
- **Missing control files:** delegate tools rely on `control_endpoint.json` in the run directory; older runs may not have it.
