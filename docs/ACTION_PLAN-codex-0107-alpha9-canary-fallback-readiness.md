# ACTION_PLAN - Codex 0.107.0-alpha.9 Canary + Fallback Removal Readiness

## Summary
- Goal: produce current canary evidence for `0.107.0-alpha.9` and finalize fallback removal readiness decision.
- Scope: docs-first scaffolding, canary execution, evidence synthesis, and task/doc/index synchronization.
- Assumptions: cloud env `Kbediako/CO` remains valid for required cloud contract checks.

## Milestones & Sequencing
1) Docs-first + task registration + delegated planning/research streams.
2) Run canary matrix for `0.106.0` and `0.107.0-alpha.9` with standard lanes/log paths.
3) Publish comparison + fallback removal readiness decision; sync mirrors/index/docs snapshot.

## Dependencies
- Existing canary scripts/workflows (`scripts/cloud-canary-ci.mjs`, `npm run review`, runtime fail-fast lane).
- GitHub/npm/Codex CLI availability.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs --task 0989-codex-0107-alpha9-canary-fallback-readiness`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
- Rollback plan:
  - If alpha.9 regresses required lanes, hold at stable baseline and keep fallback unchanged.

## Risks & Mitigations
- Risk: prerelease behavior drift in cloud/appserver lanes.
- Mitigation: stable-vs-prerelease parity matrix with explicit fail/hold criteria.
- Risk: premature fallback removal.
- Mitigation: hard policy gate requiring evidence-based readiness criteria.

## Execution Result (2026-03-02)
- Milestones 1-3 completed.
- Final decision: hold alpha.9 advancement and hold fallback removal until fallback gate contract mismatch is resolved and rerun evidence passes.

## Approvals
- Reviewer: Codex (self-approval with user-approved objective).
- Date: 2026-03-02.
