---
id: 20260424-linear-56c2656d-853f-43f9-91af-455970800060
title: "CO-356 archive automation Core Lane checks"
relates_to: docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

# Mini Spec - CO-356 archive automation Core Lane checks

See also:
- `docs/PRD-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/TECH_SPEC-linear-56c2656d-853f-43f9-91af-455970800060.md`
- `docs/ACTION_PLAN-linear-56c2656d-853f-43f9-91af-455970800060.md`

## User-request translation
- Diagnose why archive automation PRs from `automation/tasks-archive` produce approval-required or no-job required workflow runs.
- Add a durable path that gives those archive PR heads the branch-protection-required `Core Lane` check.
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
- The fix only unblocks PR `#637` while future archive PRs can reproduce the missing-check state.
- Diff budget or downstream-scope checks cannot resolve PR metadata from the archive dispatch inputs.
- The out-of-scope `CO-362` auto-merge token repair becomes a blocker for producing the required `Core Lane` check.

## Parity matrix

| Surface | Current behavior | Target behavior |
| --- | --- | --- |
| Archive PR creation | Workflow `GITHUB_TOKEN` updates leave native `pull_request` runs approval-required or no-job. | Archive workflow explicitly dispatches `core-lane.yml` on the archive PR branch. |
| Required checks | PR `#637` has no reported `Core Lane` check and cannot satisfy branch protection. | Archive PR heads receive a real `Core Lane` check result before merge. |
| Diff budget override | Native PR metadata is available only for `pull_request` events. | Archive dispatch resolves PR metadata from the archive PR number before running diff budget. |
| Auto-merge token | Current token failure is `401 Bad credentials`. | Token repair is handled separately in `CO-362` after the required-check path exists. |

## Scope
- Add a safe `workflow_dispatch` Core Lane path for archive automation PR heads.
- Keep branch protection and required context names unchanged.
- Add focused workflow contract coverage.

## Acceptance
- `core-lane.yml` supports dispatch with archive PR audit inputs.
- Dispatched `Core Lane` runs validate that the supplied PR number is an open `main` PR on a known archive automation branch and owns the dispatched head SHA, repo, and ref.
- `archive-automation-base.yml` dispatches Core Lane after a PR is created or updated.
- Dispatch failure fails the archive automation run.
- Tests prove the workflow contract.

## Validation
- [x] `npm run test -- tests/archive-automation-workflow.spec.ts`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] Full handoff validation recorded in `tasks/tasks-linear-56c2656d-853f-43f9-91af-455970800060.md`
