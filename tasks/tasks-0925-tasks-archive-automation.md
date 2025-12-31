# Task Checklist - Tasks Archive Automation (0925)

> Set `MCP_RUNNER_TASK_ID=0925-tasks-archive-automation` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0925-tasks-archive-automation.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0925-prd-tasks-archive-automation.md`, `docs/PRD-tasks-archive-automation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-tasks-archive-automation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-tasks-archive-automation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0925-tasks-archive-automation.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0925-tasks-archive-automation.md` - Evidence: `docs/TASKS.md`, `.agent/task/0925-tasks-archive-automation.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T04-49-55-774Z-bf7c0600/manifest.json`.

### Automation workflow
- [x] Workflow added to run the archive script and open a PR - Evidence: `.github/workflows/tasks-archive-automation.yml`.
- [x] Archive payload sync to `task-archives` branch documented - Evidence: `docs/TECH_SPEC-tasks-archive-automation.md`.
- [x] Agent guidance updated for automation and fallback - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.

### Archive safety fix
- [x] Snapshot header match check added to the archive script - Evidence: `scripts/tasks-archive.mjs`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-04-46-898Z-82dd0288/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0925-tasks-archive-automation/cli/2025-12-31T05-05-34-058Z-6b103aff/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json`.

## Relevant Files
- `docs/tasks-archive-policy.json`
- `scripts/tasks-archive.mjs`
- `.github/workflows/tasks-archive-automation.yml`

## Subagent Evidence
- `.runs/0925-tasks-archive-automation-review/cli/2025-12-31T05-03-45-338Z-0dcb0ceb/manifest.json` (review agent docs-review run).
