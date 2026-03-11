---
id: 20260311-1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary
title: Coordinator Symphony-Aligned Standalone Review Bounded Relevant Reinspection Dwell Boundary
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary.md
risk: high
owners:
  - Codex
last_review: 2026-03-11
---

## Summary

Add a dedicated standalone-review boundary for repetitive bounded relevant reinspection so the wrapper stops timing out generically after it keeps revisiting the same touched files and adjacent relevant helpers/tests without concrete findings.

## Technical Requirements

- Detect repetitive bounded relevant reinspection after startup-anchor success.
- Keep the boundary distinct from meta-surface drift, shell probes, command-intent violations, and active closeout-bundle rereads.
- Preserve allowance for first-pass relevant inspection, diverse bounded relevant inspection, and concrete finding output.
- Emit a dedicated operator-facing failure reason plus persisted telemetry for the new boundary.

## Architecture & Design

### 1. Track bounded relevant reinspection dwell in review execution state

`ReviewExecutionState` already records inspection targets, hit counts, startup-anchor state, and concrete output signals. Extend that state with a bounded relevant reinspection dwell counter/violation that activates only when:

- startup-anchor has already been observed,
- inspection remains within touched files or adjacent relevant helpers/tests,
- the target set stays narrow/repetitive,
- and no concrete finding output has appeared.

### 2. Wire a dedicated termination path in the wrapper

`scripts/run-review.ts` should poll the new boundary alongside the existing startup-anchor, closeout-reread, command-intent, shell-probe, and meta-surface guards. When triggered, the wrapper should terminate with an explicit bounded relevant reinspection dwell reason instead of falling through to the generic timeout message.

### 3. Add focused regression coverage

Add focused `tests/review-execution-state.spec.ts` coverage for the new dwell-shaping contract and `tests/run-review.spec.ts` coverage for:

- repetitive relevant reinspection triggering the dedicated boundary,
- diverse bounded relevant inspection not triggering it,
- and concrete finding output preventing premature dwell termination.

## Validation Plan

- `node scripts/delegation-guard.mjs --task 1120-coordinator-symphony-aligned-standalone-review-bounded-relevant-reinspection-dwell-boundary`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- Focused `review-execution-state.spec.ts` and `run-review.spec.ts` regressions for the new boundary
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Approvals

- Reviewer: Codex (top-level agent, docs-first self-approval)
- Date: 2026-03-11
