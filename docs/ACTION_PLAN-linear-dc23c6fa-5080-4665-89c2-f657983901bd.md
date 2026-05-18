# ACTION_PLAN - CO-359 appserver child-lane runtime classification after pack smoke validation stall

## Summary
- Goal: create the docs-first packet for CO-359 and define the parent-owned path for classifying an appserver child-lane runtime failure surfaced by `pack-smoke-current-validation-r2`.
- Scope: docs packet only in this child lane; parent owns runtime classification, implementation, tests, validation, Linear state, workpad, PR, and merge.
- Assumptions: the parent-provided lane prompt carries the authoritative issue contract because the referenced source payload path is not materialized inside this child checkout.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `providerLinearChildLaneRunner`
  - `runtime_mode=appserver`
  - `pack-smoke-current-validation-r2`
  - `child manifest in_progress`
  - `appserver startup`
  - `no assistant follow-up`
  - `no scoped Vitest`
  - `child-lane invalidation`
  - `codex_exit_1`
  - `CO-224`
  - `CO-303`
- Not done if:
  - the work is reframed as marketplace command changes, model posture changes, broad control-host rewrite, proof/patch validation bypass, or parent-dirty fail-open behavior
  - the parent plan does not classify the gap between `child manifest in_progress` and actual assistant/test progress
  - the packet fails to preserve the `CO-224` and `CO-303` boundaries
- Pre-implementation issue-quality review:
  - 2026-04-25: docs child lane classifies CO-359 as a focused runtime regression/classification lane. The issue is not still plausibly narrower than a pack-smoke command problem because the protected evidence chain names appserver runtime/startup and missing child-lane follow-through.

## Milestones & Sequencing
1. Create PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, and task checklist for CO-359.
2. Register the canonical TECH_SPEC in `tasks/index.json` under `items[]`.
3. Run scoped docs sanity checks only: JSON parse for `tasks/index.json`, diff whitespace check, and protected-term presence check.
4. Parent inspects runtime surfaces around `providerLinearChildLaneRunner` and appserver child-lane startup/follow-up classification.
5. Parent implements the smallest focused classification/recovery change without marketplace command changes, model posture changes, broad control-host rewrite, proof/patch validation bypass, or parent-dirty fail-open behavior.
6. Parent adds focused tests for the runtime classification behavior and no-regression coverage for same-issue child-lane safety gates.
7. Parent runs docs-review / implementation-gate and PR lifecycle validation.

## Dependencies
- Parent-owned CO-359 issue/workpad and source evidence.
- Parent-owned runtime code and focused test surfaces.
- Existing child-lane proof/patch validation and parent-dirty fail-closed contracts.

## Validation
- Child-lane checks:
  - `jq empty tasks/index.json`
  - `git diff --check -- docs/PRD-linear-dc23c6fa-5080-4665-89c2-f657983901bd.md docs/TECH_SPEC-linear-dc23c6fa-5080-4665-89c2-f657983901bd.md docs/ACTION_PLAN-linear-dc23c6fa-5080-4665-89c2-f657983901bd.md tasks/tasks-linear-dc23c6fa-5080-4665-89c2-f657983901bd.md tasks/specs/linear-dc23c6fa-5080-4665-89c2-f657983901bd.md tasks/index.json`
  - protected-term `rg` across the five CO-359 markdown files
- Parent-owned checks:
  - focused runtime classification tests
  - same-issue child-lane proof/patch validation no-regression tests
  - parent-dirty fail-closed no-regression checks
  - parent-selected review and validation gates
- Rollback plan:
  - revert only the CO-359 docs packet and `tasks/index.json` item if parent rejects the issue shape; do not touch implementation/test files from this child lane.

## Risks & Mitigations
- Risk: pack-smoke evidence causes marketplace scope drift.
  - Mitigation: packet states `pack-smoke-current-validation-r2` is evidence, not the implementation owner.
- Risk: runtime failure is hidden by treating `child manifest in_progress` as healthy active work.
  - Mitigation: packet requires parent classification for the gap between in-progress manifest and actual assistant/test follow-through.
- Risk: safety gates are weakened to accept the child lane.
  - Mitigation: packet repeats no bypass of same-issue child-lane proof/patch validation and no weakening of parent-dirty fail-closed behavior.
- Risk: CO-359 duplicates adjacent issues.
  - Mitigation: packet distinguishes the later `appserver startup` / `child manifest in_progress` shape from `CO-224` and preserves `CO-303` as context only.

## Approvals
- Reviewer: parent CO-359 lane, pending
- Date: 2026-04-25
