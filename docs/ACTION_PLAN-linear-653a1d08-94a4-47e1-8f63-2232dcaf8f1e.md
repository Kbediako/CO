# ACTION_PLAN - linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e

## Summary
- Goal: stabilize the provider-worker validation and standalone-review path for long-running suites without broadening CO-117 feature scope.
- Scope: docs-first packet, single workpad upkeep, focused reproductions, owner classification, minimal validation or review-wrapper repair, and required validation plus review handoff gates.
- Assumptions:
  - the issue’s earlier `cli-frontend-test` timeout may already be stale on the current tree because the test now bootstraps an isolated temp package root
  - the current blocker is most likely split across a few overlapping validation and review-owner surfaces rather than requiring a broad repo-wide CI rewrite

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `validation-stability lane`, `implementation-gate`, `npm run test`, `ProviderLinearWorkerRunner.test.ts`, `failed-boundary`, and the requirement for a machine-checkable explanation of timeout vs suite failure vs both.
- Not done if: implementation-gate still terminates `npm run test` without clear root cause and fix, `ProviderLinearWorkerRunner.test.ts` remains unclassified red, or provider-worker handoff still depends on ad hoc manual review fallback.
- Pre-implementation issue-quality review: approved. The issue is already narrower than a feature lane or generic CI cleanup lane; the remaining job is to reproduce and classify the blocker truthfully on current `HEAD`.

## Milestones & Sequencing
1. Create the CO-134 docs packet, task mirrors, registry entries, and initial `## Codex Workpad`, then upsert the workpad and run an audited `linear child-stream --pipeline docs-review`.
2. Capture current evidence for the named blockers via focused Vitest and manifest-backed validation or review runs.
3. Classify the blocker as stage timeout, true suite failure, review-boundary drift, or a combination, and land the smallest truthful fix or narrowed contract.
4. Re-run the focused reproductions, `implementation-gate`, and forced standalone review until the resulting evidence is explicit and stable.
5. Run the required validation floor, standalone review, and elegance pass, then prepare PR or review handoff only if the lane is truly ready.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `tests/cli-frontend-test.spec.ts`
- `scripts/run-review.ts`
- `scripts/lib/review-command-intent-classification.ts`
- `scripts/lib/review-execution-state.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `orchestrator/src/cli/services/commandRunner.ts`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused reproductions for `ProviderLinearWorkerRunner.test.ts` and `cli-frontend-test.spec.ts`
  - manifest-backed `implementation-gate` reproduction or rerun
  - forced standalone-review rerun with telemetry classification captured
  - full repo validation floor before handoff
- Rollback plan:
  - revert the owner-surface fix and restore the previous contract together if the new classification path changes provider-worker semantics without improving validation truth

## Risks & Mitigations
- Risk: the older frontend timeout evidence is stale and could send the lane into the wrong owner surface.
  - Mitigation: rerun `tests/cli-frontend-test.spec.ts` early and explicitly record whether it is still an active owner.
- Risk: the blocker is a combination of stage timeout and review-boundary classification, which could tempt scope creep.
  - Mitigation: classify each failure path separately and only touch the surfaces that current evidence proves.
- Risk: fixing the review boundary could accidentally weaken bounded-review enforcement.
  - Mitigation: keep the heavy-command guard explicit and add or retain focused telemetry classification coverage.

## Approvals
- Reviewer: `codex-orchestrator docs-review (manual fallback accepted)`
- Date: 2026-04-10
- Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-docs-review/cli/2026-04-10T00-23-47-516Z-b5b978f9/manifest.json`, `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002347Z-docs-review-fallback.md`
