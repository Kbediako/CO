# Task 1173 — Coordinator Symphony-Aligned Orchestrator Cloud-Target Execution Request Contract Extraction

- MCP Task ID: `1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`

> This lane follows completed `1172`. The next bounded Symphony-aligned move is to extract the inline cloud-target execution request contract in `orchestratorCloudTargetExecutor.ts` without reopening cloud fallback, environment-id resolution, or broader executor lifecycle seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `tasks/specs/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `tasks/tasks-1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `.agent/task/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`
- [x] Deliberation/findings captured for the request-contract seam. Evidence: `docs/findings/1173-orchestrator-cloud-target-execution-request-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction.md`, `docs/findings/1173-orchestrator-cloud-target-execution-request-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1173`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T033431Z-docs-first/05-docs-review-override.md`

## Request Contract Extraction

- [x] One bounded helper inside `orchestratorCloudTargetExecutor.ts` owns the request contract assembled before `CodexCloudTaskExecutor.execute(...)`. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/00-summary.md`
- [x] `executeOrchestratorCloudTarget(...)` retains lifecycle, persistence, and final result ownership while delegating request shaping. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/00-summary.md`
- [x] Focused cloud regressions preserve prompt construction, env/default precedence, feature parsing, and cloud execution request shaping. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/01-delegation-guard.log`, `.runs/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction-guard/cli/2026-03-14T03-49-08-442Z-4d49a50f/manifest.json`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/08-diff-budget.log` (stacked-branch override applied)
- [x] `npm run review`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1173-coordinator-symphony-aligned-orchestrator-cloud-target-execution-request-contract-extraction/manual/20260314T034531Z-closeout/12-elegance-review.md`
