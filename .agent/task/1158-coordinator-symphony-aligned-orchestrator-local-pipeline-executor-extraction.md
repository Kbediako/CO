# Task Checklist - 1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction

- MCP Task ID: `1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`
- TECH_SPEC: `tasks/specs/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`

> This lane follows the completed `1157` cloud-target extraction. The next bounded Symphony-aligned move is to extract the remaining local pipeline executor cluster in `orchestrator.ts` without reopening runtime selection, cloud policy, or broader lifecycle orchestration seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `tasks/specs/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `tasks/tasks-1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `.agent/task/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`
- [x] Deliberation/findings captured for the local-pipeline executor seam. Evidence: `docs/findings/1158-orchestrator-local-pipeline-executor-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction.md`, `docs/findings/1158-orchestrator-local-pipeline-executor-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1158`. Evidence: `out/1158-coordinator-symphony-aligned-orchestrator-local-pipeline-executor-extraction/manual/20260313T132508Z-docs-first/04-docs-review-override.md`

## Local-Pipeline Executor Extraction

- [ ] One bounded helper/service owns the remaining local-pipeline executor body in `orchestrator.ts`.
- [ ] The non-cloud lifecycle branch delegates that local-only executor seam without changing public behavior or widening coordinator authority.
- [ ] Focused local regressions preserve command-stage execution, subpipeline handling, fail/skip shaping, already-completed skip behavior, and manifest/run-event persistence.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock local-pipeline executor evidence captured.
- [ ] Elegance review completed.
