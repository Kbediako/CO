# Action Plan — Codex Orchestrator Resilience Hardening (Task 0202)

## Status Snapshot
- Current Phase: Ready for review (persistence + telemetry hardening complete).
- Run Manifest Link: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`
- Metrics / State Snapshots: `.runs/0202-orchestrator-hardening/metrics.json`, `out/0202-orchestrator-hardening/state.json` (updated 2025-10-31).
- Approvals / Escalations: None required; safe `read/edit/run/network` profile maintained.

## Milestones & Tasks
1. Milestone: Persistence Reliability
   - Tasks: Implement retry/backoff in `TaskStateStore`, adjust `PersistenceCoordinator` to continue manifest writes on snapshot failure, add unit coverage for contention.
2. Milestone: Heartbeat Safety
   - Tasks: Queue heartbeat writes with awaited async handling, throttle manifest persistence to 30s intervals, log failures with context.
3. Milestone: Output Bounding & Verification
   - Tasks: Cap command runner buffers, truncate error payloads, refresh docs/checklists, execute diagnostics + guardrail commands, run `npm run review`.

## Risks & Mitigations
- Excessive contention prolongs retries — cap retries to <3s and surface warnings in logs.
- Heartbeat queue drift — force manifest flush on completion and during error handling.
- Truncated output hides root cause — record full logs in `.ndjson` files while trimming summaries/error payloads.

## Next Review
- Date: 2025-11-03
- Agenda: Confirm retry metrics, validate diagnostics manifest `2025-10-31T22-56-34-431Z-9574035c`, approve documentation updates.
