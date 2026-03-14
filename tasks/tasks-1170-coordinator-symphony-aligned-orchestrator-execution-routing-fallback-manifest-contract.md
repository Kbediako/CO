# Task 1170 — Coordinator Symphony-Aligned Orchestrator Execution-Routing Fallback Manifest Contract

- MCP Task ID: `1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`
- TECH_SPEC: `tasks/specs/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`

> This lane follows completed `1169`. The broad router-local policy split is already done; `1170` narrows to the remaining fallback manifest/error-note contract inside the cloud branch.

## Checklist

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `tasks/specs/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `tasks/tasks-1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `.agent/task/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `out/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract/manual/20260314T012200Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the fallback contract seam. Evidence: `docs/findings/1170-orchestrator-execution-routing-fallback-manifest-contract-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract.md`, `docs/findings/1170-orchestrator-execution-routing-fallback-manifest-contract-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1170`. Evidence: `.runs/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract/cli/2026-03-14T01-30-10-935Z-ea374f79/manifest.json`, `out/1170-coordinator-symphony-aligned-orchestrator-execution-routing-fallback-manifest-contract/manual/20260314T012200Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Fallback manifest/error-note shaping is isolated into a smaller truthful router-local seam. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- [ ] Hard-fail versus recursive fallback outcomes remain behaviorally unchanged. Evidence: `orchestrator/tests/OrchestratorExecutionRouter.test.ts`

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
