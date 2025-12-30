# Task Checklist - Subagent Delegation Enforcement (0918)

> Set `MCP_RUNNER_TASK_ID=0918-subagent-delegation-enforcement` for orchestrator commands. Mirror with `tasks/tasks-0918-subagent-delegation-enforcement.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Planning and approvals
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.
- [x] Docs-review manifest captured - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json`.

## Delegation guard implementation
- [x] `scripts/delegation-guard.mjs` added with top-level/subagent detection - Evidence: `scripts/delegation-guard.mjs`.
- [x] Core pipelines updated to run delegation guard - Evidence: `codex.orchestrator.json`.

## Documentation + templates
- [x] AGENTS + SOPs updated with mandatory delegation rules - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/SOPs/meta-orchestration.md`.
- [x] Templates updated to require subagent evidence - Evidence: `.agent/task/templates/tasks-template.md`, `.agent/task/templates/subagent-request-template.md`.

## Validation + handoff
- [x] Guardrails complete (delegation-guard/spec-guard/build/lint/test/docs:check/diff-budget/review) - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

## Subagent evidence
- 0918-subagent-delegation-enforcement-docs - `.runs/0918-subagent-delegation-enforcement-docs/cli/2025-12-30T16-38-34-482Z-000d8b75/manifest.json`.
