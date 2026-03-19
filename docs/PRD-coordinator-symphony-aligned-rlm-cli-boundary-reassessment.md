# PRD: Coordinator Symphony-Aligned RLM CLI Boundary Reassessment

## Summary

After `1276` extracted the bounded `plan` shell, the next neighboring binary-facing pocket is `handleRlm(...)` in `bin/codex-orchestrator.ts`. That surface appears broader and less obviously extractable, so it needs a truthful reassessment before another implementation lane is opened.

## Problem

`handleRlm(...)` still mixes several concerns locally:

- help gating and shared `parseArgs(...)` ownership
- repo-policy and runtime-mode handling
- goal/task/env resolution and legacy alias warnings
- inline start orchestration, manifest wait, state-file readback, and terminal status reporting

That may be too broad for the next bounded extraction, but it is also not obviously exhausted, so a reassessment is the honest next move.

## Goal

Determine whether any truthful bounded local `rlm` CLI seam remains after the recent binary-facing shell extractions, and if so identify it precisely.

## Non-Goals

- forcing an `rlm` extraction for symmetry
- reopening the deeper `rlmRunner.ts` / `orchestrator.start(...)` ownership prematurely
- widening into unrelated CLI families

## Success Criteria

- docs-first artifacts record whether the local `rlm` wrapper contains a real bounded follow-on seam
- the result explicitly says `go` with a bounded seam or `freeze/reassess-stop`
- no implementation starts unless reassessment finds a concrete bounded boundary

## Reassessment Result

The truthful result is `go`, not `freeze`. Current-tree inspection plus bounded scout evidence shows the remaining local `rlm` pocket is not exhausted: `handleRlm(...)` still owns post-start manifest completion, `rlm/state.json` readback, and final terminal status / exit-code reporting above the deeper RLM runtime. The next slice should extract that bounded completion/reporting shell rather than force a broader or speculative `rlm` rewrite.
