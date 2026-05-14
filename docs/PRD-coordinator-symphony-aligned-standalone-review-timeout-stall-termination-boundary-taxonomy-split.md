# PRD - Coordinator Symphony-Aligned Standalone Review Timeout-Stall Termination Boundary Taxonomy Split

## Summary

`1134` closed the explicit startup-loop boundary gap. The next truthful standalone-review reliability seam is the remaining generic timeout/stall family: `run-review` already terminates on overall timeout and output stall, but those failures still collapse into prose plus `timedOut` handling rather than first-class `termination_boundary` records.

## Problem

The runtime already treats timeout and stall as dedicated failure paths:
- overall timeout has its own configuration knob
- output stall has its own configuration knob
- both terminate through explicit `run-review` branches

But the compact telemetry contract still lags behind:
- timeout/stall failures do not persist first-class `termination_boundary` records
- terminal stderr does not print stable timeout/stall classification/provenance lines
- fallback error inference cannot distinguish those paths from other generic failure prose

After `1134`, that makes timeout/stall the next real taxonomy gap rather than a speculative redesign request.

## Goals

- Promote the existing timeout and stall failures into first-class `termination_boundary` families.
- Keep the slice bounded to the already-shipped timeout/stall branches rather than redesigning broader review error semantics.
- Preserve the existing `timedOut` behavior where it already controls retry/exit handling.
- Keep the solution compact and aligned with the `1130`-`1134` boundary-family work.

## Non-Goals

- Reworking startup-loop, command-intent, shell-probe, startup-anchor, or meta-surface families.
- Changing timeout or stall thresholds, cadence, or detector heuristics.
- Broadening the slice into a full review-wrapper architecture rewrite.
- Reopening coordinator / Telegram / Linear seams in this lane.

## User Value

- Operators get machine-readable distinction between generic timeout, output stall, and startup-loop failures.
- Standalone-review moves closer to a hardened Symphony-like runtime surface where deterministic runtime families are explicit instead of prose-only.
- Future automation can route retry or escalation behavior without parsing human-readable timeout/stall text.

## Acceptance Criteria

- Generic timeout terminations persist a stable non-null first-class `termination_boundary` record.
- Output-stall terminations persist a stable non-null first-class `termination_boundary` record.
- Terminal stderr prints one stable classification/provenance line for each of those families while preserving the existing human-readable error text.
- Fallback boundary inference recognizes timeout/stall failure prose.
- Existing timeout/stall tests stay green without changing startup-loop behavior.
