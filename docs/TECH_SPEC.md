# Technical Spec Overview — Codex Orchestrator Projects

## Task 0801 — Dead Code Pruning & Evidence
- Primary Doc: `docs/TECH_SPEC-dead-code-pruning.md`
- Run Manifest Link: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- Metrics / State Snapshots: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`.
- Checklist Mirror: `tasks/tasks-0801-dead-code-pruning.md`, `.agent/task/<id>-<slug>.md`, `docs/TASKS.md` (0801 section).

## Task 0901 — Orchestrator Issue Validation & Prioritization
- Primary Doc: `docs/TECH_SPEC-orchestrator-issue-validation.md`
- Run Manifest Link: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics / State Snapshots: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- Checklist Mirror: `tasks/tasks-0901-orchestrator-issue-validation.md`, `docs/TASKS.md` (0901 section).

## Task 0909 — Orchestrator Run Reporting Consistency
- Primary Doc: `docs/TECH_SPEC-orchestrator-run-reporting-consistency.md`
- Run Manifest Link: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- Metrics / State Snapshots: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
- Checklist Mirror: `tasks/tasks-0909-orchestrator-run-reporting-consistency.md`, `docs/TASKS.md` (0909 section), `.agent/task/0909-orchestrator-run-reporting-consistency.md`.

## Task 0910 — Docs Review Gate (Pre/Post Implementation)
- Primary Doc: `docs/TECH_SPEC-docs-review-gate.md`
- Run Manifest Link: _(pending — capture docs-review run under `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0910-docs-review-gate/metrics.json` and `out/0910-docs-review-gate/state.json`)._
- Checklist Mirror: `tasks/tasks-0910-docs-review-gate.md`, `docs/TASKS.md` (0910 section), `.agent/task/0910-docs-review-gate.md`.

## Task 0911 — Orchestrator Status UI
- Primary Doc: `docs/TECH_SPEC-orchestrator-status-ui.md`
- Canonical Spec: `tasks/specs/0911-orchestrator-status-ui.md`
- Run Manifest Link: `.runs/0911-orchestrator-status-ui/cli/2025-12-23T07-59-47-613Z-344689f5/manifest.json`.
- Metrics / State Snapshots: _(pending — populate `.runs/0911-orchestrator-status-ui/metrics.json` and `out/0911-orchestrator-status-ui/state.json`)._
- Checklist Mirror: `tasks/tasks-0911-orchestrator-status-ui.md`, `docs/TASKS.md` (0911 section), `.agent/task/0911-orchestrator-status-ui.md`.

## Task 0904 — README vs Codebase Alignment
- Primary Doc: `docs/TECH_SPEC-readme-codebase-alignment.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0904-readme-codebase-alignment/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0904-readme-codebase-alignment/metrics.json` and `out/0904-readme-codebase-alignment/state.json`)._
- Checklist Mirror: `tasks/tasks-0904-readme-codebase-alignment.md`, `docs/TASKS.md` (0904 section), `.agent/task/0904-readme-codebase-alignment.md`.

## Task 0905 — Agentic Coding Readiness & Onboarding Hygiene
- Primary Doc: `docs/TECH_SPEC-agentic-coding-readiness.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0905-agentic-coding-readiness/metrics.json` and `out/0905-agentic-coding-readiness/state.json`)._
- Checklist Mirror: `tasks/tasks-0905-agentic-coding-readiness.md`, `docs/TASKS.md` (0905 section), `.agent/task/0905-agentic-coding-readiness.md`.

## Task 0303 — Codex Orchestrator Autonomy Enhancements
- Primary Doc: `docs/TECH_SPEC-codex-orchestrator-autonomy.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` after initial diagnostics)._ 
- Checklist Mirror: `tasks/tasks-0303-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`, `docs/TASKS.md` (0303 section).

## Task 0505 — More Nutrition Pixel Archive
- Primary Doc: `tasks/0505-more-nutrition-pixel.md`
- Run Manifest Link: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`
- Archive / Artifacts: `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` *(folders removed locally on 2025-11-09 to keep the repo trim; rerun capture to recreate)*
- Findings & Metrics: `docs/findings/more-nutrition.md`, `out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json`
- Checklist Mirror: `.agent/task/0505-more-nutrition-pixel.md`, `docs/TASKS.md` (0505 section)

---

# Technical Spec — Codex Orchestrator Resilience Hardening (Task 0202)

## Overview
- Objective: Increase durability and observability resiliency for orchestrator runs by adding retryable state snapshots, safer heartbeat persistence, and bounded command output capture.
- In Scope: `TaskStateStore`, `PersistenceCoordinator`, heartbeat loop inside `orchestrator/src/cli/orchestrator.ts`, and `runCommandStage` plus manifest error writes.
- Out of Scope: Pipeline composition, approval surfaces, or replacing filesystem-based storage.

## Architecture & Design
- Current State: `TaskStateStore` acquires a lock once and aborts if it already exists, causing lost snapshots whenever overlapping runs occur. Heartbeat intervals call `saveManifest`/`writeHeartbeatFile` without awaiting results, risking unhandled rejections. Command outputs are buffered entirely in memory and persisted without limits.
- Proposed Changes:
  - Wrap `TaskStateStore.acquireLock` in bounded retries (default: 5 attempts, exponential backoff starting at 100 ms) and expose `TaskStateStoreLockError` when exhausted.
  - Update `PersistenceCoordinator.handleRunCompleted` to continue writing manifests even if state snapshots fail after retries, and log retries via the injected logger.
  - Replace the heartbeat interval with an async queue that awaits writes, throttles manifest persistence to every 30 seconds, and still writes `.heartbeat` on each tick.
  - Refactor `runCommandStage` to maintain capped buffers (64 KiB per stream) and ensure `appendCommandError` truncates serialized `stderr` to 8 KiB.
- Data Persistence / State Impact: State snapshot JSON now stores identical shape but may skip a run if retries exceed bounds; the orchestrator will log a warning and still persist manifest + metrics.
- External Dependencies: None added; relies solely on Node.js core libraries.

## Operational Considerations
- Failure Modes: Exhausted lock retries raise a controlled warning and continue. Heartbeat write failures are logged and retried on next tick; lack of manifest flush for >30 seconds triggers a forced write.
- Observability & Telemetry: Logger entries include retry attempts and heartbeat failures. Metrics continue to append after pipeline completion.
- Security / Privacy: No change — capped buffers reduce risk of logging excessive secrets but do not add new exposure.
- Performance Targets: Backoff maximum wait < 3 seconds total. Bounded buffers ensure per-command memory usage stays under 128 KiB.

### Identifier Guardrails
- **Task IDs:** `sanitizeTaskId` is the single source of truth for filesystem validation. CLI `resolveEnvironment()` now calls it directly and throws a descriptive `Invalid MCP_RUNNER_TASK_ID` error when the env var includes control characters, traversal attempts, or Windows-reserved characters (`<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`). There is no silent lowercasing/fallback; set the correct task ID before launching any orchestrator command.
- **Run IDs:** A new shared `sanitizeRunId` helper mirrors the same strict rules and guards colon or control characters that previously slipped through via `replace(/:/g, '-')`. `resolveRunPaths`, `RunManifestWriter`, `ArtifactStager`, `CloudSyncWorker`, and CLI manifest bootstrap now all depend on this helper so every run directory remains under `.runs/<task-id>/...` and traversal attempts are rejected outright.
- **Testing:** Dedicated unit tests cover control characters, traversal strings, and Windows-unsafe characters to ensure run/task IDs cannot escape `.runs/<task-id>/cli/<run-id>` or break manifest persistence. Builders/testers that throw now emit structured failure summaries so `run:completed` (and therefore persistence) always fires.

## Testing Strategy
- Unit / Integration: Extend persistence tests to cover lock contention scenarios; add command runner tests verifying truncation and recorded summaries. Exercise heartbeat loop through mocked timers to assert awaited writes.
- Tooling / Automation: Run `npm run lint`, `npm run test`, and `node scripts/spec-guard.mjs --dry-run`. Diagnostics manifest to be captured via `npx codex-orchestrator start diagnostics --format json`.
- Rollback Plan: Feature flags not required; revert changes and restore previous persistence/heartbeat modules if regressions discovered.

## Documentation & Evidence
- Linked PRD: `docs/PRD.md`
- Run Manifest Link: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
- Metrics / State Snapshots: `.runs/0202-orchestrator-hardening/metrics.json`, `out/0202-orchestrator-hardening/state.json` (updated 2025-10-31).

## Open Questions
- Should retry/backoff intervals be configurable per project via `codex.orchestrator.json`?
- Do we need to surface truncated stderr length within manifest summaries?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
