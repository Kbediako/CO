# Technical Spec - Orchestrator Run Reporting Consistency (Task 0909)

## Objective
Align grouped run summaries, scheduler finalization, and metrics aggregation so they reflect overall outcomes without adding new schemas or heavy coordination mechanisms.

## Proposed Changes
1. Grouped run summary reflects overall outcome
   - File: `orchestrator/src/manager.ts`
   - Approach: In `executeGroup`, anchor the returned summary to the last processed subtask (`finalResult`) so the top-level `build/test/review` reflect group success or failure. Keep `group.entries` plus `builds/tests/reviews` arrays for per-subtask detail.
   - Tests: Update `orchestrator/tests/TaskManager.test.ts` to assert that a later subtask failure flips the top-level summary to failed while preserving per-subtask arrays.

2. Scheduler finalization avoids completed timestamps for running
   - Files: `orchestrator/src/scheduler/plan.ts`, `orchestrator/src/cli/services/schedulerService.ts`
   - Approach: If `finalStatus` is `running`, do not set `assignment.completedAt` or `attempt.completedAt`. Only stamp completion timestamps for terminal statuses, and keep `startedAt` if missing.
   - Tests: Add coverage in `orchestrator/tests/SchedulerPlan.test.ts` for `finalizeSchedulerPlan` with `running` status.

3. Metrics aggregation serialized per task
   - Files: `orchestrator/src/cli/metrics/metricsRecorder.ts`, `orchestrator/src/cli/metrics/metricsAggregator.ts`
   - Approach: Add a lightweight lock file (for example `metrics.lock` under `.runs/<task>/`) around append + aggregate updates. Retry a small number of times with short backoff. If the lock cannot be acquired, log and skip aggregation to avoid corrupt reads while still capturing the metrics entry.
   - Tests: Extend `orchestrator/tests/MetricsAggregator.test.ts` or add a small recorder test to cover lock acquisition behavior and ensure aggregates remain valid.

## Testing Strategy
- Update existing unit tests for task manager group summaries and scheduler plan finalization.
- Add metrics aggregation serialization coverage where patterns exist.
- Run guardrails in order: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Evidence
- Diagnostics manifest: pending `.runs/0909-orchestrator-run-reporting-consistency/cli/<run-id>/manifest.json`.
