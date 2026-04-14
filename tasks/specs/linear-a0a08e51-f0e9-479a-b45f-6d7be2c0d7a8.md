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
  - 2026-04-14: Baseline repro saved `221` stale entries with no missing/invalid/uncatalogued drift; classification found one `2026-03-14` cohort spanning lineage `1164-1195`.
  - 2026-04-14: Issue-quality review approves a policy/tooling lane rather than a blind date bump because CO-175 owns repo-wide debt while CO-173/CO-174 need per-PR diff health.
  - 2026-04-14: PR feedback and Core Lane showed the same owned stale spec cohort blocks non-dry-run `spec-guard`; implementation aligns `spec-guard` with the catalog policy while failing closed for invalid, expired, over-budget, or non-eligible stale specs.
---

# Technical Specification

## Context
`CO-175` owns the Apr 14 repo-wide freshness baseline. Clean main at `cac56ec89` produced `221` stale entries, all `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`, with no registry/catalog drift. This is real debt, but it should not force unrelated feature lanes to refresh historical task/spec/report cohorts.

## Requirements
1. Preserve `docs:freshness` as a blocking guard for missing registry rows, missing files, invalid entries, uncatalogued docs, non-eligible stale docs, malformed rolling policy config, expired cohorts, and over-budget cohorts.
2. Add a machine-readable `docs/docs-catalog.json` policy named `rolling_freshness_cohorts`.
3. Report eligible rolling debt in JSON, markdown, and console output with owner, expiry, class/path breakdowns, lineage, and samples.
4. Exclude only eligible, owner-backed, in-window rows from blocking `stale_entries`.
5. Apply the same policy to stale active specs in `spec-guard`.
6. Keep CO-173 and CO-174 able to cite CO-175 for this repo-wide baseline.

## Issue-Shaping Contract
Protected terms: `docs:freshness`, `spec-guard`, `repo-wide freshness debt`, `per-PR diff health`, `date-boundary stale cohort`, `docs registry drift`, `rolling freshness cohorts`.

Wrong interpretations rejected: warning-only gates, mass `last_review` bump, hidden stale docs, CO-173/CO-174 runtime work, or global gate disabling.

Not done if eligible rolling debt is invisible, if stale public/active/agent policy docs can pass under the rolling rule, or if malformed policy fields can defer stale docs/specs.

## Parity / Alignment Matrix
- Current truth: one coherent March 14 task/report/spec cohort blocks repo-wide validation.
- Reference truth: feature-lane validation fails for branch-local docs drift and truly blocking stale docs, not for a newly rolled historical cohort with a repo-wide owner.
- Target truth: `docs:freshness` and `spec-guard` pass when only eligible CO-175-owned rolling debt exists, while reporting that debt explicitly.
- Out of scope: archive automation redesign, broad historical cleanup, review-wrapper changes, and child-lane policy changes.

## Technical Design
- Normalize `rolling_freshness_cohorts` from `docs/docs-catalog.json`; disabled or invalid config produces no deferral.
- Group stale rows by `last_review`, `cadence_days`, and `age_days`; enforce `window_days`, `max_cohorts`, and `max_entries`.
- Require explicit `owner_issue`, `policy_doc`, and non-empty `eligible_doc_classes`.
- Store deferred docs in `rolling_cohort_entries` / `rolling_freshness_cohorts`; keep existing `stale_entries` as the blocking set.
- Have `spec-guard` resolve spec doc classes from the catalog and apply the same policy only to active stale specs.

## Validation Plan
- Focused tests: eligible rolling rows, non-eligible rows, expired rows, over-budget rows, invalid classes, and spec-guard policy parity.
- Required gates: delegation guard, spec guard, build, lint, test, docs check, docs freshness, repo stewardship, diff budget, manifest-backed review, and ready-review.
- Before/after evidence: baseline report shows `221` blocking stale rows; post-policy report shows `0` blocking stale rows and `221` rolling rows.

## Approvals
- Reviewer: docs-review / standalone-review evidence in workpad.
- Date: 2026-04-14
