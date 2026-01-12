# Task Checklist - 0942-delegation-release-plan (0942)

> Set `MCP_RUNNER_TASK_ID=0942-delegation-release-plan` for orchestrator commands. Mirror status with `tasks/tasks-0942-delegation-release-plan.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist) - Evidence: `docs/PRD-delegation-release-plan.md`, `docs/TECH_SPEC-delegation-release-plan.md`, `docs/ACTION_PLAN-delegation-release-plan.md`, `tasks/tasks-0942-delegation-release-plan.md`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0942-delegation-release-plan-scout/cli/2026-01-12T07-20-18-514Z-3039faee/manifest.json`.
- [x] Docs-review manifest captured; mirrors updated; PRD approval recorded; docs freshness registry + metrics/state snapshots updated - Evidence: `.runs/0942-delegation-release-plan/cli/2026-01-12T07-13-22-468Z-3877ad2f/manifest.json`, `docs/TASKS.md`, `.agent/task/0942-delegation-release-plan.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.runs/0942-delegation-release-plan/metrics.json`, `out/0942-delegation-release-plan/state.json`.

### Discovery (Release Deltas)
- [x] package.json vs npm 0.1.4 diff captured - Evidence: `docs/PRD-delegation-release-plan.md`.
- [x] Delegation feature presence check (tarball vs main) captured - Evidence: `docs/PRD-delegation-release-plan.md`.
- [x] Pack audit allowlist review for delegation assets captured - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`.

### Release Plan
- [x] Version + tag strategy defined - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`.
- [x] Changelog/release notes draft prepared - Evidence: `docs/ACTION_PLAN-delegation-release-plan.md`.
- [x] Risk + rollback plan captured - Evidence: `docs/TECH_SPEC-delegation-release-plan.md`, `docs/ACTION_PLAN-delegation-release-plan.md`.
- [x] Comms plan captured - Evidence: `docs/ACTION_PLAN-delegation-release-plan.md`.

### Release Execution
- [x] Version bump to 0.1.4 - Evidence: tag `v0.1.4`, workflow `https://github.com/Kbediako/CO/actions/runs/20908106047`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0942-delegation-release-plan/cli/2026-01-12T03-22-30-037Z-67a768f4/manifest.json`.
- [x] Full matrix release checks (`npm run build:all`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test`) - Evidence: `out/0942-delegation-release-plan/build-all.log`, `out/0942-delegation-release-plan/test-adapters.log`, `out/0942-delegation-release-plan/test-evaluation.log`, `out/0942-delegation-release-plan/eval-test.log`.
- [x] Pack audit + smoke complete - Evidence: `out/0942-delegation-release-plan/pack-audit.log`, `out/0942-delegation-release-plan/pack-smoke.log`.
- [x] Tag + publish complete - Evidence: tag `v0.1.4`, workflow `https://github.com/Kbediako/CO/actions/runs/20908106047`.

### Patch Release 0.1.5 (Framing Fix)
- [x] JSONL framing support implemented + tested - Evidence: `orchestrator/src/cli/delegationServer.ts`, `orchestrator/tests/DelegationServer.test.ts`.
- [x] Version bump to 0.1.5 - Evidence: `package.json`, `package-lock.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0942-delegation-release-plan/cli/2026-01-12T07-56-58-069Z-225abb4e/manifest.json`.
- [x] Pack audit + smoke complete - Evidence: `out/0942-delegation-release-plan/pack-audit.log`, `out/0942-delegation-release-plan/pack-smoke.log`.
- [ ] Tag + publish complete - Evidence: (pending).

## Relevant Files
- `docs/PRD-delegation-release-plan.md`
- `docs/TECH_SPEC-delegation-release-plan.md`
- `docs/ACTION_PLAN-delegation-release-plan.md`
- `tasks/tasks-0942-delegation-release-plan.md`
