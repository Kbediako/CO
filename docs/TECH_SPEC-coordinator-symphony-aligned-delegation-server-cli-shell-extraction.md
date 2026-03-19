# TECH_SPEC: Coordinator Symphony-Aligned Delegation Server CLI Shell Extraction

## Scope

Bounded extraction of the `delegation-server` shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/delegationServer.ts`
- `tests/cli-command-surface.spec.ts`
- a new dedicated shell helper/test file if the extraction warrants it
- adjacent task/docs artifacts only as needed to record the lane

## Requirements

1. Extract the inline `delegation-server` shell without changing user-facing behavior.
2. Preserve help gating, CLI/env mode resolution, invalid-mode warn-only fallback, config-override parsing, and handoff behavior.
3. Keep the underlying delegation-server engine out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused delegation-server CLI coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `delegation-server` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
