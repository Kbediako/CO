# Evaluation Playbook (Collab + Context-Rot)

## Purpose
Provide a repeatable runbook for collab and long-running context-rot evaluations, with consistent evidence capture and reporting.

## Scope
- Collab/multi-agent scenarios in Codex CLI.
- Long-running workflows (multi-hour, 24h pause/resume, multi-day).

## Inputs
- Task id (use `MCP_RUNNER_TASK_ID=<task-id>`).
- Target pipeline or eval command.
- Fixtures or context sources (large logs/specs if applicable).

## Required artifacts
- Run manifest: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Run logs: `.runs/<task-id>/cli/<run-id>/runner.ndjson`.
- Findings note: `docs/findings/<date>-<topic>.md`.

## Checkpoints (every 60–90 minutes)
- Decision log: what changed, why, and invariants.
- Open questions + next action.
- Minimal validation: build or targeted tests.

## Resume ritual
- Re-validate checkpoint invariants.
- Confirm next action still applies.
- Record drift before proceeding.

## Scenarios
- Multi-hour refactor with checkpoints.
- 24h pause/resume context-rot regression.
- Multi-day initiative (48–72h).
- Large-context symbolic RLM with collab subcalls.

## Validation checklist
- Manifests + logs captured.
- Collab events present when expected.
- Collab success ratio reported if captured (successes / total tool calls).
- Invariants preserved across resumes.
- Quality gates pass at each checkpoint.

## Reporting
- Update `docs/findings/<date>-<topic>.md` with results and evidence.
- Mirror in `docs/TASKS.md` and task spec notes.
