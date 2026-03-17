# PRD: Coordinator Symphony-Aligned Doctor CLI Remaining Boundary Freeze Reassessment

## Summary

After `1251` extracted the doctor-owned execution shell into `orchestrator/src/cli/doctorCliShell.ts`, the remaining nearby doctor surface needs a truthful freeze check instead of a forced follow-on extraction.

## Problem

The doctor command family still has nearby code in `bin/codex-orchestrator.ts`, but that remaining surface now appears to be:

- parser/help glue
- wrapper-only flag normalization and validation
- shared top-level CLI routing that is intentionally still owned by `bin/`

If that assessment is correct, the right result is a no-op freeze rather than another symmetry-driven slice.

## Goal

Confirm whether any real post-`1251` doctor-boundary extraction remains. If not, close the pocket explicitly as frozen.

## Non-Goals

- forcing another doctor extraction for symmetry
- widening into broader top-level CLI helper families
- reopening already-frozen neighboring command families

## Success Criteria

- docs-first artifacts record whether the post-`1251` doctor pocket is truly exhausted
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation work is started unless reassessment finds a real remaining boundary
