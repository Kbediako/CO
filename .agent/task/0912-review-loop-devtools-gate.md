# Task Checklist — Review Loop + DevTools Review Gate (0912-review-loop-devtools-gate)

> Set `MCP_RUNNER_TASK_ID=0912-review-loop-devtools-gate` for orchestrator commands. Mirror status with `tasks/tasks-0912-review-loop-devtools-gate.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0912-review-loop-devtools-gate/cli/<run-id>/manifest.json`).

## Foundation
- [x] Implementation-gate-devtools manifest captured — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-45-48-830Z-1087d10f/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0912-review-loop-devtools-gate/metrics.json`, `out/0912-review-loop-devtools-gate/state.json`.
- [x] Mirrors updated (`docs/TASKS.md`, `.agent/task/0912-review-loop-devtools-gate.md`, `tasks/index.json`) — Evidence: this commit + manifest above.

## Workflow updates
- [x] DevTools review gate pipeline wired — Evidence: `codex.orchestrator.json`, `scripts/run-review.ts`, `scripts/codex-devtools.sh`.
- [x] Review-loop SOP added and linked in agent docs — Evidence: `.agent/SOPs/review-loop.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- [x] NOTES required for review handoff with optional questions template — Evidence: `scripts/run-review.ts`, `README.md`, `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`.

## Guardrails & handoff
- [x] Spec-guard/build/lint/test/docs:check/diff-budget/review recorded — Evidence: `.runs/0912-review-loop-devtools-gate/cli/2025-12-24T08-45-48-830Z-1087d10f/manifest.json`.
