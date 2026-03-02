# Task Checklist - 0989-codex-0107-alpha9-canary-fallback-readiness

- MCP Task ID: `0989-codex-0107-alpha9-canary-fallback-readiness`
- Primary PRD: `docs/PRD-codex-0107-alpha9-canary-fallback-readiness.md`
- TECH_SPEC: `tasks/specs/0989-codex-0107-alpha9-canary-fallback-readiness.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-0107-alpha9-canary-fallback-readiness.md`

> Set `MCP_RUNNER_TASK_ID=0989-codex-0107-alpha9-canary-fallback-readiness` for orchestrator commands. Required quality lane for this docs/canary task: `node scripts/delegation-guard.mjs --task 0989-codex-0107-alpha9-canary-fallback-readiness`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-codex-0107-alpha9-canary-fallback-readiness.md`, `docs/TECH_SPEC-codex-0107-alpha9-canary-fallback-readiness.md`, `docs/ACTION_PLAN-codex-0107-alpha9-canary-fallback-readiness.md`, `tasks/specs/0989-codex-0107-alpha9-canary-fallback-readiness.md`, `tasks/tasks-0989-codex-0107-alpha9-canary-fallback-readiness.md`, `.agent/task/0989-codex-0107-alpha9-canary-fallback-readiness.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated planning/research streams captured. - Evidence: `.runs/0989-codex-0107-alpha9-canary-fallback-readiness-scout/cli/2026-03-02T04-26-34-844Z-c77c1c2d/manifest.json`, `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/delegated-scout.log`.
- [x] Docs-review manifest captured before non-doc command work. - Evidence: `.runs/0989-codex-0107-alpha9-canary-fallback-readiness/cli/2026-03-02T04-30-54-182Z-76ea4048/manifest.json`, `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/docs-review-pre-implementation-rerun2.log`.

## Canary Execution
- [x] Stable baseline (`0.106.0`) matrix executed with required artifacts. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/stable/00-install.log` through `99-summary.json`.
- [x] Prerelease (`0.107.0-alpha.9`) matrix executed with required artifacts. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/prerelease/00-install.log` through `99-summary.json`.
- [x] Comparison summary + go/no-go decision written. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/compare/pass-rate-summary.json`, `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/compare/decision-go-no-go.md`.
- [x] Fallback removal readiness decision recorded (`go` or `hold`) with criteria evidence. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/compare/decision-go-no-go.md` (decision: hold).

## Validation
- [x] 01 `node scripts/delegation-guard.mjs --task 0989-codex-0107-alpha9-canary-fallback-readiness`. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/final-02-spec-guard.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/final-08-diff-budget.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0989-codex-0107-alpha9-canary-fallback-readiness.md`, `.agent/task/0989-codex-0107-alpha9-canary-fallback-readiness.md`, `docs/TASKS.md`.
- [x] Final evidence summary posted with alpha.9 + fallback decision. - Evidence: `out/0989-codex-0107-alpha9-canary-fallback-readiness/manual/codex-version-canary/compare/decision-go-no-go.md`.
- [ ] PR merged and branch cleanup completed.
