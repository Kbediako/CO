# PRD - CO workflow: stop repo-wide docs baseline regressions from forcing manual fallback in unrelated lanes

## Added by Bootstrap 2026-04-06
## Refreshed 2026-04-09

## Traceability
- Linear issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- Linear URL: https://linear.app/asabeko/issue/CO-102/co-workflow-stop-repo-wide-docs-baseline-regressions-from-forcing
- Prior attempt: PR `#370` / `CO-102 Refresh repo-wide spec/docs freshness blockers`

## Summary
- Problem Statement: the April 6 stale-cohort repair landed and PR `#370` merged, but current `main` is red again for a different reason. On 2026-04-09, `node scripts/spec-guard.mjs --dry-run` and `npm run docs:check` are clean while `npm run docs:freshness` fails on `282` stale docs (`Task Packet=205`, `Task Mirror=41`, `Report Only=36`). The daily implementation-docs archive automation is healthy, and a fresh local `node scripts/implementation-docs-archive.mjs --dry-run` agrees with it (`Archived docs: 0`, `Skipped docs: 313`, `Stray candidates: 146`), so the relapse is not a dead scheduler. The current root cause is narrower and more concrete: `scripts/implementation-docs-archive.mjs` only creates task-linked archive candidates when `tasks/index.json` reports `status === "succeeded"`, but current completed lanes now use `status: "completed"` with `completed_at` and `gate.status: "succeeded"`. Completed March packets therefore never leave the active baseline, and unrelated lanes accept truthful manual fallback again.
- Desired Outcome: refresh `CO-102` as the repo-baseline prevention lane, fix the archive-eligibility seam so completed task packets are archived truthfully under the existing policy, reconcile any residual truly-active stale docs that remain after the fix, and restore a clean repo-wide docs baseline without weakening review or freshness policy.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): stop shared docs/spec baseline regressions from forcing unrelated provider-worker lanes into accepted manual fallback, and make the issue explicitly about preventing that repo-baseline relapse rather than blaming or loosening review policy.
- Success criteria / acceptance:
  - clean current `main` passes `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness`
  - `docs/TASKS.md` and related docs-registry surfaces stay within their intended guardrails instead of relapsing immediately after cleanup
  - unrelated provider-worker lanes no longer need accepted manual fallback purely because the shared docs baseline is already red
  - the packet and workpad record which surfaces were fixed and what prevention was added
- Constraints / non-goals:
  - do not weaken or disable standalone-review, provider-worker review policy, or `docs:freshness`
  - do not reopen child-stream architecture or review-wrapper redesign
  - do not turn this into a broad umbrella about manual review generally being bad

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:check`
  - `docs:freshness`
  - `docs/TASKS.md`
  - `manual fallback`
  - `shared baseline`
  - `unrelated lanes`
- Protected terms / exact artifact and surface names:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/implementation-docs-archive.mjs --dry-run`
  - `scripts/implementation-docs-archive.mjs`
  - `docs/implementation-docs-archive-policy.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
- Nearby wrong interpretations to reject:
  - the review wrapper is the primary bug here
  - the fix is to waive, weaken, or bypass docs/review gates
  - the fix is another one-off `last_review` sweep with no prevention against the same relapse class

## Parity / Alignment Matrix
- Current truth:
  - `spec-guard --dry-run` is clean on current `main`
  - `docs:check` is clean on current `main`
  - `docs:freshness` fails on `282` stale docs concentrated in completed March task packets, mirrors, and linked findings docs
  - implementation-docs archive automation ran successfully on 2026-04-08 but archived nothing because the script never considers `status: "completed"` task items eligible
- Reference truth:
  - completed implementation packets should leave the active docs baseline through the existing archive policy once they are old enough
  - unrelated lanes should not inherit a red docs baseline after their own packet shape is correct
- Target truth / intended delta:
  - implementation-docs archive eligibility matches the current `tasks/index.json` completion vocabulary
  - the stale completed-packet cohort archives or reclassifies truthfully under the existing policy
  - any residual stale active docs are reconciled explicitly instead of hidden
  - shared docs guards return green without policy weakening
- Explicitly out-of-scope differences:
  - changing review-state semantics
  - loosening docs or review gates
  - broad docs tooling redesign beyond the minimum truthful prevention fix needed now

## Not Done If
- `docs:freshness` still fails because completed task packets remain active solely due to the `completed` versus `succeeded` mismatch.
- unrelated issue lanes still record accepted manual fallback because the shared docs baseline is red again.
- the only outcome is another one-off refresh with no prevention against the same relapse class.

## Goals
- Refresh the `CO-102` packet to the reopened baseline-prevention scope.
- Capture the current repo-baseline failure shape and archive-automation behavior with machine-checkable evidence.
- Fix the implementation-doc archive eligibility seam that prevents completed packets from leaving the active baseline.
- Reconcile any residual truly-active stale docs that remain after the archive fix.
- Record the repaired baseline surfaces and prevention seam in the packet and workpad.

## Non-Goals
- Review-wrapper redesign or review-policy changes.
- Reopening unrelated runtime or app behavior lanes.
- Silent review-date churn without a truthful active-doc review or archive rationale.

## Stakeholders
- Product: CO operators and maintainers relying on truthful handoff readiness.
- Engineering: docs/archive tooling owners and provider-worker lane owners blocked by shared baseline drift.
- Design: not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - `spec-guard --dry-run`, `docs:check`, and `docs:freshness` all exit `0`
  - completed implementation packets archive truthfully under the existing policy rather than staying active due to stale status matching
  - unrelated lanes stop citing repo-baseline drift as the reason for accepted manual fallback
- Guardrails / Error Budgets:
  - preserve strict review and docs-policy semantics
  - avoid speculative claims about the stale set without current command output
  - create a follow-up instead of expanding scope if a larger archive-policy redesign is uncovered

## User Experience
- Personas:
  - provider workers preparing review handoff
  - maintainers auditing docs/archive automation
- User Journeys:
  - a worker finishes a bounded lane and runs the required docs gates
  - the lane is no longer blocked by unrelated stale implementation packets that should already be archived
  - a maintainer can trace which docs remained active versus which moved under the archive policy

## Technical Considerations
- Architectural Notes:
  - the current seam is in the archive selection path, not the docs-freshness reporter and not the review wrapper
  - the archive automation workflow is already running successfully, so prevention should prefer fixing candidate eligibility over adding another scheduler
  - after the eligibility fix, rerun the archive path and only do explicit active-doc refreshes where a doc really should stay live
- Dependencies / Integrations:
  - `scripts/docs-freshness.mjs`
  - `scripts/implementation-docs-archive.mjs`
  - `.github/workflows/implementation-docs-archive-automation.yml`
  - `docs/implementation-docs-archive-policy.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`

## Open Questions
- After the archive eligibility fix lands, do any residual stale active docs remain that need a truthful refresh or a separate follow-up? Current evidence suggests the long-tail candidates are the older still-`in-progress` `0935`-`0939` packet family, but the exact post-fix remainder should be confirmed by rerunning `docs:freshness`.

## Approvals
- Product: pending
- Engineering: pending
- Design: not applicable
