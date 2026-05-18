# ACTION_PLAN - CO workflow: reclassify blocked CO-231 validation floor on current head

## Added by Bootstrap 2026-04-18

## Summary
- Goal: refresh the blocked `CO-231` validation-floor story on current head `3d3d56959` without assuming that either inherited blocker surface is still live.
- Scope: docs-first packet, current-head docs classification, current-head `SelectedRunProjection` classification, bounded follow-up only for still-live surfaces, and truthful handoff language for blocked `CO-231`.
- Assumptions:
  - the source packet anchors from `CO-231` remain canonical context
  - the current `446` line count for `docs/TASKS.md` is a useful signal but not proof that the docs gate is green
  - the exact `SelectedRunProjection` case may now be a live blocker, a broader validation-path interaction, or a current-head non-repro

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs/TASKS.md`, `450/450 zero_headroom`, `tasks-file-too-large`, `SelectedRunProjection.test.ts`, `refreshes projection proofs when child-lane reservation ledger placeholders exist`, `current-head repro`, `live blockers or non-repros`, `CO-231`, `linear/co-231-doctor-readiness-stability-r2`
- Not done if:
  - the docs packet still implies either inherited blocker outcome before fresh current-head evidence
  - the parent cannot tell which surface is still blocking `CO-231`, if any
  - the follow-up scope expands into generic docs cleanup or broad projection refactors without fresh proof
- Pre-implementation issue-quality review:
  - this follow-up is not a generic cleanup lane. Correctness depends on exact blocker naming, exact source anchors, and truthful current-head classification, so the micro-task shortcut is not appropriate here.

## Milestones & Sequencing
1. Completed: capture live issue context, source anchors, current workpad signal, and the bounded six-file docs child-lane scope.
2. Completed in this child lane: draft the PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror without touching registry mirrors, `docs/TASKS.md`, or code/tests.
3. Parent-owned next step: rerun current-head docs evidence with `wc -l docs/TASKS.md` plus `npm run docs:check`, then classify the docs surface as live blocker or non-repro.
4. Parent-owned next step: rerun `npx vitest run --config vitest.config.core.ts orchestrator/tests/SelectedRunProjection.test.ts -t "refreshes projection proofs when child-lane reservation ledger placeholders exist"` and add broader validation only if needed to classify current-head behavior.
5. Parent-owned follow-through: implement the smallest repair only for surfaces that remain red, update workpad / handoff truth, and record whether blocked `CO-231` now has a truthful review-handoff validation floor or an explicit remaining dependency.

## Dependencies
- `out/linear-9ce7811e-45ca-4d04-b759-bc5e7da77511/workpad.md`
- `docs/TASKS.md`
- `npm run docs:check`
- `orchestrator/tests/SelectedRunProjection.test.ts`
- `npm run test`
- `CO-231` / `91749283-6dc8-4df8-aee3-5c9127c1200c`
- `linear/co-231-doctor-readiness-stability-r2`

## Validation
- Checks / tests:
  - child lane: packet-only consistency pass across the six owned files
  - parent lane: current-head docs classification (`wc -l docs/TASKS.md`, `npm run docs:check`)
  - parent lane: exact isolated `SelectedRunProjection` rerun for `refreshes projection proofs when child-lane reservation ledger placeholders exist`
  - parent lane: broader validation only if one surface remains red and needs more context
  - parent lane: standalone review and elegance review before any review handoff if a non-trivial diff lands
- Rollback plan:
  - if fresh current-head evidence shows one or both inherited blockers are stale, keep this lane docs-only and roll no speculative fix into the parent diff

## Risks & Mitigations
- Risk: stale `CO-231` blocker wording pressures the parent into fixing a surface that no longer reproduces.
  - Mitigation: require fresh current-head evidence for each inherited surface before any implementation.
- Risk: the `446` line count is treated as equivalent to a green docs gate.
  - Mitigation: keep `npm run docs:check` as the real docs classifier.
- Risk: the exact `SelectedRunProjection` timeout is misclassified without isolating the named test case first.
  - Mitigation: rerun the exact test name before escalating to broader validation paths.

## Approvals
- Reviewer: self-approved for docs-first packet drafting; parent owns reproduction, remediation, validation, and handoff approval.
- Date: 2026-04-18
