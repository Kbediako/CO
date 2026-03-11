# Task Checklist - 1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard

- MCP Task ID: `1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`
- TECH_SPEC: `tasks/specs/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`

> This lane continues the broader Symphony-aligned control-server thinning track after `1121` by extracting the remaining pending ready-instance activation guard while leaving startup-input prep and downstream ready-instance startup helpers unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `tasks/specs/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `tasks/tasks-1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `.agent/task/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T223257Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1122-control-server-pending-ready-instance-activation-guard-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard.md`, `docs/findings/1122-control-server-pending-ready-instance-activation-guard-deliberation.md`.
- [x] docs-review approval/override captured for registered `1122`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260311T223257Z-docs-first/05-docs-review-override.md`.

## Pending Ready-Instance Activation Guard

- [ ] The pending ready-instance activation guard is extracted through one bounded helper while preserving the ready-instance return contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [ ] The extracted helper owns only the live `instance` cell, request-shell reader wiring, bootstrap/expiry lifecycle attachment, close-on-failure routing, and final `baseUrl` publication/return. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Focused regression coverage proves request-shell reader dereferencing, lifecycle attachment, and close-on-failure behavior remain unchanged. Evidence: `orchestrator/tests/ControlServerReadyInstanceStartup.test.ts`, `orchestrator/tests/ControlServerStartupSequence.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/10-pack-smoke.log`.
- [ ] Manual pending ready-instance activation-guard evidence captured. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/11-manual-pending-ready-instance-activation-guard-check.json`.
- [ ] Elegance review completed. Evidence: `out/1122-coordinator-symphony-aligned-control-server-pending-ready-instance-activation-guard/manual/20260312T000000Z-closeout/12-elegance-review.md`.
