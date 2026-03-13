# Task Checklist - 1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction

- MCP Task ID: `1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`

> This lane follows `1155` from the thinned run-entry startup-shell baseline. The next bounded Symphony-aligned move is to extract the duplicated local/cloud execution lifecycle shell in `orchestrator.ts` without merging execution bodies or reopening control/Telegram seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `tasks/specs/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `tasks/tasks-1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `.agent/task/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the execution-mode lifecycle seam. Evidence: `docs/findings/1156-orchestrator-execution-mode-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction.md`, `docs/findings/1156-orchestrator-execution-mode-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1156`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T113036Z-docs-first/04-docs-review.json`

## Orchestrator Execution-Mode Lifecycle Shell Extraction

- [x] One bounded helper owns the duplicated local/cloud execution lifecycle shell around the mode-specific execution bodies in `orchestrator.ts`. Evidence: `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
- [x] `orchestrator.ts` delegates shared execution lifecycle orchestration without widening coordinator authority or merging execution bodies. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/11-manual-execution-lifecycle-check.json`
- [x] Focused regressions preserve control-watcher ordering, heartbeat/finalization behavior, and local/cloud mode-specific differences. Evidence: `orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`, `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/08-diff-budget.log`, `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/13-override-notes.md`
- [x] `npm run review`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/09-review.log`, `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/10-pack-smoke.log`
- [x] Manual/mock execution lifecycle evidence captured. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/11-manual-execution-lifecycle-check.json`
- [x] Elegance review completed. Evidence: `out/1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction/manual/20260313T120356Z-closeout/12-elegance-review.md`
