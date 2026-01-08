# Task 0940 - Codex Delegation Autonomy Platform

- MCP Task ID: `0940-delegation-autonomy-platform`
- Primary PRD: `docs/PRD-delegation-autonomy-platform.md`
- Tech Spec: `docs/TECH_SPEC-delegation-autonomy-platform.md`
- Action Plan: `docs/ACTION_PLAN-delegation-autonomy-platform.md`
- Mini-spec: `tasks/specs/0940-delegation-autonomy-platform.md`
- Run Manifest (docs review): `.runs/0940-delegation-autonomy-platform/cli/2026-01-08T09-15-22-109Z-e577581a/manifest.json`
- Metrics/State: `.runs/0940-delegation-autonomy-platform/metrics.json`, `out/0940-delegation-autonomy-platform/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-delegation-autonomy-platform.md`, `docs/TECH_SPEC-delegation-autonomy-platform.md`, `docs/ACTION_PLAN-delegation-autonomy-platform.md`, `tasks/tasks-0940-delegation-autonomy-platform.md`, `tasks/specs/0940-delegation-autonomy-platform.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0940-delegation-autonomy-platform-docs-scout/cli/2026-01-08T08-50-17-654Z-e6012ee4/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0940-delegation-autonomy-platform/cli/2026-01-08T09-15-22-109Z-e577581a/manifest.json`, `docs/TASKS.md`, `.agent/task/0940-delegation-autonomy-platform.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0940-delegation-autonomy-platform/metrics.json`, `out/0940-delegation-autonomy-platform/state.json`.

### Discovery (Diagnostics + RLM)
- [ ] Diagnostics + RLM runs captured with baseline summary - Evidence: `.runs/0940-delegation-autonomy-platform/cli/<run-id>/manifest.json`.

### Implementation
- [ ] Delegation MCP server, RLM policy, UI/TUI, and GitHub integration implemented with tests - Evidence: `.runs/0940-delegation-autonomy-platform/cli/<run-id>/manifest.json`.

### Validation + Handoff
- [ ] Implementation-gate manifest captured - Evidence: `.runs/0940-delegation-autonomy-platform/cli/<run-id>/manifest.json`.

## Notes
- Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.
- Subagent usage required: capture at least one subagent manifest under `.runs/0940-delegation-autonomy-platform-*/cli/<run-id>/manifest.json`.
