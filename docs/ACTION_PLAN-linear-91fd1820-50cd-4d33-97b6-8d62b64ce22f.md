# ACTION_PLAN - CO-574 Control-Host Recovery Admission

## Summary

- Goal: stop accepted/no-run provider recovery from producing terminal no-launch acknowledgements or refreshed stale state without launch/retry/release evidence, and keep `/ui/machine-status.json` bounded under stalled reads.
- Scope: provider recovery API, provider issue handoff rehydrate/recovery predicates, machine-status controller degradation, focused supervision behavior if needed.
- Assumptions: CO-570 may continue running while this break-glass workspace implements CO-574; shared root remains clean latest `main`.

## Issue Readiness Gate

- Intent checksum / protected terms carried forward: `control-host`, `provider_issue_rehydration_pending_revalidation`, `provider_worker_recover_no_launch_evidence`, `provider_issue_start_blocked:max_concurrency`, `launch_token`, `run_id`, `run_manifest_path`.
- Not done if: the operator still needs Backlog/In Progress cycling to recover CO-574/CO-575, or a no-run accepted claim can be mistaken for a terminal clean skip.
- Pre-implementation issue-quality review: live CO-574/CO-575 evidence plus GPT Pro advisory identify acknowledgement semantics, stable stale anchor, and active-worker probe churn as the root seams.
- Fallback / refactor decision: this task touches fallback/stale recovery behavior. Remove the no-launch observation fallback, remove refreshed stale-clock behavior, and keep only a tested fail-closed supervision restart path for true dead-host cases.
- Durable retention evidence: any retained degraded supervision path must name the active-worker protection contract and have tests.
- Large-refactor check: a bounded cross-surface fix is warranted because another one-line timeout or state-cycle patch would leave authority split.

## Milestones & Sequencing

1. Add/update tests that reproduce accepted pending-revalidation no-launch acknowledgements and stale-anchor refresh.
2. Patch observability/recovery semantics so intermediate accepted/no-run observations return queued pending, not terminal skipped/no-launch.
3. Patch provider rehydrate/recovery state so manifestless accepted claims retain a stable recovery age anchor.
4. Add machine-status endpoint timeout/degraded JSON coverage so read stalls cannot hang the endpoint.
5. Add control-host supervision regression if the implementation touches probe timeout behavior.
6. Run focused tests, then repo validation gates and review.

## Dependencies

- CO-575 remains blocked on this issue.
- PR #868 / CO-567 review can proceed independently.
- CO-570 worker may release capacity during implementation.

## Validation

- Checks / tests: focused affected tests first, then `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness` where baseline permits.
- Current blocker classification: `npm run docs:freshness` and `npm run docs:freshness:maintain` remain blocked by external CO-573 rolling/spec-guard maintenance debt with `blocking changed paths: 0`; this lane must not repair that owner debt inline.
- Rollback plan: revert the CO-574 branch/PR; do not manually edit live provider-intake state.

## Risks & Mitigations

- Risk: hiding real failed launches by making no-launch pending. Mitigation: only classify intermediate accepted/no-run observations as queued while the background recovery promise is still in flight; completed handoff failures still return terminal results.
- Risk: over-launching under real capacity constraints. Mitigation: preserve admission gate checks and add tests for capacity-blocked state.
- Risk: broadening into docs freshness. Mitigation: CO-575 stays linked and blocked, not edited here.

## Approvals

- Reviewer: parent orchestrator
- Date: 2026-05-21
