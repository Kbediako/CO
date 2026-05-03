# ACTION_PLAN - CO-442 classify Codex rollout-item thread-not-found review log noise

## Summary
- Goal: create the CO-442 docs-first packet and traceability mirrors so the review-log classification work can leave Backlog with its guardrails intact.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - `review/telemetry.json` is authoritative only when it is present, parseable, successful, and not contradicted by wrapper errors.
  - The raw review output log remains visible.
  - CO-442 is independent of the `CO-441` owner re-home lane.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `codex_core::session`
  - `failed to record rollout items`
  - `thread not found`
  - `review/telemetry.json`
  - `review_outcome`
  - `clean-success`
  - `bounded-success`
  - `status=succeeded`
  - `error=null`
  - `CO-441`
  - `backlog_head_follow_up_traceability_pending`
- Not done if:
  - successful telemetry plus the log line still surfaces as a failed review
  - missing or failed telemetry can be waved through as benign
  - no regression fixture, parser coverage, or operator guidance exists for the log shape
  - raw logs are deleted, suppressed, filtered, or hidden
  - standalone review or review-wrapper behavior is weakened
  - the lane changes `CO-441` owner re-home surfaces
- Pre-implementation issue-quality review:
  - 2026-05-03: CO-442 is a classification and traceability lane, not a raw-log cleanup lane.
  - 2026-05-03: the micro-task path is unavailable because correctness depends on protected wording, exact status surfaces, and a fail-closed telemetry boundary.
  - 2026-05-03: packet setup must happen before the issue leaves Backlog.
- Fallback / refactor decision: retain a narrow classification seam for this external log shape only when telemetry proves success; fail closed otherwise.

## Milestones & Sequencing
1. Read nearby docs-first packet patterns for provider-worker follow-up lanes.
2. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror for CO-442.
3. Register the CO-442 task in `tasks/index.json`.
4. Add a top `docs/TASKS.md` snapshot.
5. Add six active rows to `docs/docs-freshness-registry.json`.
6. Record that the packet clears `backlog_head_follow_up_traceability_pending`.
7. Run scoped packet validation: JSON parse, path scan, protected-term scan, docs checks where feasible.
8. Re-check control-host queue state and keep provider intake under the active issue cap.
9. Parent implementation follow-up adds fixture/parser coverage and status/workpad/handoff classification changes.

## Dependencies
- Linear issue `CO-442` / `8a453a7c-ba31-4604-a88e-2e4c6244ec51`.
- Source issue `CO-441` / `b9e7583a-3051-40d3-a87f-0388faa9df61`.
- Standalone review wrapper telemetry and review output logs.
- Provider-worker status, workpad, and handoff projection code.

## Validation
- Checks / tests:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - targeted path scan for `linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51` and `CO-442`
  - targeted protected-term scan for the log and telemetry contract
  - `node scripts/spec-guard.mjs --dry-run`
  - `TASK=linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51 NOTES="Goal: verify CO-442 packet evidence | Summary: traceability packet only, raw logs preserved, successful telemetry authoritative | Risks: missing NOTES gate, scope bleed into CO-441" MANIFEST=.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/manifest.json codex-orchestrator review --manifest .runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/manifest.json`
  - record `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/manifest.json` plus review telemetry in the task checklist so the NOTES-backed gate remains auditable
  - `npm run docs:check`
  - `npm run docs:freshness`
  - unresolved actionable review threads = 0 before merge, or an explicit waiver is recorded in the task checklist with owner, expiry, reason, and evidence
  - focused parser/status tests after implementation begins
- Rollback plan:
  - revert only the CO-442 packet files, task index item, task snapshot, and registry rows if the packet is rejected.

## Risks & Mitigations
- Risk: the line is treated as always benign.
  - Mitigation: packet states telemetry must be present and successful, otherwise classification remains blocking.
- Risk: raw evidence is hidden to reduce noise.
  - Mitigation: packet explicitly forbids deletion, suppression, and filtering of review output logs.
- Risk: CO-442 drifts into CO-441 owner re-home work.
  - Mitigation: packet marks `CO-441` owner metadata as out of scope.

## Approvals
- Reviewer: CO operator / provider-worker parent lane.
- Date: 2026-05-03
