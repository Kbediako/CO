# Technical Spec — Docs Hygiene Automation & Review Handoff Gate (Task 0906)

## Objective
Deliver deterministic tooling that (1) checks agentic documentation for drift and broken references and (2) safely syncs task mirrors for the active task, while standardizing the required “review handoff” step (`npm run review`) after implementation validations.

## Scope
### In scope
- A docs hygiene tool with two modes:
  - `docs:check`: validate documentation invariants and fail fast on drift.
  - `docs:sync`: update task mirrors for the active task in a deterministic way.
- CI integration: run `docs:check` in `.github/workflows/core-lane.yml`.
- Documentation updates that make review handoff a completion gate for implementation work.

### Out of scope
- Auto-updating freeform docs content (beyond narrow, clearly managed mirror outputs).
- Any changes that require Codex authentication in CI (e.g., running `npm run review` in CI).
- TF-GRPO automation (explicitly shelved).

## Design

### New commands
- Add npm scripts:
  - `npm run docs:check`
  - `npm run docs:sync -- --task <task-id>` (or reads `MCP_RUNNER_TASK_ID`)

### `docs:check` behavior (deterministic lint)
Scan a bounded set of “agentic docs” sources (at minimum):
- `README.md`
- `.agent/**/*.md`
- `.ai-dev-tasks/**/*.md`
- `docs/**/*.md`
- `tasks/**/*.md`

Skip:
- `.runs/**`, `out/**`, `archives/**`, `node_modules/**`, `dist/**`

Validation rules (initial set):
1) `npm run <script>` references must exist in `package.json#scripts`.
2) `codex-orchestrator start <pipeline-id>` references must exist in `codex.orchestrator.json#pipelines[].id`.
3) Repo-relative file references in backticks (e.g., `` `docs/TASKS.md` ``) must exist when they:
   - contain a path separator (`/`) and
   - do not contain placeholder markers like `<task-id>` or `<run-id>`.

Output contract:
- Print a concise error list (file + failing rule + reference).
- Exit non-zero if any errors are found (CI gate).

### `docs:sync` behavior (safe mirror generation)
Principle: treat `/tasks` as the source of truth and only rewrite known mirror outputs.

Inputs:
- Active task id (from `--task` or `MCP_RUNNER_TASK_ID`)
- Canonical task checklist: `tasks/tasks-<id>-<slug>.md`

Outputs (active task only):
1) `.agent/task/<id>-<slug>.md`
2) A corresponding snapshot section inside `docs/TASKS.md`

Safety constraints:
- Only update content inside explicit managed blocks for the active task (e.g., `<!-- docs-sync:begin <task> --> ... <!-- docs-sync:end <task> -->`), or only append a new task section if missing.
- Never rewrite `README.md`, `.agent/system/*`, or `.ai-dev-tasks/*` via `docs:sync`.

Idempotency:
- `docs:sync` should produce stable output; running twice should yield no further diffs.

## Review handoff standardization
Update agent-facing workflow docs so “implementation complete” includes:
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run review` (Codex-first reviewer handoff)

Do not attempt to run `npm run review` automatically inside CI.

## Testing strategy
- Unit: tests for the docs hygiene tool’s parsing + rules.
- Integration: run `npm run docs:check`; after updating the canonical checklist with evidence, run `npm run docs:sync -- --task <task-id>` twice and confirm the second run is a no-op.
- CI: ensure `docs:check` runs in the core lane workflow without requiring secrets.

## Evidence
- Task checklist: `tasks/tasks-0906-docs-hygiene-automation.md`
- Run manifest: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T20-57-07-377Z-65e21144/manifest.json`
