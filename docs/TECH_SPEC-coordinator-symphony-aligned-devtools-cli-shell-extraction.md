# TECH_SPEC: Coordinator Symphony-Aligned Devtools CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `devtools` shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/devtoolsSetup.ts`
- `tests/cli-command-surface.spec.ts`
- a new dedicated shell helper/test file if the extraction warrants it
- adjacent task/docs artifacts only as needed to record the lane

## Requirements

1. Extract the inline `devtools` shell without changing user-facing behavior.
2. Preserve subcommand validation, `--format json` vs text shaping, the `--yes` plus `--format json` incompatibility guard, downstream runner invocation, and summary emission.
3. Keep `orchestrator/src/cli/devtoolsSetup.ts` logic out of scope beyond the shell handoff.
4. Keep the already-frozen internal devtools readiness family out of scope.
5. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused devtools CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `devtools` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
