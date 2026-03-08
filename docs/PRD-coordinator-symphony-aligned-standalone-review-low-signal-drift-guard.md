# PRD - Coordinator Symphony-Aligned Standalone Review Low-Signal Drift Guard

## Summary

After `1058`, standalone review has one runtime state owner, but the real `npm run review` path can still loop through repetitive `thinking` blocks and repeated nearby-file inspection without converging. This slice adds a bounded low-signal drift guard so the review wrapper fails closed with artifacts when bounded review stops making meaningful progress.

## Problem

- `scripts/run-review.ts` no longer has split runtime ownership, but it still treats any `thinking` / `exec` activity as progress.
- Real review evidence from `1058` showed repeated nearby-file inspection and patience checkpoints without a verdict.
- That wastes time and exec slots and makes standalone review less reliable than the Symphony-inspired supervision shape we want.

## Goals

- Detect low-signal bounded-review drift from the shared `ReviewExecutionState` seam.
- Fail closed with explicit review artifacts instead of allowing indefinite repetitive inspection.
- Keep the policy advisory-only: no silent retries, no auto-approval, no widened execution authority.
- Keep the implementation bounded to standalone review reliability, not general Codex-session orchestration.

## Non-Goals

- Replacing line-parsed telemetry with fully structured provider events.
- Rewriting the review prompt contract or broader review policy.
- Changing heavy-command detection beyond what is needed for drift classification.
- Adding autonomous restart/requeue behavior.

## User-Facing Outcome

- `npm run review` still allows bounded local inspection, but it now terminates with a precise low-signal drift reason when the reviewer only repeats shallow exploration.
- Failure artifacts explain why the review was stopped and what evidence was observed.
