# Action Plan — Agentic Coding Readiness & Onboarding Hygiene (Task 0905)

## Status Snapshot
- Current Phase: Planning (PRD + spec + task list drafted).
- Run Manifest Link: _(pending — capture first diagnostics run under `.runs/0905-agentic-coding-readiness/cli/<run-id>/manifest.json`)._
- Metrics / State Snapshots: _(pending — populate `.runs/0905-agentic-coding-readiness/metrics.json` and `out/0905-agentic-coding-readiness/state.json`)._
- Approvals / Escalations: None recorded (planning only).

## Milestones & Tasks
1. Milestone: Onboarding docs unblocked
   - Tasks: replace `.agent/system/*` and `.ai-dev-tasks/*` placeholders with repo-specific guidance; ensure “read first” order is accurate.
2. Milestone: Governance/link integrity
   - Tasks: remove stale/non-standard subagent docs and ensure repo guidance is Codex-first and self-consistent.
3. Milestone: CI guardrails enabled
   - Tasks: ship a PR/push (main) workflow that runs build/lint/test/spec-guard in a non-interactive way.
4. Milestone: Evidence & mirrors
   - Tasks: run diagnostics + guardrails, capture manifest evidence, and flip checklist items in `tasks/`, `docs/TASKS.md`, and `.agent/task/**`.

## Risks & Mitigations
- Risk: Docs get updated but drift again without enforcement.
  - Mitigation: put the core lane in CI and keep docs pointing to source-of-truth scripts/configs.

## Next Review
- Date: TBD
- Agenda: approve scope and CI workflow shape (single workflow vs split jobs), then begin implementation subtasks.
