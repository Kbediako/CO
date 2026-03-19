# PRD: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Review-Support Classification

## Summary

After `1211` extracted the shared shell-command parser primitives into `scripts/lib/review-shell-command-parser.ts`, the standalone-review review-support classifier still does not recognize the parser family as `review-support`.

## Problem

The standalone-review helper-family classifier and touched-family exemptions already recognize the adjacent extracted helper families, but they currently omit:

- `scripts/lib/review-shell-command-parser.ts`
- `dist/scripts/lib/review-shell-command-parser.js`

That leaves a real bounded parity gap: the parser family is now shared by `review-command-probe-classification`, `review-command-intent-classification`, `review-inspection-target-parsing`, `review-meta-surface-boundary-analysis`, and `review-meta-surface-normalization`, but bounded review still treats direct parser-family inspection as ordinary meta-surface activity instead of the same `review-support` family the adjacent extracted helpers already inherit.

## Goal

Classify the shell-command parser family as `review-support` and give it the same bounded touched-family parity as the adjacent standalone-review helper families, without widening into parser behavior changes, another extraction pass, or broader taxonomy reshaping.

## Non-Goals

- changing shell-command parser semantics
- extracting another helper from `scripts/lib/review-execution-state.ts` or `scripts/run-review.ts`
- widening into shell-env, command-intent, command-probe, inspection-target, or meta-surface behavior changes
- broader review-support taxonomy refactors beyond the parser-family parity gap

## Success Criteria

- `scripts/lib/review-shell-command-parser.ts` is classified as `review-support`
- `dist/scripts/lib/review-shell-command-parser.js` is classified as `review-support`
- touching the parser helper source keeps the paired built parser helper surface in ordinary diff scope
- focused normalization and review-state regressions prove the parser family now inherits the same bounded helper-family behavior as adjacent extracted standalone-review helpers
