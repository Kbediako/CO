# PRD: Coordinator Symphony-Aligned Review CLI Launch Shell Extraction

## Summary

`handleReview(...)` in `bin/codex-orchestrator.ts` still owns a bounded review launch shell above the existing standalone review wrapper.

## Problem

After `1262` froze the remaining local `delegation` pocket, the next nearby real shell boundary is the inline review wrapper. It still owns:

- top-level review help/entry handling
- source-vs-dist review-runner resolution
- passthrough child-process launch with inherited stdio/env/cwd
- exit-code mapping back into `process.exitCode`

That is a real mixed shell boundary even though the review wrapper behavior already lives in `scripts/run-review.ts` and the deeper review engine helpers under `scripts/lib/`.

## Goal

Extract the binary-facing review launch shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing prompt/manifest/boundary/runtime behavior inside `scripts/run-review.ts`
- changing deeper review engine helpers under `scripts/lib/`
- widening into broader binary parser/help primitives outside the review command family
- combining this lane with unrelated `init`, `pr`, or broader CLI cleanup

## Success Criteria

- the inline review launch shell is extracted behind a dedicated boundary
- help behavior, runner resolution, passthrough launch semantics, and exit-code propagation remain identical
- focused parity coverage exists where the extraction needs it
