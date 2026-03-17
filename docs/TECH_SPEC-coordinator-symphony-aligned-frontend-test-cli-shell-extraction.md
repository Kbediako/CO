# TECH_SPEC: Coordinator Symphony-Aligned Frontend-Test CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `frontend-test` launch shell above `orchestrator.start(...)`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated frontend-test CLI shell helper if needed
- focused `frontend-test` CLI task and docs artifacts

## Requirements

1. Extract the inline `frontend-test` shell without changing user-facing behavior.
2. Preserve output-format and runtime-mode resolution, repo-policy application, the `CODEX_REVIEW_DEVTOOLS` env toggle and restoration behavior, `withRunUi(...)` handoff, output emission, and exit-code mapping.
3. Keep the deeper frontend-testing runtime under `orchestrator/src/cli/frontendTestingRunner.ts` out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused frontend-test CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `frontend-test` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
