# PRD: Coordinator Symphony-Aligned Frontend-Test CLI Shell Extraction

## Summary

`handleFrontendTest(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `frontend-test` shell above `orchestrator.start(...)`.

## Problem

After `1271` extracted the local `start` shell, the next truthful nearby wrapper is the top-level `frontend-test` family. It still owns:

- output-format and runtime-mode resolution
- repo-policy application
- the `CODEX_REVIEW_DEVTOOLS` env toggle and restoration branch
- `withRunUi(...)` wrapping
- the `orchestrator.start(...)` handoff
- local output emission and exit-code mapping

The deeper frontend-testing runtime already lives under `orchestrator/src/cli/frontendTestingRunner.ts` and related helpers, so the remaining binary-local work is a real shell seam rather than only parser glue.

## Goal

Extract the binary-facing `frontend-test` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing deeper frontend-testing runtime or prompt behavior
- widening into neighboring command families such as `flow`, `resume`, `status`, or `rlm`
- changing `parseArgs(...)` semantics beyond a narrow extraction handoff if needed

## Success Criteria

- the inline `frontend-test` shell is extracted behind a dedicated boundary
- the devtools env toggle and restore, `withRunUi(...)` handoff, output emission, and exit mapping remain identical
- focused parity coverage exists where the extraction needs it
