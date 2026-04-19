# ACTION_PLAN - CO-41 post-PR #547 provider refresh stall recurrence

## Added by Bootstrap 2026-03-30

## Refreshed 2026-04-18

## Refreshed 2026-04-19

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- Linear URL: https://linear.app/asabeko/issue/CO-41/co-investigate-control-host-provider-refresh-stall-that-stops-new
- March reference baseline: `PR #324` / commit `330581458`
- Apr 18 repair baseline: `PR #547` / commit `0484cd803`
- Apr 18 source anchor: `ctx:sha256:32d01f29a223917c3e47b5f30f7753d44d23e7cfafd3dc6fb8977eb8a2d0c633#chunk:c000001`
- Apr 19 reopened source anchor: `ctx:sha256:1bc7b3ac282ad1ebac36e250c2a063346e8497500fbf4b407ca3ea84ae327f35#chunk:c000001`
- Apr 19 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-apr19-refresh/cli/2026-04-19T02-56-26-118Z-98ad9a6f/manifest.json`

## Summary
- Goal: Reframe `CO-41` around the Apr 19 reopened recurrence after `PR #547` merged.
- Scope: docs packet refresh only in this child lane; parent owns source investigation, implementation, tests, review, Linear/workpad updates, PR lifecycle, and merge.
- Assumptions:
  - `PR #324` is the March reference fix and must not be erased.
  - `PR #547` is the Apr 18 repair baseline and must not be treated as Apr 19 completion proof.
  - Apr 19 recurrence evidence from Linear comments includes post-#547 `restart_required` recurrences, stale `released:not_active` rows, `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, and spare-capacity no-admission.

## Protected Terms
- `provider-intake-state.json`
- `provider_refresh_lifecycle_stuck`
- `refresh:claim_reconcile`
- `Ready`
- `In Progress`
- `restart_required`
- `stuck`
- `released:not_active`
- `provider_issue_released:not_active`
- `active_worker_proof_missing`
- `freshness-gauge stale`
- `partial restart recovery`
- `spare-capacity no-admission`
- `CO-41`
- `CO-252`
- `CO-217`
- `CO-211`
- `CO-214`
- `CO-248`

## Not Done If
- The packet treats March `PR #324` or Apr 18 `PR #547` as the final Apr 19 answer.
- The packet drops post-#547 `restart_required` recurrence evidence.
- The packet omits stale `released:not_active` rows, `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, or spare-capacity no-admission.
- Apr 19 implementation, tests, review, or PR lifecycle are marked complete by this docs child lane.
- The packet widens into `CO-39`, `CO-40`, `CO-33`, `CO-211`, `CO-214`, `CO-248`, `CO-217`, or `CO-252` instead of preserving those issue boundaries.

## Milestones & Sequencing
1. Refresh the `CO-41` PRD, docs TECH_SPEC, canonical task spec, ACTION_PLAN, task checklist, `.agent/task` mirror, and `tasks/index.json` entry for the Apr 19 post-#547 recurrence.
2. Accept the docs child-lane patch into the authoritative issue workspace and reconcile Linear/workpad state.
3. Parent investigates the Apr 19 source seam represented by stale `released:not_active` rows, `active_worker_proof_missing`, freshness-gauge stale verdict, partial restart recovery, and spare-capacity no-admission.
4. Parent lands the smallest safe repair only after focused source evidence identifies the current blocker.
5. Parent preserves `CO-39`, `CO-40`, `CO-33`, `CO-211`, `CO-214`, `CO-248`, `CO-217`, and `CO-252` boundaries unless source evidence requires coordinated no-regression coverage.
6. Parent runs focused tests plus required review/PR gates before closing the Apr 19 attempt.

## Dependencies
- Apr 19 recurrence source anchor: `ctx:sha256:1bc7b3ac282ad1ebac36e250c2a063346e8497500fbf4b407ca3ea84ae327f35#chunk:c000001`
- Apr 19 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-apr19-refresh/cli/2026-04-19T02-56-26-118Z-98ad9a6f/manifest.json`
- Apr 18 repair baseline: `PR #547` / commit `0484cd803`
- Apr 18 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`
- March reference baseline: `PR #324` / commit `330581458`
- Adjacent issue boundaries: `CO-252`, `CO-217`, `CO-211`, `CO-214`, `CO-248`

## Validation
- Child-lane checks:
  - `node -e 'JSON.parse(require("fs").readFileSync("tasks/index.json","utf8"))'`
  - `git diff --check -- docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md docs/TECH_SPEC-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md .agent/task/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/index.json`
- Parent validation:
  - focused regression for the post-#547 source seam
  - stale release-row and missing active-worker-proof coverage
  - freshness-gauge stale and partial restart recovery coverage
  - spare-capacity no-admission coverage
  - no-regression checks for truthful `provider_refresh_lifecycle_stuck`, `restart_required`, and `stuck` surfacing
  - full review/PR lifecycle before closeout

## Rollback / Recovery
- Revert any implementation that hides `provider_refresh_lifecycle_stuck`, drops `restart_required`, or treats spare-capacity `Ready` starvation as normal.
- If safe recovery is not proven, keep restart-required truth explicit and make the operator action machine-checkable.
- Preserve the docs distinction between March `PR #324`, Apr 18 `PR #547`, and the Apr 19 recurrence even if the repair lands in a neighboring source seam.

## Risks & Mitigations
- Risk: the recurrence is incorrectly closed as already fixed by `PR #547`.
  - Mitigation: every packet file names `PR #547` as the Apr 18 baseline and leaves Apr 19 implementation/tests/review open.
- Risk: the repair weakens adjacent lanes.
  - Mitigation: acceptance requires explicit boundaries for `CO-39`, `CO-40`, `CO-33`, `CO-211`, `CO-214`, `CO-248`, `CO-217`, and `CO-252`.
- Risk: a recovery path hides a real stuck lifecycle.
  - Mitigation: preserve `provider_refresh_lifecycle_stuck`, `restart_required`, `stuck`, stale-release, freshness, and spare-capacity diagnostics in tests and closeout evidence.

## Approvals
- March docs-review: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Apr 18 docs refresh approval date: 2026-04-18
- Apr 18 docs refresh: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`
- Apr 19 docs refresh: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-apr19-refresh/cli/2026-04-19T02-56-26-118Z-98ad9a6f/manifest.json`
