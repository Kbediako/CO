# Task 0932 - Orchestrator Performance & Reliability Loop

- MCP Task ID: `0932-orchestrator-performance-reliability`
- Primary PRD: `docs/PRD-orchestrator-performance-reliability.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-performance-reliability.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-performance-reliability.md`
- Mini-spec: `tasks/specs/0932-orchestrator-performance-reliability.md`
- Run Manifest (docs review): `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-12-04-477Z-51bd9a65/manifest.json`
- Metrics/State: `.runs/0932-orchestrator-performance-reliability/metrics.json`, `out/0932-orchestrator-performance-reliability/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Subagent diagnostics captured - Evidence: `.runs/0932-orchestrator-performance-reliability-scout/cli/2026-01-05T16-04-27-772Z-2b9059f1/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-12-04-477Z-51bd9a65/manifest.json`, `docs/TASKS.md`, `.agent/task/0932-orchestrator-performance-reliability.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0932-orchestrator-performance-reliability/metrics.json`, `out/0932-orchestrator-performance-reliability/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-14-28-095Z-416cf9bb/manifest.json`, `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T16-16-02-146Z-e87b271d/manifest.json`, `tasks/tasks-0932-orchestrator-performance-reliability.md`.

### Implementation
- [x] Targeted performance/reliability fixes + tests/benchmarks applied - Evidence: code changes, `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T17-52-00-108Z-be984007/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0932-orchestrator-performance-reliability/cli/2026-01-05T17-52-00-108Z-be984007/manifest.json`.


## Hotspot Summary (RLM)
- Exec event capture (`packages/orchestrator/src/exec/unified-exec.ts`, `orchestrator/src/cli/services/commandRunner.ts`): per-chunk append + full payload capture inflates memory/manifest size.
- Telemetry exporter (`packages/orchestrator/src/telemetry/otel-exporter.ts`): unbounded in-memory queue when endpoint is unavailable.
- Manifest persister (`orchestrator/src/cli/run/manifestPersister.ts`): clears dirty flags before write; failures can drop state and stall future persistence.
- Persistence locks (`orchestrator/src/persistence/lockFile.ts`, `TaskStateStore`, `ExperienceStore`): no stale-lock cleanup after crashes.
- ExperienceStore (`orchestrator/src/persistence/ExperienceStore.ts`): JSONL rewrite on each batch and full-file reads for fetches.
- Metrics aggregation (`orchestrator/src/cli/metrics/metricsAggregator.ts`): recomputes aggregates from full metrics history each run.
- Cloud sync (`orchestrator/src/sync/CloudSyncWorker.ts`): audit log writes can throw without handling.

**Candidate fixes**
- Cap exec chunk capture by default (set `CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS`, truncate chunk data) and buffer append writes off the hot path.
- Bound telemetry queues with drop-oldest or sampling and periodic flush + jittered backoff.
- Persist dirty flags only after successful writes; keep `pendingPersist` usable and retry with backoff.
- Add stale-lock detection with TTL cleanup for task/experience stores.
- Switch ExperienceStore to append-only writes; stream reads with a top-k heap or small index.
- Incremental/rolling metrics aggregation with periodic compaction.
- Guard CloudSyncWorker audit log writes with try/catch and fallback logging.

## Relevant Files
- `orchestrator/src`
- `packages/orchestrator/src`
- `packages/shared`
- `scripts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0932-orchestrator-performance-reliability-*/cli/<run-id>/manifest.json`.
