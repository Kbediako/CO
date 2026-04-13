# ACTION_PLAN - CO STATUS: clear stale retry state when active claims rehydrate so one issue cannot appear in both Running and Backoff

## Added by Bootstrap 2026-04-10

## Summary
- Goal: land the smallest truthful claim-state fix so active-run rehydrates clear stale retry metadata and one issue no longer appears in both `Running` and `Backoff`.
- Scope:
  - bootstrap the issue packet, registry mirrors, and single workpad
  - run audited `docs-review` before implementation
  - reproduce or lock the stale retry rehydrate shape from current tests/artifacts
  - implement the bounded claim-state fix
  - add focused regressions and complete the required validation/review gates
- Assumptions:
  - runtime/dashboard layers are mostly truthful already
  - the main defect is stale retry metadata surviving authoritative running rehydrate

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO STATUS`, `Running`, `Backoff`, `retry_queued`, `retry_due_at`, `retry_error`, `provider_issue_rehydrated_active_run`, `providerIssueHandoff.ts`, `providerIntakeState.ts`, `CO-127`
- Not done if:
  - a running rehydrated claim still carries stale retry metadata
  - one issue can still appear in both `Running` and `Backoff` after authoritative rehydrate
  - real retry-owned flows lose Backoff behavior
- Pre-implementation issue-quality review:
  - Source audit matches the issue: `providerIssueHandoff.ts` active rehydrate writes clear `merge_closeout` but not all stale retry metadata, and `providerIntakeState.ts` can preserve retry fields from existing claim state. The renderer is not the primary bug.

## Milestones & Sequencing
- [x] Register the `linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc` docs packet, task mirrors, freshness registry entries, `docs/TASKS.md` snapshot, and initial workpad source.
- [x] Run audited `linear child-stream --pipeline docs-review` and record the manifest-backed result. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`, `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.
- [x] Reproduce the stale retry rehydrate shape from current tests or local intake artifacts and enumerate every active-run rehydrate/upsert path that must clear retry metadata.
- [x] Implement the smallest source-of-truth fix in `providerIssueHandoff.ts` and any bounded `providerIntakeState.ts` defaulting seam that still preserves stale retry metadata on running claims.
- [x] Add focused regressions proving the same issue no longer projects into both `Running` and `Backoff` after rehydrate while real retry-owned flows still queue correctly.
- [ ] Run the required validation floor, standalone review, and elegance pass before PR/review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIntakeState.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`

## Validation
- [x] Audited `linear child-stream --pipeline docs-review` rerun passed cleanly. Evidence: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`, `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.
- [x] Focused stale-retry rehydrate regressions in handoff/intake/runtime tests.
- [ ] Required local validation floor (`node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `FORCE_CODEX_REVIEW=1 npm run review`, `npm run pack:smoke`) is still in progress because the parent review hit a wrapper `failed-boundary` stop and `npm run pack:smoke` has not yet been rerun on the rework branch head.
- [x] Explicit elegance/minimality pass recorded before review handoff.
- Rollback plan:
  - keep the change bounded to claim retry-state management so revert remains isolated if needed

## Risks & Mitigations
- Active rehydrate logic may be duplicated across several branches in `providerIssueHandoff.ts`.
  - Mitigation: audit all `provider_issue_rehydrated_active_run` writers before editing and centralize retry-state clearing where possible.
- Tightening retry-field defaults could accidentally affect real retry-owned flows.
  - Mitigation: preserve `resumable` / `handoff_failed` coverage and add focused regressions for those paths.
- `docs-review` may still stop on the standing repo-wide docs baseline rather than this packet.
  - Mitigation: record truthful manifest-backed fallback rather than treating repo-baseline drift as a packet-shape blocker.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream `docs-review-rework-rerun` (`succeeded`, `clean-success`)
- Date: 2026-04-10
