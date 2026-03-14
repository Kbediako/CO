# Task Checklist — Coordinator Symphony-Aligned Orchestrator Execution-Routing Policy Splitting (1169)

> Set `MCP_RUNNER_TASK_ID=1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting` for orchestrator commands. Mirror status with `tasks/tasks-1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (for example `.runs/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting/cli/<run-id>/manifest.json`).

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `tasks/specs/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `tasks/tasks-1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `.agent/task/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `out/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting/manual/20260314T004425Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the router-local policy seam. Evidence: `docs/findings/1169-orchestrator-execution-routing-policy-splitting-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting.md`, `docs/findings/1169-orchestrator-execution-routing-policy-splitting-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1169`. Evidence: `.runs/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting/cli/2026-03-14T00-50-24-464Z-02a21da7/manifest.json`, `out/1169-coordinator-symphony-aligned-orchestrator-execution-routing-policy-splitting/manual/20260314T004425Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] `routeOrchestratorExecution(...)` delegates to smaller router-local policy helpers. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- [ ] Cloud hard-fail, fallback, and local-routing branches preserve current behavior. Evidence: `orchestrator/tests/OrchestratorExecutionRouter.test.ts`
- [ ] `executePipeline()` remains a thin router adapter boundary. Evidence: `orchestrator/src/cli/orchestrator.ts`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
