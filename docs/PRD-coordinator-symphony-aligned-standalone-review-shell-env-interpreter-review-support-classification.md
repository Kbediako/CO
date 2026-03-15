# PRD: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Review-Support Classification

## Summary

After `1209` extracted the shell-env helper from `scripts/lib/review-execution-state.ts`, the standalone-review support-family classifier still does not recognize the new helper family as `review-support`.

## Problem

The review-execution-state classifier currently enumerates the older adjacent standalone-review helper families and their direct test surfaces as `review-support`, but it omits:

- `scripts/lib/review-shell-env-interpreter.ts`
- `dist/scripts/lib/review-shell-env-interpreter.js`

The touched-family exemptions also still only recognize the older prompt-context and review-scope helper families, so the new shell-env helper does not inherit the same bounded-review parity that earlier extracted helper families already have.

## Goal

Classify the shell-env helper family as `review-support` and give it the same bounded touched-family parity as the adjacent standalone-review helper families, without widening into new helper behavior, runtime changes, or another extraction pass.

## Non-Goals

- changing shell-env interpreter behavior
- adding a new dedicated shell-env helper test suite
- changing `scripts/run-review.ts` runtime supervision or telemetry behavior
- widening into generic review-support taxonomy reshaping beyond the new helper family

## Success Criteria

- `scripts/lib/review-execution-state.ts` recognizes the shell-env helper family as `review-support`
- touching the shell-env helper source keeps the paired built helper surface in ordinary diff scope
- focused review-execution-state and review-wrapper coverage prove the new helper family inherits the existing support-family behavior
