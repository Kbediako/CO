# TECH_SPEC: Coordinator Symphony-Aligned Plan CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `plan` shell above `orchestrator.plan(...)`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- new dedicated plan CLI shell helper if needed
- focused `plan` CLI task and docs artifacts

## Requirements

1. Extract the inline `plan` shell without changing user-facing behavior.
2. Preserve help gating, repo-policy application, pipeline/task/stage argument resolution, JSON/text format selection, and `formatPlanPreview(...)` behavior.
3. Keep the deeper orchestrator plan service behavior out of scope beyond shell handoff.
4. Add focused parity tests if the extracted shell needs direct coverage.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused plan CLI shell coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the inline `plan` shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
