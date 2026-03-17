# PRD: Coordinator Symphony-Aligned Start CLI Shell Extraction

## Summary

`handleStart(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `start` shell above `orchestrator.start(...)`.

## Problem

After `1270` extracted the local `exec` shell, the next stronger nearby wrapper is the top-level `start` family. It still owns:

- help gating and top-level pipeline selection
- output-format, execution-mode, and runtime-mode resolution
- repo-policy application and auto issue-log enablement
- the `rlm`-specific env override and legacy warning branch
- task-id shaping before `orchestrator.start(...)`
- `withRunUi(...)` wrapping
- start-time auto issue-log capture and output emission
- local exit-code mapping and the post-success adoption-hint follow-on

The deeper lifecycle already lives under `orchestrator/src/cli/orchestrator.ts` and its service shells, so the remaining binary-local work is a real shell seam rather than only parser/help glue.

## Goal

Extract the binary-facing `start` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing deeper orchestrator start preparation or runtime routing behavior
- widening into neighboring command families such as `frontend-test`, `resume`, or `status`
- changing `parseArgs(...)` semantics beyond a narrow extraction handoff if needed

## Success Criteria

- the inline `start` shell is extracted behind a dedicated boundary
- start-time issue-log capture, output emission, `rlm` task shaping, and adoption-hint behavior remain identical
- focused parity coverage exists where the extraction needs it
