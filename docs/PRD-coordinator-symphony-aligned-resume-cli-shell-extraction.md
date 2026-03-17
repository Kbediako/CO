# PRD: Coordinator Symphony-Aligned Resume CLI Shell Extraction

## Summary

`handleResume(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `resume` shell above `orchestrator.resume(...)`.

## Problem

After `1272` extracted the local `frontend-test` shell, the next truthful nearby wrapper is the top-level `resume` family. It still owns:

- help gating and run-id resolution
- runtime-mode resolution
- repo-policy application
- `withRunUi(...)` wrapping
- the `orchestrator.resume(...)` handoff
- local output emission

The deeper resume-preparation and lifecycle already live under `orchestrator/src/cli/orchestrator.ts` and its service shells, so the remaining binary-local work is a real shell seam rather than only parser glue.

## Goal

Extract the binary-facing `resume` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing deeper resume token validation or resume-preparation behavior
- widening into neighboring command families such as `status` or `rlm`
- changing `parseArgs(...)` semantics beyond a narrow extraction handoff if needed

## Success Criteria

- the inline `resume` shell is extracted behind a dedicated boundary
- runtime-mode resolution, `withRunUi(...)` handoff, `orchestrator.resume(...)` invocation, and output emission remain identical
- focused parity coverage exists where the extraction needs it
