# PRD: Coordinator Symphony-Aligned Exec CLI Shell Extraction

## Summary

`handleExec(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `exec` launch shell above `orchestrator/src/cli/exec/command.ts`.

## Problem

After `1269` froze the remaining local `init` pocket, the next stronger nearby shell boundary is the top-level `exec` wrapper. It still owns:

- empty-command validation after `parseExecArgs(...)`
- output-mode resolution from requested flags versus TTY state
- environment normalization and optional task override
- `ExecCommandContext` and invocation shaping above `executeExecCommand(...)`
- local exit-code mapping
- the interactive adoption-hint follow-on

The deeper execution lifecycle already lives under `orchestrator/src/cli/exec/command.ts`, so the remaining binary-local work is a real shell seam rather than only parser/help glue.

## Goal

Extract the binary-facing `exec` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing `parseExecArgs(...)` semantics unless extraction requires a narrow handoff adjustment
- changing the deeper execution lifecycle under `orchestrator/src/cli/exec/command.ts`
- widening into unrelated binary helpers or neighboring command families

## Success Criteria

- the inline `exec` shell is extracted behind a dedicated boundary
- output-mode resolution, environment/task shaping, exit-code behavior, and interactive adoption-hint behavior remain identical
- focused parity coverage exists where the extraction needs it
