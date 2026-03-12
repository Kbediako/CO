---
id: 20260312-1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification
title: Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md
related_tasks:
  - tasks/tasks-1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification

## Summary

Promote the existing standalone-review startup-loop detector into the first-class `termination_boundary` contract.

## Scope

- Add a first-class startup-loop `termination_boundary` kind / provenance.
- Thread the explicit boundary record from the existing `run-review` startup-loop termination site.
- Extend fallback error inference and docs for startup-loop classification.

## Out of Scope

- Generic timeout, stall, or heavy-command taxonomy work.
- Rewriting the startup-loop detector itself.
- Coordinator / Telegram / Linear refactors.

## Notes

- 2026-03-12: Registered after `1133` closed the active-closeout taxonomy split. A bounded scout confirmed startup-loop is the next smallest truthful contract seam because it already exists as a dedicated runtime detector and only lacks first-class boundary classification.
- 2026-03-12: Pre-implementation local read-only review approved. The lane stays explicitly bounded to startup-loop contract exposure and must preserve the existing cross-stream fragmented false-positive guard. Evidence: `docs/findings/1134-standalone-review-startup-loop-termination-boundary-classification-deliberation.md`.
- 2026-03-12: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline failed at its own delegation guard before surfacing a concrete docs defect, so the docs-first package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/cli/2026-03-12T10-17-32-111Z-6086a0eb/manifest.json`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T110200Z-docs-first/00-summary.md`.
- 2026-03-12: Closed after the startup-loop boundary became first-class with a minimal direct-termination-site record, focused startup-loop regressions passed `11/11`, build/lint/docs/pack-smoke passed, and the recurring full-suite quiet-tail plus standalone-review drift were captured as explicit overrides instead of false greens. Evidence: `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/00-summary.md`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/05-targeted-tests.log`, `out/1134-coordinator-symphony-aligned-standalone-review-startup-loop-termination-boundary-classification/manual/20260312T102852Z-closeout/14-override-notes.md`.
