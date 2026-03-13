# Task Checklist - 1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction

- MCP Task ID: `1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`
- TECH_SPEC: `tasks/specs/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`

> This lane follows `1156` from the shared execution-lifecycle baseline. The next bounded Symphony-aligned move is to extract the remaining cloud-only target executor cluster in `orchestrator.ts` without reopening runtime-selection, local execution, or broader lifecycle orchestration seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `tasks/specs/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `tasks/tasks-1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `.agent/task/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`
- [x] Deliberation/findings captured for the cloud-target executor seam. Evidence: `docs/findings/1157-orchestrator-cloud-target-executor-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction.md`, `docs/findings/1157-orchestrator-cloud-target-executor-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1157`. Evidence: `out/1157-coordinator-symphony-aligned-orchestrator-cloud-target-executor-extraction/manual/20260313T122837Z-docs-first/04-docs-review-override.md`

## Cloud-Target Executor Extraction

- [ ] One bounded helper/service owns the remaining cloud-target executor body in `orchestrator.ts`.
- [ ] `executeCloudPipeline(...)` delegates that cloud-only executor seam without changing public behavior or widening coordinator authority.
- [ ] Focused cloud regressions preserve target resolution, non-target skips, cloud failure shaping, prompt/config behavior, and manifest persistence.

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
- [ ] Manual/mock cloud-target executor evidence captured.
- [ ] Elegance review completed.
