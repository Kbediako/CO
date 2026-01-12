# Task 0942 - Delegation NPM Release Plan

- MCP Task ID: `0942-delegation-release-plan`
- Primary PRD: `docs/PRD-delegation-release-plan.md`
- Tech Spec: `docs/TECH_SPEC-delegation-release-plan.md`
- Action Plan: `docs/ACTION_PLAN-delegation-release-plan.md`
- Run Manifest (docs review): `.runs/0942-delegation-release-plan/cli/2026-01-12T04-26-14-937Z-556faaa6/manifest.json`
- Metrics/State: `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: `docs/PRD-delegation-release-plan.md`, `docs/TECH_SPEC-delegation-release-plan.md`, `docs/ACTION_PLAN-delegation-release-plan.md`, `tasks/tasks-0942-delegation-release-plan.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0942-delegation-release-plan-scout/cli/2026-01-12T02-52-07-076Z-f7bbf932/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0942-delegation-release-plan/cli/2026-01-12T04-26-14-937Z-556faaa6/manifest.json`, `docs/TASKS.md`, `.agent/task/0942-delegation-release-plan.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`.

### Discovery (Release Deltas)
- [x] package.json vs npm 0.1.3 diff captured - Evidence: `docs/PRD-delegation-release-plan.md`.
- [x] Delegation feature presence check (tarball vs main) captured - Evidence: `docs/PRD-delegation-release-plan.md`.
- [x] Pack audit allowlist review for delegation assets captured - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`.

### Release Plan
- [x] Version + tag strategy defined - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`.
- [x] Changelog/release notes draft prepared - Evidence: `docs/ACTION_PLAN-delegation-release-plan.md`.
- [x] Risk + rollback plan captured - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`, `docs/ACTION_PLAN-delegation-release-plan.md`.
- [x] Comms plan captured - Evidence: `docs/ACTION_PLAN-delegation-release-plan.md`.

### Release Execution
- [x] Version bump to 0.1.4 - Evidence: `package.json`, `package-lock.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0942-delegation-release-plan/cli/2026-01-12T03-22-30-037Z-67a768f4/manifest.json`.
- [x] Full matrix release checks (`npm run build:all`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test`) - Evidence: `out/0942-delegation-release-plan/build-all.log`, `out/0942-delegation-release-plan/test-adapters.log`, `out/0942-delegation-release-plan/test-evaluation.log`, `out/0942-delegation-release-plan/eval-test.log`.
- [x] Pack audit + smoke complete - Evidence: `out/0942-delegation-release-plan/pack-audit.log`, `out/0942-delegation-release-plan/pack-smoke.log`.
- [ ] Tag + publish complete - Evidence: pending.

## Notes
- Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review` (per `.agent/SOPs/release.md`).
- Subagent usage required: capture at least one subagent manifest under `.runs/0942-delegation-release-plan-*/cli/<run-id>/manifest.json`.
