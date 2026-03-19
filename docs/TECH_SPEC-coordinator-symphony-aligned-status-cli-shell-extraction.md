# TECH_SPEC: Coordinator Symphony-Aligned Status CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `status` shell above `orchestrator.status(...)`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated status CLI shell helper if needed
- focused `status` CLI task and docs artifacts

## Requirements

1. Extract the inline `status` shell without changing user-facing behavior.
2. Preserve help gating, run-id resolution, watch and format parsing, interval parsing, the inline watch-loop termination behavior, and the `orchestrator.status(...)` call shape.
3. Keep the deeper status formatting and service behavior under `orchestrator/src/cli/orchestrator.ts` and the lower-layer status shell out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused status CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `status` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
