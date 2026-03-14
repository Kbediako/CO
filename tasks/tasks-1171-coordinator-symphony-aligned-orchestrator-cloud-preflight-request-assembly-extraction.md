# Task 1171 — Coordinator Symphony-Aligned Orchestrator Cloud-Preflight Request Assembly Extraction

- MCP Task ID: `1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`

> This lane follows completed `1170`. The cloud-preflight failure contract is already isolated; `1171` narrows to the remaining inline preflight request assembly cluster inside `executeCloudRoute(...)`.

## Checklist

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `tasks/tasks-1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `.agent/task/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`
- [x] Deliberation/findings captured for the preflight-request seam. Evidence: `docs/findings/1171-orchestrator-cloud-preflight-request-assembly-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/findings/1171-orchestrator-cloud-preflight-request-assembly-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1171`. Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T021411Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Cloud-preflight request assembly is isolated into a smaller truthful router-local seam. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`
- [ ] `executeCloudRoute(...)` preserves preflight invocation plus hard-fail/fallback ownership. Evidence: `orchestrator/tests/OrchestratorExecutionRouter.test.ts`

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
