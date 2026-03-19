# 1074 Elegance Review

Delegated elegance review found one worthwhile simplification in the first draft: the helper was over-split into separate candidate-collection and filtering steps, which made both call sites remember the pairing manually.

That feedback was applied on the final tree by collapsing the seam into [`createQuestionReadRetrySelector`](../../../../../../orchestrator/src/cli/control/questionReadRetryDeduplication.ts), which captures the immutable pre-read status snapshot once and returns the bounded selector used after expiry.

Final verdict: the shipped shape is minimal for this slice. It fixes the read-time duplicate-retry defect across both API and Telegram without widening into expiry lifecycle or child-resolution internals.
