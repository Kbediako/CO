# TECH_SPEC: Coordinator Symphony-Aligned Resume CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `resume` launch shell above `orchestrator.resume(...)`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated resume CLI shell helper if needed
- focused `resume` CLI task and docs artifacts

## Requirements

1. Extract the inline `resume` shell without changing user-facing behavior.
2. Preserve help gating, run-id resolution, runtime-mode resolution, repo-policy application, `withRunUi(...)` handoff, the `orchestrator.resume(...)` call shape, and output emission.
3. Keep the deeper resume-preparation lifecycle under `orchestrator/src/cli/orchestrator.ts` and service shells out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused resume CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `resume` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
