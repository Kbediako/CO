# Task Checklist - Delegation RLM Quick Wins Follow-up (0952)

> Set `MCP_RUNNER_TASK_ID=0952-delegation-rlm-quick-wins-followup` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0952-delegation-rlm-quick-wins-followup.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered — Evidence: `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `tasks/tasks-0952-delegation-rlm-quick-wins-followup.md`, `.agent/task/0952-delegation-rlm-quick-wins-followup.md`.
- [x] Delegation subagent run captured (diagnostics scout) — Evidence: `.runs/0952-delegation-rlm-quick-wins-followup-scout/cli/2026-01-15T12-27-33-684Z-36222bdc/manifest.json`.

### Implementation
- [x] Follow-up RLM symbolic gaps closed (byte-native search offsets, JSONL planner hits, clamp recording, combined snippet/span cap, tests) — Evidence: `orchestrator/src/cli/rlm/context.ts`, `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/src/cli/rlm/types.ts`, `orchestrator/tests/RlmContextStoreOffsets.test.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.

### Validation + handoff
- [x] Implementation-gate manifest captured — Evidence: `.runs/0952-delegation-rlm-quick-wins-followup/cli/2026-01-15T12-33-33-681Z-77535168/manifest.json`.
- [x] Review manifest captured — Evidence: `.runs/0952-delegation-rlm-quick-wins-followup/cli/2026-01-15T12-33-33-681Z-77535168/manifest.json` (via `npm run review`).

## Relevant Files
- `docs/FOLLOWUP-0951-true-rlm-symbolic.md`
- `docs/PRD-delegation-rlm-quick-wins.md`
- `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
- `docs/ACTION_PLAN-delegation-rlm-quick-wins.md`
