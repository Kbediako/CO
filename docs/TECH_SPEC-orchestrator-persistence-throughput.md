# Technical Spec — Orchestrator Persistence Throughput

## Overview
- Objective: Parallelize task snapshot + manifest writes to reduce end-of-run latency.
- In Scope: `PersistenceCoordinator.handleRunCompleted` and unit coverage.
- Out of Scope: persistence formats, lock strategy, or additional telemetry.

## Architecture & Design
- Current State:
  - `handleRunCompleted` awaits `TaskStateStore.recordRun` before writing the run manifest.
  - Snapshot failures still allow manifests, but the operations are serialized.
- Proposed Changes:
  - Launch snapshot + manifest writes concurrently using `Promise.allSettled`.
  - Preserve existing error handling semantics:
    - Log snapshot errors immediately after settlement.
    - If manifest write fails, invoke `onError` (or log) and exit without emitting a second error for the snapshot.
    - If manifest succeeds but snapshot fails, invoke `onError` (or log warn) for the snapshot.
- Data Persistence / State Impact:
  - No schema changes; outputs remain identical.
- External Dependencies:
  - None beyond Node.js promises.

## Operational Considerations
- Failure Modes:
  - Snapshot lock failure continues to be non-fatal for manifest writes.
  - Manifest failures still stop the handler after reporting.
- Observability & Telemetry:
  - No new logs; reuse existing warn/error paths.
- Security / Privacy:
  - No new data exposure.
- Performance Targets:
  - Run completion persistence latency reduced to max(snapshot, manifest) instead of sum.

## Testing Strategy
- Unit / Integration:
  - Update PersistenceCoordinator tests to validate error handling under concurrent writes.
- Tooling / Automation:
  - Use diagnostics + RLM pipelines to capture evidence during discovery.
- Rollback Plan:
  - Revert to sequential awaits if concurrency causes regressions.

## Documentation & Evidence
- Linked PRD: `docs/PRD-orchestrator-persistence-throughput.md`
- Run Manifest Link: `.runs/0934-orchestrator-persistence-throughput/cli/<run-id>/manifest.json`
- Metrics / State Snapshots: `.runs/0934-orchestrator-persistence-throughput/metrics.json`, `out/0934-orchestrator-persistence-throughput/state.json`

## Approvals
- Engineering:
- Reviewer:
