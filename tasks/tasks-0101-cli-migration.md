# Task Checklist — Orchestrator Wrapper Template

> Export `MCP_RUNNER_TASK_ID=<task-id>` before executing orchestrator commands. Mirror status across `/tasks`, `docs/TASKS.md`, and `.agent/task/<task-id>-<slug>.md` so every project references the same manifest evidence.

## Foundation
- [ ] Assign task metadata: confirm `tasks/index.json`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `.agent/task/<task-id>-<slug>.md` reference the active task id; Acceptance: reviewer acknowledges synchronized docs; Evidence: attach manifest path proving updates.
- [ ] Bootstrap run directories: ensure `.runs/<task-id>/cli/` and `.runs/<task-id>/mcp/` exist; Acceptance: first CLI run writes manifest; Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- [ ] Update environment defaults: set `MCP_RUNNER_TASK_ID=<task-id>` in local shell or CI; Acceptance: diagnostics manifest records correct `task_id`.

## Project Pipeline Implementation
1. Implement CLI scaffolding for project
   - Files: `packages/<project>/**`, `orchestrator/src/cli/**` (project hooks)
   - Acceptance: `npx codex-orchestrator start diagnostics --format json` succeeds; Evidence: diagnostics manifest path + command output snippet.
   - Status: [ ]
2. TaskManager integration
   - Files: `orchestrator/src/cli/adapters/*`, project config in `codex.orchestrator.json`
   - Acceptance: manifest records ordered stages with plan/build/test/guardrail events; Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json`.
   - Status: [ ]
3. Nested sub-agent support (if needed)
   - Files: `orchestrator/src/cli/pipelines/**`
   - Acceptance: Subpipeline stages record `parent_run_id` and child manifest references; Evidence: manifest excerpt or test log.
   - Status: [ ]

## Persistence & Telemetry
- [ ] Manifests & compatibility pointers
  - Files: `orchestrator/src/cli/persistence/**`, shims under `scripts/`
  - Acceptance: `.runs/<task-id>/cli/<run-id>/manifest.json` + `.runs/<task-id>/mcp/<run-id>/manifest.json` pointer exist; Evidence: paths linked in checklist.
- [ ] Metrics emission
  - Files: `orchestrator/src/cli/metrics/*`, `scripts/mcp-runner-metrics.js`
  - Acceptance: `.runs/<task-id>/metrics.json` contains new entry with guardrail coverage; Evidence: metrics file path with timestamp.
- [ ] Task state snapshot
  - Files: `out/<task-id>/state.json`
  - Acceptance: Integration or smoke test verifies run summary persisted; Evidence: `out/<task-id>/state.json` reference.

## Guardrails & Rollout
- [ ] Diagnostics pipeline validation
  - Commands: `codex-orchestrator start diagnostics`
  - Acceptance: run completes with `status: succeeded` and guardrail summary recorded; Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json#summary`.
- [ ] Review hand-off
  - Commands: `npm run review` (or project equivalent)
  - Acceptance: review script reads latest CLI manifest; Evidence: command output referencing `.runs/<task-id>/cli/<run-id>/manifest.json`.
- [ ] Documentation updates
  - Files: `.agent/AGENTS.md`, `docs/TASKS.md`, project SOPs
  - Acceptance: docs reference multi-project workflow and manifest locations; Evidence: updated doc paths.

## Enhancements (optional)
- [ ] Telemetry schema helper updates
  - Acceptance: schemas reflect new project data; Evidence: manifest + test log.
- [ ] Plan preview coverage
  - Acceptance: `codex-orchestrator plan <pipeline>` outputs accurate stages; Evidence: command output snippet.
- [ ] Guardrail summary tuning
  - Acceptance: manifest summary conveys project-specific guardrails; Evidence: manifest excerpt.

Flip each `[ ]` to `[x]` with the manifest path (e.g., `.runs/<task-id>/cli/2025-10-31T23-59-59Z/manifest.json`) once acceptance criteria are satisfied.
