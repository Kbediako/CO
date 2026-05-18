---
id: 20260414-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8
title: CO workflow: reopen CO-175 for Apr 18 docs:freshness over-budget historical packet cohort
status: done
owner: Codex
created: 2026-04-14
last_review: 2026-05-18
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
related_action_plan: docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
related_tasks:
  - tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
review_notes:
  - 2026-04-14: Original CO-175 scope established the rolling cohort policy for the Apr 14 March 14 baseline and kept `docs:freshness` fail closed for undeclared, expired, invalid, or over-budget stale docs.
  - 2026-04-18: Reopened after the merged policy on `origin/main` `b678ce4` left a new historical packet cohort outside the declared rolling baseline. Current truth is `70` blocking stale docs plus `221` rolling CO-175 entries, with `docs:freshness:maintain` reporting `block_policy_over_budget`, `candidate_entries=291`, `current_cohorts=8`, `max_cohorts=2`, and `blocking_changed_paths=[]`.
  - 2026-04-18: Repo-local packet inspection confirms the blocking cohort is the March 18 lineage `1289-1298`: Task Packet `50`, Task Mirror `10`, and Report Only `10` across path families `.agent/task`, `docs/findings`, `tasks/specs`, `tasks/tasks-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, and `docs/ACTION_PLAN-*`.
  - 2026-04-18: Shared source anchor `ctx:sha256:c4f24ab84edb50fdc98e76b64014ea589485230f2da0aba7746189ae723a9798#chunk:c000001` resolves to run-contract and manifest provenance only. The issue-shaping contract in this child lane comes from the parent prompt plus current repo lineage and freshness metadata.
  - 2026-04-18: Pre-implementation issue-quality review accepts reopened CO-175 as the explicit owner issue for resolving the March 18 `1289-1298` cohort while preserving the existing rolling cohort `co-175-apr-14-march-14-tasks-1164-1195` and rejecting cap expansion, policy weakening, or hidden debt.
  - 2026-04-18: Parent implementation declared the second explicit baseline cohort `co-175-apr-18-march-18-cli-1289-1298` in `docs/docs-catalog.json`, updated `docs/guides/docs-freshness-cohorts.md`, and restored the branch to `docs:freshness` `0` blocking stale docs with `291` rolling CO-175 entries and `docs:freshness:maintain = pass_with_owned_rolling_debt` (`current_cohorts=2`, `max_cohorts=2`, `blocking_changed_paths=[]`).
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (23 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context
The original CO-175 rolling policy already landed on `origin/main`. That policy still correctly owns the Apr 14 March 14 baseline cohort and still fails closed for undeclared or over-budget stale docs.

The new Apr 18 problem on `origin/main` was narrower: `b678ce4` had a separate March 18 historical packet cohort outside the declared rolling baseline. This branch resolves that by declaring the second explicit CO-175 baseline cohort `co-175-apr-18-march-18-cli-1289-1298`, keeping the owner issue and policy caps unchanged.

## Current Truth
- `origin/main` before this branch failed with:
  - `70` blocking stale docs
  - `221` rolling CO-175 entries
- `docs:freshness:maintain` reported:
  - `freshness_decision=block_policy_over_budget`
  - `candidate_entries=291`
  - `current_cohorts=8`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
- Current branch now reports:
  - `0` blocking stale docs
  - `291` rolling CO-175 entries
  - `freshness_decision=pass_with_owned_rolling_debt`
  - `candidate_entries=291`
  - `current_cohorts=2`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
- The reviewed March 18 cohort is still lineage `1289-1298`:
  - Task Packet: `50`
  - Task Mirror: `10`
  - Report Only: `10`
  - `last_review=2026-03-18`
  - `cadence_days=30`
- The cohort spans these path families with `10` rows each:
  - `.agent/task`
  - `docs/findings`
  - `tasks/specs`
  - `tasks/tasks-*`
  - `docs/PRD-*`
  - `docs/TECH_SPEC-*`
  - `docs/ACTION_PLAN-*`
- The original rolling cohort remains:
  - owner issue `CO-175`
  - id `co-175-apr-14-march-14-tasks-1164-1195`
  - `221` rolling rows
- The new declared cohort also remains:
  - owner issue `CO-175`
  - id `co-175-apr-18-march-18-cli-1289-1298`
  - `70` rolling rows

## Requirements
1. Preserve the existing CO-175 rolling cohort and fail-closed policy semantics.
2. Reopen CO-175 as the explicit owner issue for the March 18 `1289-1298` cohort instead of creating a new owner issue or widening policy caps.
3. Classify and resolve the March 18 cohort through reviewed owner action:
   - refresh after review
   - archive if truly inactive
   - reclassify only if current class assignment is wrong
4. Keep the March 18 cohort explicit in before/after artifacts and issue docs.
5. Restore clean unrelated-diff maintenance behavior without hiding rolling debt.
6. Keep this child lane docs-only; parent owns registry changes, guide updates, reports, validation, Linear state, workpad, PR, and merge.

## Issue-Shaping Contract
- User-request translation: refresh the CO-175 docs packet so the reopened Apr 18 work is clearly about resolving the March 18 `1289-1298` historical packet cohort while preserving the already-merged CO-175 rolling baseline and fail-closed policy.
- Protected terms:
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
  - the original rolling policy should be reverted
  - the right fix is cap or window expansion
  - the March 18 cohort should be silently absorbed into the rolling baseline
  - a new owner issue should replace reopened CO-175
  - the parent can resolve the cohort with only a blanket date bump

## Parity / Alignment Matrix
- Current truth: the original CO-175 rolling policy is merged, but a new March 18 historical packet cohort makes Apr 18 maintenance fail over budget by cohort count.
- Reference truth: rolling policy stays narrow, explicit, and fail closed; new historical cohorts require reviewed owner action.
- Target truth: parent resolves the March 18 `1289-1298` cohort under reopened CO-175, leaving only the existing `221` rolling rows visible and restoring an allowed maintenance decision for clean unrelated diffs.
- Explicitly out-of-scope differences: cap/window expansion, policy weakening, hiding the rolling ledger, new issue ownership, or non-docs child-lane scope drift.

## Technical Requirements
- Functional requirements:
  1. Save before/after `docs:freshness` and `docs:freshness:maintain` artifacts under the CO-175 `out/` path.
  2. Record March 18 cohort classification by class and path family.
  3. Keep the original rolling cohort id and counts unchanged in policy and reporting.
  4. Resolve the March 18 cohort through reviewed owner action only.
  5. Restore a post-fix maintenance state where clean unrelated diffs are not blocked by this March 18 cohort.
- Non-functional requirements:
  - no policy dilution
  - no hidden debt
  - no unreviewed date bump
  - no implementation/test work in this child lane

## Data / Interfaces
- Current packet files:
  - `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `.agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
- Parent-owned implementation surfaces:
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - before/after reports under `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/`

## Validation Plan
- Child lane:
  - JSON parse check for `tasks/index.json`
  - protected-term grep over the refreshed packet and mirrors
  - `git diff --check` on touched scoped files
- Parent lane:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused guide and registry updates if the reviewed owner action changes those surfaces

## Not Done If
- the March 18 `1289-1298` cohort still blocks `docs:freshness` without explicit reviewed owner action
- `docs:freshness:maintain` still returns `block_policy_over_budget` for clean unrelated diffs because the cohort was left unresolved
- the original rolling cohort id or counts are widened, hidden, or repurposed
- the fix relies on cap expansion or a blind date bump

## Approvals
- Reviewer: pending parent docs-review / implementation.
- Date: 2026-04-18
