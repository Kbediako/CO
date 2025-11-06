# SOP — Codex Orchestrator Autonomy Enhancements (Task 0303)

## Scope
Applies to all runs executed with `MCP_RUNNER_TASK_ID=0303-orchestrator-autonomy`, including diagnostics, guardrails, and reviewer hand-offs for the autonomy initiative.

## Guardrails
- Default approval profile remains `read/edit/run/network`; do not request escalations unless the manifest history documents reviewer consent.
- Every run must capture its manifest under `.runs/0303-orchestrator-autonomy/cli/<run-id>/manifest.json`; attach this path when updating checklists.
- Metrics live in `.runs/0303-orchestrator-autonomy/metrics.json`; state snapshots accumulate in `out/0303-orchestrator-autonomy/state.json`.
- Run `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, and `npm run eval:test` (when fixtures exist) before review. Record the manifest that proves these commands ran successfully.

## Escalations & Logging
- If an approval escalation is necessary, annotate the manifest `approvals` array with approver, timestamp, and rationale.
- Reflect the same manifest path inside `/tasks`, `docs/TASKS.md`, and `.agent/task/0303-orchestrator-autonomy.md` when flipping `[ ]` to `[x]`.
- Store any additional evidence (logs, attachments) alongside the manifest directory for traceability.

## Evidence Checklist (pre-review)
1. Diagnostics manifest referenced in checklist mirrors.
2. Guardrail command manifest recorded and linked in docs/tasks.
3. Metrics/state snapshots refreshed and noted in docs.
4. Reviewer hand-off (`npm run review`) manifest captured with timestamp.

## Review Handoff
- Run `npm run review -- --manifest <latest>` if the CLI accepts the flag, or rely on `npm run review` defaulting to the newest manifest in `.runs/0303-orchestrator-autonomy/cli/`.
- Update `docs/ACTION_PLAN-codex-orchestrator-autonomy.md` and `docs/TASKS.md` to reference the manifest path used for the hand-off.
