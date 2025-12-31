# Task Checklist — 0924-tasks-archive-policy (0924)

> Set `MCP_RUNNER_TASK_ID=0924-tasks-archive-policy` for orchestrator commands. Mirror status with `tasks/tasks-0924-tasks-archive-policy.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0924-tasks-archive-policy/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0924-prd-tasks-archive-policy.md`, `docs/PRD-tasks-archive-policy.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-tasks-archive-policy.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-tasks-archive-policy.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0924-tasks-archive-policy.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0924-tasks-archive-policy.md` - Evidence: `docs/TASKS.md`, `.agent/task/0924-tasks-archive-policy.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-13-05-921Z-731779ca/manifest.json`.

## Archive policy + tooling
- [x] Archive policy config added - Evidence: `docs/tasks-archive-policy.json`.
- [x] Archive script implemented - Evidence: `scripts/tasks-archive.mjs`.
- [x] `docs/TASKS.md` archive index added and initial archive run applied - Evidence: `docs/TASKS.md`, `out/0924-tasks-archive-policy/TASKS-archive-2025.md`.
- [x] Archive branch updated with payload - Evidence: `task-archives` branch commit `e2ac1a3`.

## Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-33-03-522Z-3a356439/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0924-tasks-archive-policy/cli/2025-12-31T03-33-41-190Z-792bce37/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0924-tasks-archive-policy-review/cli/2025-12-31T03-24-18-440Z-4aef69f1/manifest.json`.

## Relevant Files
- `docs/PRD-tasks-archive-policy.md`
- `docs/TECH_SPEC-tasks-archive-policy.md`
- `docs/ACTION_PLAN-tasks-archive-policy.md`
- `tasks/specs/0924-tasks-archive-policy.md`

## Subagent Evidence
- `.runs/0924-tasks-archive-policy-review/cli/2025-12-31T03-24-18-440Z-4aef69f1/manifest.json` (review agent docs-review run).
