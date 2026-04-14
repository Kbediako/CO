# ACTION_PLAN - CO workflow: make parent-owned same-issue child lanes parallel-first by default where safe

## Summary
- Goal: make ordinary provider-worker turns start from a safe parallel-first posture by requiring a pre-turn decomposition matrix, rejecting broad serial defaults, bounding child-lane cap semantics, preserving parent ownership, and proving adoption through a shaped canary.
- Scope: docs-first packet, single workpad, current-turn `parallelize_now` decision, bounded `surface-inventory` child lane, provider-worker guidance/discoverability changes, focused tests, shaped canary report, validation, standalone review, elegance pass, and PR/review handoff.
- Assumptions:
  - `CO-35` child-lane runtime, `CO-101` current-turn decision recording, and `CO-125` provider admission constraints are present and should be reused.
  - This lane can add policy/canary helpers without mutating live issue states outside CO-174.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `parallelize_now`, `stay_serial`, `forbid_parallel`, `independent_scope_available`, parent-owned same-issue child-lane parallelization, pre-turn decomposition matrix, child-lane cap, parent ownership discipline, and shaped canary.
- Not done if: serial decisions remain allowed while safe independent child-lane candidates exist, cap exhaustion is silent, parent delegated-file restraint is absent, or canary reporting counts metric-only child lanes.
- Pre-implementation issue-quality review: approved. The packet preserves the full issue-shaping contract and rejects the nearby wrong interpretations from the Linear issue.

## Milestones & Sequencing
1. Bootstrap Linear state/workpad, record the turn-level `parallelize_now` decision, and launch `surface-inventory` as a bounded same-issue child lane.
2. Register PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`; repair archive line budget if needed.
3. Run audited docs-review before implementation and record manifest/fallback evidence.
4. Inspect and accept/reject/invalidate the `surface-inventory` child-lane result before touching delegated implementation/test scope.
5. Implement the smallest provider-worker policy, discoverability, cap/canary, and test changes that satisfy the acceptance criteria.
6. Run focused tests, shaped canary, required validation floor, manifest-backed standalone review, explicit elegance pass, PR creation/update, PR feedback sweep, and `pr ready-review` before review-state handoff.

## Dependencies
- `providerLinearWorkerRunner.ts`, `providerLinearChildLaneShell.ts`, `linearCliShell.ts`, focused tests, `skills/linear/SKILL.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review --stream co-174-docs-review --format json`
  - focused provider-worker, child-lane, help, and canary regression tests
  - shaped canary report comparing against `5/235` `parallelize_now`
  - required floor: delegation guard, spec guard, build, lint, test, docs check/freshness, repo stewardship, and diff budget
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` if CLI/package/skills/review-wrapper surfaces are touched
- Rollback plan:
  - revert the CO-174 policy/canary changes and docs packet together, leaving `CO-35`, `CO-101`, and `CO-125` contracts untouched.

## Risks & Mitigations
- Unconditional parallelization or admission bypass: require matrix, overlap/dependency checks, cap accounting, truthful `forbid_parallel`, and explicit `CO-125` preservation.
- Metric-hack canary or parent collision: require accepted/rejected/invalidated outcome reasons, zero metric-only lanes, parent delegated-file restraint, and focused validation.

## Approvals
- Reviewer: pending docs-review
- Date: pending
