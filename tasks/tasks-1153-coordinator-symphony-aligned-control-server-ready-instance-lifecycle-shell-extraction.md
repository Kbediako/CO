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

- [x] One bounded lifecycle shell replaces the remaining higher-order ready-instance startup/rollback orchestration in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerReadyInstanceLifecycle.ts`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/00-summary.md`
- [x] `controlServer.ts` delegates pending-ready activation and owned shutdown orchestration without widening the public contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/12-elegance-review.md`
- [x] Focused ready-instance lifecycle regressions preserve startup ordering and rollback/cleanup behavior. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/05b-targeted-tests.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/11-manual-ready-instance-lifecycle-check.json`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/04-lint.log`
- [x] `npm run test` override recorded. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/05-test.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/13-override-notes.md`
- [x] `npm run docs:check`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` override recorded. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/08-diff-budget.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/13-override-notes.md`
- [x] `npm run review` override recorded after fixing the real shared-state regression it surfaced. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/09-review.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke`. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/10-pack-smoke.log`
- [x] Manual/mock ready-instance lifecycle evidence captured. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/11-manual-ready-instance-lifecycle-check.json`
- [x] Elegance review completed. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/12-elegance-review.md`
