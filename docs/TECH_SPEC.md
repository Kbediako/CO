# Technical Spec — Codex Orchestrator CLI Migration (Task 0101)

## Scope & Goals
- Deliver a `codex-orchestrator` CLI that replaces `scripts/agents_mcp_runner.mjs` without depending on MCP transports.
- Reuse the existing `TaskManager` as the orchestration core so local CLI and cloud runs share event and persistence plumbing.
- Generate run manifests, metrics, and task snapshots under `.runs/0101/**` and `out/0101/state.json`, with compatibility pointers for legacy MCP paths.
- Support nested sub-agent runs by allowing pipeline stages to spawn child pipelines and attach `parentRunId` lineage to manifests.
- Provide parity commands (`start`, `resume`, `status`) plus a diagnostics pipeline that runs build, lint, test, and spec guard steps.

## Architecture Overview
- **CLI Surface:**
  - `codex-orchestrator start <pipeline>` initializes a run, streams command output to `runner.ndjson`, updates a heartbeat every 5 seconds, and dispatches the pipeline through `TaskManager`.
  - `codex-orchestrator plan [pipeline]` resolves the effective pipeline (defaulting to diagnostics) and prints ordered stage metadata without executing. `--format json` emits the structured payload returned by `CodexOrchestrator.plan`.
  - `codex-orchestrator resume --run <id>` reloads the manifest, resets failed or incomplete commands, and replays the pipeline.
  - `codex-orchestrator status --run <id>` reads the manifest and emits structured status (text or JSON) including heartbeat age, metrics flag, and child run IDs.
- **Pipelines:** defined in `orchestrator/src/cli/pipelines`. Each pipeline consists of ordered stages of type `command` or `subpipeline`. Subpipeline stages call back into the CLI with the current run id as `parentRunId` to record nesting.
- **TaskManager Integration:** The CLI wraps pipeline execution in an adapter layer:
  - `CommandPlanner` maps the pipeline into a `PlanResult` with one item per stage.
  - `CommandBuilder` executes `command` stages via `CommandRunner` (spawned shell processes) and `subpipeline` stages by invoking a nested run.
  - `CommandTester` verifies guardrail coverage (ensures spec-guard stage succeeded) and emits a summarized report.
  - `CommandReviewer` synthesizes a review summary, capturing success, failures, and manifest pointers.
  - `PersistenceCoordinator` listens for `run:completed` and writes state snapshots plus manifests using the existing TaskStateStore and RunManifestWriter.
- **Persistence Layout:**
  - Primary artifacts land in `.runs/0101/cli/<run-id>/` (manifest, heartbeat, resume-token, runner.ndjson, command artifacts, sub-run ledger).
  - Post-run compatibility pointer is created at `.runs/0101/mcp/<run-id>/manifest.json` (symlink when supported, JSON stub otherwise) and `.runs/local-mcp/<run-id>/compat.json` to avoid breaking downstream consumers.
  - Child runs record `parent_run_id` and `child_runs[]` arrays in manifests for lineage queries.
- **Configuration:**
  - Optional `codex.orchestrator.json` file allows pipelines to be extended or overridden per repo. Defaults live in `orchestrator/src/cli/pipelines/defaultDiagnostics.ts`.
  - Environment variables: `MCP_RUNNER_TASK_ID` (defaults to `0101`), `CODEX_ORCHESTRATOR_ROOT` (override repo root), `CODEX_ORCHESTRATOR_RUNS_DIR`, `CODEX_ORCHESTRATOR_OUT_DIR`.

## Workflows & Tooling
- **Diagnostics Pipeline (default):**
  1. `npm run build`
  2. `npm run lint`
  3. `npm run test`
  4. `bash scripts/spec-guard.sh --dry-run`
  - Each command produces a `commands/<index>-<slug>.ndjson` log and aggregated NDJSON events in `runner.ndjson`.
- **Nested Agent Stage (optional):** Example stage definition spawns `codex-orchestrator start smoke --parent-run <current-run>` to validate targeted checks before full diagnostics.
- **Automation Hooks:**
  - `scripts/agents_mcp_runner.mjs`, `scripts/mcp-runner-start.sh`, and `scripts/mcp-runner-poll.sh` become thin shims that call the CLI to preserve backwards compatibility for existing shells or documentation.
  - `npm run review` updated to call `codex-orchestrator status --run <latest>` so reviewer automation reads CLI manifests.
- **Developer Tooling:** TypeScript sources under `orchestrator/src/cli/**` compile via existing `tsc` config; `bin/codex-orchestrator.ts` re-exports the built CLI.

## Guardrails & Telemetry
- **Manifest Schema:** `orchestrator/src/cli/telemetry/schema.ts` exposes `getTelemetrySchemas()` for downstream JSON schema tooling and `validateCliManifest()` for lightweight shape checks (used in `tests/cli-orchestrator.spec.ts`). Consumers can import the helper to verify manifests before ingesting them.
- **Heartbeat:** `HeartbeatWriter` updates `.heartbeat` every 5 seconds while commands are in flight; stale detection mirrors the previous 30 second threshold.
- **Metrics:** `MetricsRecorder` appends JSONL entries to `.runs/0101/metrics.json` after terminal states, including guardrail presence, duration, failure summaries, and whether child runs were spawned. Summary generation stays in `scripts/mcp-runner-metrics.js` (pointed to the new constants module).
- **Guardrail Summary:** `MetricsRecorder` now calls `upsertGuardrailSummary()` so every manifest ends with a `Guardrails: ...` line explaining whether spec-guard commands were missing, failed, partial, or fully succeeded. Reviewers rely on this when scanning manifest summaries.
- **Spec Guard Compatibility:** Pipeline requires a successful spec-guard step; failures append remediation guidance to the manifest summary, matching the previous MCP runner behavior.
- **Approvals:** CLI logs an `approvals` array when shims request escalations; manifests capture `approvals: []` if none were needed.

## Open Questions / Follow-Ups
- Determine whether metrics summary should move into the CLI package to reduce duplicate constant definitions.
- Track adoption of the new guardrail summary in reviewer tooling dashboards; expand to additional guardrail commands if needed.

Mirrors: `/tasks/0101-prd-cli-migration.md`, `docs/ACTION_PLAN.md`, `docs/TASKS.md`, and `.agent/task/0101-cli-migration.md` carry matching milestones and manifest references.
