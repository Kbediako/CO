# PRD: Coordinator Symphony-Aligned Orchestrator Cloud Interactive Env Default Fallback Contract

## Summary

A delegated guard run for `1205` exposed a real regression in the live tree: when the parent process exports blank `CODEX_NON_INTERACTIVE`, `CODEX_NO_INTERACTIVE`, or `CODEX_INTERACTIVE` values, the cloud executor request builder forwards those blank strings instead of falling back to the established defaults.

## Problem

`orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts` currently resolves the interactive env flags with nullish coalescing:

- `CODEX_NON_INTERACTIVE`
- `CODEX_NO_INTERACTIVE`
- `CODEX_INTERACTIVE`

That treats `''` as an explicit value rather than an empty/invalid one. The current test only fails when the parent shell happens to export those variables blank, so the regression is real but not yet deterministically enforced on the normal local lane.

## Goal

Normalize blank interactive env values the same way the executor already normalizes other optional cloud request strings, while preserving explicit nonblank overrides and making the regression deterministic in focused tests.

## Non-Goals

- changing cloud environment-id or branch resolution after `1203` and `1204`
- changing feature-toggle parsing, numeric/default parsing, prompt assembly, or completion behavior
- changing cloud preflight or doctor behavior
- broad cloud request-contract refactors beyond this interactive env fallback fix

## Success Criteria

- blank parent-process interactive env values fall back to the current defaults (`1`, `1`, `0`)
- explicit nonblank env overrides and process-env values still win when present
- focused tests reproduce the previous failure deterministically and pass on the fixed tree
