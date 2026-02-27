# ACTION_PLAN - CO 0.1.37 Release + Codex 0.107 Canary

## Summary
- Goal: Release CO patch and complete Codex prerelease canary decision.
- Scope: Docs-first scaffolding, delegated execution streams, release lifecycle, canary automation, and final recommendation.
- Assumptions: GitHub + npm credentials are available for release, and dummy repo automation can run locally.

## Milestones & Sequencing
1) Docs-first + task registration + delegation setup.
2) Release lane: bump `0.1.37`, PR lifecycle watch, signed tag, release workflow watch, npm verify, downstream smoke.
3) Canary lane: stable vs prerelease dummy-repo matrix automation, result synthesis, global-version recommendation.
4) Final docs/checklist closeout with evidence.

## Dependencies
- GitHub CLI auth with release permissions.
- npm auth for publish.
- Existing CO validation scripts and canary harness.

## Validation
- Checks / tests:
  - Required ordered lane for implementation/release edits:
    1. `node scripts/delegation-guard.mjs`
    2. `node scripts/spec-guard.mjs --dry-run`
    3. `npm run build`
    4. `npm run lint`
    5. `npm run test`
    6. `npm run docs:check`
    7. `npm run docs:freshness`
    8. `node scripts/diff-budget.mjs`
    9. `npm run review`
    10. `npm run pack:smoke`
- Rollback plan:
  - If release workflow/publish fails, stop and fix before tag/publish retry.
  - If canary fails threshold, keep global Codex stable and schedule re-canary.

## Risks & Mitigations
- Risk: prerelease introduces behavior drift.
- Mitigation: compare against stable baseline and block global adoption on regression.
- Risk: release automation misses late feedback.
- Mitigation: use resolve-merge monitoring and unresolved-thread checks before merge/tag.

## Approvals
- Reviewer: Codex (self-approval with user-approved objective).
- Date: 2026-02-27.

## Completion Snapshot (2026-02-27)
- Milestone 1: complete.
- Milestone 2: complete (`0.1.37` released and verified).
- Milestone 3: complete with decision hold (NO-GO for global `0.107.x` due missing required cloud-lane evidence).
- Milestone 4: complete (task mirrors + index + closeout validation logs updated).
