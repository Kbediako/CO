---
id: 20260312-1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification.md
related_tasks:
  - tasks/tasks-1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Termination Boundary Provenance Classification

## Summary

Expose the existing standalone-review termination classes as a stable telemetry/output contract so operators no longer infer the fired boundary from free-form prose alone.

## Scope

- Persist a compact `termination_boundary` record for startup-anchor, meta-surface expansion, verdict-stability, and relevant-reinspection dwell.
- Print one explicit stable boundary classification line in stderr for those four classes.
- Keep the existing human-readable failure prose and current rejection order intact.

## Out of Scope

- Command-intent, shell-probe, heavy-command, active-closeout-bundle reread, or generic timeout/stall parity.
- Any guard threshold or surface-rule changes.
- Native review replacement or other wrapper architecture refactors.

## Notes

- 2026-03-12: Registered after `1129` closed. The live runtime now terminates the architecture in-bounds reread loop correctly, so the next truthful seam is stable classification/provenance in telemetry and terminal output rather than more heuristic tuning. Evidence: `out/1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary/manual/20260312T045112Z-closeout/00-summary.md`, `out/1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary/manual/20260312T045112Z-closeout/10-review.log`, `out/1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary/manual/20260312T045112Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Pre-implementation local read-only review approved. The bounded scout converged on a compact output-contract slice that leaves heuristics untouched and avoids widening into command-intent/shell-probe/timeout parity. Evidence: `docs/findings/1130-standalone-review-termination-boundary-provenance-classification-deliberation.md`.
- 2026-03-12: Completed. The final tree now carries the supported boundary record through termination instead of reconstructing it from prose, keeps unsupported families explicitly `null`, preserves the natural child-close dwell path, and excludes active-closeout self-reference from the supported taxonomy. Evidence: `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/00-summary.md`, `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/05-targeted-tests.log`, `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/08-test.log`, `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/12-manual-termination-boundary-check.md`, `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/15-elegance-review.md`.
