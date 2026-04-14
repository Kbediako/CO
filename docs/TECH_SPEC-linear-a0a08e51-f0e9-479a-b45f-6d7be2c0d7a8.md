---
id: 20260414-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8
title: CO workflow: add rolling docs:freshness cohort policy for Apr 14 stale baseline
relates_to: docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md
risk: high
owners:
  - Codex
last_review: 2026-04-14
---

## Canonical Reference
- Task spec: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- PRD: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Task checklist: `tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`

## Summary
CO-175 owns the Apr 14 `docs:freshness` baseline: `221` stale rows, all `2026-03-14`, with no registry or catalog drift. The implementation adds a catalog-backed rolling cohort policy so eligible owned task/report rows remain visible but no longer block unrelated feature-lane validation during the configured window.

## Requirements
- `docs:freshness` separates blocking stale rows from policy-covered `rolling_cohort_entries`.
- JSON, markdown, and console output include owner issue, expiry, counts, class/path breakdowns, and representative paths.
- Rolling deferral requires explicit `owner_issue`, `policy_doc`, valid window/budget fields, and non-empty eligible classes.
- `spec-guard` uses the same owner-backed policy for eligible stale active specs.
- Missing files, missing registry rows, invalid registry entries, uncatalogued docs, malformed policy config, expired cohorts, over-budget cohorts, and non-eligible stale specs/docs remain blocking.

## Evidence
- Baseline: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`.
- Classification: `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`.
- Policy guide: `docs/guides/docs-freshness-cohorts.md`.

## Validation Plan
Run focused tests for `docs:freshness` and `spec-guard`, then the required lane gates: delegation guard, spec guard, build, lint, test, docs check, docs freshness, repo stewardship, diff budget, manifest-backed review, and ready-review.

## Approvals
- Reviewer: docs-review / standalone-review evidence in workpad.
- Date: 2026-04-14
