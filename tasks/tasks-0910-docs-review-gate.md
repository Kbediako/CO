# Task 0910 - Docs Review Gate (Pre/Post Implementation)

- MCP Task ID: `0910-docs-review-gate`
- Primary PRD: `docs/PRD-docs-review-gate.md`
- Tech Spec: `docs/TECH_SPEC-docs-review-gate.md`
- Action Plan: `docs/ACTION_PLAN-docs-review-gate.md`
- Run Manifest (docs review, pre-implementation): `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`
- Run Manifest (implementation review): `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`
- Metrics/State: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`

## Checklist
### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: this commit.
- [x] Mirrors created (`docs/TASKS.md`, `.agent/task/0910-docs-review-gate.md`, `tasks/index.json`) - Evidence: this commit.
- [ ] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`.
- [ ] Metrics/state snapshots updated - Evidence: `.runs/0910-docs-review-gate/metrics.json`, `out/0910-docs-review-gate/state.json`.
- [ ] `tasks/index.json` gate metadata updated with docs-review manifest - Evidence: `tasks/index.json` + `.runs/0910-docs-review-gate/cli/<run-id>/manifest.json`.

### Docs-review pipeline
- [ ] Add docs-review pipeline to `codex.orchestrator.json` (spec-guard, docs:check, review).
- [ ] Set `SKIP_DIFF_BUDGET=1` for the docs-review review stage.
- [ ] Confirm docs-review runs capture the manifest evidence for the pre-implementation review.

### Workflow docs and templates
- [ ] Update `docs/AGENTS.md` to require docs-review evidence before implementation.
- [ ] Update task checklist templates to include docs-review and implementation review items.
- [ ] Update `.agent/system/conventions.md` and `.ai-dev-tasks/process-task-list.md` if needed for consistency.

### Review handoffs
- [ ] Pre-implementation docs review completed and recorded.
- [ ] Post-implementation review completed and recorded.
