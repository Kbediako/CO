---
id: 20260119-0953-standalone-review-docs-first-ship
title: Standalone Review + Docs-First Shipping
relates_to: tasks/tasks-0953-standalone-review-docs-first-ship.md
risk: low
owners:
  - Codex
last_review: 2026-01-19
---

## Summary
- Objective: Ship standalone review guidance and the docs-first workflow updates, then cut a patch release.
- Scope: Docs/skills/templates only; no code refactors.
- Constraints: Keep changes minimal and reviewable.

## Technical Requirements
- Delegation MCP enabled by default (only MCP on by default); other MCPs enabled only when relevant.
- Require PRD + TECH_SPEC + ACTION_PLAN + task checklist for every task; depth scales with scope.
- Pre-implementation standalone review approval recorded in PRD/TECH_SPEC and mirrored to checklists.
- Replace mini-spec terminology with TECH_SPEC; update templates and guidance accordingly.
- `codex exec` only for pre-task triage or lightweight audits that do not require manifest evidence; prefer delegation when a task id exists.

## Documentation Updates
- AGENTS guidance: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `templates/codex/AGENTS.md`.
- Skills: `skills/docs-first/SKILL.md`, `skills/standalone-review/SKILL.md`, `skills/delegation-usage/*`.
- SOPs/templates: `.agent/SOPs/specs-and-research.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/task/templates/*`.
- Task mirrors: `docs/TASKS.md`, `tasks/tasks-0953-standalone-review-docs-first-ship.md`, `.agent/task/0953-standalone-review-docs-first-ship.md`.

## Validation Plan
- Standalone review approval recorded in this TECH_SPEC (no manifest emitted).
- Docs-review + implementation-gate manifests captured.

## Related Docs
- PRD: `docs/PRD-standalone-review-docs-first-ship.md`
- ACTION_PLAN: `docs/ACTION_PLAN-standalone-review-docs-first-ship.md`

## Validation Notes (2026-01-19)
- Conflict audit captured via `codex exec` as a lightweight audit (no manifest emitted); output at `out/0953-conflict-audit/codex-exec-summary.md`.
- `codex exec` does not emit `.runs/**` manifests, even when `MCP_RUNNER_TASK_ID` is set; use `codex-orchestrator start <pipeline> --task <id>` for manifest-backed evidence.
- Delegation subagent run created a manifest at `.runs/0953-standalone-review-docs-first-ship-audit/cli/2026-01-19T05-53-04-728Z-62111065/manifest.json` (delegate.spawn timed out before returning, but the run was created).
- Standalone review (`codex review --uncommitted`) flagged an invalid `last_review` placeholder and missing tracked docs/templates; resolved by excluding `tasks/specs/README.md` from spec-guard freshness checks (informational README) and adding the new PRD/ACTION_PLAN/templates. Approval recorded here and mirrored to the task checklists (no manifest emitted).

## Approvals
- Reviewer: Codex (standalone review)
- Date: 2026-01-19
