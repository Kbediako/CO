# PRD: Coordinator Symphony-Aligned Setup CLI Wrapper Extraction

## Summary

After `1282` froze the remaining local `self-check` pocket, the next truthful nearby binary-facing shell candidate is the still-inline `setup` wrapper in `bin/codex-orchestrator.ts`.

## Problem

`handleSetup(...)` still owns a bounded but real binary-facing shell above `orchestrator/src/cli/setupBootstrapShell.ts`:

- local `setup` help text
- `--format json` plus `--yes` incompatibility guarding
- repo flag/default resolution
- binary-facing wrapper handoff into `runSetupBootstrapShell(...)`

That wrapper logic is still inline in the binary instead of sitting behind a dedicated CLI shell helper.

## Goal

Extract the bounded `setup` wrapper into `orchestrator/src/cli/` while keeping top-level parse/dispatch ownership local in the binary.

## Non-Goals

- changing the underlying setup bootstrap behavior in `runSetupBootstrapShell(...)`
- widening into delegation/devtools/skills internals
- reworking shared parser helpers or command dispatch

## Success Criteria

- `handleSetup(...)` becomes a thin parse/help wrapper
- the local setup validation and wrapper handoff move into a dedicated CLI helper
- focused parity proves the command surface is unchanged
