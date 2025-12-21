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
   - Approach: Add a lightweight lock file (`metrics.lock` under `.runs/<task>/`) around append + aggregate updates with bounded retries. Before acquiring, prune stale lock files (mtime older than a few minutes). If the lock cannot be acquired, queue entries in `metrics.pending/` (one file per entry) and merge them into `metrics.json` on the next successful lock acquisition so metrics are never appended without holding the lock.
   - Tests: Extend `orchestrator/tests/MetricsAggregator.test.ts` or add a small recorder test to cover lock acquisition behavior and ensure aggregates remain valid.

## Testing Strategy
- Update existing unit tests for task manager group summaries and scheduler plan finalization.
- Add metrics aggregation serialization coverage where patterns exist.
- Run guardrails in order: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Evidence
- Implementation-gate manifest: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
