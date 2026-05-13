# ACTION_PLAN - linear-87d23327-3ee6-429c-a25f-8bd9c84cde58

## Added by Bootstrap 2026-04-10

## Summary
- Goal: stabilize or truthfully classify the broad timeout-heavy repo `npm run test` lane so unrelated failures stop ambiguously blocking narrow issue handoffs.
- Scope: rework-reset docs-first packet + workpad registration, audited docs-review, fresh full-lane evidence collection on current `origin/main`, bounded owner-seam fix or reporting/classification improvement, focused regressions, and required validation/review gates.
- Assumptions:
  - `CO-94` captured a real broad blocker on 2026-04-09
  - the backup `CO-132` ref may already contain a candidate stabilization path, but current `main` still needs fresh measurement before that path is trusted

## Status Update - Rework Reset 2026-04-10
- PR `#410` is closed.
- The stale `## Codex Workpad` comment was deleted and replaced with a fresh reset workpad comment.
- The old attempt is preserved on `backup/linear-co-132-rework-20260410T095713Z`.
- The active workspace branch `linear/co-132-timeout-test-lane-truth` was reset to fresh `origin/main`.
- Fresh current-main evidence first passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-reset-baseline-repro/01-npm-test-run-1.log`, then narrowed the live blocker to two load-sensitive CLI timeouts on a later uncapped run at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/05-test.log`.
- The manual capped rerun passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-closeout-validation/06-test-maxworkers4-min1.log`, so the implementation direction changed from docs-only closeout to a bounded worker-cap fix in `vitest.config.core.ts`.
- Post-fix broad-lane proof passed at `out/linear-87d23327-3ee6-429c-a25f-8bd9c84cde58/manual/20260410T101130Z-post-fix-validation/05-test.log` with `324/324` files and `3350/3350` tests.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - keep this about the broad repo test lane, not `CO-94` feature work
  - preserve truthful validation semantics for `npm run test`
  - let narrow lanes distinguish unrelated repo baseline failures from local regressions
- Not done if:
  - the current broad failure family is still ambiguous
  - the lane only "passes" by suppressing suites or hiding failure truth
  - dependent lanes still cannot tell whether the broad lane is already red for unrelated reasons
- Pre-implementation issue-quality review:
  - the issue remains broader than "fix one flake": `CO-94` already proved the blocker was broad enough to block review handoff across many unrelated suites, and this rework lane still owns either stabilization or truthful classification/reporting on the fresh baseline

## Milestones & Sequencing
1. Register the rework-reset docs-first packet, task mirrors, local workpad source, and registry entries; keep the packet truthful about backup-branch findings being comparison-only.
2. Run an audited same-issue `docs-review` child stream and record its manifest-backed result. Resolve any findings before final handoff material is refreshed.
3. Reproduce or freshly audit the broad `npm run test` lane on current head, capture exact failing suites and timing shape, and compare that result against the `CO-94` blocker evidence plus the backup attempt.
4. Land the smallest truthful outcome:
   - bounded shared fix if one owner seam is proven
   - bounded refreshed classification/reporting improvement if the key problem is ambiguous handoff truth rather than one safe fix
5. Rerun the required validation floor for the final diff, then run standalone review plus an explicit elegance pass before any handoff.

## Dependencies
- `CO-94` blocker evidence in `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/`
- prior `CO-132` attempt artifacts on `backup/linear-co-132-rework-20260410T095713Z`
- prior repo-wide validation lanes: `CO-24`, `CO-38`, `CO-57`
- full-suite and focused test surfaces named in the issue description and `CO-94` workpad

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - fresh `npm run test` evidence collection on current head
  - focused config regression `npx vitest run tests/vitest-progress-config.spec.ts`
  - required repo validation floor for the final diff
- Rollback plan:
  - if the worker-cap change proves too broad after branch sync or review, revert it and keep only the refreshed classification artifacts instead of forcing a risky repo-wide change

## Risks & Mitigations
- Risk: the current failure family is host-specific and non-deterministic.
  - Mitigation: preserve the uncapped failing log, the capped passing log, and the post-fix broad-lane proof in the packet.
- Risk: the broad failure list spans multiple unrelated seams.
  - Mitigation: only ship the worker-cap seam that reproduced on current head; keep the unproven `ProviderIssueHandoff` idea out of scope.
- Risk: the backup branch biases the new run.
  - Mitigation: treat it only as comparison context; current-head evidence had to stand on its own before any code was re-landed.
- Risk: `docs/TASKS.md` is already at the archive threshold on `main`.
  - Mitigation: keep the archived `0991` snapshot restored in `docs/TASKS-archive-2026.md` so task archiving remains truthful and docs-review stays clean.

## Approvals
- Reviewer: Pending
- Date: 2026-04-10
