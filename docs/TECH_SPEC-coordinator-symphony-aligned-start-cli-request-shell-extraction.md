# TECH_SPEC: Coordinator Symphony-Aligned Start CLI Request Shell Extraction

## Context

`orchestrator/src/cli/startCliShell.ts` already owns the lower launch lifecycle, but `handleStart(...)` still builds the request contract passed into it.

## Requirements

1. Extract a bounded `start` request-shell helper under `orchestrator/src/cli/`.
2. Keep `bin/codex-orchestrator.ts` limited to shared parse/help ownership and a thin handoff.
3. Preserve current `start` flag semantics, help behavior, issue-log behavior, RLM shaping, and output behavior.
4. Add focused tests for the extracted request shell plus maintain the existing `start` CLI parity coverage.

## Invariants

- Help output remains owned by the binary wrapper.
- `startCliShell.ts` remains the owner of the lower orchestration lifecycle.
- The extraction must not change exit-code semantics or issue-log capture behavior.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- targeted tests for the new request shell and `start` CLI surface
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
