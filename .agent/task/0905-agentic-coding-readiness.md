# Task Checklist — Agentic Coding Readiness & Onboarding Hygiene (0905)

> Set `MCP_RUNNER_TASK_ID=0905-agentic-coding-readiness` for orchestrator commands. Mirror with `tasks/tasks-0905-agentic-coding-readiness.md` and `docs/TASKS.md`.

## Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0905-agentic-coding-readiness/metrics.json`, `out/0905-agentic-coding-readiness/state.json`.
- [x] Docs + task mirrors updated — Evidence: this commit + `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.

## Deliverables
- [x] `.agent/system/*` placeholders replaced with repo-specific content — Evidence: this commit.
- [x] `.ai-dev-tasks/*` placeholders replaced with canonical workflow docs — Evidence: this commit.
- [x] Stale/non-standard subagent docs removed; guidance standardized on Codex-first workflows — Evidence: this commit.
- [x] CI workflow enabled for build/lint/test/spec-guard — Evidence: `.github/workflows/core-lane.yml`.

## Guardrails
- [x] Spec guard passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Build passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0905-agentic-coding-readiness/cli/2025-12-15T14-58-24-866Z-c03673e7/manifest.json`.
