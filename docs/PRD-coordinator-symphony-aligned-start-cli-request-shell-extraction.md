# PRD: Coordinator Symphony-Aligned Start CLI Request Shell Extraction

## Summary

`handleStart(...)` still owns a broad binary-facing request-shaping layer above `orchestrator/src/cli/startCliShell.ts`.

## Problem

The current `start` wrapper in `bin/codex-orchestrator.ts` still bundles:

- pipeline/format/mode selection
- repo-config required-policy application
- auto issue-log enablement
- task/goal/parent-run/approval-policy/target-stage shaping
- UI wrapping and helper injection
- RLM legacy-env warning and runtime-env override wiring

That ownership is broader than thin parse/help glue and remains a real Symphony-aligned seam.

## Goal

Extract the remaining `start` request shell into a dedicated helper while leaving shared parse/help ownership in the binary and preserving current command behavior.

## Non-Goals

- changing lower `start` runtime behavior in `startCliShell.ts`
- refactoring unrelated CLI families
- moving generic shared helpers unless the extraction requires a minimal shared adapter

## Success Criteria

- `handleStart(...)` is reduced to shared parse/help ownership plus a thin handoff
- the extracted helper owns the remaining `start` request-shaping responsibilities
- focused parity covers the extracted seam and the user-facing `start` command surface remains unchanged
