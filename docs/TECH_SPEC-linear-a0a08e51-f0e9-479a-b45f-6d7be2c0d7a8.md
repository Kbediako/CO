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
- Canonical TECH_SPEC: `tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- PRD: `docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`
- Task checklist: `tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md`

## Traceability
- Linear issue: `CO-175` / `a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8`
- Linear URL: https://linear.app/asabeko/issue/CO-175/co-workflow-add-rolling-docsfreshness-cohort-policy-for-apr-14-stale
- Affected lanes: `CO-173`, `CO-174`
- Historical baseline lanes: `CO-63`, `CO-102`, `CO-155`, `CO-166`, `CO-167`, `CO-170`, `CO-124`

## Summary
- Objective: add an explicit rolling cohort policy so a short-lived, owner-backed task/report stale cohort remains visible but does not block unrelated feature-lane `docs:freshness` validation.
- Scope:
  - bootstrap the `CO-175` docs-first packet, workpad source, and registry mirrors
  - add durable policy documentation
  - extend `scripts/docs-freshness.mjs` report semantics for rolling cohorts
  - align `scripts/spec-guard.mjs` with the same owner-backed rolling cohort window for stale specs
  - add focused test coverage
  - save before/after artifacts
- Constraints:
  - do not weaken freshness for public/active/agent policy docs
  - do not hide missing or invalid registry drift
  - do not date-bump the March 14 cohort as the primary fix

## Technical Requirements
- Functional requirements:
  - `docs:freshness` must separate blocking stale rows from policy-covered rolling rows
  - rolling rows must remain present in JSON and markdown reports
  - configured policy must include owner issue, window, eligible classes, max cohorts, and max entries
  - malformed rolling policy fields must fail closed instead of falling back to permissive defaults
  - `spec-guard` must report eligible stale specs as rolling cohort debt and continue to fail for invalid, expired, over-budget, or non-eligible stale specs
  - stale rows outside policy must fail exactly as before
- Non-functional requirements:
  - no network dependency
  - report output remains deterministic
  - existing consumers of `stale_entries` continue to see the blocking stale set
- Interfaces / contracts:
  - `docs/docs-catalog.json` policy key `rolling_freshness_cohorts`
  - `scripts/docs-freshness.mjs`
  - `scripts/spec-guard.mjs`
  - `tests/docs-freshness.spec.ts`
  - `tests/spec-guard.spec.ts`

## Execution Notes
- Baseline artifact:
  - `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-docs-freshness-report.json`
  - `docs:freshness FAILED - 3791 docs, 3794 registry entries`
  - stale total `221`; Task Packet `157`, Task Mirror `32`, Report Only `32`
- Classification artifact:
  - `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/manual/baseline-cohort-classification.json`
  - one cohort: `last_review=2026-03-14`, `cadence_days=30`, `age_days=31`
  - lineage: `1164-1195`
  - disposition: rolling freshness window owned by `CO-175`

## Validation Plan
- Focused tests:
  - policy-covered task/report stale rows move to `rolling_cohort_entries`
  - non-eligible stale rows remain blocking failures
  - malformed rolling policy classes leave stale docs blocking
  - `spec-guard` honors eligible owner-backed spec cohorts and fails closed on invalid classes
  - markdown summarizes rolling cohorts even when blocking drift is absent
- Required gates:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review -- --uncommitted`

## Approvals
- Reviewer: pending docs-review / standalone review.
- Date: 2026-04-14
