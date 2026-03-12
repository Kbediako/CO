---
id: 20260312-1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split
title: Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split
status: draft
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md
related_tasks:
  - tasks/tasks-1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Active-Closeout Termination Boundary Taxonomy Split

## Summary

Make the active-closeout taxonomy explicit by promoting only the dedicated active-closeout reread guard into the first-class `termination_boundary` contract while keeping active-closeout search under `meta-surface-expansion`.

## Scope

- Add a dedicated first-class termination-boundary family for active-closeout rereads.
- Keep broad active-closeout/self-reference search behavior classified as meta-surface expansion.
- Document the split explicitly in the standalone-review guide and closeout materials.

## Out of Scope

- A generic umbrella `active-closeout` boundary.
- Timeout, stall, heavy-command, startup-loop, or native-review redesign work.
- Reclassifying shell-probe, command-intent, or the existing `1130` first-class families.

## Notes

- 2026-03-12: Registered after `1132` closed shell-probe parity. A bounded scout confirmed active-closeout is the next smallest truthful seam only if framed as a taxonomy split because search and reread behaviors are intentionally different today.
- 2026-03-12: Pre-implementation local read-only review approved. The lane is intentionally scoped to promote only the deterministic active-closeout reread guard while preserving active-closeout search as `meta-surface-expansion`. Evidence: `docs/findings/1133-standalone-review-active-closeout-termination-boundary-taxonomy-split-deliberation.md`, `out/1133-coordinator-symphony-aligned-standalone-review-active-closeout-termination-boundary-taxonomy-split/manual/20260312T113500Z-docs-first/00-summary.md`.
