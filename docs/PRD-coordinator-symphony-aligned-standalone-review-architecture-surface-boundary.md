# PRD - Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary

## Summary

Standalone review has converged on a stronger bounded `diff` path and a separate `audit` path, but broader architectural context review still has no first-class home. The remaining drift pattern is the reviewer using bounded diff review to reason about wider design surfaces, which expands into adjacent helpers and historical context before it returns to the actual verdict.

## Problem

The current review wrapper exposes only two explicit surfaces:
- `diff` for touched-path review,
- `audit` for manifest/log/checklist evidence review.

That leaves broader architecture understanding implicit. In practice, the reviewer sometimes reaches for:
- adjacent controller/helper structure,
- higher-level layering questions,
- broader shape comparisons,

while still running in bounded `diff` mode. That mixes two jobs:
- determining whether the touched diff is correct,
- reasoning about whether the wider design is ideal.

The result is slower, lower-signal review runs and residual path drift even after the recent bounded-scope fixes.

## Goals

- Introduce one explicit `architecture` review surface for broader design/context review.
- Keep `diff` as the default bounded touched-path review mode.
- Keep `audit` focused on task/checklist/manifest/evidence review.
- Make the architecture surface intentionally consume the canonical docs-first inputs:
  - task checklist,
  - primary PRD,
  - TECH_SPEC,
  - ACTION_PLAN,
  - repo architecture baseline.
- Tighten startup-anchor treatment so `git show <rev>:<path>` no longer behaves like a normal diff startup anchor.
- Preserve the current Symphony-aligned runtime shape: one shared review-state authority with thin wrapper wiring.

## Non-Goals

- Replacing the wrapper with a native review controller in this slice.
- Reopening path-rendering/parser work already closed in `1098` and `1099`.
- Recombining `audit` into `diff`.
- Generic new heuristics that are not attached to an explicit review surface contract.
- Product/controller refactors outside the review wrapper.

## User Value

- Default bounded review becomes more reliable because broader design thinking has an explicit surface instead of leaking into diff review.
- Operators can choose the right review mode for the task:
  - `diff` for correctness/regression review,
  - `audit` for evidence/closeout review,
  - `architecture` for higher-level design alignment.
- Pre-implementation review of task/spec against user intent gets a first-class surface instead of piggybacking on bounded diff review.
- The review wrapper moves closer to a Symphony-like shape where capabilities are explicit and composable instead of implied by prompt drift.

## Acceptance Criteria

- `run-review` exposes an explicit `architecture` surface alongside `diff` and `audit`.
- The architecture prompt uses the task checklist, primary PRD, TECH_SPEC, ACTION_PLAN, and repo architecture doc without pulling in manifest/runner-log evidence lines.
- Prompt shaping and runtime selection reflect the new surface without weakening the existing bounded `diff` and `audit` contracts.
- Architecture-mode reads of wrapper/docs support inputs no longer trip off-task meta-surface drift, while default `diff` still treats those reads as off-task.
- `git show <rev>:<path>` no longer counts as a default diff startup anchor.
- Focused tests cover the new surface contract and the revised startup-anchor behavior.
- Docs/task mirrors explain when to use `architecture` versus `diff` or `audit`.
