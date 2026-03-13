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

- [ ] One bounded helper/service owns the remaining execution-routing shell in `orchestrator.ts`.
- [ ] `orchestrator.ts` delegates that routing seam without changing public behavior or widening coordinator authority.
- [ ] Focused routing regressions preserve mode policy, runtime selection/env merge, cloud preflight/fallback shaping, and local/cloud executor dispatch.

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
- [ ] Manual/mock execution-routing shell evidence captured.
- [ ] Elegance review completed.
