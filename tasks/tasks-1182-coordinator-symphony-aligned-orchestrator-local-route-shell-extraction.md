# Task 1182 — Coordinator Symphony-Aligned Orchestrator Local Route Shell Extraction

- MCP Task ID: `1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`

> This lane follows completed `1181`. The next bounded Symphony-aligned move is to extract the remaining local-route shell around `runLocalExecutionLifecycleShell(...)` in `orchestratorExecutionRouter.ts` without reopening route-state resolution, cloud-route ownership, execution-mode policy helpers, or lifecycle/executor internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `tasks/specs/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `tasks/tasks-1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `.agent/task/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`
- [x] Deliberation/findings captured for the local-route shell seam. Evidence: `docs/findings/1182-orchestrator-local-route-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction.md`, `docs/findings/1182-orchestrator-local-route-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1182`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/04-docs-review.json`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/05-docs-review-override.md`

## Local-Route Shell Extraction

- [x] One bounded helper/module owns the remaining local-route shell around `runLocalExecutionLifecycleShell(...)`. Evidence: `orchestrator/src/cli/services/orchestratorLocalRouteShell.ts`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/00-summary.md`
- [x] `routeOrchestratorExecution(...)` remains the router-local failure and branch boundary while delegating runtime-fallback summary append, auto-scout env forwarding, local execution dispatch, and guardrail recommendation append. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/00-summary.md`
- [x] Focused regressions preserve runtime-fallback summary behavior, auto-scout env propagation, local execution dispatch, and guardrail recommendation append without reopening route-state or cloud-route seams. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/01-delegation-guard.log`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/00a-guard-subrun.json`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05-test.log`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/13-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/08-diff-budget.log`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/13-override-notes.md`
- [x] `npm run review`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/09-review.log`, `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/12-elegance-review.md`
