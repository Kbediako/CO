# Findings - 1129 Standalone Review Architecture In-Bounds Verdict Termination Boundary

## Decision

Open a bounded review-reliability slice that reuses the existing in-bounds termination hooks for architecture review instead of expanding the review surface again.

## Why now

- `1128` already solved the surface-selection problem by shipping explicit `architecture` review and runtime `architecture-context`.
- The final patient rerun on Codex CLI `0.114.0` did not reproduce the earlier historical-closeout drift.
- The remaining live problem is narrower and concrete: architecture review stayed in-bounds, emitted no heavy-command or meta-surface violations, and still timed out after `300s` with no verdict.

## Recommended seam

- `scripts/run-review.ts`
  - `announceRelevantReinspectionDwellBoundary`
  - `enforceRelevantReinspectionDwellBoundary`
  - verdict-stability / timeout wiring
- `scripts/lib/review-execution-state.ts`
  - `updateRelevantReinspectionDwellCandidate`
  - `updateVerdictStabilityCandidate`
  - inspection-target clustering if needed

## Rejected alternatives

- Reopening historical closeout-bundle drift as the primary problem.
  - Rejected because the patient `0.114.0` rerun did not reproduce it.
- Adding a fourth review surface or replacing the wrapper.
  - Rejected because the current gap is termination, not surface selection.
- Broad prompt-only wording changes.
  - Rejected because the runtime already has the correct architecture contract; the failure is the lack of an earlier deterministic no-verdict boundary.
