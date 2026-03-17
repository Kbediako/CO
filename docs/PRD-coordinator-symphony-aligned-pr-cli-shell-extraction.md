# PRD: Coordinator Symphony-Aligned PR CLI Shell Extraction

## Summary

`handlePr(...)` in `bin/codex-orchestrator.ts` still owns a bounded top-level `pr` shell above the existing `scripts/lib/pr-watch-merge.js` runner.

## Problem

After `1263` extracted the remaining review launch shell, the next nearby real shell boundary is the top-level `pr` wrapper. It still owns:

- top-level `pr` help gating and help output
- subcommand validation for `watch-merge` and `resolve-merge`
- subcommand-to-mode selection for the downstream runner
- exit-code mapping back into `process.exitCode`

The deeper PR monitor/merge behavior already lives in `scripts/lib/pr-watch-merge.js`, so the remaining binary-local work is a real shell seam rather than just parser glue.

## Goal

Extract the binary-facing `pr` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing monitor/merge logic inside `scripts/lib/pr-watch-merge.js`
- changing PR auth/repo resolution, quiet-window policy, merge execution, or required-check heuristics
- widening into unrelated binary families such as `review`, `exec`, or run-control commands
- combining this lane with broader `pr-watch-merge` engine cleanup

## Success Criteria

- the inline `pr` shell is extracted behind a dedicated boundary
- top-level `pr` help behavior remains local and unchanged
- subcommand selection, mode defaults, and exit-code mapping remain identical
- focused parity coverage exists where the extraction needs it
