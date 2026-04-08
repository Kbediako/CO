# Technical Spec — Orchestrator Performance & Reliability Loop 2

## Overview
- Objective: Identify and resolve the highest-impact performance and reliability bottlenecks in core orchestrator pipelines with minimal, measurable changes.
- In Scope: orchestrator CLI/core pipeline execution, manifest/persistence writes + filesystem access, diagnostics and RLM discovery loops.
- Out of Scope: new pipeline features unrelated to performance, external integrations/API changes, release/versioning work.

## Context and Orientation (ExecPlan-Style)
This spec should be usable from a fresh repo checkout with no tribal knowledge.
- **Diagnostics**: `codex-orchestrator start diagnostics` pipeline (defined in `codex.orchestrator.json`).
- **RLM loop**: discovery pipeline invoked via `codex-orchestrator start rlm`.
- **Run manifests**: evidence artifacts under `.runs/<task-id>/cli/<run-id>/manifest.json`.
- **Hotspot files**: `orchestrator/src/cli/metrics/metricsAggregator.ts`, `orchestrator/src/cli/metrics/metricsRecorder.ts`.
- **Tests to extend**: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/MetricsAggregatorFlush.test.ts`.

## Architecture & Design
- Current State:
  - Diagnostics and RLM runs provide baseline evidence but no dedicated performance guardrails.
  - Persistence and manifest writes are on the critical path for most pipelines.
  - Metrics aggregation reads/parses the full `metrics.json` history each run, creating O(N) time/memory as history grows.
- Proposed Changes:
  - Use diagnostics + RLM to identify hotspots, then apply small, targeted fixes (e.g., batching, caching, reduced redundant work).
  - Add lightweight validation (tests or micro-benchmarks) where regressions are likely.
  - Update docs with evidence links for this loop.
  - Stream metrics aggregation (line-by-line) to avoid full-file reads.
  - Use atomic writes for aggregate outputs.
- Data Persistence / State Impact:
  - No schema changes; continue writing manifests under `.runs/<task-id>/` and snapshots under `out/<task-id>/`.
- External Dependencies:
  - None beyond existing Node.js and repo tooling.

## Operational Considerations
- Failure Modes:
  - Increased latency due to synchronous I/O or repeated stats.
  - Flaky pipeline stages due to excessive resource usage.
- Observability & Telemetry:
  - Use diagnostics manifests and RLM outputs to capture run durations and file activity.
  - Add minimal logging or counters only where needed to support fixes.
- Security / Privacy:
  - No new data sources or sensitive inputs.
- Performance Targets:
  - 10–20% diagnostics runtime improvement where achievable without risky changes.

## Testing Strategy
- Unit / Integration:
  - Add or update targeted tests for any modified persistence or pipeline logic.
- Tooling / Automation:
  - Use `diagnostics` and `rlm` pipelines to validate behavior under non-interactive runs.
- Rollback Plan:
  - Revert isolated changes if metrics regress or tests fail; keep diffs small for fast rollback.

## Validation and Acceptance
- Demonstrate measurable improvement vs baseline (target 10–20% where feasible).
- No regressions in unit/integration tests; repeated runs remain stable.
- Output artifacts remain schema-compatible and reviewable.

## Idempotence and Recovery
- Each baseline/validation run should produce a new `<run-id>` without corrupting prior evidence.
- If a step fails mid-run, re-run the exact same command; avoid manual artifact edits.

## Documentation & Evidence
- Linked PRD: `docs/PRD-orchestrator-performance-reliability-loop-2.md`
- Run Manifest Link: `.runs/0939-orchestrator-performance-reliability-loop-2/cli/2026-01-06T07-49-03-214Z-a31732c2/manifest.json`
- Metrics / State Snapshots: `.runs/0939-orchestrator-performance-reliability-loop-2/metrics.json`, `out/0939-orchestrator-performance-reliability-loop-2/state.json`

## Approvals
- Engineering:
- Reviewer:
