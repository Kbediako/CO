---
id: 20260312-1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split
title: Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md
related_tasks:
  - tasks/tasks-1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split

## Summary

Promote the existing generic timeout and output-stall failures into first-class `termination_boundary` families.

## Scope

- Add first-class timeout / stall `termination_boundary` kinds and provenance.
- Thread explicit boundary records from the existing `run-review` timeout and stall termination sites.
- Extend fallback error inference and docs for timeout/stall classification.

## Out of Scope

- Startup-loop, command-intent, shell-probe, startup-anchor, or meta-surface family redesign.
- Generic retry / `timedOut` semantics redesign.
- Coordinator / Telegram / Linear refactors.

## Notes

- 2026-03-12: Registered after `1134` closed the startup-loop boundary classification. Timeout/stall is the next smallest truthful contract seam because both families already have dedicated runtime branches and still lack first-class compact boundary representation.
- 2026-03-12: Pre-implementation local read-only review approved. The lane stays explicitly bounded to timeout/stall contract exposure and must not broaden into startup-loop or generic retry semantics work. Evidence: `docs/findings/1135-standalone-review-timeout-stall-termination-boundary-taxonomy-split-deliberation.md`.
- 2026-03-12: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline failed at its own delegation guard before surfacing a concrete docs defect, so the docs-first package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/cli/2026-03-12T10-50-46-717Z-c9962288/manifest.json`, `out/1135-coordinator-symphony-aligned-standalone-review-timeout-stall-termination-boundary-taxonomy-split/manual/20260312T104300Z-docs-first/00-summary.md`.
