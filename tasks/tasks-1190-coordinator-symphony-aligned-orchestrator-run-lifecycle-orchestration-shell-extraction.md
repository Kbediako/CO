# Task Checklist - 1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction

- MCP Task ID: `1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`

> This lane follows the completed `1189` task-manager shell extraction. The next bounded Symphony-aligned move is to extract the remaining lifecycle orchestration envelope without reopening broader public lifecycle, routing, or task-manager ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `tasks/specs/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `tasks/tasks-1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `.agent/task/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`
- [x] Deliberation/findings captured for the lifecycle orchestration seam. Evidence: `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction.md`, `docs/findings/1190-orchestrator-run-lifecycle-orchestration-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1190`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/20260314T125616Z-docs-first/05-docs-review-override.md`

## Run-Lifecycle Orchestration Shell Extraction

- [ ] `performRunLifecycle(...)` no longer owns the local orchestration shell around guard/planning, task execution, and completion/error ordering. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `runLifecycleGuardAndPlanning(...)` and `executeRunLifecycleTask(...)` move or delegate through the same shell boundary without changing behavior. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve privacy-guard reset, guard short-circuit behavior, run-error ordering, and completion semantics. Evidence: `orchestrator/tests/OrchestratorRunLifecycleGuardAndPlanning.test.ts`, `orchestrator/tests/OrchestratorRunLifecycleExecutionAndRunError.test.ts`, `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1190-coordinator-symphony-aligned-orchestrator-run-lifecycle-orchestration-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
