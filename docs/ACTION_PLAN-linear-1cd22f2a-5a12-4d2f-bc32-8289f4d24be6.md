# ACTION_PLAN - CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint

## Added by Bootstrap 2026-04-11

## Summary
- Goal: verify the stale CO-128 failure against the fresh rework branch and land only the smallest truthful delta for current `origin/main`.
- Scope:
  - recreate the docs-first packet, registry mirrors, and fresh workpad state after `Rework`
  - run an audited docs-review child stream
  - reproduce the hang in the suite and direct CLI path on current `origin/main`
  - reapply only the minimal startup-seam fix plus focused validation evidence when the fresh branch still reproduces the bug
- Assumptions:
  - the prior closed branch captured useful historical context, but it is not current truth until the fresh branch reproduces the same seam
  - if fresh current-main validation already passes, the correct outcome is a docs-only closeout rather than a revived runtime patch

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `tests/cli-frontend-test.spec.ts`, `frontend-test`, `bin/codex-orchestrator.ts frontend-test --format json`, `pre-manifest hang`, `node --loader ts-node/esm`
- Not done if:
  - the focused suite still times out
  - direct CLI repros still hang before manifest creation
  - the only change is timeout inflation instead of a seam fix
- Pre-implementation issue-quality review:
  - the issue is already bounded to one CLI surface and explicit failing artifacts, so the truthful next move is a reset-aware bootstrap/debugging pass on current `origin/main`, not a broader provider or frontend lane.

## Milestones & Sequencing
1. Draft the `CO-128` docs packet, registry mirrors, and fresh checklist mirrors on the rework branch.
2. Run an audited `linear child-stream --pipeline docs-review` pass and record the result before implementation.
3. Reproduce the hang in `tests/cli-frontend-test.spec.ts` and the direct `node --loader ts-node/esm ... frontend-test --format json` path on current mainline code.
4. If the fresh branch still reproduces the issue, compare the seam against the captured old CO-128 diff and implement only the smallest fix that still matches current source. If it does not reproduce, update the packet and workpad to close the lane as a current-main non-repro.
5. Run focused validation, repo-required validation, standalone review, and an explicit elegance/minimality pass on the final truthful diff before any new PR or review handoff. If unrelated blockers appear, file a narrow follow-up instead of widening CO-128.

## Dependencies
- `tests/cli-frontend-test.spec.ts`
- `tests/cli-command-surface.spec.ts`
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/frontendTestCliRequestShell.ts`
- `orchestrator/src/cli/frontendTestCliShell.ts`

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - `npm run test -- tests/cli-frontend-test.spec.ts`
  - manual `frontend-test --format json` repro under `node --loader ts-node/esm`
  - focused adjacent smoke only if the chosen seam needs it
- Rollback plan:
  - revert the startup-seam change if the focused suite or manual repro still fails and reopen investigation from the saved reproduction output

## Risks & Mitigations
- Risk: current `origin/main` no longer reproduces the exact same seam as the closed branch.
  - Mitigation: treat the old diff only as a candidate reapply set and anchor the implementation to fresh repro output.
- Risk: the stall is in a lower runner path rather than bootstrap.
  - Mitigation: save direct repro output and stop once manifest creation proves where control reaches.
- Risk: the fix drifts into generic runtime cleanup.
  - Mitigation: create a follow-up issue for any broader improvement discovered during root-cause work.

## Approvals
- Reviewer: docs-review child stream passed cleanly on the refreshed packet; standalone review fallback recorded after wrapper boundary
- Date: 2026-04-11
