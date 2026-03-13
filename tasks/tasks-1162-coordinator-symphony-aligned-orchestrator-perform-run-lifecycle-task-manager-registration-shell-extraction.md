# Task Checklist - 1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction

- MCP Task ID: `1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`

> This lane follows the completed `1161` completion-shell extraction. The next bounded Symphony-aligned move is to extract the TaskManager-registration harness still inline in `performRunLifecycle(...)` without reopening guard/planning, execution, or completion ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `tasks/specs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `tasks/tasks-1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `.agent/task/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`
- [x] Deliberation/findings captured for the TaskManager-registration seam. Evidence: `docs/findings/1162-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction.md`, `docs/findings/1162-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1162`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T165501Z-docs-first/00-summary.md`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T165501Z-docs-first/05-docs-review-override.md`, `.runs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction-guard/cli/2026-03-13T17-00-19-428Z-8852dbd4/manifest.json`, `.runs/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/cli/2026-03-13T17-01-13-246Z-176a7716/manifest.json`

## Task-Manager Registration Shell Extraction

- [x] One bounded helper owns the TaskManager-registration harness in `performRunLifecycle(...)`. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/11-manual-task-manager-registration-check.json`
- [x] `performRunLifecycle(...)` delegates that seam without changing guard/planning, execution, or completion authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/00-summary.md`
- [x] Focused regressions preserve manager wiring continuity and `plan_target_id` tracking behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/05b-test.log`
- [x] `npm run docs:check`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/08-diff-budget.log`, `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/13-override-notes.md`
- [x] `npm run review`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/10-pack-smoke.log`
- [x] Manual/mock TaskManager-registration evidence captured. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/11-manual-task-manager-registration-check.json`
- [x] Elegance review completed. Evidence: `out/1162-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-task-manager-registration-shell-extraction/manual/20260313T171317Z-closeout/12-elegance-review.md`
