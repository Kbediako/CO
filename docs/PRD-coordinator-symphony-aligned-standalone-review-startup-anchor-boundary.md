# PRD - Coordinator Symphony-Aligned Standalone Review Startup-Anchor Boundary

## Summary

The fresh `1106` review trace showed a concrete remaining reliability gap: diff-mode standalone review started by reading the Codex memory registry and other off-task review surfaces before it ever anchored on the touched diff paths. Those early meta-surface samples were later evicted from the recent telemetry window by normal nearby-code inspection, so the final telemetry summary still recorded `metaSurfaceSignals: 0`.

## Problem

- `ReviewExecutionState` already classifies `.codex/memories/**`, `.runs/**`, review-support paths, and other off-task surfaces.
- Direct verification showed the shell-wrapped `rg` memory command shape already classifies correctly in isolation, so raw shell-payload parsing is not the remaining defect.
- The live `1106` review instead broadened early into memory/history and broad repo reads before the first touched-file or diff anchor, then later converged back to the changed files.
- Because the existing meta-surface guard only watches a recent rolling window, the later normal inspection can hide the earlier off-task startup drift from the final telemetry summary.

## Goals

- Require diff-mode standalone review to establish a touched-path or diff anchor before it spends more than a tiny budget on off-task meta-surface reads.
- Track pre-anchor meta-surface activity separately so early drift cannot disappear from telemetry once later nearby-code inspection dominates the recent window.
- Keep the fix bounded to standalone review execution-state tracking, prompt guidance, and nearby regression coverage.

## Non-Goals

- Replacing the standalone review wrapper with a native controller.
- Reworking audit-mode evidence flows that intentionally read manifests and runner logs.
- Reopening command-intent heavy-command blocking outside the startup-anchor gap.
- Resuming Symphony controller extraction in the same slice.

## User Value

- Review telemetry becomes trustworthy for the exact broaden-then-converge behavior still showing up in live review.
- The wrapper gets closer to a real bounded diff-local verdict by preventing diff-mode reviews from front-loading memory/history or review-artifact reads before they inspect the changed area.

## Acceptance Criteria

- Diff-mode review tracks whether a touched-path or diff anchor has been established before off-task meta-surface activity.
- Repeated pre-anchor reads of memory/skills/manifests/review artifacts trigger the new startup-anchor boundary instead of disappearing behind later normal inspection.
- The diff-mode review prompt explicitly tells the reviewer to start with touched paths, diff scope, or nearby changed-code inspection before memory/skills/manifests/review artifacts.
- Focused regressions cover both triggering and non-triggering flows without regressing existing low-signal or sustained meta-surface behavior.
