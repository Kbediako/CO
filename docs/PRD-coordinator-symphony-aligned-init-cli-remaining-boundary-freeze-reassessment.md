# PRD: Coordinator Symphony-Aligned Init CLI Remaining Boundary Freeze Reassessment

## Summary

After `1268` extracted the bounded `init` launch shell into `orchestrator/src/cli/initCliShell.ts`, the remaining nearby init pocket needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

`handleInit(...)` in `bin/codex-orchestrator.ts` still exists locally, but the residual surface now appears to be:

- shared top-level `parseArgs(...)` ownership
- shared command-family help ownership through `printInitHelp()`
- a thin wrapper into `runInitCliShell({ positionals, flags })`

If that is the full remaining surface, the right result is a no-op freeze rather than another symmetry-driven helper.

## Goal

Confirm whether any real post-`1268` local init extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another `init` extraction for symmetry
- reopening the already-extracted `initCliShell` boundary or the underlying `init.ts` / `codexCliSetup.ts` helpers
- widening into generic top-level parser or help helpers
- widening into unrelated `--codex-cli` consumers elsewhere in the binary

## Success Criteria

- docs-first artifacts record whether the post-`1268` local init pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
