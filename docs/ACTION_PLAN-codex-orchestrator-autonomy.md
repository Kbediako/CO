# Action Plan — Codex Orchestrator Autonomy Enhancements (Task 0303)

## Status Snapshot
- Current Phase: Planning (orchestrator autonomy backlog aligned, implementation pending).
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` after initial diagnostics)._
- Approvals / Escalations: None to date; retain safe `read/edit/run/network` profile and record future escalations in run manifests.

## Milestones & Tasks
1. Milestone: Foundation & Orchestrator Layer
   - Tasks: Align collateral/checklists, provision `.runs/0303-orchestrator-autonomy/**`, implement `ToolOrchestrator`, persist approval/retry metadata, add schema/tests.
2. Milestone: Unified Exec Interfaces
   - Tasks: Build `ExecSessionManager`, update unified exec streaming + sandbox retries, ship CLI `exec` command, extend Node.js SDK, document CI usage.
3. Milestone: Telemetry & Instruction Hierarchy
   - Tasks: Add OTEL exporter + metrics, deliver notification hooks, implement instruction loader + manifest hashing, publish JSONL schema docs, refresh AGENTS guidance.
4. Milestone: Verification & Review
   - Tasks: Run diagnostics, guardrail commands (`spec-guard`, lint, test, eval), execute `npm run review`, update manifests/metrics/state snapshots before hand-off.

## Risks & Mitigations
- Approval regressions: Gate `ToolOrchestrator` rollout behind feature flag; maintain manifest audits for cache hits/misses.
- Streaming performance: Benchmark PTY session manager with long-lived runs; fallback to buffered mode if latency exceeds +150 ms P95.
- Telemetry overload: Enforce retry/backoff ceiling and allow disabling OTEL exporter per environment.
- Instruction conflicts: Document precedence rules and include manifest hash comparison to detect drift.

## Next Review
- Date: 2025-11-10
- Agenda: Confirm diagnostics manifest captured, validate instruction loader prototype, approve telemetry rollout plan, and ensure spec guard evidence recorded.
