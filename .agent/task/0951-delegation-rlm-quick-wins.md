# Task Checklist - Delegation Guard Actionable Diagnostics (0951)

> Set `MCP_RUNNER_TASK_ID=0951-delegation-rlm-quick-wins` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0951-delegation-rlm-quick-wins.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) — Evidence: `docs/PRD-delegation-rlm-quick-wins.md`, `docs/TECH_SPEC-delegation-rlm-quick-wins.md`, `docs/ACTION_PLAN-delegation-rlm-quick-wins.md`, `tasks/tasks-0951-delegation-rlm-quick-wins.md`.
- [x] RLM brainstorming + doc draft captured — Evidence: `.runs/0951-delegation-rlm-quick-wins-brainstorm/cli/2026-01-13T19-51-20-277Z-244d0f90/manifest.json`, `.runs/0951-delegation-rlm-quick-wins-doc-draft/cli/2026-01-13T19-52-44-805Z-b2068fcc/manifest.json`, `.runs/0951-delegation-rlm-quick-wins-brainstorm3-local/cli/2026-01-14T03-43-35-993Z-ac6429cf/manifest.json`.
- [x] Docs-review manifest captured; mirrors/registry updated — Evidence: `.runs/0951-delegation-rlm-quick-wins/cli/2026-01-14T08-58-56-755Z-012d15a6/manifest.json`, `docs/TASKS.md`, `.agent/task/0951-delegation-rlm-quick-wins.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

### Implementation
- [ ] Delegation guard emits actionable diagnostics — Evidence: `scripts/delegation-guard.mjs`.
- [ ] Troubleshooting note added to review-loop SOP (optional) — Evidence: `.agent/SOPs/review-loop.md`.
- [ ] Async/start-only `delegate.spawn` supports long-running runs without tool-call timeout — Evidence: `orchestrator/src/cli/delegationServer.ts`.
- [ ] True RLM behavior implemented (context object + symbolic recursion) — Evidence: `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/src/cli/rlm/`.
- [ ] Implementation-docs archive automation fixes for PR #165 (doc-archives payloads + diff budget strategy) — Evidence: `.github/workflows/*`, `scripts/docs-archive*`, `docs/implementation-docs-archive-policy.json`.

### Validation + handoff
- [ ] Implementation-gate manifest captured — Evidence: `.runs/0951-delegation-rlm-quick-wins/cli/<run-id>/manifest.json`.

## Relevant Files
- `scripts/delegation-guard.mjs`
- `.agent/SOPs/review-loop.md`
- `docs/PRD-delegation-rlm-quick-wins.md`
- `docs/TECH_SPEC-delegation-rlm-quick-wins.md`
- `docs/ACTION_PLAN-delegation-rlm-quick-wins.md`
