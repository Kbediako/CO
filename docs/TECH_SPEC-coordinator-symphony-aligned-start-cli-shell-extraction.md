# TECH_SPEC: Coordinator Symphony-Aligned Start CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `start` launch shell above `orchestrator.start(...)`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated start CLI shell helper if needed
- focused `start` CLI task and docs artifacts

## Requirements

1. Extract the inline `start` shell without changing user-facing behavior.
2. Preserve help gating, output-format and execution/runtime-mode resolution, repo-policy application, `rlm`-specific env shaping, `withRunUi(...)` handoff, auto issue-log capture, output emission, exit-code mapping, and post-success adoption-hint behavior.
3. Keep the deeper orchestrator lifecycle under `orchestrator/src/cli/orchestrator.ts` and service shells out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused start CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `start` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
