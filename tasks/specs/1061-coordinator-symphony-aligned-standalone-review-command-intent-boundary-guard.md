---
id: 20260308-1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard
title: Coordinator Symphony-Aligned Standalone Review Command-Intent Boundary Guard
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1061 Coordinator Symphony-Aligned Standalone Review Command-Intent Boundary Guard

- Task ID: `1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard.md`

## Summary

This slice adds one explicit command-intent boundary guard so bounded standalone review stops when it launches policy-violating commands instead of treating them as acceptable progress.

## Scope

- Extend `ReviewExecutionState` with command-intent classes for bounded review.
- Terminate on explicit policy-violating command intents.
- Preserve the thin wrapper / single-state-owner split.

## Validation Expectations

- Direct command-intent classification coverage.
- Targeted `run-review` regressions.
- Standard docs/check/lint/build/test gates plus `pack:smoke`.

## Review Notes

- 2026-03-08 `1060` closed the meta-surface broadening seam, but the final synced-tree wrapper rerun still drifted by launching its own targeted Vitest rerun and speculative review work; evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/09-review.log`.
- 2026-03-08 follow-on note explicitly recommended promoting bounded-policy violations to first-class command-intent classes instead of relying only on operand heuristics; evidence: `out/1060-coordinator-symphony-aligned-standalone-review-meta-surface-expansion-guard/manual/20260308T050930Z-closeout/14-next-slice-note.md`.
- 2026-03-08 closeout validated the final boundary on direct validation-runner shorthands plus zero/non-zero fast exits; the live wrapper rerun still required an explicit override because it broadened into exhaustive inspection and the configured 180-second timeout ceiling did not stop it before manual termination. Evidence: `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/00-summary.md`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/11-manual-review-runtime-check.json`, `out/1061-coordinator-symphony-aligned-standalone-review-command-intent-boundary-guard/manual/20260308T072548Z-closeout/13-override-notes.md`.
