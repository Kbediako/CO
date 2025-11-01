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

## Testing Strategy
- Unit / Integration: Extend persistence tests to cover lock contention scenarios; add command runner tests verifying truncation and recorded summaries. Exercise heartbeat loop through mocked timers to assert awaited writes.
- Tooling / Automation: Run `npm run lint`, `npm run test`, and `bash scripts/spec-guard.sh --dry-run`. Diagnostics manifest to be captured via `npx codex-orchestrator start diagnostics --format json`.
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
