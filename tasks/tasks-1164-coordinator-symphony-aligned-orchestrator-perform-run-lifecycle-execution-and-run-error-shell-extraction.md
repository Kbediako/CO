# Task Checklist - 1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction

- MCP Task ID: `1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`

> This lane follows the completed `1163` guard-and-planning extraction. The next bounded Symphony-aligned move is to extract the remaining execution / run-error shell still inline in `performRunLifecycle(...)`, without reopening registration, guard-and-planning, completion, or public lifecycle ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `tasks/specs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `tasks/tasks-1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `.agent/task/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`
- [x] Deliberation/findings captured for the execution / run-error seam. Evidence: `docs/findings/1164-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction.md`, `docs/findings/1164-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1164`. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/00-summary.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/05-docs-review-override.md`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T215110Z-docs-first/04-manual-tasks-archive-0935.md`, `.runs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/cli/2026-03-13T21-53-20-769Z-ca789e4a/manifest.json`

## Execution / Run-Error Shell Extraction

- [x] One bounded helper owns the execution / run-error shell in `performRunLifecycle(...)`. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/00-summary.md`
- [x] `performRunLifecycle(...)` delegates that seam without changing registration, guard-and-planning, completion, or public lifecycle authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/11-manual-execution-and-run-error-check.json`
- [x] Focused regressions preserve the success return path and failure run-error / rethrow behavior. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/01-delegation-guard.log`, `.runs/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction-correctness/cli/2026-03-13T22-07-28-858Z-0ae58fa4/manifest.json`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/05b-test.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/13-override-notes.md`
- [x] `npm run docs:check` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/08-diff-budget.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/13-override-notes.md`
- [x] `npm run review` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/09-review.log`, `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/10-pack-smoke.log`
- [x] Manual/mock execution / run-error evidence captured. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/11-manual-execution-and-run-error-check.json`
- [x] Elegance review completed. Evidence: `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/12-elegance-review.md`
