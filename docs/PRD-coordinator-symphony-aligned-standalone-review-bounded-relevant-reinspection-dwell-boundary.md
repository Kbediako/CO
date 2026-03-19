# PRD - Coordinator Symphony-Aligned Standalone Review Bounded Relevant Reinspection Dwell Boundary

## Summary

`1119` removed the active closeout-bundle reread masking defect, but it also isolated the next truthful residual issue: standalone review can stay on touched files plus adjacent relevant tests/helpers, repeatedly re-read that same bounded relevant surface, and still consume the full timeout budget without surfacing findings or a verdict. The next bounded slice is to detect and stop that low-signal relevant reinspection dwell explicitly.

## Problem

- After `1119`, the remaining review-wrapper failures are no longer off-task closeout rereads or generic meta-surface drift.
- The current residual shape is repetitive bounded relevant inspection: review keeps revisiting the same touched files and nearby relevant helpers/tests, but does not converge to findings or a terminal no-findings verdict before timeout.
- Reporting those runs as a generic timeout weakens operator trust because the wrapper no longer tells the truth about what actually happened.

## Goals

- Detect repetitive bounded relevant reinspection after startup-anchor success when review remains on touched files and adjacent relevant helpers/tests.
- Fail with an explicit operator-facing reason that distinguishes bounded relevant dwell from off-task drift.
- Preserve first-pass relevant inspection, genuinely broad relevant exploration, and concrete finding output.

## Non-Goals

- Declaring automatic no-findings for every long relevant review.
- Replacing standalone review with a native review implementation in this slice.
- Reopening closeout-bundle, shell-probe, or generic meta-surface drift work already handled by prior slices.
- Rewriting broader Symphony-alignment controller work in this slice.

## User Value

- Review outcomes become more truthful: operators can distinguish “stayed on-task but looped” from “went off-task” and from “found a defect.”
- The wrapper keeps respecting detailed review behavior while cutting off repetitive low-signal reinspection of the same bounded relevant surface.
- CO moves toward a more hardened Symphony-like control posture: explicit state, explicit failure modes, and smaller, auditable surfaces.

## Acceptance Criteria

- A bounded diff review that repeatedly re-reads the same touched files and adjacent relevant helpers/tests without concrete findings fails before the full generic timeout budget with a dedicated bounded-relevant-reinspection-dwell reason.
- Operator-facing logs and saved telemetry distinguish that failure from off-task meta-surface drift.
- First-pass relevant inspection and diverse bounded relevant inspection do not trigger the dwell boundary.
- Concrete finding output remains allowed and does not immediately trip the dwell boundary.
- Task/docs mirrors describe the new seam accurately.
