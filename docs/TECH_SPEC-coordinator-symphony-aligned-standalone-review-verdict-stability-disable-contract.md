---
id: 20260312-1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract
title: Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md
risk: medium
owners:
  - Codex
last_review: 2026-03-12
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract

## Summary

Protect the documented `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0` disable contract with explicit wrapper isolation and disabled-path coverage.

## Current State

The standalone-review runtime already supports a verdict-stability timeout env knob:
- `scripts/run-review.ts` parses `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`
- `0` is documented as disabling the guard
- `tests/run-review.spec.ts` already covers enabled-path verdict-stability failures

But two gaps remain:
- `baseEnv(...)` does not clear `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`, so ambient exports can leak into unrelated wrapper tests
- no integration test proves that the disabled path falls through to the remaining timeout/stall transport instead of still terminating on `verdict-stability`

## Symphony Alignment Note

This is the next smallest truthful hardening seam. Symphony-aligned reliability work should keep contracts explicit and deterministic before broadening semantics. Protecting the disable switch is more valuable than opening a larger `timedOut` redesign while this smaller contract remains unguarded.

## Proposed Design

### 1. Scrub the verdict-stability env var in shared wrapper test setup

Update `baseEnv(...)` in `tests/run-review.spec.ts` so the shared sandbox env deletes `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS` by default, matching the other review guard env vars.

### 2. Add a disabled-path wrapper regression

Add a focused wrapper test using the existing `verdict-stability-drift` fake review mode with:
- `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0`
- `CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0`
- a short overall timeout

The test should prove:
- the run does not fail on verdict-stability
- stderr does not print a `verdict-stability` boundary line
- telemetry does not store a `verdict-stability` termination boundary
- the run falls back to the existing overall-timeout path

### 3. Preserve existing enabled-path behavior

Do not change verdict-stability detection heuristics, threshold defaults, or existing enabled-path assertions beyond any minimal fixture cleanup needed to keep the new disabled-path check deterministic.

## Files / Modules

- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md` if a brief clarification is needed

## Risks

- Accidentally weakening the existing enabled verdict-stability guard while adding the disabled-path test.
- Letting the slice broaden into timeout/stall or generic `timedOut` semantics work.

## Validation Plan

- Focused wrapper regressions for verdict-stability enabled + disabled paths.
- Deterministic docs/build/lint/test/review/pack-smoke validation on the final tree.
