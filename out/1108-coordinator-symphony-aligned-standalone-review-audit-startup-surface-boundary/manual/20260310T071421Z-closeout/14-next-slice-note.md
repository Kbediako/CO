# Next Slice Note

- `1108` completes audit startup anchoring for active manifest and runner-log evidence, but the review wrapper still has one remaining env-boundary asymmetry: shell-local export and multi-segment env propagation can still hide whether `$MANIFEST` or `$RUNNER_LOG` was rebound away from the active audit evidence path across separate shell segments.
- The next bounded review-reliability lane should therefore be `Standalone Review Audit Shell-Env Propagation Boundary`.
- Keep that slice inside the existing wrapper/state seams:
  - `scripts/run-review.ts`
  - `scripts/lib/review-execution-state.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/run-review.spec.ts`
  - `docs/standalone-review-guide.md`
- Safe v1 contract:
  - audit should still succeed when shell-local exports preserve the active manifest or runner-log path,
  - audit should fail when shell-local exports or multi-segment env updates rebind `$MANIFEST` or `$RUNNER_LOG` away from the active evidence path,
  - do not reopen native review replacement, broad scope rendering changes, or controller extraction work in the same slice.
