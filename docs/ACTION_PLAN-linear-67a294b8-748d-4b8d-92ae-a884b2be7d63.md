# ACTION_PLAN: CO-415 repair current-main core validation timeout cluster

## Added by Provider Worker 2026-04-28

## Summary
- Goal: Restore terminal-green current-main core validation for the reduced timeout cluster that blocks CO-409.
- Scope: Docs-first packet, reduced-cluster reproduction, worker-cap root cause isolation, focused config/test patch, full validation, review, PR handoff, and CO-409 unblock guidance.
- Assumptions: The CO-417 proof-lock recovery commit is already on `origin/main`; this lane starts by fast-forwarding to that current baseline before implementation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `npm run test`, `vitest.config.core.ts`, `ControlRuntime.test.ts`, `ProviderLinearChildLaneRunner.test.ts`, `Doctor.test.ts`, `cli-command-surface.spec.ts`, current-main baseline, timeout failures, `projects authoritative budget exhaustion event text into running rows`, CO-409, and docs:freshness.
- Not done if: full core validation remains red for the named timeout/assertion family, or if the fix deletes/quarantines tests or relies on a waiver.
- Pre-implementation issue-quality review: The issue is not a CO-409 docs repair. It is a current-main validation repair, and the narrow implementation target is the core Vitest non-interactive worker-cap seam after reproduction showed the cluster passes with lower concurrency.
- Fallback / refactor decision: No fallback introduced; no large refactor required.

## Milestones & Sequencing
1. Read live Linear context, move `Ready` to `In Progress`, create one workpad, and record one parallelization decision.
2. Create the docs-first packet and registry mirrors.
3. Reproduce the reduced cluster on the current branch and classify the failure family.
4. Prove lower worker concurrency makes the reduced cluster pass without assertion changes.
5. Patch the worker-cap config and contract test.
6. Run focused config and reduced-cluster validation.
7. Run full repository validation gates, standalone review, elegance pass, PR attach/update, ready-review drain, and review handoff.

## Dependencies
- `vitest.config.core.ts`
- `tests/vitest-progress-config.spec.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/ProviderLinearChildLaneRunner.test.ts`
- `orchestrator/tests/Doctor.test.ts`
- `tests/cli-command-surface.spec.ts`

## Validation
- Checks / tests: focused config contract, reduced four-file cluster, full `npm run test`, docs and stewardship gates, review wrapper, and elegance pass.
- Rollback plan: Revert the worker-cap and contract-test change if it fails full `npm run test`, hides failures, or materially regresses local interactive validation.

## Risks & Mitigations
- Risk: Lowering workers hides a real source bug. Mitigation: preserve all assertions and prove the same named files pass under lower concurrency before full-suite validation.
- Risk: Full suite becomes too slow. Mitigation: use cap `2`, not serial-only, because the reduced cluster passed at `--maxWorkers=2`.
- Risk: Scope creeps into CO-409 docs freshness. Mitigation: keep docs freshness out of implementation and record CO-409 rerun guidance only after validation is green.

## Approvals
- Reviewer: Pending docs-review and implementation review.
- Date: 2026-04-28
