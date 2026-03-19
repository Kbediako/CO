# PRD - Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract

## Summary

`1135` made timeout and stall first-class boundary families. The next truthful standalone-review reliability seam is smaller than a broad `timedOut` rewrite: the documented verdict-stability disable contract exists, but the wrapper does not protect it with an explicit disabled-path integration test and the shared test env scrubber does not clear the controlling env var.

## Problem

The current contract says `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0` disables the bounded verdict-stability guard.

That contract is still soft in two ways:
- the shared `baseEnv(...)` helper in `tests/run-review.spec.ts` does not clear `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`
- wrapper integration coverage only proves the enabled-path verdict-stability failure, not the disabled path

That leaves a real regression surface:
- an ambient exported env var can leak into unrelated wrapper tests
- the documented disable behavior can silently regress without CI catching it
- review reliability remains blurrier than it needs to be even after the new boundary-family work

## Goals

- Make the verdict-stability disable contract deterministic in wrapper tests.
- Keep the slice bounded to env scrubbing plus disabled-path wrapper coverage.
- Preserve the existing enabled verdict-stability behavior and boundary taxonomy.
- Continue moving standalone-review toward a hardened, explicit runtime contract.

## Non-Goals

- Reworking verdict-stability heuristics or timeout thresholds.
- Revisiting timeout/stall/startup-loop taxonomy or generic `timedOut` transport semantics.
- Broad standalone-review architecture rewrites.
- Coordinator / Telegram / Linear changes.

## User Value

- Operators get a more trustworthy standalone-review surface where documented disable switches are actually protected by regression coverage.
- Wrapper tests become less sensitive to ambient shell exports or local env drift.
- The review runtime moves closer to a Symphony-like hardened contract by tightening a real configuration edge instead of broadening into a speculative redesign.

## Acceptance Criteria

- `baseEnv(...)` clears `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`.
- A wrapper regression proves that setting `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0` disables the verdict-stability guard.
- The disabled-path run falls back to another existing failure mode rather than reporting a `verdict-stability` boundary.
- Disabled-path telemetry does not persist a `verdict-stability` `termination_boundary`.
- Existing enabled verdict-stability regressions remain green in intent.
