# 1067 Deliberation - Standalone Review Manifest Affinity and Termination Closure

## Why This Slice Exists

- `1066` closed the validation-suite boundary seam, but current evidence still shows two remaining lifecycle issues owned by the standalone review wrapper:
  - manifest selection can bind review artifacts to an older sibling run,
  - bounded termination can reject before the child process tree is fully closed.
- The next smallest fix is still inside `scripts/run-review.ts` and its direct lifecycle helpers, not a broader supervisor rewrite.

## Bounded Decision

- Keep manifest affinity and termination closure together because they are both wrapper-lifecycle ownership issues.
- Keep the implementation inside the standalone review wrapper and direct helpers.
- Avoid mixing in implementation-gate-specific `npm run test` lifecycle work beyond what is directly shared with the review-owned child-wait path.

## Evidence Basis

- `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/13-override-notes.md`
- `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/14-next-slice-note.md`
- `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/00-summary.md`
- `out/1066-coordinator-symphony-aligned-standalone-review-validation-suite-boundary-guard/manual/20260308T112510Z-closeout/13-override-notes.md`
