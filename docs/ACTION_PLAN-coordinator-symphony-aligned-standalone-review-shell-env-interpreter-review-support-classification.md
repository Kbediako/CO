# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Shell Env Interpreter Review-Support Classification

## Objective

Finish the family-local follow-on from `1209` by classifying the extracted shell-env helper family as `review-support` wherever standalone-review bounded-surface heuristics already recognize adjacent helper families.

## Steps

1. Register the lane docs-first with explicit evidence that the shell-env helper family is currently omitted from `review-support` classification and touched-family parity.
2. Update `scripts/lib/review-execution-state.ts` to classify the shell-env helper family as `review-support` and include it in the local touched-family exemption logic.
3. Add only the focused review-state / review-wrapper regressions needed to prove the new helper family inherits the existing support-family behavior.
4. Run the lane validations and record the resulting review or override evidence.
5. Sync closeout mirrors and reassess the next truthful standalone-review seam only after the parity gap is resolved.
