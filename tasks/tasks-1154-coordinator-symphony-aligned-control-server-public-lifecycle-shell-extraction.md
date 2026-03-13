# Task Checklist - 1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction

- MCP Task ID: `1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`

> This lane follows `1153` from the thinner public-handle baseline. The next bounded Symphony-aligned move is to extract the remaining public startup/close lifecycle shell around `ControlServer` itself without reopening ready-instance or Telegram-local internals.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `tasks/specs/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `tasks/tasks-1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `.agent/task/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the public lifecycle shell seam. Evidence: `docs/findings/1154-control-server-public-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction.md`, `docs/findings/1154-control-server-public-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1154`. Evidence: `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T090827Z-docs-first/00-summary.md`, `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/20260313T090827Z-docs-first/05-docs-review-override.md`

## Control Server Public Lifecycle Shell Extraction

- [ ] One bounded public lifecycle shell replaces the remaining startup/close orchestration in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`
- [ ] `controlServer.ts` delegates public startup and shutdown orchestration without widening the public contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`
- [ ] Focused public lifecycle regressions preserve startup order and shutdown behavior.

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
- [ ] Manual/mock public lifecycle evidence captured.
- [ ] Elegance review completed.
