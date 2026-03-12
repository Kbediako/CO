# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Architecture In-Bounds Verdict Termination Boundary

## Summary
- Goal: terminate repetitive in-bounds architecture review loops before the global wrapper timeout.
- Scope: standalone-review runtime boundary tuning for architecture-mode rereads only.
- Assumptions: the `1128` architecture surface contract remains correct; the current gap is runtime termination, not surface selection.

## Milestones & Sequencing
1. Register the `1129` docs-first package and capture the narrowed post-`1128` problem statement.
2. Inspect the existing relevant-reinspection dwell / verdict-stability hooks and choose the smallest architecture-mode extension.
3. Add focused runtime + wrapper regressions for the in-bounds timeout pattern.
4. Implement the bounded termination change, rerun focused checks, then close the lane with explicit review reliability evidence.

## Dependencies
- `1128` closeout evidence, especially the final `0.114.0` patient rerun.
- Existing review-runtime classification in `scripts/lib/review-execution-state.ts`.
- Existing wrapper termination hooks in `scripts/run-review.ts`.

## Validation
- Checks / tests:
  - docs-first guard bundle
  - focused `tests/run-review.spec.ts`
  - focused `tests/review-execution-state.spec.ts`
  - build / lint / docs guards / pack-smoke on the final tree
- Rollback plan:
  - revert the architecture termination extension and restore the prior `1128` runtime if the new boundary over-terminates legitimate architecture review.

## Risks & Mitigations
- Risk: terminating legitimate context gathering too early.
  - Mitigation: target only repeated rereads of canonical architecture docs plus touched implementation files; keep first-pass context reading intact.
- Risk: broadening into another general review-reliability refactor.
  - Mitigation: keep the slice anchored to the specific `1128` timeout telemetry and the existing runtime hooks.
