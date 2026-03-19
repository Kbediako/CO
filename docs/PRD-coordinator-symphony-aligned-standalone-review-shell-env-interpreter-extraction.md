# PRD: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Extraction

## Summary

After `1208` closed the prompt-context support-family gap, the next truthful standalone-review seam is the shared shell-env interpreter logic still embedded inside `scripts/lib/review-execution-state.ts`.

## Problem

`review-execution-state` currently reuses the same exported-env / nested-shell / `env` / `export` / `unset` interpretation logic across multiple review-surface analyses, but that state machine is still inline and repeated rather than owned by a dedicated helper boundary.

## Goal

Extract the shared shell-env interpreter seam from `scripts/lib/review-execution-state.ts` without widening into command-intent launcher normalization, review wrapper runtime changes, or broader review taxonomy work.

## Non-Goals

- changing standalone-review prompt/context behavior
- changing review child-process supervision in `scripts/run-review.ts`
- reopening nearby orchestrator/private-wrapper micro-extractions
- reshaping review-support classification beyond the interpreter seam itself

## Success Criteria

- the shared shell-env interpreter state machine is owned by a bounded helper seam
- the existing meta-surface and startup-anchor consumers reuse that helper without behavior drift
- focused regression coverage proves the extracted interpreter preserves current shell-env handling
