# Action Plan - Docs Review Gate (Task 0910)

## Phase 0 - Planning collateral
- [x] Draft PRD - `docs/PRD-docs-review-gate.md`
- [x] Draft Tech Spec - `docs/TECH_SPEC-docs-review-gate.md`
- [x] Draft task checklist - `tasks/tasks-0910-docs-review-gate.md`
- [x] Update mirrors - `docs/TASKS.md`, `.agent/task/0910-docs-review-gate.md`, `tasks/index.json`

## Phase 1 - Docs-review pipeline
1. Add a docs-review pipeline to `codex.orchestrator.json` (spec-guard, docs:check, docs:freshness, review).
2. Set `SKIP_DIFF_BUDGET=1` for the review stage in that pipeline.
3. Validate the pipeline produces a manifest and uses the existing review prompt.

## Phase 2 - Workflow and checklist updates
1. Update `docs/AGENTS.md` to require docs-review evidence before implementation.
2. Update task checklist templates to include docs-review and implementation review items.
3. Update `.agent/system/conventions.md` and `.ai-dev-tasks/process-task-list.md` if needed for consistency.

## Phase 3 - Evidence capture
1. Run the docs-review pipeline after planning docs are drafted and record the manifest.
2. Update `tasks/index.json` gate metadata with the docs-review manifest path.
3. After implementation, run the implementation gate and record the post-implementation review manifest.
