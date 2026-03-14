# Task 1180 — Coordinator Symphony-Aligned Orchestrator Execution Route State Assembly Extraction

- MCP Task ID: `1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`

> This lane follows completed `1179`. The next bounded Symphony-aligned move is to extract the shared route-state assembly around `resolveExecutionRouteState(...)` in `orchestratorExecutionRouter.ts` without reopening cloud fallback policy, cloud/local lifecycle shells, or runtime-provider internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `tasks/specs/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `tasks/tasks-1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `.agent/task/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`
- [x] Deliberation/findings captured for the shared route-state assembly seam. Evidence: `docs/findings/1180-orchestrator-execution-route-state-assembly-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction.md`, `docs/findings/1180-orchestrator-execution-route-state-assembly-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1180`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/20260314T064312Z-docs-first/04-docs-review.json`, `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/20260314T064312Z-docs-first/05-docs-review-override.md`

## Shared Route-State Assembly Extraction

- [ ] One bounded helper/module owns the shared route-state assembly around `resolveExecutionRouteState(...)`. Evidence: `orchestrator/src/cli/services/`, `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `routeOrchestratorExecution(...)` remains the router-local failure and branch boundary while delegating env merge, runtime selection resolution, manifest application, and effective env assembly. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve runtime selection invocation, manifest application, and env-precedence behavior without reopening lifecycle or fallback-policy seams. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1180-coordinator-symphony-aligned-orchestrator-execution-route-state-assembly-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
