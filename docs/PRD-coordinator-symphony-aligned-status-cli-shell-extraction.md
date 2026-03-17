# PRD: Coordinator Symphony-Aligned Status CLI Shell Extraction

## Summary

`handleStatus(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `status` shell above `orchestrator.status(...)`.

## Problem

After `1273` extracted the local `resume` shell, the next truthful nearby wrapper is the top-level `status` family. It still owns:

- help gating and run-id resolution
- watch, format, and interval parsing
- the inline watch loop and terminal-status break condition
- the `orchestrator.status(...)` handoff

The deeper status formatting and service behavior already live under `orchestrator/src/cli/orchestrator.ts` and the lower-layer status shell, so the remaining binary-local work is a real shell seam rather than only parser glue.

## Goal

Extract the binary-facing `status` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing lower-layer status formatting or manifest rendering behavior
- widening into neighboring command families such as `rlm`
- changing `parseArgs(...)` semantics beyond a narrow extraction handoff if needed

## Success Criteria

- the inline `status` shell is extracted behind a dedicated boundary
- run-id resolution, watch-loop behavior, interval parsing, and `orchestrator.status(...)` invocation remain identical
- focused parity coverage exists where the extraction needs it
