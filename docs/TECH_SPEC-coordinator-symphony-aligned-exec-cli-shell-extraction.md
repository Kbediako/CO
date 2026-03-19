# TECH_SPEC: Coordinator Symphony-Aligned Exec CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `exec` launch shell above the existing exec command engine.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/exec/command.ts`
- new dedicated exec CLI shell helper if needed
- focused exec CLI task and docs artifacts

## Requirements

1. Extract the inline `exec` shell without changing user-facing behavior.
2. Preserve empty-command validation, output-mode resolution, environment normalization with optional task override, invocation shaping, exit-code mapping, and the interactive adoption-hint follow-on.
3. Keep the deeper execution lifecycle in `orchestrator/src/cli/exec/command.ts` out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused exec CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `exec` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
