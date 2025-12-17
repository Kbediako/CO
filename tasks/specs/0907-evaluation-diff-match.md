---
id: 20251217-evaluation-diff-match
title: Evaluation Harness diff-match Assertions
relates_to: Task 0907 (evaluation-diff-match)
risk: low
owners:
  - Platform Enablement
last_review: 2025-12-17
---

## Summary
- Add first-class support for `diff-match` pattern assertions in the evaluation harness.
- Make unknown assertion types fail loudly (no silent skips).
- Align the `backend-api-opt` scenario + `node-api-nplus1` fixture so `diff-match` is meaningful and adapter goals can run.

## Invariants
- Evaluation scenarios must be validated deterministically (bad configs should error with actionable messages).
- `patternAssertions` must never silently no-op; any declared assertion should yield a result (pass/fail) or fail the scenario.
- Fixtures must include the minimum project scaffolding required by their adapter (e.g., `package.json` for `typescript-default`).

## Proposed Changes
- Extend `PatternAssertion` to include `diff-match` and implement evaluation logic with normalized unified diffs.
- Decide and document how `agentTask` is applied (minimal interpreter for deterministic fixture edits).
- Update `backend-api-opt` scenario + `node-api-nplus1` fixture so:
  - adapter `test` goal executes
  - `diff-match` checks the intended optimization patch

## Validation
- Add unit tests for `diff-match` matching/normalization + unknown-type failure behavior.
- Add integration coverage for `backend-api-opt` in `evaluation/tests`.
