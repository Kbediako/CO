# TODO: replace with upstream file

Use this manual when executing approved tasks in sequence.
It captures the review cadence, sign-offs, and spec guard checks.
Update the active task note in /tasks after each meaningful change.

## Added by Governance 2025-10-16
- Phase Gate G1 (PRD): confirm Product, Engineering, and Design approvals are logged in `tasks/0001-prd-codex-orchestrator.md#approval-log-2025-10-16` before opening implementation subtasks.
- Phase Gate G2 (Task List): synchronize `tasks/index.json` gate metadata and the task list's Relevant Files notes; keep safe approval mode active while updating mirrors.
- Phase Gate G3 (Spec Guard): reference `.agent/SOPs/specs-and-research.md#added-by-governance-2025-10-16` and block progress until related `gate.status` values read `approved`.
- Logging: Capture Codex CLI run IDs in session notes and echo the summary into the `tasks/tasks-0001-codex-orchestrator.md` Relevant Files section for traceability.
