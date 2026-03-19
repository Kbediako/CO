# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Command-Intent Boundary Guard

## Goal

Extend the shared `ReviewExecutionState` owner with explicit command-intent boundary classification so bounded standalone review can stop on policy-violating command launches instead of relying only on secondary drift heuristics.

## Scope

- Add bounded command-intent classes to `scripts/lib/review-execution-state.ts`.
- Surface a distinct command-intent boundary failure projection from the state owner.
- Wire `scripts/run-review.ts` to terminate on that projection with artifact-first summaries.
- Add targeted regression coverage for command-intent violations observed in live `1060` review reruns.

## Design

### 1. Runtime-owned intent classes

`ReviewExecutionState` remains the single owner for classifying command starts into bounded intent buckets such as:

- in-scope inspection
- meta-surface inspection
- orchestration/delegation control activity
- bounded-policy-violating validation or nested review launches

The wrapper should not infer intent on its own.

### 2. Distinct boundary failure mode

Add one explicit bounded failure mode for command-intent violations that should not occur in default review mode, for example:

- targeted/full validation commands launched by the reviewer itself
- nested review/docs-review launches
- explicit delegation control activity that goes beyond the local review contract

This failure mode should stay separate from:

- low-signal nearby-file drift
- meta-surface expansion
- startup-loop / stall / timeout outcomes

### 3. Minimal structural posture

- Preserve the thin wrapper structure in `scripts/run-review.ts`.
- Keep the new logic local to standalone-review runtime reliability.
- Do not add retries, supervisors, or mutation authority.

## Constraints

- Keep bounded review advisory-only outside the explicit fail-closed reasons.
- Avoid reopening already-closed `1060` scope unless new evidence shows the earlier classifier is wrong.
- Prefer explicit tests for concrete command forms over broad semantic heuristics.

## Validation

- direct intent-classification coverage
- targeted `run-review` regressions for policy-violating command launches
- standard build/lint/test/docs checks
- `pack:smoke`
