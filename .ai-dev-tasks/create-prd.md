# Create PRD (docs-first packet)

This repo keeps non-trivial work under a docs-first packet:
- `docs/PRD-<task-id>.md`
- `docs/TECH_SPEC-<task-id>.md`
- `tasks/specs/<task-id>.md` (canonical TECH_SPEC)
- `docs/ACTION_PLAN-<task-id>.md`
- `tasks/tasks-<task-id>.md` plus `.agent/task/<task-id>.md`
- registry/mirror updates in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`

## 1) Pick the task id
- Use a stable `<task-id>`.
- Regular repo lanes can use a numeric slice such as `0905-agentic-coding-readiness`.
- Provider-worker lanes should use the worker-scoped id form, for example `linear-<issue-id>`.

Export it as `MCP_RUNNER_TASK_ID=<task-id>` so evidence lands under:
- `.runs/<task-id>/cli/<run-id>/manifest.json`
- `out/<task-id>/state.json`

## 2) Create the docs from the current templates
```bash
cp .agent/task/templates/prd-template.md docs/PRD-<task-id>.md
cp .agent/task/templates/tech-spec-template.md tasks/specs/<task-id>.md
cp .agent/task/templates/action-plan-template.md docs/ACTION_PLAN-<task-id>.md
```

Create `docs/TECH_SPEC-<task-id>.md` as the docs-side mirror of the canonical task spec.
There is no dedicated docs-side TECH_SPEC template today, so adapt a recent `docs/TECH_SPEC-*.md` file and keep its `Canonical Reference`, traceability, and approvals aligned with `tasks/specs/<task-id>.md`.

Fill in the PRD with:
- problem statement and desired outcome
- user-request translation, protected terms, nearby wrong interpretations, and non-goals
- links to the TECH_SPEC, ACTION_PLAN, and checklist paths
- where manifest-backed evidence will be recorded

## 3) Keep the packet aligned with the current workflow
- Link both the canonical task spec and docs-side TECH_SPEC mirror from `tasks/index.json` (`paths.spec` and `paths.docs`).
- Update `docs/TASKS.md` and `docs/docs-freshness-registry.json` when you register or rename the packet.
- Use the bundled `skills/docs-first/SKILL.md` when the lane needs the full repo workflow, not a one-off doc.

## 4) Run docs-review before implementation
Use the packet task id for the pre-implementation docs gate:
```bash
npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>
```

Provider-worker lanes should use the `linear child-stream --pipeline docs-review` helper so the child manifest stays scoped under the issue workspace.
