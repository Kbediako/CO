---
id: 20260311-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation
title: Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md
related_tasks:
  - tasks/tasks-1117-coordinator-symphony-aligned-standalone-review-run-review-spec-harness-env-isolation.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation

## Summary

Keep `tests/run-review.spec.ts` deterministic by scrubbing ambient fake-Codex env knobs from the shared harness env builder rather than reopening `scripts/run-review.ts` product logic.

## Scope

- Tighten `baseEnv()` or the equivalent shared harness env builder in `tests/run-review.spec.ts`.
- Add focused regression coverage proving ambient fake-Codex env knobs do not mutate unrelated baseline tests.
- Keep docs/task mirrors aligned.

## Out of Scope

- Product-runtime changes in `scripts/run-review.ts`.
- Reopening `1116` prompt contract wording.
- Broad `run-review.spec.ts` file splitting unless env isolation proves insufficient.
- Native review replacement.

## Proposed Design

### 1. Treat fake-Codex knobs as harness-local only

`baseEnv()` currently inherits `process.env` for convenience. That should stay only for ordinary runtime/env defaults the wrapper actually needs. Fake-Codex behavior toggles that exist purely for the mock harness must be removed from the inherited env unless a specific test sets them explicitly.

The initial bounded target is the known fake-Codex knobs used by `makeFakeCodex()`, starting with:

- `RUN_REVIEW_MODE`
- `RUN_REVIEW_ARGS_LOG`

If the harness exposes more fake-only controls through the same pattern, delete them in the same seam while keeping the slice bounded.

### 2. Add one focused regression that proves env isolation

Add a regression around an unrelated baseline test path so the acceptance signal is about determinism, not just string deletion. The test should show that an ambient `RUN_REVIEW_MODE=delete-after-help` no longer flips a baseline bounded-review prompt test red.

### 3. Keep the slice harness-only

This slice should not patch `scripts/run-review.ts` unless deterministic evidence shows the harness isolation is insufficient and the product surface is still implicated.

## Files / Modules

- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md` only if wording is needed for operator-facing notes about the remaining whole-file determinism follow-on

## Risks

- Scrubbing too aggressively could remove env values that legitimate tests depend on.
- This may improve one reproducibility seam without resolving the full whole-file `run-review.spec.ts` noise.
- Because the file is large, the acceptance signal must stay narrowly scoped and deterministic.

## Validation Plan

- Add a focused Vitest regression for ambient fake-Codex env isolation.
- Re-run the affected baseline prompt test plus the new env-isolation test.
- Keep docs-first guard bundle green before implementation.
