# Task Checklist - Docs Review Gate (0910)

> Set `MCP_RUNNER_TASK_ID=0910-docs-review-gate` for orchestrator commands. Keep mirrors in sync with `tasks/tasks-0910-docs-review-gate.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (for example `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`).

## Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Mirrors created (`docs/TASKS.md`, `.agent/task/0910-docs-review-gate.md`, `tasks/index.json`) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T13-47-00-490Z-61badd0b/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`.
- [x] `tasks/index.json` gate metadata updated with docs-review manifest - Evidence: `tasks/index.json`, `.runs/0910-docs-review-gate/cli/2025-12-22T13-47-00-490Z-61badd0b/manifest.json`.

## Docs-review pipeline
- [x] Add docs-review pipeline to `codex.orchestrator.json` (spec-guard, docs:check, review). - Evidence: `codex.orchestrator.json`.
- [x] Set `SKIP_DIFF_BUDGET=1` for the docs-review review stage. - Evidence: `codex.orchestrator.json`.
- [x] Confirm docs-review runs capture the manifest evidence for the pre-implementation review. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T13-47-00-490Z-61badd0b/manifest.json`.

## Workflow docs and templates
- [x] Update `docs/AGENTS.md` to require docs-review evidence before implementation. - Evidence: `docs/AGENTS.md`.
- [x] Update task checklist templates to include docs-review and implementation review items. - Evidence: `.agent/task/templates/tasks-template.md`.
- [x] Update `.agent/system/conventions.md` and `.ai-dev-tasks/process-task-list.md` if needed for consistency. - Evidence: `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md`.

## Review handoffs
- [x] Pre-implementation docs review completed and recorded. - Evidence: `.runs/0910-docs-review-gate/cli/2025-12-22T13-47-00-490Z-61badd0b/manifest.json`.
- [ ] Post-implementation review completed and recorded.
