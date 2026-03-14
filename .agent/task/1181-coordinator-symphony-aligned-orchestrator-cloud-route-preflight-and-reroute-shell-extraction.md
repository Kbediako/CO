# Task 1181 — Coordinator Symphony-Aligned Orchestrator Cloud Route Preflight And Reroute Shell Extraction

- MCP Task ID: `1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`

> This lane follows completed `1180`. The next bounded Symphony-aligned move is to extract the cloud-route shell around `executeCloudRoute(...)` in `orchestratorExecutionRouter.ts` without reopening shared route-state assembly, preflight helpers, lifecycle shells, or executor internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `tasks/specs/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `tasks/tasks-1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `.agent/task/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`
- [x] Deliberation/findings captured for the cloud-route shell seam. Evidence: `docs/findings/1181-orchestrator-cloud-route-preflight-and-reroute-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction.md`, `docs/findings/1181-orchestrator-cloud-route-preflight-and-reroute-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1181`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/04-docs-review.json`, `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/05-docs-review-override.md`

## Cloud-Route Shell Extraction

- [ ] One bounded helper/module owns the cloud-route shell around `executeCloudRoute(...)`. Evidence: `orchestrator/src/cli/services/`, `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `routeOrchestratorExecution(...)` remains the router-local failure and branch boundary while delegating cloud preflight, fallback reroute, and successful cloud dispatch. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve fail-fast behavior, fallback reroute env propagation, and successful cloud delegation without reopening shared route-state or lifecycle seams. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
