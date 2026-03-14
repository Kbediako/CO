# Task 1175 — Coordinator Symphony-Aligned Orchestrator Cloud-Target Running-State And Update Shell Extraction

- MCP Task ID: `1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`

> This lane follows completed `1174`. The next bounded Symphony-aligned move is to extract the running-state transition and `onUpdate` persistence shell in `orchestratorCloudTargetExecutor.ts` without reopening missing-env handling, request shaping, or final success/failure result application.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `tasks/specs/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `tasks/tasks-1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `.agent/task/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`
- [x] Deliberation/findings captured for the activation/update shell seam. Evidence: `docs/findings/1175-orchestrator-cloud-target-running-state-and-update-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction.md`, `docs/findings/1175-orchestrator-cloud-target-running-state-and-update-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1175`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T043310Z-docs-first/05-docs-review-override.md`

## Activation And Update Shell Extraction

- [x] One bounded helper inside `orchestratorCloudTargetExecutor.ts` owns the running-state transition and `onUpdate` persistence shell. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/00-summary.md`
- [x] `executeOrchestratorCloudTarget(...)` retains request shaping, missing-env handling, final completion behavior, and return-path control flow. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/00-summary.md`
- [x] Focused cloud regressions preserve activation/update behavior without widening into final result application. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/08-diff-budget.log` (stacked-branch override applied)
- [x] `npm run review`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/09-review.log`, `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1175-coordinator-symphony-aligned-orchestrator-cloud-target-running-state-and-update-shell-extraction/manual/20260314T044007Z-closeout/12-elegance-review.md`
