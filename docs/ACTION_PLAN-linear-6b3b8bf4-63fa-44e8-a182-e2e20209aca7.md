# ACTION_PLAN - CO-369: CO-360 task registry docs pointer TECH_SPEC mirror alignment

## Summary
- Goal: create the `CO-369` docs packet and give the parent lane a narrow implementation plan for `CO-360` registry/docs alignment.
- Scope: child creates the packet files; parent verifies `CO-360`, chooses the mirror/repoint path or legacy fallback-rationale path, validates, and owns integration.
- Assumptions:
  - the exact `CO-360` UUID and current registry row are parent-owned verification inputs
  - the source-0 payload path supplied in the prompt is unavailable in this child workspace
  - no child lane registry, Linear, or provider runtime edits are allowed

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-360`
  - `CO-369`
  - `tasks/index.json`
  - `items[]`
  - `paths.docs`
  - `TECH_SPEC mirror`
  - `CO-360 docs TECH_SPEC mirror`
  - `add the missing CO-360 docs TECH_SPEC mirror and repoint paths.docs`
  - `record a specific legacy fallback rationale`
- Not done if:
  - the parent cannot tell whether the intended outcome is mirror/repoint or explicit fallback rationale
  - the child packet implies registry edits were completed in this lane
  - the parent implements before verifying current `CO-360` state
  - the final state leaves `paths.docs` ambiguous, missing, or stale without a concrete rationale
- Pre-implementation issue-quality review:
  - this packet keeps the issue broader than a single blind `paths.docs` string edit and narrower than broad task-registry migration, docs freshness policy, or provider runtime work

## Milestones & Sequencing
1. Completed in this child lane: create the PRD, docs `TECH_SPEC` mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror for `CO-369`.
2. Parent applies the child patch and verifies the exact `CO-360` task UUID, canonical task spec, docs-side `TECH_SPEC` mirror state, and `tasks/index.json` `paths.docs` value.
3. Parent chooses one implementation path based on evidence:
   - add the missing `CO-360` docs `TECH_SPEC` mirror and repoint `paths.docs`, or
   - record a specific legacy fallback rationale explaining why `paths.docs` must not point to a docs mirror.
4. Parent runs focused validation for the touched registry/docs surfaces and records evidence in the task checklist/workpad.
5. Parent handles Linear state, PR lifecycle, review, and closeout.

## Dependencies
- `tasks/index.json`
- `tasks/specs`
- `docs/TECH_SPEC-*`
- `docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- parent-owned `CO-360` canonical task spec and docs mirror

## Validation
- Child checks / tests:
  - target-file presence for the six owned files
  - `git diff --check -- docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md docs/TECH_SPEC-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md docs/ACTION_PLAN-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md tasks/tasks-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md .agent/task/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
  - protected-term search across the six owned files
- Parent checks / tests:
  - inspect the `CO-360` registry row and mirror paths
  - `node scripts/spec-guard.mjs --dry-run`
  - focused docs/registry checks required by actual parent edits
  - standalone review/elegance review if the parent implementation is non-trivial
- Rollback plan:
  - revert the parent registry/mirror edit if `paths.docs` points at the wrong surface or validation proves a legacy fallback is required
  - keep this packet as issue-shaping evidence unless the Linear issue itself is re-scoped

## Risks & Mitigations
- Risk: a blind `paths.docs` update points to a docs mirror that does not exist or does not reflect canonical `CO-360` truth.
  - Mitigation: parent verifies mirror existence and content before choosing the repoint path.
- Risk: a legacy fallback remains undocumented and future agents repeat the same confusion.
  - Mitigation: fallback path is acceptable only with a specific rationale recorded in the parent-owned surfaces.
- Risk: scope expands into unrelated registry cleanup.
  - Mitigation: packet marks unrelated registry rows, docs freshness policy, and provider runtime files as explicit non-goals.

## Approvals
- Reviewer: CO-369 parent lane verification and final standalone review completed on 2026-04-25.
- Date: 2026-04-25
