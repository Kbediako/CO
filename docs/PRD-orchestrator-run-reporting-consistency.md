# PRD - Orchestrator Run Reporting Consistency (Task 0909)

## Summary
- Problem Statement: Grouped runs can report top-level summaries that only reflect the primary subtask, scheduler finalization can stamp completed timestamps on running assignments, and metrics aggregation can race when concurrent runs write to the same task metrics file.
- Desired Outcome: Run summaries, scheduler metadata, and metrics rollups reflect the actual overall outcome with minimal, well-tested changes.

## Goals
- Grouped run top-level summaries reflect the overall group outcome (no false success when later subtasks fail).
- Scheduler assignment completion timestamps are only set for terminal statuses.
- Metrics aggregation tolerates or prevents concurrent writes to the same task metrics file.
- Add regression tests where existing patterns exist.
- Keep guardrails (`spec-guard`, build, lint, test, docs:check, diff-budget, review) green.

## Non-Goals
- New run summary schema fields or consumer-facing API redesigns.
- Building a distributed metrics service or a full cross-process locking framework.
- Supporting fully concurrent writes for the same task across multiple machines.

## Stakeholders
- Product: Platform Enablement
- Engineering: Orchestrator Reliability
- Design: N/A

## Metrics and Guardrails
- Grouped run summaries match the final group outcome in tests.
- Scheduler run summaries do not show completed timestamps for running assignments.
- Metrics rollups update without parse errors during rapid local runs.

## User Experience
- Consumers can trust the top-level summary to represent the run result.
- Scheduler dashboards do not show "completed" assignments that are still running.
- Metrics rollups remain consistent during repeated WIP runs.

## Technical Considerations
- Scope: `orchestrator/src/manager.ts`, `orchestrator/src/scheduler/plan.ts`, `orchestrator/src/cli/services/schedulerService.ts`, `orchestrator/src/cli/metrics/*`.
- Maintain the existing run summary shape; use `group.entries` and `builds/tests/reviews` arrays for detail.
- Favor simple, local locking or serialized aggregation with no new dependencies.
- Mini-spec: `tasks/specs/0909-orchestrator-run-reporting-consistency.md`.

## Open Questions
- None. See tech spec for implementation decisions.

## Approvals
- Product: pending
- Engineering: pending
- Design: N/A

## Evidence and Manifests
- Implementation-gate/guardrails manifest: `.runs/0909-orchestrator-run-reporting-consistency/cli/2025-12-21T14-02-47-637Z-9f7c2ccb/manifest.json`.
- Metrics/state snapshots: `.runs/0909-orchestrator-run-reporting-consistency/metrics.json`, `out/0909-orchestrator-run-reporting-consistency/state.json`.
