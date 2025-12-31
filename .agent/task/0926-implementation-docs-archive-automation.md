# Task Checklist — 0926-implementation-docs-archive-automation (0926)

> Set `MCP_RUNNER_TASK_ID=0926-implementation-docs-archive-automation` for orchestrator commands. Mirror status with `tasks/tasks-0926-implementation-docs-archive-automation.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0926-implementation-docs-archive-automation/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0926-prd-implementation-docs-archive-automation.md`, `docs/PRD-implementation-docs-archive-automation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-implementation-docs-archive-automation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-implementation-docs-archive-automation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0926-implementation-docs-archive-automation.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T05-58-03-469Z-748bdbc3/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0926-implementation-docs-archive-automation.md` - Evidence: `docs/TASKS.md`, `.agent/task/0926-implementation-docs-archive-automation.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T05-58-03-469Z-748bdbc3/manifest.json`.

## Archive automation
- [x] Implementation-docs archive policy added - Evidence: `docs/implementation-docs-archive-policy.json`.
- [x] Archive script implemented - Evidence: `scripts/implementation-docs-archive.mjs`.
- [x] Workflow added for implementation-docs archiving - Evidence: `.github/workflows/implementation-docs-archive-automation.yml`.
- [x] Agent guidance updated for archive automation and fallback - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- [x] Tasks archive policy line threshold updated - Evidence: `docs/tasks-archive-policy.json`, `docs/TECH_SPEC-tasks-archive-policy.md`.
- [x] Archive payloads synced to archive branches - Evidence: `doc-archives` branch and `task-archives` branch commit `4ee20c0`.

## Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T06-21-23-157Z-aac3d325/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0926-implementation-docs-archive-automation/cli/2025-12-31T06-22-12-129Z-8d132792/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0926-implementation-docs-archive-automation-review/cli/2025-12-31T06-20-44-602Z-0e74240c/manifest.json`.

## Relevant Files
- `docs/implementation-docs-archive-policy.json`
- `scripts/implementation-docs-archive.mjs`
- `.github/workflows/implementation-docs-archive-automation.yml`

## Subagent Evidence
- `.runs/0926-implementation-docs-archive-automation-review/cli/2025-12-31T06-20-44-602Z-0e74240c/manifest.json` (review agent docs-review run).
