---
id: 20260312-1132-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification
title: Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification.md
related_tasks:
  - tasks/tasks-1132-coordinator-symphony-aligned-standalone-review-shell-probe-termination-boundary-provenance-classification.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Shell-Probe Termination Boundary Provenance Classification

## Summary

Extend the first-class standalone-review `termination_boundary` contract so the existing shell-probe family no longer stays `null` in telemetry/stderr.

## Scope

- Persist a compact shell-probe `termination_boundary` record using the existing shell-probe boundary state.
- Print one stable shell-probe boundary classification line in stderr.
- Keep the existing human-readable failure prose and current rejection order intact.

## Out of Scope

- Active-closeout/self-reference, heavy-command, timeout, stall, or startup-loop parity.
- Any guard threshold or surface-rule changes.
- Native review replacement or other wrapper architecture refactors.

## Notes

- 2026-03-12: Registered after `1131` closed. Command-intent now has first-class parity, so the next smallest truthful gap is shell-probe parity rather than more review-surface policy work. Evidence: `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/00-summary.md`, `out/1131-coordinator-symphony-aligned-standalone-review-command-intent-termination-boundary-provenance-classification/manual/20260312T081716Z-closeout/14-next-slice-note.md`.
- 2026-03-12: Pre-implementation local read-only review approved. A bounded scout confirmed shell-probe is the smallest remaining contract-parity seam because the runtime already has dedicated shell-probe boundary state and termination paths. Evidence: `docs/findings/1132-standalone-review-shell-probe-termination-boundary-provenance-classification-deliberation.md`.
