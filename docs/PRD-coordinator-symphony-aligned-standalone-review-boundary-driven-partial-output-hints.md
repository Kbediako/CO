# PRD - Coordinator Symphony-Aligned Standalone Review Boundary-Driven Partial Output Hints

## Summary

`1136` closed the verdict-stability disable contract. The next truthful standalone-review reliability seam is the lingering partial-output hint path: `run-review` still uses the legacy `CodexReviewError.timedOut` boolean to decide when to print `Review output log (partial)`, even though first-class `termination_boundary` records now carry the real failure family.

## Problem

The runtime classification story is now boundary-first:
- `timeout`, `stall`, and `startup-loop` are explicit `termination_boundary` families
- command-intent, shell-probe, verdict-stability, startup-anchor, and related failures already have their own explicit boundaries

But the partial-output hint still depends on `error.timedOut`, which is now misaligned:
- it is broader than literal timeout
- it is narrower than the actual boundary system
- it obscures which families should still surface a partial log hint

That leaves a small but real contract mismatch inside `run-review` after the taxonomy work.

## Goals

- Drive the partial-output hint from first-class boundary families instead of the legacy boolean branch.
- Keep the slice narrowly scoped to the partial-output hint behavior on primary and retry failure paths.
- Preserve existing telemetry payloads and boundary classification.
- Continue hardening standalone-review toward an explicit Symphony-like runtime contract.

## Non-Goals

- Adding new boundary kinds or provenance values.
- Reworking retry policy, issue-log capture, or broader review heuristics.
- Redesigning all uses of `CodexReviewError.timedOut` beyond the partial-output hint behavior.
- Coordinator / Telegram / Linear changes.

## User Value

- Operators get a cleaner runtime contract where partial-log hints match the actual failure family rather than a legacy transport flag.
- Review failures become easier to reason about because timeout/stall/startup-loop keep the hint while non-timeout boundary violations do not.
- The wrapper moves closer to a hardened model where behavior follows the explicit boundary taxonomy already present in telemetry.

## Acceptance Criteria

- `run-review` no longer branches on `error.timedOut` for partial-output log hints.
- Partial-output hints are driven by `terminationBoundary.kind`.
- `timeout`, `stall`, and `startup-loop` still print `Review output log (partial)`.
- Non-timeout boundaries such as `shell-probe`, `command-intent`, `startup-anchor`, and `verdict-stability` do not print that hint.
- Existing `termination_boundary` telemetry payloads remain unchanged.
