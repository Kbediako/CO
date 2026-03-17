# TECH_SPEC: Coordinator Symphony-Aligned Init CLI Shell Extraction

## Scope

Bounded extraction of the remaining binary-facing `init` shell.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/init.ts`
- `orchestrator/src/cli/codexCliSetup.ts`
- a new dedicated `init` CLI shell helper under `orchestrator/src/cli/`
- focused init CLI tests and task/docs artifacts

## Requirements

1. Extract the inline `init` shell without changing user-facing behavior.
2. Preserve `init codex` validation, cwd/force resolution, template summary emission, and the optional `--codex-cli` follow-on setup path.
3. Keep `orchestrator/src/cli/init.ts` and `orchestrator/src/cli/codexCliSetup.ts` behavior out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused init CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `init` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
