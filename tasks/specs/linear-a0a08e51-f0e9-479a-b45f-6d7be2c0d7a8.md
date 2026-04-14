---
id: 20260414-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8
title: CO workflow: add rolling docs:freshness cohort policy for Apr 14 stale baseline
status: in_progress
owner: Codex
created: 2026-04-14
last_review: 2026-04-14
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
related_action_plan: docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
related_tasks:
  - tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
review_notes:
  - 2026-04-14: Opened from Linear issue `CO-175` in the provider-worker workspace after live issue-context showed the issue in Backlog, moving it to `In Progress`, recording `stay_serial` / `single_bounded_change`, creating workpad comment `2c7d4608-80fc-41bd-a48d-c383afe6d4e4`, and switching detached HEAD `cac56ec89` onto branch `linear/co-175-rolling-docs-freshness-cohorts`.
  - 2026-04-14: Baseline repro saved `221` stale entries with `0` missing registry, missing disk, invalid entry, or uncatalogued drift. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`.
  - 2026-04-14: Classification found one coherent `2026-03-14` cohort, cadence `30`, age `31`, spanning task/spec lineage `1164-1195` across task packet, task mirror, and report-only path families. Evidence: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`.
  - 2026-04-14: Pre-implementation issue-quality review approves a policy/tooling lane instead of another blind cohort date bump because the acceptance criteria require per-PR diff health to stay separate from repo-wide freshness debt.
  - 2026-04-14: PR feedback and Core Lane CI showed the same owned March 14 stale spec cohort also blocks non-dry-run `spec-guard`; the lane now keeps `spec-guard` aligned with the catalog-backed rolling cohort policy while failing closed for invalid, expired, over-budget, or non-eligible stale specs.
---

# Technical Specification

## Context
`CO-175` owns the Apr 14 repo-wide `docs:freshness` baseline. The failure is real, but it is not branch-local fallout for CO-173, CO-174, or future feature lanes. The reproduced stale set is one date-boundary cohort: `221` entries, all reviewed on `2026-03-14`, one day past a `30` day cadence.

## Requirements
1. Preserve `docs:freshness` as a blocking guard for missing registry rows, missing files, invalid entries, uncatalogued docs, non-eligible stale classes, and expired stale cohorts.
2. Add a machine-readable rolling freshness cohort policy for eligible repo-wide task/report cohorts.
3. Keep rolling cohort entries visible in JSON and markdown reports with owner issue, expiry, class breakdown, path family breakdown, and representative paths.
4. Ensure eligible rolling cohort debt does not make unrelated feature lanes fail blocking `docs:freshness` during the configured window.
5. Ensure the same eligible, owner-backed stale spec cohort does not make unrelated feature lanes fail non-dry-run `spec-guard` during the configured window.
6. Document the policy in a durable contributor guide and in this task packet.
7. Save before/after report artifacts and workpad evidence.

## Issue-Shaping Contract
- User-request translation carried forward:
  - reproduce Apr 14 `docs:freshness` baseline
  - classify the `221` stale entries
  - define rolling freshness cohorts
  - preserve per-PR diff health without hiding repo-wide freshness debt
- Protected terms / exact artifact and surface names:
  - `docs:freshness`
  - `spec-guard`
  - `repo-wide freshness debt`
  - `per-PR diff health`
  - `date-boundary stale cohort`
  - `docs registry drift`
  - `rolling freshness cohorts`
  - `scripts/docs-freshness.mjs`
  - `docs/docs-catalog.json`
- Nearby wrong interpretations to reject:
  - a warning-only freshness gate
  - a warning-only spec guard
  - a mass `last_review` bump
  - CO-173/CO-174 implementation changes
  - hiding non-task or expired stale docs
- Explicit non-goals carried forward:
  - no review-wrapper or child-lane policy runtime changes
  - no active issue transitions outside CO-175
  - no global disabling of docs gates

## Parity / Alignment Matrix
- Current truth: all stale rows are `Task Packet`, `Task Mirror`, or `Report Only`; no stale public guide, agent policy, active guide, skill, template, missing, or invalid drift exists.
- Reference truth: feature-lane validation should fail on its own diff health and on truly blocking docs drift, not on a newly rolled historical cohort that has a repo-wide owner.
- Target truth / intended delta: `docs:freshness` returns green for blocking validation when only eligible owned rolling cohorts are stale, while the report still lists those stale rows under `rolling_freshness_cohorts`; `spec-guard` likewise reports eligible stale active specs as rolling cohort debt and remains blocking for invalid or out-of-policy stale specs.
- Explicitly out-of-scope differences: long-term archiving cadence, task archive automation redesign, and unrelated historical packet cleanup.

## Readiness Gate
- Not done if:
  - post-change `docs:freshness` lacks rolling cohort details
  - eligible rolling debt is invisible in JSON/markdown
  - stale public/active/agent policy docs can pass under the rolling rule
  - stale cohorts older than the configured window can pass
  - malformed policy fields, including empty eligible classes, can defer stale docs or specs
- Pre-implementation issue-quality review evidence:
  - baseline report and classification prove the current failure is a coherent date-boundary cohort, not mixed registry drift
  - the issue explicitly asks for policy/tooling separation rather than another refresh-only lane
- Safeguard ownership split:
  - CO-175 owns the policy and current Apr 14 cohort
  - CO-173 and CO-174 can cite CO-175 for the repo-wide baseline
  - future out-of-window cohorts must get refreshed, archived, reclassified, or assigned to a new owner

## Technical Requirements
- Functional requirements:
  - read `docs/docs-catalog.json` policy `rolling_freshness_cohorts`
  - group eligible stale rows by `last_review`, `cadence_days`, and `age_days`
  - defer only groups inside `window_days`, `max_cohorts`, and `max_entries`
  - require explicit owner issue, policy doc, and non-empty eligible classes before deferring rows
  - keep deferred rows in `rolling_cohort_entries` and grouped metadata
  - exclude deferred rows from blocking `stale_entries`
  - emit console and markdown summaries for rolling cohorts
  - have `spec-guard` use the same catalog policy for active stale specs while preserving blocking behavior for invalid/out-of-policy specs
- Non-functional requirements:
  - keep behavior deterministic and local
  - keep report schema backward-compatible for existing failure fields
  - keep policy default disabled unless configured
- Interfaces / contracts:
  - `runDocsFreshness(...)`
  - `renderDocsFreshnessMarkdown(...)`
  - `scripts/spec-guard.mjs`
  - `docs/docs-catalog.json`
  - `tests/docs-freshness.spec.ts`
  - `tests/spec-guard.spec.ts`

## Architecture & Data
- Architecture / design adjustments:
  - The docs catalog owns the policy. The script remains the evaluator and report writer.
  - Raw stale rows are split into blocking stale rows and policy-covered rolling rows after registry validation.
  - Spec freshness uses the same policy, but only for active spec files that resolve to eligible catalog classes.
  - Missing/invalid/uncatalogued drift remains independent and always fails.
- Data model changes / migrations:
  - Report version increments to include `totals.rolling_cohort_entries`, `rolling_cohort_entries`, and `rolling_freshness_cohorts`.
  - The catalog gains an explicit `rolling_freshness_cohorts` policy block.
- External dependencies / integrations:
  - none beyond existing Node/Vitest test surfaces and Linear workpad evidence.

## Validation Plan
- Tests / checks:
  - focused `tests/docs-freshness.spec.ts`
  - focused `tests/spec-guard.spec.ts`
  - `node scripts/spec-guard.mjs`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `npm run review`
- Rollout verification:
  - before artifact shows `221` stale blocking rows
  - after artifact shows `0` blocking stale rows and `221` rolling cohort rows
  - markdown and console output name the rolling policy owner
- Monitoring / alerts:
  - the normal `docs:freshness` gate fails when rolling cohorts exceed the configured window or when non-eligible docs become stale

## Open Questions
- None for implementation.

## Approvals
- Reviewer: pending docs-review / standalone review.
- Date: 2026-04-14
