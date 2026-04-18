# PRD - CO workflow: reopen CO-175 for Apr 18 docs:freshness over-budget historical packet cohort

## Summary
- Problem Statement: `origin/main` at `b678ce4` reopened CO-175 because Apr 18 maintenance hit a new March 18 historical packet cohort outside the declared rolling baseline. This branch resolves that by declaring the second explicit CO-175 baseline cohort `co-175-apr-18-march-18-cli-1289-1298`, so current branch truth is `0` blocking stale docs, `291` rolling CO-175 entries, and `docs:freshness:maintain` returning `pass_with_owned_rolling_debt` with `candidate_entries=291`, `current_cohorts=2`, `max_cohorts=2`, and `blocking_changed_paths=[]`.
- Desired Outcome: keep the reopened CO-175 packet truthful about the resolved Apr 18 state while preserving the existing CO-175 rolling debt, fail-closed policy semantics, and explicit before/after evidence.

## Source Traceability
- Linear issue: `CO-175` / `a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- Current baseline: `origin/main` at `b678ce4`
- Source payload anchor: `ctx:sha256:c4f24ab84edb50fdc98e76b64014ea589485230f2da0aba7746189ae723a9798#chunk:c000001`
- Source payload path: `/Users/kbediako/Code/CO/.workspaces/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/memory/source-0/source.txt`
- Source payload note: shared source 0 contains run-contract and manifest provenance only. The reopen scope in this child lane is anchored on the parent prompt plus repo-local March 18 packet lineage and freshness metadata.
- Current origin manifest: `.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/manifest.json`

## User Request Translation
- Refresh the CO-175 docs packet for the reopened Apr 18 maintenance state only.
- Describe the new blocking cohort as the March 18 `1289-1298` historical packet lineage, not as a policy-regression or cap-expansion lane.
- Preserve the existing CO-175 rolling cohort `co-175-apr-14-march-14-tasks-1164-1195` and the fail-closed docs freshness policy.
- Keep this child lane docs-only. Parent owns implementation, report generation, registry/date changes, validation, Linear state, workpad, PR work, and merge.

## Intent Checksum
- Exact phrases to preserve:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `block_policy_over_budget`
  - `candidate_entries=291`
  - `current_cohorts=8`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
  - `CO-175`
  - `co-175-apr-14-march-14-tasks-1164-1195`
  - `1289-1298`
  - `last_review=2026-03-18`
  - `70` blocking stale docs
  - `221` rolling entries
  - `update existing owner issue CO-175 rather than expand caps`
- Nearby wrong interpretations to reject:
  - the prior CO-175 rolling policy failed and should be reverted
  - rolling caps or windows should be widened to absorb the new cohort
  - a new owner issue should be created instead of reopening CO-175
  - the existing CO-175 rolling cohort should be hidden or reclassified away
  - the fix is a blind `last_review` bump with no reviewed owner action
  - this child lane should touch implementation, tests, Linear state, or PR state

## Current Truth
- The original CO-175 policy lane already landed on `origin/main`.
- `origin/main` before this change reopened CO-175 with `70` blocking stale docs from the March 18 historical packet lineage `1289-1298` plus the existing `221` rolling CO-175 entries.
- This branch declares the second explicit baseline cohort `co-175-apr-18-march-18-cli-1289-1298` in `docs/docs-catalog.json` and records the reviewed owner update in `docs/guides/docs-freshness-cohorts.md`.
- Current branch validation reports:
  - `0` blocking stale docs
  - `291` rolling CO-175 entries across two explicit baseline cohorts
  - `docs:freshness:maintain = pass_with_owned_rolling_debt`
  - `candidate_entries=291`
  - `current_cohorts=2`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
- The owned March 18 cohort remains the same reviewed packet family:
  - Task Packet: `50`
  - Task Mirror: `10`
  - Report Only: `10`
  - path families `.agent/task`, `docs/findings`, `tasks/specs`, `tasks/tasks-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, and `docs/ACTION_PLAN-*`
- The two owned rolling cohorts now expire on `2026-04-20` (Apr 14 cohort) and `2026-04-24` (Apr 18 cohort) unless refreshed, archived, or reclassified earlier.

## Parity / Alignment Matrix

| Dimension | Current Truth | Reference Truth | Target Truth / Intended Delta | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Rolling policy | CO-175 policy is already merged and still owns the Apr 14 March 14 cohort. | Rolling debt stays visible and fail-closed for undeclared or expired cohorts. | Keep the existing rolling cohort unchanged. | Reverting or weakening the policy. |
| New stale cohort | This branch keeps the March 18 lineage `1289-1298` machine-visible as a second explicit CO-175 rolling cohort instead of blocking stale rows. | Newly stale historical packets need explicit owner action. | Keep the March 18 cohort owned and visible until reviewed refresh/archive/reclassify occurs before expiry. | Treating it as hidden rolling debt by default. |
| Maintenance budget | Current branch state is `candidate_entries=291`, `current_cohorts=2`, `max_cohorts=2`, `blocking_changed_paths=[]`, and `pass_with_owned_rolling_debt`. | Clean unrelated diffs can pass only when historical debt is owned and within policy. | Keep the repo inside the existing `2`-cohort / `300`-row policy without cap expansion. | Raising caps or windows. |
| Post-fix steady state | `docs:freshness` now reports `0` blocking stale rows while leaving the two owned CO-175 cohorts visible. | After reviewed historical maintenance, only the declared rolling debt should remain. | Preserve the truthful after-state until the cohorts are refreshed, archived, or reclassified. | Hiding the rolling ledger or bypassing reports. |

## Goals
- Refresh the CO-175 docs-first packet to the Apr 18 reopen scope.
- Preserve the exact over-budget maintenance facts and the March 18 `1289-1298` lineage in the packet.
- Give the parent lane a bounded path to resolve the March 18 cohort while preserving the existing rolling cohort and fail-closed policy.
- Keep all child-lane claims truthful about ownership boundaries.

## Non-Goals
- No cap/window increase.
- No warning-only or softened `docs:freshness` policy.
- No new owner issue for the March 18 cohort.
- No implementation, test, Linear, workpad, branch, or PR work in this child lane.
- No claim that the original CO-175 rolling policy itself is wrong.

## Stakeholders
- CO maintainers who need unrelated clean diffs to stop inheriting March 18 historical packet debt.
- Docs freshness and maintenance-policy owners who need the existing fail-closed policy preserved.
- Parent lane implementer who needs a precise reopen packet before touching registry rows or guide surfaces.

## Metrics & Guardrails
- Primary metrics:
  - before state on `origin/main`: `70` blocking stale docs, `221` rolling rows
  - before maintenance on `origin/main`: `candidate_entries=291`, `current_cohorts=8`, `max_cohorts=2`, `blocking_changed_paths=[]`
  - current branch state: `0` blocking stale docs, `291` rolling rows, `pass_with_owned_rolling_debt`, `current_cohorts=2`, `blocking_changed_paths=[]`
- Guardrails:
  - existing rolling cohort id remains `co-175-apr-14-march-14-tasks-1164-1195`
  - no cap/window expansion
  - no blind date bump
  - no hidden March 18 debt

## Open Questions
- Which reviewed owner action should close out the March 18 `1289-1298` cohort before its `2026-04-24` expiry: refresh, archive, or limited reclassification?
- Do any future historical batches need a separate owner issue once the current `2`-cohort policy budget is exhausted?

## Approvals
- Product: issue accepted via reopened `CO-175`.
- Engineering: pending parent docs-review and focused docs maintenance validation.
- Design: not applicable.
