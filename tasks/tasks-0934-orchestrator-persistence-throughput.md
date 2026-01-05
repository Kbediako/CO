# Task 0934 - Orchestrator Persistence Throughput

- MCP Task ID: `0934-orchestrator-persistence-throughput`
- Primary PRD: `docs/PRD-orchestrator-persistence-throughput.md`
- Tech Spec: `docs/TECH_SPEC-orchestrator-persistence-throughput.md`
- Action Plan: `docs/ACTION_PLAN-orchestrator-persistence-throughput.md`
- Mini-spec: `tasks/specs/0934-orchestrator-persistence-throughput.md`
- Run Manifest (docs review): `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-14-40-500Z-2e4b8f16/manifest.json`
- Metrics/State: `.runs/0934-orchestrator-persistence-throughput/metrics.json`, `out/0934-orchestrator-persistence-throughput/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-orchestrator-persistence-throughput.md`, `docs/TECH_SPEC-orchestrator-persistence-throughput.md`, `docs/ACTION_PLAN-orchestrator-persistence-throughput.md`, `tasks/tasks-0934-orchestrator-persistence-throughput.md`, `tasks/specs/0934-orchestrator-persistence-throughput.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0934-orchestrator-persistence-throughput-scout/cli/2026-01-05T19-12-04-736Z-5dd136d5/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-14-40-500Z-2e4b8f16/manifest.json`, `docs/TASKS.md`, `.agent/task/0934-orchestrator-persistence-throughput.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0934-orchestrator-persistence-throughput/metrics.json`, `out/0934-orchestrator-persistence-throughput/state.json`.

### Discovery (Diagnostics + RLM)
- [x] Diagnostics + RLM runs captured with hotspot summary - Evidence: `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-16-11-839Z-134db404/manifest.json`, `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-17-31-497Z-6f7af799/manifest.json`, `tasks/tasks-0934-orchestrator-persistence-throughput.md`.

### Implementation
- [x] Targeted performance fix + tests applied - Evidence: code changes, `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-26-37-274Z-8ede48e3/manifest.json`.

### Validation + Handoff
- [x] Implementation-gate manifest captured - Evidence: `.runs/0934-orchestrator-persistence-throughput/cli/2026-01-05T19-26-37-274Z-8ede48e3/manifest.json`.

## Hotspot Summary (RLM)
- `PersistenceCoordinator.handleRunCompleted` serializes task snapshot and manifest writes, extending end-of-run latency.

## Candidate fixes
- Run snapshot + manifest writes concurrently and preserve error handling semantics.
- Add test coverage for concurrent start and dual-failure prioritization.

## Relevant Files
- `orchestrator/src/persistence/PersistenceCoordinator.ts`
- `orchestrator/tests/PersistenceCoordinator.test.ts`

## Notes
- Spec Requirements: performance work requires a mini-spec; keep `last_review` current.
- Approvals Needed: PRD approval captured in `tasks/index.json` gate metadata before implementation.
- Subagent usage (required): capture at least one subagent manifest under `.runs/0934-orchestrator-persistence-throughput-*/cli/<run-id>/manifest.json`.
