---
id: 20260312-1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md
related_tasks:
  - tasks/tasks-1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Command-Intent Termination Boundary Provenance Classification

## Summary

Extend the first-class standalone-review `termination_boundary` contract so the existing command-intent family no longer stays `null` in telemetry/stderr.

## Scope

- Persist a compact command-intent `termination_boundary` record using the existing violation kind/provenance.
- Print one stable command-intent boundary classification line in stderr.
- Keep the existing human-readable failure prose and current rejection order intact.

## Out of Scope

- Shell-probe, active-closeout/self-reference, heavy-command, timeout, stall, or startup-loop parity.
- Any guard threshold or surface-rule changes.
- Native review replacement or other wrapper architecture refactors.

## Notes

- 2026-03-12: Registered after `1130` closed. The four-family boundary contract is now stable, so the next smallest truthful gap is command-intent parity rather than more widening of the existing taxonomy. Evidence: `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/00-summary.md`, `out/1130-coordinator-symphony-aligned-standalone-review-termination-boundary-provenance-classification/manual/20260312T061623Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Pre-implementation local read-only review approved. A bounded scout confirmed command-intent is the smallest remaining contract-parity seam because the runtime already carries typed violation state for that family. Evidence: `docs/findings/1131-standalone-review-command-intent-termination-boundary-provenance-classification-deliberation.md`.
- 2026-03-12: Completed. The final tree now persists a first-class command-intent `termination_boundary` record with provenance, carries that record through both poller and natural child-close termination paths, fixes the `validation-suite` label fallthrough, and keeps the broader unsupported families out of scope. Evidence: `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/00-summary.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/05b-targeted-tests.log`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/12-manual-command-intent-boundary-check.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/15-elegance-review.md`.
