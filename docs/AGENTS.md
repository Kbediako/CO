# Repository Agent Guidance

## Project 0303 — Codex Orchestrator Autonomy Enhancements
- Export `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy` so diagnostics land in `.runs/0303-orchestrator-autonomy/cli/` and mirrors sync across `/tasks`, `docs/`, and `.agent/`.
- Store evidence under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`, metrics in `.runs/0303-orchestrator-autonomy/metrics.json`, and summaries in `out/0303-orchestrator-autonomy/state.json`.
- Record any approval escalations in the manifest `approvals` array and cross-link when flipping checklist items.
- Run `node scripts/spec-guard.mjs --dry-run` plus `npm run lint`, `npm run test`, and `npm run eval:test` (if fixtures exist) before reviewer hand-off; attach the manifest path documenting these runs.

## Project 0202 — Codex Orchestrator Resilience Hardening
- Existing manifests remain in `.runs/0202-orchestrator-hardening/cli/`; keep metrics/state snapshots in `.runs/0202-orchestrator-hardening/metrics.json` and `out/0202-orchestrator-hardening/state.json`.
- Maintain checklist mirrors across `tasks/tasks-0202-orchestrator-hardening.md`, `docs/TASKS.md`, and `.agent/task/0202-orchestrator-hardening.md` when updating evidence.

## Instruction Chain
- Global defaults live in `AGENTS.md`.
- Repository-level specifics (this file) describe project directories and guardrails.
- Project SOPs and task detail live under `.agent/AGENTS.md` and `.agent/task/**`.
