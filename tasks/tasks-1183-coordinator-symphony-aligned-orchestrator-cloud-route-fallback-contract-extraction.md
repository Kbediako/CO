# Task 1183 — Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction

- MCP Task ID: `1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`

> This lane follows completed `1182`. The next bounded Symphony-aligned move is to extract the remaining cloud-route fallback contract cluster in `orchestratorCloudRouteShell.ts` without reopening router-local branch selection, successful cloud dispatch wiring, or broader executor lifecycle behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `tasks/specs/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `tasks/tasks-1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `.agent/task/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`
- [x] Deliberation/findings captured for the cloud-route fallback contract seam. Evidence: `docs/findings/1183-orchestrator-cloud-route-fallback-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction.md`, `docs/findings/1183-orchestrator-cloud-route-fallback-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1183`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/04-docs-review.json`, `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/05-docs-review-override.md`

## Cloud-Route Fallback Contract Extraction

- [ ] One bounded helper/module owns the remaining cloud-route fallback contract cluster inside `orchestratorCloudRouteShell.ts`. Evidence: `orchestrator/src/cli/services/`, `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `orchestratorCloudRouteShell.ts` remains the shell boundary for preflight invocation, manifest mutation, reroute dispatch, and successful cloud execution handoff. Evidence: `orchestrator/src/cli/services/orchestratorCloudRouteShell.ts`, `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve fail-fast behavior, fallback contract shaping, and reroute payload assembly without reopening router or executor seams. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
