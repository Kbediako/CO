# TECH_SPEC: Coordinator Symphony-Aligned Frontend-Test CLI Request Shell Extraction

## Context

The current tree still leaves binary-facing frontend-test request shaping inline in `bin/codex-orchestrator.ts`.

## Scope

- extract the remaining frontend-test request-shaping logic into a dedicated helper
- preserve parse/help ownership in the binary
- preserve lower pipeline execution ownership in `orchestrator/src/cli/frontendTestCliShell.ts`

## Requirements

1. Extract a bounded frontend-test request shell without changing runtime behavior.
2. Preserve current flag semantics for `--format`, `--devtools`, `--runtime-mode`, and request metadata fields.
3. Preserve the current extra-argument advisory and repo-config-required policy behavior.
4. Add focused parity for the extracted request shell without widening into unrelated CLI families.

## Validation Plan

- targeted Vitest coverage for the new request shell
- targeted frontend-test CLI parity
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`
