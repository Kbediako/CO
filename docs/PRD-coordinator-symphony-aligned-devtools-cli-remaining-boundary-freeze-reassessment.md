# PRD: Coordinator Symphony-Aligned Devtools CLI Remaining Boundary Freeze Reassessment

## Summary

After `1266` extracted the bounded `devtools` launch shell into `orchestrator/src/cli/devtoolsCliShell.ts`, the remaining nearby devtools pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleDevtools(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- shared top-level `parseArgs(...)` ownership
- shared command-family dispatch and help ownership in the binary
- a thin wrapper into `runDevtoolsCliShell({ positionals, flags })`

If that is the full remaining surface, the right result is a no-op freeze rather than another symmetry-driven helper.

## Goal

Confirm whether any real post-`1266` local devtools extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `devtools` extraction for symmetry
- reopening the already-extracted `devtoolsCliShell` boundary or the underlying `devtoolsSetup` engine
- widening into generic top-level parser or help helpers
- widening into unrelated `--devtools` flag consumers elsewhere in the binary

## Success Criteria

- docs-first artifacts record whether the post-`1266` local devtools pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
