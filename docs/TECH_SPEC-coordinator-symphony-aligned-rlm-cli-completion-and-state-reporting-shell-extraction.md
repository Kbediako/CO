# TECH_SPEC: Coordinator Symphony-Aligned RLM CLI Completion and State Reporting Shell Extraction

## Scope

Bounded extraction of the RLM post-start completion/state-reporting shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/startCliShell.ts`
- new RLM CLI shell/helper under `orchestrator/src/cli/`
- focused RLM CLI tests

## Requirements

1. Move manifest completion polling, `rlm/state.json` readback, final status printing, and exit-code mapping out of `handleRlm(...)`.
2. Keep binary ownership limited to shared `parseArgs(...)`, help gating, repo-policy/runtime-mode handling, goal/task flag resolution, and the doctor-tip preamble.
3. Preserve current RLM CLI behavior, including missing-state fallback to internal error exit code `10`.
4. Avoid widening into deeper `rlmRunner.ts` runtime internals or unrelated CLI families.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM CLI/helper tests
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the RLM post-start completion/state-reporting shell is extracted with focused parity evidence
- `abort`: current-tree inspection shows the seam is not cleanly extractable without widening beyond the bounded ownership described here
