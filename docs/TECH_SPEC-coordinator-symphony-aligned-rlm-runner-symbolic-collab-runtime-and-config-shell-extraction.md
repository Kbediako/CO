# TECH_SPEC: Coordinator Symphony-Aligned RLM Runner Symbolic Collab Runtime And Config Shell Extraction

## Context

`1237` extracted runtime Codex command resolution, completion and JSONL handling, collab lifecycle validation, and feature-key negotiation into `rlmCodexRuntimeShell.ts`. The remaining `rlmRunner.ts` surface still owns a smaller but concrete shell seam: duplicated symbolic collab-runtime invocation branches plus canonical-vs-legacy env wrapper resolution for collab role-policy and allow-default-role behavior.

## Requirements

1. Extract the remaining symbolic collab-runtime shell across:
   - `orchestrator/src/cli/rlmRunner.ts`
   - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
   - `orchestrator/tests/RlmCodexRuntimeShell.test.ts`
   - `orchestrator/tests/RlmRunnerCollabLifecycle.test.ts`
   - `orchestrator/tests/RlmRunnerMode.test.ts`
2. Move the duplicated collab-aware symbolic `runSubcall` and deliberation invocation behavior behind the runtime shell instead of leaving it inline in `rlmRunner.ts`.
3. Move the remaining canonical-vs-legacy role-policy and allow-default-role env wrapper logic behind the same shell boundary when it is shell-owned rather than top-level orchestration.
4. Rehome shell-owned focused tests to direct runtime-shell imports where that reduces `rlmRunner.__test__` to genuine top-level-owner behavior.
5. Keep the iterative and symbolic loop cores, top-level CLI and env parsing, mode selection, budgets, and alignment policy out of scope.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM regressions
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- docs-review approval or explicit override
- `npm run pack:smoke`

## Exit Conditions

- `go`: the duplicated symbolic collab-runtime invocation and shell-owned config surface move behind `rlmCodexRuntimeShell.ts` while focused RLM contracts stay green
- `no-go`: the attempted move blurs top-level orchestration ownership or regresses symbolic collab lifecycle behavior
