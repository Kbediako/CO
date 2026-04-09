# ACTION_PLAN - linear-87d23327-3ee6-429c-a25f-8bd9c84cde58

## Added by Bootstrap 2026-04-10

## Summary
- Goal: stabilize or truthfully classify the broad timeout-heavy repo `npm run test` lane so unrelated failures stop ambiguously blocking narrow issue handoffs.
- Scope: docs-first packet + workpad registration, audited docs-review, fresh full-lane evidence collection, bounded owner-seam fix or reporting/classification improvement, focused regressions, and required validation/review gates.
- Assumptions:
  - `CO-94` captured a real broad blocker on 2026-04-09, but the current host/tree still needs fresh measurement
  - earlier lanes `CO-24`, `CO-38`, and `CO-57` may be relevant background, not proof that the same owner still explains the current failure family

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
  - the issue is not narrower than "fix one flake": `CO-94` already proved the blocker is broad enough to block review handoff across many unrelated suites, and the follow-up explicitly owns either stabilization or truthful classification/reporting

## Milestones & Sequencing
1. Register the docs-first packet, task mirrors, and initial Linear workpad; keep `CO-132` in `In Progress` with the current branch and blocker evidence recorded.
2. Launch an audited same-issue `docs-review` child stream and record its manifest-backed result or truthful fallback.
3. Reproduce or freshly audit the broad `npm run test` lane on the current branch, capture exact failing suites and timing shape, and compare that result against the `CO-94` blocker evidence and earlier repo-wide instability lanes.
4. Decide the smallest truthful outcome:
   - bounded shared fix if one owner seam is proven
   - bounded classification/reporting improvement if the key problem is ambiguous handoff truth rather than one safe fix
5. Implement the chosen fix/reporting seam, add focused regressions, rerun the required validation floor, then run standalone review plus an explicit elegance pass before any handoff.

## Dependencies
- `CO-94` blocker evidence in `/Users/kbediako/Code/CO/.runs/linear-ce6f26d0-029a-40d9-8ffe-289cd40cde8d/cli/2026-04-09T08-36-05-967Z-014680f3/`
- prior repo-wide validation lanes: `CO-24`, `CO-38`, `CO-57`
- full-suite and focused test surfaces named in the issue description and `CO-94` workpad

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - fresh `npm run test` evidence capture or exact environment-sensitive blocker record
  - focused tests for any touched owner seam or reporting surface
  - required repo validation floor for the final diff
- Rollback plan:
  - if a proposed shared fix widens scope or weakens truthfulness, revert to the narrower classification/reporting path and record the reason instead of forcing a risky repo-wide change

## Risks & Mitigations
- Risk: the current failure family is host-specific and non-deterministic.
  - Mitigation: record exact reproduction conditions and classify environment sensitivity explicitly rather than overgeneralizing.
- Risk: the broad failure list spans multiple unrelated seams.
  - Mitigation: prefer a truthful classification/reporting improvement unless a bounded shared owner is actually proven.
- Risk: registering the issue packet could push `docs/TASKS.md` back over its line budget.
  - Mitigation: keep the new snapshot to a single line; current budget check showed `448 / 450` lines before registration.

## Approvals
- Reviewer: Pending
- Date: 2026-04-10
