# TECH_SPEC: Coordinator Symphony-Aligned Flow CLI Request Shell Extraction

## Context

`orchestrator/src/cli/flowCliShell.ts` already owns the lower docs-review plus implementation-gate lifecycle, but `handleFlow(...)` still builds the request contract passed into it.

## Requirements

1. Extract a bounded `flow` request-shell helper under `orchestrator/src/cli/`.
2. Keep `bin/codex-orchestrator.ts` limited to shared parse/help ownership and a thin handoff.
3. Preserve current `flow` flag semantics, help behavior, issue-log behavior, target-stage behavior, and output behavior.
4. Add focused tests for the extracted request shell plus maintain the existing `flow` CLI parity coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- targeted tests for the new request shell and `flow` CLI surface
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
