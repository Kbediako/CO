---
id: 20260312-1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints
title: Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md
related_tasks:
  - tasks/tasks-1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints

## Summary

Align the `Review output log (partial)` hint with first-class termination-boundary families instead of the legacy `timedOut` boolean.

## Scope

- Add a local helper for partial-output hint eligibility.
- Switch the primary and retry failure paths to the helper.
- Add focused wrapper coverage for positive and negative boundary families.

## Out of Scope

- New boundary kinds or provenance values.
- Retry-policy, issue-log, or generic `CodexReviewError` redesign.
- Wider standalone-review heuristic changes.
- Coordinator / Telegram / Linear refactors.

## Notes

- 2026-03-12: Registered after `1136` closed the verdict-stability disable contract. The next smallest truthful seam is the partial-output hint because first-class `termination_boundary` families now exist, but the hint still depends on the legacy `timedOut` boolean. Evidence: `docs/findings/1137-standalone-review-boundary-driven-partial-output-hints-deliberation.md`.
- 2026-03-12: Pre-implementation local read-only review approved. The lane stays bounded to partial-output hint routing and must not broaden into a general retry or transport redesign. Evidence: `docs/findings/1137-standalone-review-boundary-driven-partial-output-hints-deliberation.md`.
- 2026-03-12: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/cli/2026-03-12T12-10-41-018Z-8abdbb5e/manifest.json`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T120754Z-docs-first/00-summary.md`.
- 2026-03-12: Closed after `run-review` moved the partial-output hint onto explicit timeout-adjacent boundary kinds, the adjacent cross-stream timeout contract was aligned to the same truth, targeted regressions passed `6/6`, the full suite passed `194/194` files and `1418/1418` tests, bounded review returned no findings, and pack-smoke passed. The remaining explicit overrides are the earlier docs-review delegation-guard package, the closeout delegation-guard rationale, and the stacked-branch diff-budget waiver. Evidence: `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T193136Z-closeout/00-summary.md`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T193136Z-closeout/05-targeted-tests.log`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T193136Z-closeout/06-test.log`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T193136Z-closeout/10-review.log`, `out/1137-coordinator-symphony-aligned-standalone-review-boundary-driven-partial-output-hints/manual/20260312T193136Z-closeout/13-override-notes.md`.
