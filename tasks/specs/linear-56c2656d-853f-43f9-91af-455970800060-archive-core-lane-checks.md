---
id: 20260424-linear-56c2656d-853f-43f9-91af-455970800060
title: "CO-356 archive automation Core Lane checks"
status: in_progress
relates_to: docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Mini Spec - CO-356 archive automation Core Lane checks

See also:
- `docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/TECH_SPEC-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/ACTION_PLAN-linear-56c2656d-853f-43f9-91af-455970800060.md`

## User-request translation
- Diagnose why archive automation PRs from `automation/tasks-archive` produce approval-required or no-job required workflow runs.
- Add a durable path that gives those archive PR heads the branch-protection-required `Core Lane` check.
- Reflect the dispatched Core Lane run result into a PR-visible `Core Lane` status context on the archive PR head.
- Preserve branch protection and avoid a one-off manual merge of PR `#637`.

## Protected terms
- `Core Lane`: the required branch-protection check context that must remain authoritative.
- `automation/tasks-archive`: the archive automation PR branch that exposed the missing-check behavior.
- `workflow_dispatch`: the explicit rerun path used to create a real `Core Lane` check for workflow-authored archive PR heads.
- `ARCHIVE_AUTOMERGE_TOKEN`: optional auto-merge credential; repair is out of scope for this lane and tracked separately.

## Nearby wrong interpretations
- Do not bypass branch protection or remove the required `Core Lane` context.
- Do not treat Cloud Canary as the required-check substitute.
- Do not close only PR `#637` while leaving future archive PRs in the same missing-check state.
- Do not rotate or expose secrets in this checked-in workflow fix.

## Explicit non-goals
- No archive eligibility redesign.
- No archive payload policy changes.
- No broader docs-freshness or registry policy changes.
- No secret rotation or GitHub branch-protection mutation.

## Not done if
- Archive PR heads still lack a `Core Lane` result.
- Dispatch failures do not fail the archive automation run.
- A successful detached `workflow_dispatch` run still leaves PR `#637` with no PR-visible required context.
- The fix only unblocks PR `#637` while future archive PRs can reproduce the missing-check state.
- Diff budget or downstream-scope checks cannot resolve PR metadata from the archive dispatch inputs.
- The out-of-scope `CO-362` auto-merge token repair becomes a blocker for producing the required `Core Lane` check.

## Parity matrix

| Surface | Current behavior | Target behavior |
| --- | --- | --- |
| Archive PR creation | Workflow `GITHUB_TOKEN` updates leave native `pull_request` runs approval-required or no-job. | Archive workflow explicitly dispatches `core-lane.yml` on the archive PR branch. |
| Dispatched Core Lane | Run `24920823983` succeeded on `a1e20f23`, but PR `#637` still has `statusCheckRollup=[]` and `mergeStateStatus=BLOCKED`. | Archive workflow waits for the dispatched run and publishes its terminal result as PR-visible `Core Lane`. |
| Required checks | PR `#637` has no reported `Core Lane` check and cannot satisfy branch protection. | Archive PR heads receive a branch-protection-satisfying `Core Lane` status result before merge. |
| Diff budget override | Native PR metadata is available only for `pull_request` events. | Archive dispatch resolves PR metadata from the archive PR number before running diff budget. |
| Auto-merge token | Current token failure is `401 Bad credentials`. | Token repair is handled separately in `CO-362` after the required-check path exists. |

## Scope
- Add a safe `workflow_dispatch` Core Lane path for archive automation PR heads.
- Publish the terminal dispatched result as a commit status named `Core Lane` on the archive PR head SHA.
- Keep branch protection and required context names unchanged.
- Add focused workflow contract coverage.

## Acceptance
- `core-lane.yml` supports dispatch with archive PR audit inputs.
- Dispatched `Core Lane` runs validate that the supplied PR number is an open `main` PR on a known archive automation branch and owns the dispatched head SHA, repo, and ref.
- `archive-automation-base.yml` dispatches Core Lane after a PR is created or updated.
- Archive automation publishes `Core Lane=success` only if the dispatched run succeeds; failed, missing, or non-success runs publish a failing status and fail the archive automation run.
- Tests prove the workflow contract.

## Validation
- [x] `npm run test -- tests/archive-automation-workflow.spec.ts`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] Full handoff validation recorded in `tasks/tasks-linear-56c2656d-853f-43f9-91af-455970800060.md`
