# Action Plan — Docs Hygiene Automation & Review Handoff Gate (Task 0906)

## Phase 0 — Planning collateral
- [x] Draft PRD — `docs/PRD-docs-hygiene-automation.md`
- [x] Draft Tech Spec — `docs/TECH_SPEC-docs-hygiene-automation.md`
- [x] Draft task checklist — `tasks/tasks-0906-docs-hygiene-automation.md`
- [x] Draft mini-spec — `tasks/specs/0906-docs-hygiene-automation.md`
- [x] Update mirrors — `docs/TASKS.md`, `.agent/task/0906-docs-hygiene-automation.md`, `tasks/index.json`

## Phase 1 — Docs hygiene tool (check)
1. Add a deterministic docs hygiene script with `--check` mode.
2. Add `npm run docs:check` and wire into `.github/workflows/core-lane.yml`.
3. Ensure `docs:check`:
   - validates `npm run <script>` references against `package.json`
   - validates pipeline ids against `codex.orchestrator.json`
   - validates backticked repo-relative file paths (excluding placeholders)

## Phase 2 — Docs hygiene tool (sync)
1. Add `--sync` mode that operates on the active task only (`--task` or `MCP_RUNNER_TASK_ID`).
2. Implement safe mirror updates:
   - `.agent/task/<task-id>.md`
   - the active task’s snapshot entry in `docs/TASKS.md`
3. Make output idempotent and bounded (no rewriting freeform docs).

## Phase 3 — Workflow standardization (review handoff gate)
1. Update agent-facing workflow docs so “implementation complete” includes:
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run build`
   - `npm run lint`
   - `npm run test`
   - `npm run docs:check`
   - `npm run review`
2. Ensure the above guidance is visible from:
   - `AGENTS.md` (global)
   - `.agent/system/conventions.md` (agent “read first”)
   - `.ai-dev-tasks/process-task-list.md` (workflow loop)

## Phase 4 — Evidence + handoff
1. Run diagnostics under `MCP_RUNNER_TASK_ID=0906-docs-hygiene-automation` and capture the manifest:
   - `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`
2. Run `npm run review` and attach the same manifest path in the prompt.
3. Flip checklist items to `[x]` with evidence links across:
   - `tasks/tasks-0906-docs-hygiene-automation.md`
   - `.agent/task/0906-docs-hygiene-automation.md`
   - `docs/TASKS.md`
   - `tasks/index.json` (`gate.log`, `gate.run_id`)

