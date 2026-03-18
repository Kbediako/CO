# TECH_SPEC: Coordinator Symphony-Aligned RLM CLI Request Shell Extraction

## Scope

Extract the current RLM request-shaping surface from `bin/codex-orchestrator.ts` into a focused request-shell helper.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new helper under `orchestrator/src/cli/`
- focused tests for the new helper
- adjacent RLM shell tests only as needed for parity

## Requirements

1. Move the current binary-facing RLM request shaping into a dedicated helper.
2. Preserve the existing `runRlmLaunchCliShell(...)` and `runRlmCompletionCliShell(...)` contracts.
3. Keep `handleRlm(...)` limited to shared parse/help ownership and the final handoff.
4. Avoid widening into lower runtime behavior or unrelated CLI families.

## Validation Plan

- targeted RLM helper tests
- targeted CLI surface tests for `rlm`
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
