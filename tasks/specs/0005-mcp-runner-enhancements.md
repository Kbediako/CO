---
id: 20251018-mcp-runner
title: Codex MCP Runner Durability & Telemetry Mini-Spec
relates_to: tasks/0001-prd-codex-orchestrator.md
risk: high
owners:
  - Codex Orchestrator Engineering
last_review: 2025-10-18
---

## Added by Spec Author 2025-10-18

## Summary
- Align the MCP runner artifact layout with task-scoped directories while preserving backward compatibility for existing `.runs/local-mcp/<run-id>/` consumers.
- Introduce heartbeat and resume-token support so detached runs can be continued without duplicating manifests or losing guardrails.
- Emit aggregated metrics for Task 0001 (`.runs/0001/metrics.json`) that quantify guardrail coverage, failure modes, and reviewer-ready completeness targets.

## Goals
- Persist every MCP run under `.runs/0001/mcp/<run-id>/` and expose a compatibility pointer under `.runs/local-mcp/<run-id>/`.
- Update runner scripts to refresh a heartbeat timestamp every ≤15 seconds and accept a cryptographically random `resume_token` so resumed processes can safely reattach to in-progress manifests.
- Automatically append structured metrics after each run summarizing command success rates, missing guardrails (e.g., absent spec-guard entry), and artifact freshness for reviewer dashboards.

## Non-Goals
- Rewriting Codex CLI UX beyond runner wrappers (`scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`).
- Implementing JSON polling output (tracked separately as a low-risk task).
- Automating diagnostics replay or log compression; those remain backlog items pending telemetry validation.

## Enhancements

### 1. Task-Scoped Run Directories
- **Structure:** All new runs live at `.runs/0001/mcp/<run-id>/`. A compatibility symlink (or stub manifest with `redirect_to`) is written at `.runs/local-mcp/<run-id>/` so legacy scripts continue working.
- **Manifest Updates:** Add `task_id` (`"0001"`), `artifact_root` (relative path to `.runs/0001/mcp/<run-id>`), and `compat_path` (relative pointer to the legacy location).
- **Migration:** Implement a one-time migration helper (`scripts/mcp-runner-migrate.js`) that discovers existing `.runs/local-mcp/<run-id>` directories and relocates them into `.runs/0001/mcp/`. The helper writes a migration log under `.runs/0001/migrations/`.
- **Guardrails:** Runner refuses to start if it cannot write both primary and compatibility paths, preventing partial migrations.

### 2. Heartbeat & Resume Tokens
- **Heartbeat:** `scripts/agents_mcp_runner.mjs execute` updates `manifest.heartbeat_at` and writes `.heartbeat` files inside the run directory every 10 seconds. Polling treats a heartbeat older than 30 seconds as stale and surfaces `status_detail: "stale-heartbeat"` to callers.
- **Resume Token:** `start` generates a 32-byte random hex token stored in `manifest.resume_token` and a separate file `.resume-token`. A new CLI entrypoint `scripts/mcp-runner-start.sh --resume <run-id>` proxies to `scripts/agents_mcp_runner.mjs resume --run-id <id> --resume-token <token>`, which restarts the MCP execution loop if the previous process exited unexpectedly.
- **Safety Checks:** `resume` verifies that no active PID is recorded, updates `manifest.runner_pid`, and appends a `resume_events[]` array capturing timestamp, actor, and reason. Heartbeat restarts reset the stale status once logs begin streaming again.

### 3. Metrics Aggregation
- **Artifact:** After each run reaches a terminal state, the runner updates `.runs/0001/metrics.json` (JSON Lines) with an entry capturing `run_id`, `started_at`, `completed_at`, `duration_seconds`, `status`, `commands_passed`, `commands_failed`, `guardrails_present` (boolean for spec-guard command), and `artifact_path`.
- **Aggregation Script:** Add `scripts/mcp-runner-metrics.js` that can recompute summary statistics (success rate, average duration, guardrail coverage) and is callable by reviewers or CI. The script writes a derived snapshot `.runs/0001/metrics-summary.json`.
- **Reviewer Hooks:** Checklist guidance updated so reviewers cite metrics artifacts when assessing “95% reviewable from artifacts” goal.

## Dependencies & Touchpoints
- `scripts/agents_mcp_runner.mjs`: manifest schema, heartbeat loop, resume command, metrics hook.
- `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`: new flags (`--resume`, `--format json`) and heartbeat awareness.
- `scripts/run-mcp-diagnostics.sh`: detect stale heartbeat and offer `--resume`.
- `tasks/tasks-0001-codex-orchestrator.md` & mirrors: document new directories, metrics artifacts, and checklist expectations.
- `.runs/README.md`: update persistence guidance to mention task-scoped locations and metrics logs.

## Testing & Validation Strategy
- Add unit tests covering manifest migrations and heartbeat logic (Vitest in `tests/mcp-runner.spec.ts`).
- Create integration smoke test invoking `scripts/mcp-runner-start.sh --format json` and `scripts/mcp-runner-start.sh --resume ...` under controlled mock responses.
- Extend `scripts/run-mcp-diagnostics.sh` to optionally wait for heartbeat before declaring failure; ensure CI executes the diagnostics scenario after migration.

## Acceptance Criteria
1. Running `scripts/mcp-runner-start.sh --format json` produces JSON with `artifact_root: ".runs/0001/mcp/<run-id>"`, creates the new directory, and leaves a compatibility pointer under `.runs/local-mcp/<run-id>`.
2. Heartbeat files and `manifest.heartbeat_at` update at least every 15 seconds during an active run; `scripts/mcp-runner-poll.sh <run-id>` surfaces a warning when heartbeat age exceeds 30 seconds.
3. Invoking `scripts/mcp-runner-start.sh --resume <run-id>` after terminating the runner process reattaches to the existing manifest using the stored `resume_token`, continues the command queue, and records a `resume_events` entry.
4. Upon run completion, `.runs/0001/metrics.json` gains a new record with guardrail coverage and runtime statistics, and `scripts/mcp-runner-metrics.js --summarize` refreshes `.runs/0001/metrics-summary.json`.
5. Migration CLI relocates existing `.runs/local-mcp/<run-id>` directories, verifies manifests, emits `.runs/0001/migrations/<timestamp>.log`, and leaves backward-compatible pointers; dry-run mode reports planned changes without mutating files.

## Open Questions & Follow-Ups
- **Log Rotation:** Defer automated log rotation; track under backlog with dependency on metrics data to quantify needs.
- **JSON Poll Output:** Low-risk improvement to be tracked as a standalone implementation task outside this mini-spec.
- **Agents SDK Version Pin:** Implementation task to ensure `package.json` pins the SDK; not part of this spec but prioritized alongside migration rollout.

## Approvals
- Pending — route to Product, Engineering, and DX reviewers after draft review.
