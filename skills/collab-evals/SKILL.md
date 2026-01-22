---
name: collab-evals
description: Run collab/multi-agent eval scenarios (symbolic RLM, large-context, pause/resume, multi-hour checkpoints) and capture manifest-backed evidence.
---

# Collab Evals

Use this skill to run repeatable collab evaluation scenarios and record evidence. Keep scope to evals; do not implement unrelated fixes.

## Quick start

1) Pick the scenario(s):
- Large-context symbolic RLM with collab subcalls.
- Multi-hour refactor with checkpoints.
- 24h pause/resume context-rot regression.
- Multi-day initiative (48–72h) with multiple resumes.

2) Ensure task context:
- `export MCP_RUNNER_TASK_ID=<task-id>`

3) Run the scenario using `codex-orchestrator start <pipeline> --format json` and record the manifest path.

## Evidence checklist
- Manifest path under `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Log path under `.runs/<task-id>/cli/<run-id>/runner.ndjson`.
- Findings recorded in `docs/findings/<date>-<topic>.md`.
- Task mirror update in `docs/TASKS.md` and task spec.

## Guardrails
- Collab is additive; keep MCP as the control plane for approvals and audit trails.
- Cap collab event capture with `CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS` when needed.
- If pause/resume is required, use control endpoints or `codex-orchestrator resume` with manifest evidence.
