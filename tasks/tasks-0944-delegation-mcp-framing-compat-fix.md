# Task 0944 - Delegation MCP Framing Compatibility Fix

- MCP Task ID: `0944-delegation-mcp-framing-compat-fix`
- Primary PRD: `docs/PRD-delegation-mcp-framing-compat-fix.md`
- Tech Spec: `docs/TECH_SPEC-delegation-mcp-framing-compat-fix.md`
- Action Plan: `docs/ACTION_PLAN-delegation-mcp-framing-compat-fix.md`
- Run Manifest (docs review): `.runs/0944-delegation-mcp-framing-compat-fix/cli/2026-01-12T13-29-28-806Z-dd184080/manifest.json`
- Metrics/State: `.runs/0944-delegation-mcp-framing-compat-fix/metrics.json`, `out/0944-delegation-mcp-framing-compat-fix/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: `docs/PRD-delegation-mcp-framing-compat-fix.md`, `docs/TECH_SPEC-delegation-mcp-framing-compat-fix.md`, `docs/ACTION_PLAN-delegation-mcp-framing-compat-fix.md`, `tasks/tasks-0944-delegation-mcp-framing-compat-fix.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0944-delegation-mcp-framing-compat-fix-scout/cli/2026-01-12T10-28-30-607Z-edf8a12a/manifest.json`.
- [x] Subagent follow-up validation captured - Evidence: `.runs/0944-delegation-mcp-framing-compat-fix-subagent/cli/2026-01-12T13-27-46-695Z-b81add69/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0944-delegation-mcp-framing-compat-fix/cli/2026-01-12T13-29-28-806Z-dd184080/manifest.json`, `docs/TASKS.md`, `.agent/task/0944-delegation-mcp-framing-compat-fix.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0944-delegation-mcp-framing-compat-fix/metrics.json`, `out/0944-delegation-mcp-framing-compat-fix/state.json`.

### Implementation
- [x] JSONL response framing tests added - Evidence: `orchestrator/tests/DelegationServer.test.ts`.
- [x] Error-path framing coverage added for JSONL + framed responses - Evidence: `orchestrator/tests/DelegationServer.test.ts`.
- [x] Pack-smoke JSONL guard hardened for release artifacts - Evidence: `scripts/pack-smoke.mjs`.
- [x] Delegation server responds with JSONL for JSONL requests - Evidence: `orchestrator/src/cli/delegationServer.ts`.

### Validation & Release
- [x] Implementation-gate manifest captured - Evidence: `.runs/0944-delegation-mcp-framing-compat-fix/cli/2026-01-12T13-40-38-573Z-1662cf67/manifest.json`.
- [x] Pack audit + smoke complete - Evidence: `out/0944-delegation-mcp-framing-compat-fix/pack-audit.log`, `out/0944-delegation-mcp-framing-compat-fix/pack-smoke.log`.
- [x] Tag + publish 0.1.6 complete - Evidence: tag `v0.1.6`, workflow `https://github.com/Kbediako/CO/actions/runs/20918428368`.
- [x] Version bumped to 0.1.7 for patch release prep - Evidence: `package.json`, `package-lock.json`.

## Notes
- Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review` (per `.agent/SOPs/release.md`).
- Subagent usage required: capture at least one subagent manifest under `.runs/0944-delegation-mcp-framing-compat-fix-*/cli/<run-id>/manifest.json`.
