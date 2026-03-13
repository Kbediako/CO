# Task Checklist - 1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction

- MCP Task ID: `1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`

> This lane follows `1152` from the thinner bootstrap baseline. The next bounded Symphony-aligned move is to extract the higher-order ready-instance lifecycle shell around `ControlServer` startup, rollback, and owned shutdown without reopening Telegram-local seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `tasks/specs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `tasks/tasks-1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `.agent/task/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the ready-instance lifecycle shell seam. Evidence: `docs/findings/1153-control-server-ready-instance-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md`, `docs/findings/1153-control-server-ready-instance-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1153`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T081150Z-docs-first/00-summary.md`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T081150Z-docs-first/07-docs-review-override.md`

## Control Server Ready Instance Lifecycle Shell Extraction

- [ ] One bounded lifecycle shell replaces the remaining higher-order ready-instance startup/rollback orchestration in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`
- [ ] `controlServer.ts` delegates pending-ready activation and owned shutdown orchestration without widening the public contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`
- [ ] Focused ready-instance lifecycle regressions preserve startup ordering and rollback/cleanup behavior. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T081150Z-closeout/05b-targeted-tests.log`

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
- [ ] Manual/mock ready-instance lifecycle evidence captured.
- [ ] Elegance review completed.
