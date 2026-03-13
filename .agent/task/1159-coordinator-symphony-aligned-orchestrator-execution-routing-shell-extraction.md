# Task Checklist - 1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction

- MCP Task ID: `1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`

> This lane follows the completed `1158` local-pipeline executor extraction. The next bounded Symphony-aligned move is to extract the remaining execution-routing shell in `orchestrator.ts` without reopening public lifecycle entrypoints, executor bodies, or broader control-plane seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `tasks/specs/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `tasks/tasks-1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `.agent/task/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`
- [x] Deliberation/findings captured for the execution-routing shell seam. Evidence: `docs/findings/1159-orchestrator-execution-routing-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction.md`, `docs/findings/1159-orchestrator-execution-routing-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1159`. Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-docs-first/05-docs-review-override.md`

## Execution-Routing Shell Extraction

- [x] One bounded helper/service owns the remaining execution-routing shell in `orchestrator.ts`. Evidence: `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/00-summary.md`
- [x] `orchestrator.ts` delegates that routing seam without changing public behavior or widening coordinator authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/00-summary.md`
- [x] Focused routing regressions preserve mode policy, runtime selection/env merge, cloud preflight/fallback shaping, local/cloud executor dispatch, and fallback-adjusted child routing. Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/05-test.log`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/05b-targeted-tests.log`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/13-override-notes.md`
- [x] `npm run docs:check` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/08-diff-budget.log`
- [x] `npm run review` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/09-review.log`, `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/10-pack-smoke.log`
- [x] Manual/mock execution-routing shell evidence captured. Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/11-manual-execution-routing-shell-check.json`
- [x] Elegance review completed. Evidence: `out/1159-coordinator-symphony-aligned-orchestrator-execution-routing-shell-extraction/manual/20260313T145000Z-closeout/12-elegance-review.md`
