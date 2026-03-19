# Findings - 1137 Standalone Review Boundary-Driven Partial Output Hints

## Decision

Queue `1137` as the next standalone-review reliability / Symphony-aligned slice.

## Why This Slice

After `1136`, the next small contract mismatch is the partial-output hint:
- first-class `termination_boundary` already defines the failure family
- `run-review` still decides `Review output log (partial)` from the legacy `timedOut` boolean
- that creates a local behavior contract that no longer matches the boundary taxonomy

## Decision Boundary

Take this slice only if it stays bounded to:
- a local helper deciding which boundary kinds print the partial-output hint
- switching the primary and retry hint branches to that helper
- focused wrapper coverage and minimal docs clarification

Do not broaden into retry-policy redesign, new boundary kinds, or general `CodexReviewError` cleanup.

## Touched Surface Forecast

- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Local Review Approval

Approved as the next truthful post-`1136` seam because it aligns one remaining runtime behavior with the already-shipped boundary taxonomy without opening a larger transport rewrite.
