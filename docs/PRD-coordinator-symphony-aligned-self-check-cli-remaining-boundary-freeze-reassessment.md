# PRD: Coordinator Symphony-Aligned Self-Check CLI Remaining Boundary Freeze Reassessment

## Summary

After `1281` extracted the bounded `self-check` output shell into `orchestrator/src/cli/selfCheckCliShell.ts`, the remaining nearby `self-check` pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleSelfCheck(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- shared `parseArgs(...)` ownership
- top-level command dispatch
- a thin wrapper into `runSelfCheckCliShell(...)`

If that is the complete remaining surface, the right result is a no-op freeze rather than another symmetry-driven extraction.

## Goal

Confirm whether any real post-`1281` local `self-check` extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `self-check` extraction for symmetry
- reopening the already-extracted `selfCheckCliShell` boundary or the lower `buildSelfCheckResult()` helper
- widening into shared parser helpers or unrelated CLI families

## Success Criteria

- docs-first artifacts record whether the post-`1281` local `self-check` pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
