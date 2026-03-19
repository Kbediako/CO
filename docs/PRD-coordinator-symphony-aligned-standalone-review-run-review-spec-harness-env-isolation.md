# PRD - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation

## Summary

`1116` closed the bounded diff-local citation contract in the product surface, but the remaining review-reliability noise includes `tests/run-review.spec.ts` inheriting ambient fake-Codex env knobs from the parent shell, which can make unrelated harness cases fail or mutate behavior.

## Problem

- `tests/run-review.spec.ts` uses a shared `baseEnv()` helper that inherits `process.env`.
- That inheritance currently leaves fake-Codex knobs such as `RUN_REVIEW_MODE` and related mock controls exposed to the test harness unless they are deleted explicitly.
- The result is harness fragility: ambient shell state can flip unrelated baseline tests red even when the underlying product seam is correct.
- This is a harness determinism issue, not another `scripts/run-review.ts` product-logic gap.

## Goals

- Isolate `tests/run-review.spec.ts` from ambient fake-Codex env leakage.
- Keep the fix bounded to the shared harness env assembly and focused regression coverage.
- Improve reproducibility for whole-file `run-review.spec.ts` debugging without reopening the already-closed prompt/state seams.

## Non-Goals

- Reopening the `1116` diff-local citation contract in `scripts/run-review.ts`.
- Broader `run-review.spec.ts` file splitting unless env isolation alone proves insufficient.
- Native review replacement or broader reviewer prompt redesign.
- Reopening `review-execution-state` heuristics.

## User Value

- Standalone-review harness failures become more reproducible and less sensitive to operator shell state.
- Follow-on review-reliability slices can focus on real product or harness defects instead of ambient env noise.
- CO keeps moving toward a hardened Symphony-like posture: isolated seams, explicit contracts, and deterministic control surfaces.

## Acceptance Criteria

- Shared harness env assembly in `tests/run-review.spec.ts` explicitly removes ambient fake-Codex control vars that can alter mock behavior across tests.
- A focused regression proves an ambient fake-Codex knob such as `RUN_REVIEW_MODE` no longer flips an unrelated baseline review test.
- The slice stays harness-only unless deterministic evidence forces a product change.
- Docs/task mirrors stay aligned and explicitly record that broader whole-file determinism may remain a separate follow-on.
