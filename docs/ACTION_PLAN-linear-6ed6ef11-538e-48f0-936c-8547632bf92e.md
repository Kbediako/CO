# ACTION_PLAN - CO: Stabilize timeout-sensitive repo validation suites blocking handoff

## Added by Bootstrap 2026-04-13

## Summary
- Goal: restore a trustworthy repo validation floor for `CO-131` by reproducing the named timeout-sensitive suites on the current head and taking the smallest truthful outcome.
- Scope: docs-first packet, issue workflow setup, docs-review child stream, focused reproductions, bounded repair or blocker split, and full pre-handoff validation/review gates.
- Assumptions:
  - the issue’s named suites and rejected shortcuts remain the canonical scope
  - prior packets are useful context, but fresh current-head evidence decides whether this is a live defect or a non-repro
  - the lane stays separate from `CO-89` resident-session implementation work

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `stabilize timeout-sensitive repo validation suites`, `keep validation behavior truthful and deterministic`, `npm run test`, `tests/diff-budget.spec.ts`, `tests/subagent-edit-guard.spec.ts`, `tests/cli-frontend-test.spec.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`
- Not done if:
  - the named suites remain unclassified on the current head
  - `npm run test` still lacks a trustworthy terminal result or explicit blocker split
  - the closeout still implies `CO-89` was the failing seam
- Pre-implementation issue-quality review:
  - the issue is already bounded and explicit. Proceed with reproduction-first narrowing and reject broad timeout or runtime changes unless the live evidence forces them.

## Milestones & Sequencing
1. Completed: rechecked live issue context, recorded the required same-turn `stay_serial` / `overlapping_scope` decision, moved the issue from `Ready` to `In Progress`, switched the detached workspace onto branch `linear/co-131-stabilize-validation-timeouts`, and staged the local workpad source.
2. Completed: drafted the full docs-first packet, registered the task mirrors, and published the initial single workpad comment.
3. Completed: ran an audited `linear child-stream --pipeline docs-review`; the final rerun succeeded with `review_outcome=clean-success`.
4. Completed: reproduced the named suites plus the current `npm run test` lane and classified the issue as a current-head non-repro rather than a live timeout cluster.
5. Completed: landed the smallest truthful repair by fixing packet/archive truthfulness only (`scripts/tasks-archive.mjs`, `tests/tasks-archive.spec.ts`, `docs/TASKS-archive-2026.md`) instead of widening into runtime or harness changes.
6. Completed: ran the standard validation floor, standalone review, and explicit elegance review, with clean outcomes recorded under the issue task id.
7. Pending: create and attach the PR, merge the latest `origin/main`, drain `pr ready-review`, refresh the workpad again, and move the issue to the team's review state when handoff is truly ready.

## Dependencies
- `package.json`
- `vitest.config.core.ts`
- `tests/diff-budget.spec.ts`
- `tests/subagent-edit-guard.spec.ts`
- `tests/cli-frontend-test.spec.ts`
- `orchestrator/tests/CodexOrchestratorCli.test.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused `npx vitest run --config vitest.config.core.ts ...` commands for the named suites
  - full `npm run test`
  - the standard validation floor for the final non-trivial diff
  - standalone review followed by explicit elegance review before any handoff
- Latest results:
  - docs-review child stream: `status=succeeded`, `review_outcome=clean-success`
  - focused reruns: `tests/diff-budget.spec.ts` (`15/15`, `6.18s`), `tests/subagent-edit-guard.spec.ts` (`12/12`, `6.42s`), `tests/cli-frontend-test.spec.ts` (`4/4`, `23.33s`), `orchestrator/tests/CodexOrchestratorCli.test.ts` (`10/10`, `40.35s`)
  - repo floor: final `npm run test` passed `335/335` files and `3703/3703` tests in `133.61s`
  - review closeout: `npm run review` finished with `review_outcome=clean-success`; explicit elegance note recorded at `out/linear-6ed6ef11-538e-48f0-936c-8547632bf92e/manual/elegance-review.md`
- Rollback plan:
  - revert the bounded validation/harness changes if they widen scope, weaken truthfulness, or fail to improve deterministic validation behavior; keep the reproduction evidence and split a follow-up instead

## Risks & Mitigations
- Risk: prior nearby packets tempt a premature non-repro closeout.
  - Mitigation: treat earlier packets as context only and rerun the exact current-head suite set before deciding scope.
- Risk: multiple timeout-sensitive suites look independent and create scope creep.
  - Mitigation: stay reproduction-first, isolate the smallest shared root cause if it exists, and create a follow-up for any genuine independent remainder.
- Risk: `docs/TASKS.md` or registry mirrors drift while the issue is active.
  - Mitigation: keep the packet and workpad updated at each milestone and rerun the standard docs guards before handoff.

## Approvals
- Reviewer: Self-approved for docs-first execution; audited docs-review completed with `review_outcome=clean-success`, final validation is green, standalone review completed with `review_outcome=clean-success`, and the explicit elegance review is recorded. PR handoff remains pending.
- Date: 2026-04-13
