# Codex Orchestrator

Codex Orchestrator is the coordination layer that glues together Codex-driven agents, run pipelines, approval policies, and evidence capture for multi-stage automation projects. It wraps a reusable orchestration core with a CLI that produces auditable manifests, integrates with control-plane validators, and syncs run results to downstream systems.

> **At a glance:** Every run starts from a task description, writes the active CLI manifest to `.runs/<task-id>/cli/<run-id>/manifest.json`, emits a persisted run summary at `.runs/<task-id>/<run-id>/manifest.json`, mirrors human-readable data to `out/<task-id>/`, and can optionally sync to a remote control plane. Pipelines define the concrete commands (build, lint, test, etc.) that execute for a given task.

## How It Works
- **Planner → Builder → Tester → Reviewer:** The core `TaskManager` (see `orchestrator/src/manager.ts`) wires together agent interfaces that decide *what* to run (planner), execute the selected pipeline stage (builder), verify results (tester), and give a final decision (reviewer).
- **Execution modes:** Each plan item can flag `requires_cloud` and task metadata can set `execution.parallel`; the mode policy picks `mcp` (local MCP runtime) or `cloud` execution accordingly.
- **Event-driven persistence:** Milestones emit typed events on `EventBus`. `PersistenceCoordinator` captures run summaries in the task state store and writes manifests so nothing is lost if the process crashes.
- **CLI lifecycle:** `CodexOrchestrator` (in `orchestrator/src/cli/orchestrator.ts`) resolves instruction sources (`AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`), loads the chosen pipeline, executes each command stage via `runCommandStage`, and keeps heartbeats plus command status current inside the manifest (approval evidence will surface once prompt wiring lands).
- **Control-plane & scheduler integrations:** Optional validation (`control-plane/`) and scheduling (`scheduler/`) modules enrich manifests with drift checks, plan assignments, and remote run metadata.
- **Cloud sync:** `CloudSyncWorker` listens for `run:completed` events and uploads manifests using the `CloudRunsClient`, with retry, audit logging, and per-task isolation under `.runs/` and `out/`.
- **Tool orchestration:** The shared `packages/orchestrator` toolkit handles approval prompts, sandbox retries, and tool run bookkeeping used by higher-level agents.

```
Task input ─► Planner ─► Builder ─► Tester ─► Reviewer ─► Run summary
                         │            │            │
                         └─ manifests, metrics, approvals, guardrails ─► .runs/, out/, cloud
```

## Repository Layout
- `orchestrator/` – Core orchestration runtime (`TaskManager`, event bus, persistence, CLI, control-plane hooks, scheduler, privacy guard).
- `packages/` – Shared libraries used by downstream projects (tool orchestrator, shared manifest schema, SDK shims, control-plane schema bundle).
- `patterns/`, `eslint-plugin-patterns/` – Codemod + lint infrastructure invoked during builds.
- `scripts/` – Operational helpers (e.g., `scripts/spec-guard.sh` for spec freshness enforcement).
- `tasks/`, `docs/`, `.agent/` – Project planning artifacts that must stay in sync (`[ ]` → `[x]` checklists pointing to manifest evidence).
- `.runs/<task-id>/` – Per-task manifests, logs, metrics snapshots (`metrics.json`), and CLI run folders.
- `out/<task-id>/` – Human-friendly summaries and cloud-sync audit logs.

## CLI Quick Start
1. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
2. Set the task context so artifacts land in the right folder:
   ```bash
   export MCP_RUNNER_TASK_ID=<task-id>
   ```
3. Launch diagnostics (defaults to the configured pipeline):
   ```bash
   npx codex-orchestrator start diagnostics --format json
   ```
4. Follow the run:
   ```bash
   npx codex-orchestrator status --run <run-id> --watch --interval 10
   ```
5. Attach the CLI manifest path (`.runs/<task-id>/cli/<run-id>/manifest.json`) when you complete checklist items; the TaskManager summary lives at `.runs/<task-id>/<run-id>/manifest.json`, metrics aggregate in `.runs/<task-id>/metrics.json`, and summaries land in `out/<task-id>/state.json`.

Use `npx codex-orchestrator resume --run <run-id>` to continue interrupted runs; the CLI verifies resume tokens, refreshes the plan, and updates the manifest safely before rerunning.

## Pipelines & Execution Plans
- Default pipelines live in `codex.orchestrator.json` (repository-specific) and `orchestrator/src/cli/pipelines/` (built-in defaults). Each stage is either a command (shell execution) or a nested pipeline.
- The `CommandPlanner` inspects the selected pipeline and target stage; you can pass `--target-stage <stage-id>` or set `CODEX_ORCHESTRATOR_TARGET_STAGE` to focus on a specific step (e.g., rerun tests only).
- Stage execution records stdout/stderr logs, exit codes, optional summaries, and failure data directly into the manifest (`commands[]` array).
- Guardrails: before review, run `bash scripts/spec-guard.sh --dry-run` to ensure specs touched in the PR are current; the orchestrator tracks guardrail outcomes in the manifest (`guardrail_status`).

## Approval & Sandbox Model
- Approval policies (`never`, `on-request`, `auto`, or custom strings) flow through `packages/orchestrator`. Tool invocations can require approval before sandbox elevation, and all prompts/decisions are persisted.
- Sandbox retries (for transient `mcp` or cloud failures) use exponential backoff with configurable classifiers, ensuring tools get multiple attempts without masking hard failures.

## Control Plane, Scheduler, and Cloud Sync
- `control-plane/` builds versioned requests (`buildRunRequestV2`) and validates manifests against remote expectations. Drift reports are appended to run summaries so reviewers see deviations.
- `scheduler/` resolves assignments, serializes plan data, and embeds scheduler state in manifests, making it easy to coordinate multi-stage work across agents.
- `sync/` uploads completed runs. Configure credentials through the credential broker (`orchestrator/src/credentials/`) and adjust retry/backoff behavior via `createCloudSyncWorker`.

## Persistence & Observability
- `TaskStateStore` writes per-task snapshots with bounded lock retries; failures degrade gracefully while still writing the main manifest.
- `RunManifestWriter` generates the canonical manifest JSON for each run (mirrored under `.runs/`), while metrics appenders and summary writers keep `out/` up to date.
- Heartbeat files and timestamps guard against stalled runs. `metrics/metricsRecorder.ts` aggregates command durations, exit codes, and guardrail stats for later review.

## Customizing for New Projects
- Duplicate the templates under `/tasks`, `docs/`, and `.agent/` for your task ID and keep checklist status mirrored (`[ ]` → `[x]`) with links to the manifest that proves each outcome.
- Update `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` with project details and evidence paths (`.runs/<task-id>/...`).
- Refresh `.agent/` SOPs with task-specific guardrails, escalation contacts, and artifact locations.
- Remove placeholder references in manifests/docs before merging so downstream teams see only live project data.

## Development Workflow
| Command | Purpose |
| --- | --- |
| `npm run lint` | Lints orchestrator, adapters, shared packages. Auto-runs `npm run build:patterns` first so codemods compile. |
| `npm run test` | Vitest suite covering orchestration core, CLI services, and patterns. |
| `npm run eval:test` | Optional evaluation harness (enable when `evaluation/fixtures/**` is populated). |
| `bash scripts/spec-guard.sh --dry-run` | Validates spec freshness; required before review. |
| `npm run review` | Runs `codex review --manifest <latest>` using the newest entry under `.runs/**`. |

Run `npm run build` to compile TypeScript before packaging or invoking the CLI directly from `dist/`.

## Extending the Orchestrator
- Add new agent strategies by implementing the planner/builder/tester/reviewer interfaces and wiring them into `TaskManager`.
- Register additional pipelines or override defaults through `codex.orchestrator.json`. Nested pipelines let you compose reusable command groups.
- Hook external systems by subscribing to `EventBus` events (plan/build/test/review/run) or by extending the `CloudSyncWorker` client.
- Leverage the shared TypeScript definitions in `packages/shared` to keep manifest, metrics, and telemetry consumers aligned.

---

When preparing a review, always capture the latest manifest path, run `bash scripts/spec-guard.sh --dry-run`, and ensure checklist mirrors (`/tasks`, `docs/`, `.agent/`) point at the evidence generated by Codex Orchestrator. That keeps the automation trustworthy and auditable across projects.
