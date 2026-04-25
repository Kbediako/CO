# ACTION_PLAN - CO-211 repeated refresh-stuck restart churn with healthy active workers

## Summary
- Goal: stop repeated refresh-stuck and probe-timeout restart churn from re-entering while active provider workers remain healthy, and make the churn sequence machine-checkable.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned lifecycle investigation, parent-owned focused fix, parent-owned focused validation, and parent-owned docs-review/handoff.
- Assumptions: the shared source-0 payloads in the Apr 17, Apr 18, and Apr 21 child lanes are metadata/provenance only; the full issue body was read through the packaged read-only `linear issue-context` helper; PR #506 merged as `e98d459f4dfdb47a22d981fedbf5ba11053d3a95`; PR #544 is also merged; parent owns all source/test work, including quarantined samples and `probe_timeout` samples preserving fail-closed unhealthy streaks and diagnostic retention.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `stalled_after_ms=45000`
  - `owner rotations`
  - `refresh phases`
  - `surviving provider workers`
  - `co-status --format json`
  - `polling.stuck=false`
  - `polling.restart_required=false`
  - `CO-207`
  - `CO-210`
  - `CO-194`
  - `CO-163`
  - `CO-179`
  - `CO-119`
  - `CO-41`
- Not done if:
  - supervisor still reaches `restart_required` every few minutes under active healthy workers
  - the fix only makes `co-status attach` reconnect after endpoint rotation
  - the fix suppresses `provider_refresh_lifecycle_stuck` without exposing or resolving the underlying lifecycle stall
  - quarantined samples clear fail-closed unhealthy streaks or drop diagnostic retention
  - repeated `probe_timeout` samples record null diagnostics or bypass same-active-worker quarantine
  - active provider workers are killed or restarted as part of recovery
  - `CO-210` child-lane manifest hydration semantics are changed
- Pre-implementation issue-quality review:
  - 2026-04-17: docs child lane preserved the issue as a lifecycle churn plus observability problem, not an attach-only or status-only lane. The issue requires exact protected terms, restart-series evidence, phase/request/claim diagnostics, worker-preserving recovery, and a hard out-of-scope boundary for `CO-210`.
  - 2026-04-18: docs refresh child lane preserved the Apr 18 recurrence as post-PR #506 lifecycle evidence, not a reason to edit source/tests in this lane. Parent owns the recurrence source fix for quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention.
  - 2026-04-21: parent Rework lane confirmed PRs `#506` and `#544` are merged, deleted the stale workpad, reset from `origin/main`, and launched `docs-apr21-rework`. The child lane completed successfully with a zero-byte advisory patch, so parent owns this refresh plus the source fix for `last_health_status=probe_timeout` recurrence under active workers.

## Milestones & Sequencing
1. Create the docs-first packet and scoped registry/checklist mirrors for `CO-211`.
2. Parent inspects the lifecycle seams named in the workpad: `providerIssueHandoff`, polling health, public lifecycle, runtime, and supervision.
3. Parent reproduces or simulates the Apr 17 churn shape with active `CO-207` / `CO-210`-like workers still running.
4. Parent chooses the smallest durable artifact for restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`.
5. Parent adds `stalled_after_ms=45000` diagnostics for phase/request/claim class, operation age, queued/checking state, and current provider keys.
6. Parent fixes or quarantines the re-entry condition so healthy active workers do not cause repeated restart churn.
7. Parent keeps quarantined samples diagnostic-retentive so they preserve fail-closed unhealthy streaks and diagnostic retention.
8. Parent keeps timeout samples diagnostic-retentive by retaining local persisted provider-intake polling and running-worker context when the HTTP `co-status` probe times out.
9. Parent quarantines repeated `probe_timeout` churn only when the same active worker series already triggered a fail-closed timeout restart inside the bounded quarantine window.
10. Parent proves genuine stuck refreshes still emit `provider_refresh_lifecycle_stuck` and `restart_required=true`.
11. Parent proves first or unrelated `probe_timeout` samples still fail closed.
12. Parent proves recovery preserves active provider workers and request-budget/no-request-burn safeguards from `CO-163` / `CO-179`.
13. Parent verifies post-recovery `co-status --format json` with `polling.stuck=false`, `polling.restart_required=false`, and live provider workers visible.
14. Parent runs focused regression coverage for repeated churn, quarantined samples, `probe_timeout` recurrence, and a no-regression path for `CO-194`, then completes docs-review, review, and PR handoff.

## Dependencies
- Linear issue `CO-211` and current workpad comment `ac53cae1-6326-4d2d-8d2e-def8b358be13`
- Active-source references:
  - `CO-207`
  - `CO-210`
- Adjacent safeguards and regressions:
  - `CO-194`
  - `CO-163`
  - `CO-179`
  - `CO-119`
  - `CO-41`
- Parent inspection seams:
  - `providerIssueHandoff`
  - polling health
  - public lifecycle
  - runtime
  - supervision

## Validation
- Docs child lane:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `git diff --check -- docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md .agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent implementation lane:
  - focused repeated-churn regression coverage
  - focused quarantined-sample recurrence coverage preserving fail-closed unhealthy streaks and diagnostic retention
  - focused `probe_timeout` recurrence coverage proving fallback diagnostics are retained and same-series timeout churn is quarantined
  - focused `CO-194` no-regression coverage
  - manifest-backed docs-review before implementation
  - parent-selected focused validation after source edits
  - post-recovery `co-status --format json` proof with `polling.stuck=false` and `polling.restart_required=false`
- Rollback plan:
  - revert the focused lifecycle fix or churn artifact wiring if it hides genuine stuck truth or interferes with healthy active workers
  - retain this packet as the issue-shaping record even if implementation changes are rolled back

## Risks & Mitigations
- Risk: the lane drifts into `CO-210` manifest hydration or `CO-179` attach-only recovery.
  - Mitigation: keep those interpretations explicitly out of scope in the packet, checklist, and parent implementation notes.
- Risk: restart-series evidence lands only in transient logs.
  - Mitigation: require one machine-checkable artifact under the issue task path.
- Risk: the fix suppresses churn symptoms without preserving fail-closed stuck truth.
  - Mitigation: acceptance requires genuine stuck refreshes to keep `provider_refresh_lifecycle_stuck` and `restart_required=true`.
- Risk: quarantine samples stop restart churn by clearing the evidence needed for fail-closed supervision.
  - Mitigation: parent acceptance requires fail-closed unhealthy streaks and diagnostic retention to survive quarantine.
- Risk: `co-status` timeout restart records remain null-diagnostic and cannot be matched to healthy active workers.
  - Mitigation: parent acceptance requires local persisted provider-intake diagnostics to be retained on timeout samples without issuing Linear or issue-by-id reads.
- Risk: worker preservation regresses while reducing churn.
  - Mitigation: keep worker-safety acceptance explicit and require focused no-regression coverage.
- Risk: request-budget/no-request-burn safeguards regress after `restart_required=true`.
  - Mitigation: preserve `CO-163` / `CO-179` behavior as a first-class acceptance item.

## Approvals
- Docs packet child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/manifest.json`
- Apr 18 docs refresh child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/manifest.json`
- Apr 21 Rework docs child lane: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json` (zero-byte advisory; parent owns this refresh)
- Parent docs-review: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-review/cli/2026-04-21T11-10-22-712Z-bf38322e/manifest.json`.
- Parent implementation/review: focused and full validation passed; manifest-backed standalone review was attempted under `FORCE_CODEX_REVIEW=1` but stalled/drifted without a concrete verdict, so manual review fallback plus explicit elegance/minimality pass completed.
- Parent PR lifecycle: pending final PR attach, ready-review drain, and review-state handoff.
