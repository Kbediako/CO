# Task Checklist - 1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction

- MCP Task ID: `1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`
- TECH_SPEC: `tasks/specs/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`

> This lane resumes the broader Symphony-aligned extraction track after `1120` by removing the remaining weak startup-input prep from `ControlServer.start()` while leaving downstream startup helpers unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `tasks/specs/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `tasks/tasks-1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `.agent/task/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T215012Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1121-control-server-startup-input-prep-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction.md`, `docs/findings/1121-control-server-startup-input-prep-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1121`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T215012Z-docs-first/05-docs-review-override.md`.

## Control Server Startup Input Prep

- [x] `ControlServer.start()` delegates the remaining startup-input prep through one bounded helper while preserving the ready-instance startup handoff. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerStartupInputPreparation.ts`.
- [x] The extracted helper owns only control-token generation, seed-loading delegation, seeded-runtime assembly delegation, and the prepared inputs passed into `startPendingReadyInstance(...)`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerStartupInputPreparation.ts`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/11-manual-startup-input-prep-check.json`.
- [x] Focused regression coverage proves the prepared runtime inputs and ready-instance startup handoff remain unchanged. Evidence: `orchestrator/tests/ControlServerStartupInputPreparation.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/08-diff-budget.log`, `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/10-pack-smoke.log`.
- [x] Manual startup-input prep evidence captured. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/11-manual-startup-input-prep-check.json`.
- [x] Elegance review completed. Evidence: `out/1121-coordinator-symphony-aligned-control-server-startup-input-prep-extraction/manual/20260311T221050Z-closeout/12-elegance-review.md`.
