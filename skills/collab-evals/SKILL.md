---
name: collab-evals
description: Run collab/multi-agent eval scenarios (symbolic RLM, large-context, pause/resume, multi-hour checkpoints) and capture manifest-backed evidence.
---

# Collab Evals

Use this skill to run repeatable collab evaluation scenarios and record evidence. Keep scope to evals; do not implement unrelated fixes.

## Quick start

0) Confirm feature readiness:
- Run `codex features list` and verify `multi_agent` is enabled.
- In this skill, "collab" refers to the same multi-agent tooling path; `collab` naming remains in legacy keys like `RLM_SYMBOLIC_COLLAB` and `manifest.collab_tool_calls`.

1) Pick the scenario(s):
- Large-context symbolic RLM with collab subcalls.
- Multi-hour refactor with checkpoints.
- 24h pause/resume context-rot regression.
- Multi-day initiative (48–72h) with multiple resumes.
- Additive config simulation: verify updates merge into existing user config without destructive overwrite.
- RLM default-capability simulation: verify built-ins-first behavior (`default`/`explorer`/`worker`/`awaiter`) before custom overlays.
- Docs relevance simulation: delegated doc-audit stream checks stale/irrelevant guidance before hard-gating.

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
- Keep top-level defaults on latest baseline model and `model_reasoning_effort >= high`; avoid role sprawl in eval lanes.
- Treat fallback profiles as exception paths in scenarios and record why baseline settings were insufficient.
- For non-trivial eval runs, include at least one delegated research/review stream and summarize evidence in parent output.

## Skill split policy
- Keep scenario/mock/simulation coverage in this skill, while scope stays focused on collab/multi-agent behavior.
- Propose a dedicated simulation skill only when repeated non-collab simulation workflows make this skill too broad.

## Related skills
- `collab-subagents-first`: for production stream ownership patterns mirrored in eval scenarios.
- `delegation-usage`: for delegation MCP setup and lifecycle semantics.
- `long-poll-wait`: for multi-hour/multi-day eval monitoring with durable checkpoints.
