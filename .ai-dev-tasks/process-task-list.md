# Process Task List (execute → validate → record evidence)

This repo’s execution loop is “evidence-first”: implement work, run a non-interactive validation pipeline, then flip checkboxes with a manifest link.

## Before you start
- Read `AGENTS.md`, `docs/AGENTS.md`, and `.agent/AGENTS.md` (instruction resolution is documented in `docs/guides/instructions.md`).
- Confirm you can run the core lane locally:
  - `npm ci`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `node scripts/spec-guard.mjs --dry-run`

## 1) Set the active task id
Use a stable task id (`<id>-<slug>`) and export it so runs are scoped correctly:
```bash
export MCP_RUNNER_TASK_ID=<task-id>
```

## 2) Implement one checklist item at a time
Work from the canonical checklist:
- `tasks/tasks-<id>-<slug>.md`

If the work triggers the spec policy, stop and write/update a mini-spec:
- `.agent/SOPs/specs-and-research.md`

## 3) Capture guardrail evidence via the orchestrator
Run diagnostics (non-interactive) and record the resulting run id + manifest path:
```bash
npx codex-orchestrator start diagnostics --format json --no-interactive --task <task-id>
```

The evidence contract is the manifest at:
- `.runs/<task-id>/cli/<run-id>/manifest.json`

## 4) Mirror outcomes everywhere
Once the checklist item is complete and you have a manifest proving it, flip `[ ] → [x]` in:
- `tasks/tasks-<id>-<slug>.md`
- `.agent/task/<id>-<slug>.md`
- `docs/TASKS.md` (matching task section)

Also update `tasks/index.json` with:
- `gate.log`: `.runs/<task-id>/cli/<run-id>/manifest.json`
- `gate.run_id`: `<run-id>`

## 5) Reviewer hand-off (Codex-first)
After guardrails pass, use the Codex review primitive:
- `npm run review` (wraps `codex review --uncommitted` and includes the latest manifest path as evidence)

## Governance notes (when applicable)
- If your project workflow uses approval gates, record approvals and any escalations in the run manifest `approvals` array and mirror the relevant links/anchors into your task checklist and `tasks/index.json`.
