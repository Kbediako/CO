# TECH_SPEC: Coordinator Symphony-Aligned Review CLI Launch Shell Extraction

## Scope

Bounded extraction of the binary-facing review launch shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `scripts/run-review.ts`
- `tests/cli-command-surface.spec.ts`
- a new dedicated shell helper/test file if the extraction warrants it
- adjacent task/docs artifacts only as needed to record the lane

## Requirements

1. Extract the inline review launch shell without changing user-facing behavior.
2. Preserve help behavior, source-vs-dist runner resolution, passthrough launch semantics, and exit-code propagation.
3. Keep `scripts/run-review.ts` and deeper review engine helpers out of scope.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused review CLI launch coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline review launch shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
