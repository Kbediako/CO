# Task Checklist - 1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction

- MCP Task ID: `1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`
- TECH_SPEC: `tasks/specs/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`

> This lane follows `1103` by extracting only the remaining inline request-shell binding assembly from `ControlServer.start()` without reopening request behavior, startup, or seeded-runtime helpers.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `tasks/specs/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `tasks/tasks-1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `.agent/task/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1104-control-server-request-shell-binding-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction.md`, `docs/findings/1104-control-server-request-shell-binding-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1104`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T032000Z-docs-first/05-docs-review-override.md`.

## Control Server Request-Shell Binding

- [x] `ControlServer.start()` delegates the remaining inline request-shell binding assembly through one dedicated helper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerRequestShellBinding.ts`.
- [x] The helper owns only `createControlServerRequestShell(...)` plus `handleControlRequest` binding. Evidence: `orchestrator/src/cli/control/controlServerRequestShellBinding.ts`, `orchestrator/src/cli/control/controlServerRequestShell.ts`, `orchestrator/src/cli/control/controlRequestController.ts`.
- [x] Focused regression coverage proves the new binding seam without reopening request-shell or request-controller logic. Evidence: `orchestrator/tests/ControlServerRequestShellBinding.test.ts`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/05-targeted-tests.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/11-manual-request-shell-binding-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/08-diff-budget.log`, `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/10-pack-smoke.log`.
- [x] Manual request-shell binding evidence captured. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/11-manual-request-shell-binding-check.json`.
- [x] Elegance review completed. Evidence: `out/1104-coordinator-symphony-aligned-control-server-request-shell-binding-extraction/manual/20260310T033215Z-closeout/12-elegance-review.md`.
