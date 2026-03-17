# PRD: Coordinator Symphony-Aligned Devtools CLI Shell Extraction

## Summary

`handleDevtools(...)` in `bin/codex-orchestrator.ts` still owns a bounded top-level `devtools` shell above the existing `orchestrator/src/cli/devtoolsSetup.ts` engine.

## Problem

After `1265` froze the remaining local `pr` pocket, the next nearby truthful shell boundary is the top-level `devtools` wrapper. It still owns:

- subcommand validation for `setup`
- `--format json` vs text output shaping
- the `--yes` plus `--format json` incompatibility guard
- downstream `runDevtoolsSetup(...)` invocation
- summary emission through `formatDevtoolsSetupSummary(...)`

The deeper devtools readiness/setup behavior already lives in `orchestrator/src/cli/devtoolsSetup.ts`, so the remaining binary-local work is a real shell seam rather than just parser glue.

## Goal

Extract the binary-facing `devtools` shell behind a dedicated helper while preserving current user-facing behavior.

## Non-Goals

- changing readiness or install logic inside `orchestrator/src/cli/devtoolsSetup.ts`
- reopening the already-frozen internal devtools readiness family from `1243`
- widening into unrelated binary families or shared top-level parser/help helpers

## Success Criteria

- the inline `devtools` shell is extracted behind a dedicated boundary
- subcommand validation, JSON/text output behavior, incompatibility guards, and summary emission remain identical
- focused parity coverage exists where the extraction needs it
