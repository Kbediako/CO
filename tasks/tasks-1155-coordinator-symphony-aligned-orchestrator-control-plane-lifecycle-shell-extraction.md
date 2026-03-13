# Task Checklist - 1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction

- MCP Task ID: `1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`

> This lane follows `1154` from the now-thin `ControlServer` baseline. The next bounded Symphony-aligned move is to extract the duplicated run-entry control-plane lifecycle shell in `orchestrator.ts` without reopening `ControlServer`, Telegram internals, or route/controller seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `tasks/specs/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `tasks/tasks-1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `.agent/task/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the orchestrator control-plane lifecycle seam. Evidence: `docs/findings/1155-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `docs/findings/1155-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1155`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T102900Z-docs-first/00-summary.md`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T102900Z-docs-first/04-docs-review.json`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T102900Z-docs-first/05-docs-review-override.md`

## Orchestrator Control Plane Lifecycle Shell Extraction

- [x] One bounded helper owns the duplicated run-entry control-plane lifecycle shell shared by `Orchestrator.start()` and `Orchestrator.resume()`. Evidence: `orchestrator/src/cli/services/orchestratorControlPlaneLifecycle.ts`, `orchestrator/src/cli/orchestrator.ts`
- [x] `orchestrator.ts` delegates shared control-plane setup and teardown without widening coordinator authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorControlPlaneLifecycle.ts`
- [x] Focused regressions preserve startup, control-disabled behavior, adapter attachment, and teardown ordering behavior. Evidence: `orchestrator/tests/OrchestratorControlPlaneLifecycle.test.ts`, `orchestrator/tests/OrchestratorCleanupOrder.test.ts`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/01-delegation-guard.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/00-delegated-guard-run.json`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/05-test.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/05b-targeted-tests.log`
- [x] `npm run docs:check`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/08-diff-budget.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/13-override-notes.md`
- [x] `npm run review`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/09-review.log`, `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/10-pack-smoke.log`
- [x] Manual/mock orchestrator control-plane lifecycle evidence captured. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/11-manual-control-plane-lifecycle-check.json`
- [x] Elegance review completed. Evidence: `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/12-elegance-review.md`
