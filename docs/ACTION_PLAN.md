# Action Plan Overview — Codex Orchestrator Projects

## Task 0303 — Codex Orchestrator Autonomy Enhancements
- Primary Doc: `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0303-orchestrator-autonomy/metrics.json` and `out/0303-orchestrator-autonomy/state.json` ahead of review)._ 
- Checklist Mirror: `tasks/tasks-0303-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md`, `docs/TASKS.md` (0303 section).

## Task 0901 — Orchestrator Issue Validation & Prioritization
- Primary Doc: `tasks/tasks-0901-orchestrator-issue-validation.md`
- Run Manifest Link: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- Metrics / State Snapshots: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- Checklist Mirror: `docs/TASKS.md` (0901 section).

## Task 0904 — README vs Codebase Alignment
- Primary Doc: `docs/ACTION_PLAN-readme-codebase-alignment.md`
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0904-readme-codebase-alignment/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0904-readme-codebase-alignment/metrics.json` and `out/0904-readme-codebase-alignment/state.json`)._
- Checklist Mirror: `tasks/tasks-0904-readme-codebase-alignment.md`, `docs/TASKS.md` (0904 section), `.agent/task/0904-readme-codebase-alignment.md`.

## Task 0505 — More Nutrition Pixel Archive
- Primary Doc: `tasks/0505-more-nutrition-pixel.md`
- Run Manifest Link: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`
- Archive / Artifacts: `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` *(local payload deleted on 2025-11-09 cleanup; rerun hi-fi pipeline to regenerate evidence)*
- Findings & Follow-ups: `docs/findings/more-nutrition.md`
- Checklist Mirror: `.agent/task/0505-more-nutrition-pixel.md`, `docs/TASKS.md` (0505 section)

---

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
