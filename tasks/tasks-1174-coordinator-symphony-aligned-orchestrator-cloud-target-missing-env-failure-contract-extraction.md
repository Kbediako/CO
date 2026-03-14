# Task 1174 — Coordinator Symphony-Aligned Orchestrator Cloud-Target Missing-Env Failure Contract Extraction

- MCP Task ID: `1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`
- TECH_SPEC: `tasks/specs/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`

> This lane follows completed `1173`. The next bounded Symphony-aligned move is to extract the missing-environment hard-fail contract in `orchestratorCloudTargetExecutor.ts` without reopening environment-id resolution, target-stage routing, or broader cloud executor lifecycle seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `tasks/specs/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `tasks/tasks-1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `.agent/task/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`
- [x] Deliberation/findings captured for the missing-env contract seam. Evidence: `docs/findings/1174-orchestrator-cloud-target-missing-env-failure-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction.md`, `docs/findings/1174-orchestrator-cloud-target-missing-env-failure-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1174`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/20260314T041036Z-docs-first/05-docs-review-override.md`

## Missing-Env Contract Extraction

- [ ] One bounded helper inside `orchestratorCloudTargetExecutor.ts` owns the missing-environment hard-fail projection. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `executeOrchestratorCloudTarget(...)` retains environment-id resolution, return-path control flow, and non-missing-env lifecycle ownership. Evidence: `orchestrator/src/cli/services/orchestratorCloudTargetExecutor.ts`, `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused cloud regressions preserve the missing-env contract without widening into executor handoff or post-execution shaping. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1174-coordinator-symphony-aligned-orchestrator-cloud-target-missing-env-failure-contract-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
