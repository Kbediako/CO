# ACTION_PLAN - Reduce practical Linear request-bucket exhaustion under low-headroom single-issue operation

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: reduce request-bucket exhaustion frequency by combining earlier request-pressure slowdown with bounded read-only helper cache reuse.
- Scope:
  - bootstrap the docs packet, registry mirrors, and single Linear workpad
  - run audited docs-review before implementation
  - land the smallest shared-budget and provider-helper changes that reduce request burn without weakening fail-fast truth
  - add focused tests, proof notes, and full validation
- Assumptions:
  - `CO-106` substrate hardening is already correct and should remain unchanged
  - the main remaining burn sources are tracked-issue polling cadence and repeated helper rereads

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `requests.remaining`, `complexity.remaining`, `linear_budget_shared_cooldown`, `provider-linear:issue-context`, earlier slowdown, reduced redundant rereads, lower steady-state request burn
- Not done if:
  - low-concurrency work still predictably burns through the request bucket before slowdown starts
  - helper rereads still spend live requests when fresh authoritative cache truth is already available
  - cooldown fail-fast truth is weakened
- Pre-implementation issue-quality review:
  - The current lane is narrower than a full rate-limit redesign. Current repo truth shows the substrate is already hardened, so this implementation stays bounded to request-burn reduction at the polling scheduler and read-only helper cache seams.

## Milestones & Sequencing
1) Register the `linear-bd8ae57a-71b5-4eb9-9b69-70841cc16827` docs packet, registry mirrors, and initial workpad source, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Audit the current request-burn seams across `linearBudgetState.ts`, `providerLinearWorkflowFacade.ts`, `controlServerPublicLifecycle.ts`, and local `.runs` artifacts so the implementation targets actual request spend instead of broader substrate changes.
3) Implement bounded reset-aware polling slowdown and low-headroom read-only issue-context cache reuse, then add focused regressions for request-vs-complexity separation and helper reread reduction.
4) Capture before/after proof notes, run the required validation floor, perform standalone review plus an elegance pass, and refresh the workpad for review handoff.

## Dependencies
- `orchestrator/src/cli/control/linearBudgetState.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/tests/LinearBudgetState.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused `LinearBudgetState` and `ProviderLinearWorkflowFacade` regressions
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - keep the changes isolated to shared polling interval selection and provider helper cache reuse so a revert can cleanly remove the request-burn reduction slice

## Risks & Mitigations
- `docs/TASKS.md` is already at the line cap.
  - Mitigation: use the repo-supported task-archive fallback after registering the new snapshot.
- Cache reuse could accidentally mask real live changes.
  - Mitigation: keep reuse bounded to the read-only `issue-context` path under degraded request pressure and retain cooldown fail-fast.
- Earlier slowdown could drift into complexity-driven behavior instead of request-bucket behavior.
  - Mitigation: compute the new guard from request buckets and add explicit request-vs-complexity regression coverage.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream rerun passed `spec-guard` and `docs:check` after the repo-supported `docs:archive-tasks` fallback, then failed only on the existing repo-wide `docs:freshness` stale-doc baseline; manual fallback accepted
- Date: 2026-04-09
