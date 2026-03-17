# PRD: Coordinator Symphony-Aligned Status CLI Remaining Boundary Freeze Reassessment

## Summary

After `1274` extracted the bounded `status` polling shell into `orchestrator/src/cli/statusCliShell.ts`, the remaining nearby `status` pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleStatus(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- top-level `status` help gating and the local `printStatusHelp()` surface
- shared `parseArgs(...)` ownership and raw flag parsing
- a thin wrapper into `runStatusCliShell(...)`

If that is the complete remaining surface, the right result is a no-op freeze rather than another symmetry-driven extraction.

## Goal

Confirm whether any real post-`1274` local `status` extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `status` extraction for symmetry
- reopening the already-extracted `statusCliShell` boundary or the lower `orchestrator.status(...)` / `orchestratorStatusShell` ownership
- widening into shared top-level parser/help helpers or unrelated CLI families

## Success Criteria

- docs-first artifacts record whether the post-`1274` local `status` pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
