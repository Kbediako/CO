# Task 1172 — Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction

- MCP Task ID: `1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`

> This lane follows completed `1171`. The router-local preflight request seam is already isolated; `1172` targets the remaining shared request-contract duplication between router and doctor.

## Checklist

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `tasks/tasks-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `.agent/task/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`
- [x] Deliberation/findings captured for the shared contract seam. Evidence: `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1172`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T024101Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] Router and doctor share a bounded cloud-preflight request contract. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `orchestrator/src/cli/doctor.ts`
- [ ] Higher-level router and doctor behavior remains caller-owned. Evidence: focused regressions

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
