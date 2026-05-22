# Task Checklist - 1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction

- MCP Task ID: `1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`

> This lane follows the completed `1188` tracker-delegation cleanup. The next bounded Symphony-aligned move is to extract the remaining task-manager composition shell without reopening broader lifecycle or routing ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `tasks/specs/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `tasks/tasks-1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `.agent/task/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`
- [x] Deliberation/findings captured for the task-manager shell seam. Evidence: `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction.md`, `docs/findings/1189-orchestrator-run-lifecycle-task-manager-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1189`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124000Z-docs-first/05-docs-review-override.md`

## Task-Manager Shell Extraction

- [x] `orchestrator.ts` no longer owns the local `createRunLifecycleTaskManager(...)` composition shell. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/00-summary.md`
- [x] The local `createTaskManager(...)` forwarding wrapper is removed as part of the same shell move. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/00-summary.md`
- [x] Focused regressions preserve manager creation, attach-after-success behavior, and no-attach-on-manager-failure behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `orchestrator/tests/OrchestratorRunLifecycleExecutionAndRunError.test.ts`, `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/08-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/10-pack-smoke.log`
- [x] Elegance review completed. Evidence: `out/1189-coordinator-symphony-aligned-orchestrator-run-lifecycle-task-manager-shell-extraction/manual/20260314T124650Z-closeout/12-elegance-review.md`
