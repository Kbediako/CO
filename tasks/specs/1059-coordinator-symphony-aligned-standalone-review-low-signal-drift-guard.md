---
id: 20260308-1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard
title: Coordinator Symphony-Aligned Standalone Review Low-Signal Drift Guard
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1059 Coordinator Symphony-Aligned Standalone Review Low-Signal Drift Guard

- Task ID: `1059-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-low-signal-drift-guard.md`

## Summary

This slice adds bounded low-signal drift detection to standalone review so repetitive nearby-file inspection no longer counts as sufficient progress.

## Scope

- Extend `ReviewExecutionState` with bounded drift-classification signals.
- Terminate bounded review when it stops making meaningful progress.
- Preserve artifact-first failure output and CO’s advisory-only authority model.

## Validation Expectations

- Direct drift-classification coverage.
- Targeted `run-review` regressions.
- Standard docs/check/lint/build gates plus `pack:smoke`.

## Review Notes

- 2026-03-08 `1058` closeout proved the structural extraction is complete but real review drift still happens; evidence: `out/1058-coordinator-symphony-aligned-standalone-review-execution-state-extraction/manual/20260308T031818Z-closeout/11-manual-review-runtime-check.md`.
- 2026-03-08 real Symphony read-only research validated one runtime owner plus thin controller/projection layers, while also showing CO should stay fail-closed and advisory-only rather than copy Symphony’s restart/approval authority.
