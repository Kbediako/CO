# Task Checklist — Docs Hygiene Automation & Review Handoff Gate (0906)

> Set `MCP_RUNNER_TASK_ID=0906-docs-hygiene-automation` for orchestrator commands. Mirror status with `tasks/tasks-0906-docs-hygiene-automation.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`).

## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this commit.
- [x] Capture diagnostics/guardrails manifest — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`.
- [x] Mirrors updated with manifest links (`docs/TASKS.md`, `.agent/task/0906-docs-hygiene-automation.md`, `tasks/index.json`) — Evidence: this commit + `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.

## Docs hygiene tool
- [ ] Add `docs:check` (deterministic lint for agentic docs).
- [ ] Add `docs:sync` (safe mirror sync for active task only).

## Workflow docs (review handoff gate)
- [ ] Require `npm run review` after implementation guardrails in the agent-facing workflow docs.

## Guardrails & handoff
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [ ] `npm run docs:check` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`.
- [ ] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`.
