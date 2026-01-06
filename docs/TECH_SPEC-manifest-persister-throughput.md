# Technical Spec — Manifest Persister Throughput

## Overview
- Objective: Reduce persistence flush latency by running manifest + heartbeat writes concurrently.
- In Scope: `ManifestPersister.flushPersist` and unit tests.
- Out of Scope: manifest formats, scheduling logic, or additional telemetry.

## Architecture & Design
- Current State:
  - `flushPersist` awaits `writeManifest` and then `writeHeartbeat` when both are dirty.
  - Failures re-dirty both flags, even when only one write failed.
- Proposed Changes:
  - Execute manifest and heartbeat writes concurrently via `Promise.allSettled`.
  - Track errors separately and re-dirty only the failed channel.
  - Preserve error semantics by throwing manifest errors first, then heartbeat errors.
- Data Persistence / State Impact:
  - Outputs remain identical; only timing and retry behavior change.
- External Dependencies:
  - None beyond built-in Promise utilities.

## Operational Considerations
- Failure Modes:
  - If both writes fail, prefer manifest error for the thrown failure.
  - If only heartbeat fails, retry heartbeat without re-writing manifest.
- Observability & Telemetry:
  - No new logging; rely on existing error surfacing.
- Security / Privacy:
  - No new data exposure.
- Performance Targets:
  - Flush duration becomes max(manifest, heartbeat) instead of sum.

## Testing Strategy
- Unit / Integration:
  - Add tests to confirm manifest + heartbeat start concurrently.
  - Add tests to ensure only the failed channel is retried.
- Tooling / Automation:
  - Use diagnostics + RLM pipelines to capture evidence during discovery.
- Rollback Plan:
  - Revert to sequential writes if concurrency causes regressions.

## Documentation & Evidence
- Linked PRD: `docs/PRD-manifest-persister-throughput.md`
- Run Manifest Link: `.runs/0935-manifest-persister-throughput/cli/<run-id>/manifest.json`
- Metrics / State Snapshots: `.runs/0935-manifest-persister-throughput/metrics.json`, `out/0935-manifest-persister-throughput/state.json`

## Approvals
- Engineering:
- Reviewer:
