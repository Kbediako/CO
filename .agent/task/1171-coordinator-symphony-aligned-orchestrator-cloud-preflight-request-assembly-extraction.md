# Task Checklist — Coordinator Symphony-Aligned Orchestrator Cloud-Preflight Request Assembly Extraction (1171)

> Set `MCP_RUNNER_TASK_ID=1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction` for orchestrator commands. Mirror status with `tasks/tasks-1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `tasks/tasks-1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `.agent/task/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`
- [x] Deliberation/findings captured for the preflight-request seam. Evidence: `docs/findings/1171-orchestrator-cloud-preflight-request-assembly-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction.md`, `docs/findings/1171-orchestrator-cloud-preflight-request-assembly-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1171`. Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T021411Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Cloud-preflight request assembly is isolated into a smaller truthful router-local seam. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/00-summary.md`
- [x] `executeCloudRoute(...)` preserves preflight invocation plus hard-fail/fallback ownership. Evidence: `orchestrator/tests/OrchestratorExecutionRouteDecisionShell.test.ts`, `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/00-summary.md`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/05-test.log`
- [x] `npm run docs:check` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/08-diff-budget.log`
- [x] `npm run review` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/09-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1171-coordinator-symphony-aligned-orchestrator-cloud-preflight-request-assembly-extraction/manual/20260314T023037Z-closeout/10-pack-smoke.log`
