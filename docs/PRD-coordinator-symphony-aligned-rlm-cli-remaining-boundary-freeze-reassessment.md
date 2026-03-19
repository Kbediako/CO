# PRD: Coordinator Symphony-Aligned RLM CLI Remaining Boundary Freeze Reassessment

## Summary

After `1279` extracted the bounded RLM launch/start shell into `orchestrator/src/cli/rlmLaunchCliShell.ts`, the remaining nearby `rlm` pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleRlm(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- top-level `rlm` help gating and the local `printRlmHelp()` surface
- shared `parseArgs(...)` ownership, runtime-mode resolution, and repo-policy application
- local goal collection and explicit collab-choice detection
- a thin wrapper into `runRlmLaunchCliShell(...)`

If that is the complete remaining surface, the right result is a no-op freeze rather than another symmetry-driven extraction.

## Goal

Confirm whether any real post-`1279` local `rlm` extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `rlm` extraction for symmetry
- reopening the already-extracted `rlmLaunchCliShell` or `rlmCompletionCliShell` boundaries
- widening into `rlmRunner.ts`, deeper runtime ownership, or unrelated CLI families

## Success Criteria

- docs-first artifacts record whether the post-`1279` local `rlm` pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
