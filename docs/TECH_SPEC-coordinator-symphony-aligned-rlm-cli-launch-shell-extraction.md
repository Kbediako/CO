# TECH_SPEC: Coordinator Symphony-Aligned RLM CLI Launch Shell Extraction

## Scope

Bounded extraction of the RLM launch/start shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/rlmCompletionCliShell.ts`
- new RLM launch shell/helper under `orchestrator/src/cli/`
- focused RLM CLI tests

## Requirements

1. Move goal validation, task/env shaping, launch orchestration, `Run started` output, and handoff into the completion helper out of `handleRlm(...)`.
2. Keep binary ownership limited to shared `parseArgs(...)`, help gating, repo-policy/runtime-mode handling, and top-level command dispatch.
3. Preserve current legacy alias warning, doctor-tip behavior, and goal-required error semantics.
4. Avoid widening into `rlmRunner.ts` runtime internals or reworking the already-extracted completion shell beyond wiring.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the RLM launch/start shell is extracted with focused parity evidence
- `abort`: the remaining `handleRlm(...)` launch ownership is shown to be same-owner glue rather than a clean shell boundary
