# PRD: Coordinator Symphony-Aligned PR CLI Remaining Boundary Freeze Reassessment

## Summary

After `1264` extracted the bounded `pr` launch shell into `orchestrator/src/cli/prCliShell.ts`, the remaining nearby `pr` pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handlePr(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- top-level `pr` help gating and the local `printPrHelp()` surface
- a thin wrapper into `runPrCliShell({ rawArgs })`
- shared command-family dispatch ownership in the binary

If that is the complete remaining surface, the right result is a no-op freeze rather than another symmetry-driven extraction.

## Goal

Confirm whether any real post-`1264` local `pr` extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `pr` extraction for symmetry
- reopening the already-extracted `prCliShell` boundary or the underlying `pr-watch-merge` engine
- widening into shared top-level parser/help helpers or unrelated CLI families

## Success Criteria

- docs-first artifacts record whether the post-`1264` local `pr` pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
