# Process Task List (execute -> validate -> record evidence)

This repo’s loop is evidence-first: implement bounded work, run the required non-interactive validation floor, then flip checklist items with manifest-backed proof.

## Before you start
- Read `AGENTS.md`, `docs/AGENTS.md`, and `.agent/AGENTS.md` (instruction precedence is documented in `docs/guides/instructions.md`).
- Confirm the current validation floor for your lane:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke` when touching downstream-facing CLI/package/skills/review-wrapper surfaces

## 1) Set the active task id
```bash
export MCP_RUNNER_TASK_ID=<task-id>
```

## 2) Capture docs-review before implementation
Generic repo lane:
```bash
npx codex-orchestrator start docs-review --format json --no-interactive --task <task-id>
```

Provider-worker lane:
- use the `linear child-stream --pipeline docs-review` helper so the child manifest stays under the issue workspace

## 3) Implement from the canonical checklist
Work from:
- `tasks/tasks-<task-id>.md`

If the work crosses the repo spec threshold, refresh `tasks/specs/<task-id>.md` before continuing.

## 4) Keep mirrors and evidence aligned
After each completed item, update:
- `tasks/tasks-<task-id>.md`
- `.agent/task/<task-id>.md`
- `docs/TECH_SPEC-<task-id>.md` when the canonical task spec changes
- `docs/TASKS.md`
- `tasks/index.json`

Provider-worker lanes should also keep the single Linear `## Codex Workpad` current after meaningful milestones and before review handoff.

## 5) Reviewer hand-off (Codex-first)
Before handoff, run the required floor in order:
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `NOTES=\"Goal: ... | Summary: ... | Risks: ...\" npm run review`
- `npm run pack:smoke` when touching downstream-facing CLI/package/skills/review-wrapper surfaces

If the diff is non-trivial, record an explicit elegance/minimality pass before handoff.
