# Technical Spec — Codex Orchestrator Wrapper

## Scope & Goals
- Maintain a `codex-orchestrator` CLI that coordinates multiple downstream projects without MCP transports.
- Reuse `TaskManager` as the orchestration core so local CLI and cloud runs share persistence and event plumbing.
- Generate manifests, metrics, and state snapshots under `.runs/<task-id>/**` and `out/<task-id>/state.json`, keeping compatibility pointers for legacy MCP integrations.
- Support nested sub-agent runs while preserving `parentRunId` lineage across projects.
- Allow per-project pipelines to extend the default diagnostics flow without breaking shared guardrails.

## Architecture Overview
- **CLI Surface:**
  - `codex-orchestrator start <pipeline>` initializes a run, streams command output to `runner.ndjson`, updates a heartbeat every 5 seconds, and dispatches the pipeline through `TaskManager` using the active `MCP_RUNNER_TASK_ID`.
  - `codex-orchestrator plan [pipeline]` renders stage metadata (text or JSON) so teams can review guardrails before executing.
  - `codex-orchestrator resume --run <id>` reloads manifests, resets incomplete stages, and replays pipelines with identical task id routing.
  - `codex-orchestrator status --run <id>` emits structured status including heartbeat age, metrics presence, child runs, and approvals.
- **Pipelines:** Defined in `orchestrator/src/cli/pipelines`. Each stage is typed (`command`, `subpipeline`, `manual`) and can be extended per project through `codex.orchestrator.json`.
- **TaskManager Integration:**
  - `CommandPlanner` maps pipelines to ordered plan items.
  - `CommandBuilder` executes shell commands or spawns nested orchestrator runs while injecting `parentRunId` metadata.
  - `CommandReviewer` aggregates outcomes into the manifest summary, surfacing guardrail status and approvals.
  - `PersistenceCoordinator` writes manifests and state snapshots to `.runs/<task-id>/cli/<run-id>/` and `out/<task-id>/state.json`.
- **Persistence Layout:**
  - Primary artifacts: `.runs/<task-id>/cli/<run-id>/manifest.json`, `.heartbeat`, `runner.ndjson`, `commands/<index>-<slug>.ndjson`, `resume-token.json`.
  - Compatibility pointers: `.runs/<task-id>/mcp/<run-id>/manifest.json` and `.runs/local-mcp/<run-id>/compat.json` when legacy tooling still expects MCP paths.
  - Child runs register lineage through `parent_run_id` plus `child_runs[]` arrays.
- **Configuration:**
  - `codex.orchestrator.json` allows repos to define additional pipelines or override defaults per project.
  - Environment variables: `MCP_RUNNER_TASK_ID` (required per project), `CODEX_ORCHESTRATOR_ROOT`, `CODEX_ORCHESTRATOR_RUNS_DIR`, `CODEX_ORCHESTRATOR_OUT_DIR`.

## Workflows & Tooling
- **Diagnostics Pipeline (default):**
  1. `npm run build`
  2. `npm run lint`
  3. `npm run test`
  4. `bash scripts/spec-guard.sh --dry-run`
  - Each command produces a `commands/<index>-<slug>.ndjson` log and aggregated events in `runner.ndjson`.
- **Project Extensions:** Teams may add smoke or integration pipelines in `codex.orchestrator.json`; manifests should still resolve to `.runs/<task-id>/cli/<run-id>/manifest.json`.
- **Automation Hooks:**
  - `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, and `scripts/mcp-runner-poll.sh` delegate to the CLI while passing through `MCP_RUNNER_TASK_ID`.
  - `npm run review` (or equivalent) uses `codex-orchestrator status --run <latest>` and attaches the manifest path to reviewer checklists.
- **Developer Tooling:** TypeScript sources under `orchestrator/src/cli/**` compile via `tsc`; `bin/codex-orchestrator.ts` exposes the CLI entrypoint for local and CI usage.

## Guardrails & Telemetry
- **Manifest Schema:** `orchestrator/src/cli/telemetry/schema.ts` exports helpers for validating manifests; downstream tooling should reference schemas when adding new projects.
- **Heartbeat:** `HeartbeatWriter` updates `.heartbeat` every 5 seconds while commands run; stale detection remains at 30 seconds.
- **Metrics:** `MetricsRecorder` appends JSONL entries to `.runs/<task-id>/metrics.json` with duration, guardrail coverage, and approval info. Summary generation continues in `scripts/mcp-runner-metrics.js`.
- **Guardrail Summary:** Each manifest ends with a human-readable guardrail summary so reviewers can quickly assess coverage across projects.
- **Approvals:** Escalations are logged in the manifest `approvals` array with references to `.runs/<task-id>/cli/<run-id>/manifest.json#approvals[]` for auditing.

## Open Questions / Follow-Ups
- Should we enforce a registry of allowed `task-id` ↔ `packages/<project>` mappings to prevent collisions?
- Would a scripted manifest index across `.runs/**` improve reviewer triage for multi-project repos?

Mirrors: `/tasks/<task-id>-<slug>.md`, `docs/ACTION_PLAN.md`, `docs/TASKS.md`, and `.agent/task/<task-id>-<slug>.md` should stay synchronized with manifest evidence.
