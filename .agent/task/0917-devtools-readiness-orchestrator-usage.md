# Task Checklist - DevTools Readiness + Orchestrator Usage Discipline (0917)

> Set `MCP_RUNNER_TASK_ID=0917-devtools-readiness-orchestrator-usage` for orchestrator commands. Mirror with `tasks/tasks-0917-devtools-readiness-orchestrator-usage.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Planning and approvals
- [x] Mini-spec approved — Evidence: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`.
- [x] PRD approval recorded in `tasks/index.json` gate metadata — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.
- [x] Docs-review manifest captured — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.

## DevTools readiness improvements
- [x] `doctor` MCP config detection added — Evidence: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/tests/Doctor.test.ts`.
- [x] DevTools setup helper added with explicit confirmation — Evidence: `orchestrator/src/cli/devtoolsSetup.ts`, `bin/codex-orchestrator.ts`, `README.md`.
- [x] DevTools pipeline preflight added — Evidence: `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts`.

## Orchestrator usage discipline
- [x] SOPs + agent docs updated with orchestrator-first + subagent delegation rubric — Evidence: `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `AGENTS.md`.
- [x] Templates updated (if needed) to capture subagent evidence — Evidence: `.agent/task/templates/tasks-template.md`.

## Validation + handoff
- [x] Tests added for readiness + setup flows — Evidence: `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/DevtoolsSetup.test.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts` (vitest run 2025-12-30).
- [x] Metrics/state snapshots updated — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/metrics.json`, `out/0917-devtools-readiness-orchestrator-usage/state.json`.
- [x] Guardrails complete (spec-guard/build/lint/test/docs:check/diff-budget/review) — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.
