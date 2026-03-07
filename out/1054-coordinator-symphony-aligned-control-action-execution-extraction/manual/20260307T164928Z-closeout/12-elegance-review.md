# 1054 Elegance Review

- Reviewed the extracted seam after implementation against the accepted `1054` scope: replay resolution plus `updateAction(...)` orchestration should live outside `controlServer.ts`, but confirmation authority, persistence and publish side effects, audit emission, and raw HTTP writes should remain server-owned.
- Applied simplification:
  - removed the redundant non-cancel `deferTransportResolutionToConfirmation` guard from the fast path in `controlServer.ts`; that flag is only set for `cancel`, so the extra condition was dead configurability rather than a meaningful branch.
- Considered but did not apply the broader suggestion to collapse replay finalization further by removing the replay-side `persistRequired` surface.
  - Reason: doing that cleanly would turn `1054` into a larger response/finalization redesign instead of a bounded execution extraction.
  - The current two-step server flow is still the smallest correct shape because pre-confirm cancel replay remains a real controller boundary.
- Result: `controlActionExecution.ts` owns the bounded execution contract, `controlActionPreflight.ts` is narrower again, and no further simplification is warranted inside `1054` without opening a new control-action finalization slice.
