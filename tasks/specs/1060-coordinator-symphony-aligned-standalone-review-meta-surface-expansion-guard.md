---
id: 20260308-1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard
title: Coordinator Symphony-Aligned Standalone Review Meta-Surface Expansion Guard
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1060 Coordinator Symphony-Aligned Standalone Review Meta-Surface Expansion Guard

- Task ID: `1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard.md`

## Summary

This slice adds one bounded off-task broadening guard to standalone review so meta-surface expansion no longer counts as acceptable bounded-review progress.

## Scope

- Extend `ReviewExecutionState` with bounded meta-surface expansion signals.
- Terminate bounded review when it persistently broadens into explicit meta-surfaces.
- Preserve artifact-first failure output and CO’s advisory-only authority model.

## Validation Expectations

- Direct meta-surface classification coverage.
- Targeted `run-review` regressions.
- Standard docs/check/lint/build gates plus `pack:smoke`.

## Review Notes

- 2026-03-08 `1059` closeout proved the nearby-file low-signal seam is fixed but the live review can still widen into global skills/memory, run manifests/logs, and nested review/delegation work; evidence: `out/1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard/manual/20260308T035206Z-closeout/09-review.log`.
- 2026-03-08 real Symphony read-only research validated one runtime owner plus thin controller/projection layers and explicitly reinforced keeping CO advisory-only rather than copying Symphony’s restart/approval ownership.
