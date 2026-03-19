# ACTION_PLAN: Coordinator Symphony-Aligned Standalone Review Prompt Context Review-Support Classification

## Objective

Finish the family-local follow-on from `1207` by classifying the extracted prompt-context helper as `review-support` wherever standalone-review bounded-surface heuristics already recognize adjacent helper families.

## Steps

1. Register the lane docs-first with explicit evidence that the prompt-context helper family is currently omitted from `review-support`.
2. Update `scripts/lib/review-execution-state.ts` to classify the prompt-context helper family as `review-support`.
3. Add only the focused review-state / review-wrapper regressions needed to prove the new paths inherit the existing support-family behavior.
4. Run the lane validations and record the resulting review/override evidence.
5. Sync closeout mirrors and identify the next truthful slice only after the classification gap is resolved.
