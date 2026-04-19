# ACTION_PLAN - CO: reclaim / reclassify / re-admit plain released/not_active issues across Backlog -> Ready with a free slot

## Added by Bootstrap 2026-04-18

## Summary
- Goal: close `CO-240` by making the control host reclaim / reclassify / re-admit eligible plain released/not-active issues when live state moves from `Backlog` back to `Ready` and there is a free slot / `max_allowed=3`.
- Scope: docs-first packet only in this child lane; parent-owned implementation, focused regressions, validation, review, and PR lifecycle after import.
- Assumptions:
  - the issue body names `CO-236` as a protected adjacent contract
  - the failure is narrower than a generic capacity or lifecycle-health rewrite
  - live `Ready` truth plus one free slot is sufficient to reopen admission without `manual-launch`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, `provider-intake-state.json`, free slot / `max_allowed=3`, reclaim / reclassify / re-admit, and `fresh_discovery`
- Not done if:
  - the parent lane can still strand a live `Ready` issue behind plain released/not-active residue after `Backlog` -> `Ready`
  - the only proposed fix is `manual-launch`
  - the explanation drifts into generic `max-concurrency`, `stale-Blocked-only`, or generic `refresh-loop` language
  - adjacent `CO-236` or prior reclaim lanes are reopened without evidence
- Pre-implementation issue-quality review:
  - 2026-04-18: this child-lane packet keeps the lane explicitly on reclaim / reclassify / re-admit across `Backlog` and `Ready`. The micro-task path is ineligible because correctness depends on protected wording, adjacent reclaim boundaries, and precise issue-state naming.

## Milestones & Sequencing
1. Draft the six scoped docs/task files only and leave shared registries untouched.
2. Parent imports the packet, updates `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` if needed, and runs parent-owned docs-review/spec-guard.
3. Parent identifies the narrow reclaim seam that should reclassify stale plain released/not-active residue against live `Backlog` / `Ready` truth.
4. Parent adds focused regressions for `Backlog` -> `Ready` reclaim / reclassify / re-admit with free slot / `max_allowed=3`.
5. Parent reruns adjacent reclaim/fair-admission coverage so `CO-236`, `CO-202`, `CO-203`, `CO-212`, and `CO-181` boundaries remain intact.
6. Parent completes required validation, standalone review, elegance pass, workpad refresh, PR handling, and review-state transition.

## Dependencies
- `provider-intake-state.json`
- `providerIssueHandoff.ts`
- `providerLinearWorkflowStates.ts`
- `fresh_discovery`
- parent-owned focused provider handoff and control-host regressions
- adjacent reclaim behavior from `CO-202`, `CO-203`, `CO-212`, and `CO-181`

## Validation
- Checks / tests:
  - child lane: scoped diff/packet review only
  - parent lane: focused regression for plain `provider_issue_released:not_active` `Backlog` -> `Ready` re-admit
  - parent lane: focused regression for free slot / `max_allowed=3`
  - parent lane: focused adjacent-lane coverage where the chosen seam touches prior reclaim logic
  - parent lane: docs-review / spec-guard plus normal validation/review gates
- Rollback plan:
  - revert the narrow reclaim classification change and focused regressions together if the fix duplicates workers, loses audit evidence, or blurs adjacent reclaim boundaries
  - preserve the issue packet even if implementation rolls back, provided it remains truthful about the protected contract

## Risks & Mitigations
- Risk: the parent broadens the change into generic capacity policy.
  - Mitigation: keep free slot / `max_allowed=3` framed as evidence that admission is available, not as a request to redesign caps.
- Risk: the parent narrows the change into `stale-Blocked-only`.
  - Mitigation: require explicit `Backlog` / `Ready` reclassification coverage and keep that wording in acceptance criteria.
- Risk: the parent solves the issue with `manual-launch`.
  - Mitigation: keep reclaim / reclassify / re-admit on the normal control-host path as a hard requirement.
- Risk: adjacent reclaim lanes regress.
  - Mitigation: cite `CO-236`, `CO-202`, `CO-203`, `CO-212`, and `CO-181` explicitly in focused review and validation.

## Approvals
- Reviewer: pending parent lane acceptance, docs-review, and implementation validation
- Date: 2026-04-18
