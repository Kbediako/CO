# PRD - Coordinator Symphony-Aligned Standalone Review Startup-Loop Termination Boundary Classification

## Summary

`1133` closed the active-closeout taxonomy split. The next truthful standalone-review reliability seam is the existing startup-loop detector: `run-review` already terminates when Codex appears stuck in delegation startup with repeated MCP startup events and no review progress, but that failure still lands as prose-only output rather than a first-class `termination_boundary`.

## Problem

The runtime already treats startup-loop as a dedicated failure family:
- it has its own timeout knob
- it has its own minimum startup-event threshold
- it already terminates through a dedicated branch in `run-review`

But the compact telemetry contract still lags behind:
- startup-loop failures do not persist a first-class `termination_boundary` record
- terminal stderr does not print a stable startup-loop classification/provenance line
- fallback error inference cannot distinguish startup-loop from generic timeout/stall families

That makes startup-loop a real contract gap, not a heuristic redesign request.

## Goals

- Promote the existing startup-loop failure into the first-class `termination_boundary` contract.
- Keep the slice bounded to the already-shipped startup-loop detector rather than redesigning timeout or stall handling.
- Preserve the existing false-positive protection where fragmented cross-stream startup text does not trigger startup-loop classification.
- Keep the solution compact and aligned with the existing `1130`-`1133` boundary-family work.

## Non-Goals

- Reworking generic timeout, stall, heavy-command, or meta-surface boundaries.
- Changing startup-loop thresholds or startup-event detection heuristics.
- Broadening the slice into a native review rewrite or a general “all missing boundary families” umbrella.
- Reopening coordinator / Telegram / Linear seams in this lane.

## User Value

- Operators get a machine-readable distinction between “delegation startup loop” and ordinary timeout-style failures.
- Standalone-review moves closer to a hardened Symphony-like runtime surface where already-real deterministic runtime families are explicit instead of prose-only.
- Future automation can reason about startup-loop failures without parsing human-readable error text.

## Acceptance Criteria

- Startup-loop terminations persist a stable non-null first-class `termination_boundary` record.
- Terminal stderr prints one stable startup-loop classification/provenance line while preserving the existing human-readable startup-loop message.
- Fallback boundary inference recognizes startup-loop failure prose.
- Existing startup-loop detection tests stay green.
- The cross-stream fragmented startup-text safeguard still falls back to plain timeout rather than startup-loop classification.
