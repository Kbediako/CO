# TECH_SPEC: Coordinator Symphony-Aligned Flow CLI Shell Extraction

## Scope

Bounded extraction of the remaining `flow` command shell that still lives inline in `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- a new dedicated flow CLI shell/helper module under the orchestrator CLI sources
- `tests/cli-command-surface.spec.ts`
- adjacent focused tests only if parity coverage needs to move with the seam

## Requirements

1. Extract `handleFlow(...)` orchestration out of the top-level CLI file without changing user-facing command behavior.
2. Move the flow-owned target-stage selection helper that belongs with that shell boundary:
   - `resolveFlowTargetStageSelection(...)`
3. Preserve docs-review to implementation-gate sequencing, task/parent-run propagation, shared auto-issue-log behavior, JSON payload parity, and adoption-hint behavior.
4. Keep shared helpers such as `maybeCaptureAutoIssueLog(...)`, `withAutoIssueLogContext(...)`, `resolveTaskFilter(...)`, and the generic run-output helpers out of scope unless extraction proves they are required.
5. Keep non-flow command handlers in `bin/codex-orchestrator.ts` unchanged unless required for import rewiring.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused `tests/cli-command-surface.spec.ts` flow coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the `flow` command shell is extracted behind a dedicated boundary with parity-backed coverage
- `abort`: current-tree inspection shows the candidate seam is only same-owner wrapper glue
