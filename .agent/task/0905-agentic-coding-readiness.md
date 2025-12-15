# Task Checklist — Agentic Coding Readiness & Onboarding Hygiene (0905)

> Set `MCP_RUNNER_TASK_ID=0905-agentic-coding-readiness` for orchestrator commands. Mirror with `tasks/tasks-0905-agentic-coding-readiness.md` and `docs/TASKS.md`.

## Foundation
- [ ] Diagnostics/guardrails manifest captured — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [ ] Docs + task mirrors updated — Evidence: this commit + manifest path once captured.

## Deliverables
- [ ] `.agent/system/*` placeholders replaced with repo-specific content.
- [ ] `.ai-dev-tasks/*` placeholders replaced with canonical workflow docs.
- [ ] Stale/non-standard subagent docs removed; guidance standardized on Codex-first workflows.
- [ ] CI workflow enabled for build/lint/test/spec-guard.

## Guardrails
- [ ] Spec guard passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] Build passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] Lint passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
- [ ] Tests pass — Evidence: `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`.
