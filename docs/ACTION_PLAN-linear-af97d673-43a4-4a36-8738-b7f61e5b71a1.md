# ACTION_PLAN - CO-41 reopened provider refresh stall recurrence

## Added by Bootstrap 2026-03-30

## Refreshed 2026-04-18

## Traceability
- Linear issue: `CO-41` / `af97d673-43a4-4a36-8738-b7f61e5b71a1`
- Linear URL: https://linear.app/asabeko/issue/CO-41/co-investigate-control-host-provider-refresh-stall-that-stops-new
- March reference fix: `PR #324` / commit `330581458`
- Apr 18 source anchor: `ctx:sha256:32d01f29a223917c3e47b5f30f7753d44d23e7cfafd3dc6fb8977eb8a2d0c633#chunk:c000001`

## Summary
- Goal: Complete the `CO-41` Apr 18 reopened recurrence with a docs-backed, focused control-host supervision fix.
- Scope: docs packet refresh, issue-shaping contract, control-host supervision health evaluation, `co-status --format json` diagnostic parsing, focused regression coverage, validation, and review handoff.
- Assumptions:
  - `PR #324` is the March reference fix and must not be erased.
  - Apr 18 recurrence evidence is current: `provider-intake-state.json` has `stuck=true`, `restart_required=true`, `last_error=provider_refresh_lifecycle_stuck`, `refresh_phase=refresh:claim_reconcile`, `running=2`, and `max_allowed=3`.
  - The current source fix is the free-capacity exception to repeated active-worker restart quarantine in `controlHostSupervision.ts`.

## Protected Terms
- `provider-intake-state.json`
- `provider_refresh_lifecycle_stuck`
- `refresh:claim_reconcile`
- `Ready`
- `In Progress`
- `restart_required`
- `stuck`
- `CO-41`
- `CO-252`
- `CO-217`
- `CO-211`
- `CO-214`
- `CO-248`

## Not Done If
- The packet still treats March `PR #324` as the final Apr 18 answer.
- The packet drops the Apr 18 free-capacity evidence (`running=2`, `max_allowed=3`).
- The packet omits `refresh:claim_reconcile` or rewrites it as generic refresh timeout.
- The repair leaves repeated active-worker restart quarantine healthy when `running + retrying < max_allowed`.
- The packet widens into `CO-211`, `CO-214`, `CO-248`, `CO-217`, or `CO-252` instead of preserving those issue boundaries.

## Milestones & Sequencing
1. Refresh the `CO-41` PRD, docs TECH_SPEC, canonical task spec, ACTION_PLAN, task checklist, `.agent/task` mirror, and `tasks/index.json` entry for the Apr 18 recurrence.
2. Accept the docs child-lane patch into the authoritative issue workspace and reconcile Linear/workpad state.
3. Simulate the Apr 18 shape: `provider-intake-state.json` at `refresh:claim_reconcile`, `provider_refresh_lifecycle_stuck`, `restart_required`, `stuck`, free capacity, and a `Ready` issue (`CO-252`) not admitted until restart.
4. Land the smallest safe repair in control-host supervision health evaluation: repeated active-worker restart quarantine must not apply when `running + retrying < max_allowed`, using the existing `co-status --format json` `counts.max_allowed` signal in the supervisor diagnostic.
5. Preserve `CO-211`, `CO-214`, `CO-248`, `CO-217`, and `CO-252` boundaries unless source evidence requires coordinated no-regression coverage.
6. Run focused tests plus the validation floor, then complete review and PR lifecycle.

## Dependencies
- Apr 18 recurrence source anchor: `ctx:sha256:32d01f29a223917c3e47b5f30f7753d44d23e7cfafd3dc6fb8977eb8a2d0c633#chunk:c000001`
- Apr 18 origin manifest: `.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-refresh/cli/2026-04-18T21-09-55-260Z-b69a5e6c/manifest.json`
- March reference fix: `PR #324` / commit `330581458`
- Apr 18 `provider-intake-state.json` recurrence evidence
- Adjacent issue boundaries: `CO-252`, `CO-217`, `CO-211`, `CO-214`, `CO-248`

## Validation
- Child-lane checks:
  - protected-term grep across the declared packet files
  - `node -e 'JSON.parse(require("fs").readFileSync("tasks/index.json","utf8"))'`
  - `git diff --check -- docs/PRD-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md docs/TECH_SPEC-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md docs/ACTION_PLAN-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/specs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/tasks-linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md .agent/task/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1.md tasks/index.json`
- Validation:
  - focused regression for the identified `refresh:claim_reconcile` blocking seam
  - focused supervision regression that keeps `counts.max_allowed` active in the quarantine decision
  - no-regression checks for truthful `provider_refresh_lifecycle_stuck`, `restart_required`, and `stuck` surfacing
  - adjacent-boundary review for `CO-211`, `CO-214`, `CO-248`, `CO-217`, and `CO-252`
  - full validation floor before PR handoff

## Rollback / Recovery
- Revert any implementation that hides `provider_refresh_lifecycle_stuck`, drops `restart_required`, or treats free-capacity `Ready` starvation as normal.
- If safe recovery is not proven, keep restart-required truth explicit and make the operator action machine-checkable.
- Preserve the docs distinction between March `PR #324` and the Apr 18 recurrence even if the repair lands in a neighboring source seam.

## Risks & Mitigations
- Risk: the recurrence is incorrectly closed as already fixed by `PR #324`.
  - Mitigation: every packet file names the Apr 18 recurrence and states that the current source seam is the free-capacity exception to repeated active-worker restart quarantine.
- Risk: the repair weakens adjacent lanes.
  - Mitigation: acceptance requires explicit boundaries for `CO-211`, `CO-214`, `CO-248`, `CO-217`, and `CO-252`.
- Risk: a recovery path hides a real stuck lifecycle.
  - Mitigation: preserve `provider_refresh_lifecycle_stuck`, `restart_required`, `stuck`, and `refresh:claim_reconcile` diagnostics in tests and closeout evidence.

## Approvals
- March docs-review: `/Users/kbediako/Code/CO/.runs/linear-af97d673-43a4-4a36-8738-b7f61e5b71a1-docs-review/cli/2026-03-30T01-25-36-879Z-17cd2f7d/manifest.json`
- Apr 18 docs refresh: bounded same-issue child lane accepted into this workspace; current lane owns integration and review-gate evidence.
