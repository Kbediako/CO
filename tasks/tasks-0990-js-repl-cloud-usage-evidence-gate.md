# Task Checklist - 0990-js-repl-cloud-usage-evidence-gate

- MCP Task ID: `0990-js-repl-cloud-usage-evidence-gate`
- Primary PRD: `docs/PRD-js-repl-cloud-usage-evidence-gate.md`
- TECH_SPEC: `tasks/specs/0990-js-repl-cloud-usage-evidence-gate.md`
- ACTION_PLAN: `docs/ACTION_PLAN-js-repl-cloud-usage-evidence-gate.md`

> Set `MCP_RUNNER_TASK_ID=0990-js-repl-cloud-usage-evidence-gate` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs --task 0990-js-repl-cloud-usage-evidence-gate`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-js-repl-cloud-usage-evidence-gate.md`, `docs/TECH_SPEC-js-repl-cloud-usage-evidence-gate.md`, `docs/ACTION_PLAN-js-repl-cloud-usage-evidence-gate.md`, `tasks/specs/0990-js-repl-cloud-usage-evidence-gate.md`, `tasks/tasks-0990-js-repl-cloud-usage-evidence-gate.md`, `.agent/task/0990-js-repl-cloud-usage-evidence-gate.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated planning/research streams captured with durable evidence. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/delegated-matrix-plan.md`, `out/0990-js-repl-cloud-usage-evidence-gate/manual/delegated-docs-audit.md`.
- [x] Final review manifest captured post-edit. - Evidence: `.runs/0990-js-repl-cloud-usage-evidence-gate/cli/2026-03-02T09-11-00-955Z-5875de54/manifest.json`.

## Implementation
- [x] Minimal local+cloud matrix automation implemented (no unrelated refactors). - Evidence: `scripts/js-repl-usage-matrix.mjs`, `package.json`, `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix-run.log`.
- [x] Global guidance docs updated based on evidence (`AGENTS`/`README`/guides/skills). - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `README.md`, `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, `docs/guides/upstream-codex-cli-sync.md`, `docs/guides/rlm-recursion-v2.md`.

## Simulation Evidence
- [x] Local runtime-mode dummy-repo matrix executed at decision-grade sample size. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/local/runtime-canary-summary.json`, `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/local/runtime-mode-canary.log`.
- [x] Cloud required contracts executed for `js_repl` enabled and disabled lanes. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/cloud/0990-js-repl-cloud-usage-evidence-gate-cloud-required-enabled-r1.log`, `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/cloud/0990-js-repl-cloud-usage-evidence-gate-cloud-required-disabled-r1.log`, `.runs/0990-js-repl-cloud-usage-evidence-gate-cloud-required-enabled-r1/cli/2026-03-02T07-27-06-132Z-9e04e7ba/manifest.json`, `.runs/0990-js-repl-cloud-usage-evidence-gate-cloud-required-disabled-r1/cli/2026-03-02T07-55-36-423Z-83db8d03/manifest.json`.
- [x] Cloud fallback contract executed and validated. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/cloud/0990-js-repl-cloud-usage-evidence-gate-cloud-fallback-r1.log`, `.runs/0990-js-repl-cloud-usage-evidence-gate-cloud-fallback-r1/cli/2026-03-02T08-15-31-930Z-08c60974/manifest.json`.
- [x] Consolidated matrix summary + recommendation decision captured. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/matrix/matrix-summary.json`, `out/0990-js-repl-cloud-usage-evidence-gate/manual/js-repl-usage-recommendation.md`.

## Validation
- [x] 01 `node scripts/delegation-guard.mjs --task 0990-js-repl-cloud-usage-evidence-gate`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-08-diff-budget.log` (fail), `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-08-diff-budget-rerun.log` (pass with `DIFF_BUDGET_OVERRIDE_REASON`), `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-08-diff-budget.log` (final pass).
- [x] 09 `npm run review`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-09-review.log` (fail), `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-09-review-rerun.log` (pass with `DIFF_BUDGET_OVERRIDE_REASON`), `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-09-review.log` (final pass).
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/final-endstate-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0990-js-repl-cloud-usage-evidence-gate.md`, `.agent/task/0990-js-repl-cloud-usage-evidence-gate.md`, `docs/TASKS.md`.
- [x] Final recommendation decision posted (adopt/defer/hold + rationale). - Evidence: `out/0990-js-repl-cloud-usage-evidence-gate/manual/js-repl-usage-recommendation.md`.
- [x] Follow-up policy alignment applied: `js_repl` default-on globally with explicit cloud edge-case guardrails + break-glass disable guidance. - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`, `docs/guides/cloud-mode-preflight.md`, `docs/guides/rlm-recursion-v2.md`, `docs/guides/upstream-codex-cli-sync.md`, `docs/TASKS.md`.
