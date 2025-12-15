# Create PRD (Codex Orchestrator workflow)

This repo treats each initiative as a **task id** (`<id>-<slug>`) with:
- scope documents under `docs/` (PRD/tech spec/action plan),
- execution checklists under `tasks/` (+ mirrors),
- and run evidence under `.runs/<task-id>/`.

## 1) Pick identifiers
- **Numeric id:** 4 digits (e.g., `0905`)
- **Slug:** kebab-case descriptor (e.g., `agentic-coding-readiness`)
- **Task id (used by the orchestrator):** `<id>-<slug>` (e.g., `0905-agentic-coding-readiness`)

You will export the task id as `MCP_RUNNER_TASK_ID` so artifacts land under:
- `.runs/<task-id>/cli/<run-id>/manifest.json`
- `out/<task-id>/state.json`

## 2) Create the PRD doc in `docs/`
Create `docs/PRD-<slug>.md` using the repo template:
```bash
cp .agent/task/PRD_TEMPLATE.md docs/PRD-<slug>.md
```

Fill in (at minimum):
- problem statement + desired outcome
- goals/non-goals
- guardrails (what must stay green: build/lint/test/spec-guard)
- links to the checklist mirror you will create in `tasks/` and `.agent/task/`
- approvals and where evidence will be recorded (manifest path under `.runs/<task-id>/cli/<run-id>/manifest.json`)

## 3) Create companion scope docs (recommended)
Create the spec + action plan alongside the PRD:
```bash
cp .agent/task/TECH_SPEC_TEMPLATE.md docs/TECH_SPEC-<slug>.md
cp .agent/task/ACTION_PLAN_TEMPLATE.md docs/ACTION_PLAN-<slug>.md
```

## 4) Register the task in `tasks/index.json`
Add an entry under `items[]` so automation and reviewers can find it:
- `id`: `"0905"` (string)
- `slug`: `"agentic-coding-readiness"`
- `title`: human title
- `path`: `tasks/tasks-<id>-<slug>.md` (created in the next phase)
- `status`/`gate`: set to `in-progress` until evidence is captured
