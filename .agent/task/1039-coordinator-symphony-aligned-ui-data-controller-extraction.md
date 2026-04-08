# Task Checklist - 1039-coordinator-symphony-aligned-ui-data-controller-extraction

- MCP Task ID: `1039-coordinator-symphony-aligned-ui-data-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-ui-data-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1039-coordinator-symphony-aligned-ui-data-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-data-controller-extraction.md`

> This lane extracts the standalone `/ui/data.json` route handling into a dedicated controller helper while preserving selected-run dataset construction, `/api/v1/*`, auth/session/webhook handling, and mutating control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `tasks/specs/1039-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `tasks/tasks-1039-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `.agent/task/1039-coordinator-symphony-aligned-ui-data-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1039-ui-data-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1039-coordinator-symphony-aligned-ui-data-controller-extraction.md`, `docs/findings/1039-ui-data-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1039`. Evidence: `.runs/1039-coordinator-symphony-aligned-ui-data-controller-extraction/cli/2026-03-07T05-44-06-301Z-3c91d73a/manifest.json`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T054248Z-docs-first/00-summary.md`.

## UI Data Controller Extraction
- [x] `/ui/data.json` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/uiDataController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] `/ui/data.json` method guards and route-local response writing move with the new controller without changing route contracts. Evidence: `orchestrator/src/cli/control/uiDataController.ts`, `orchestrator/tests/UiDataController.test.ts`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/11-manual-ui-data-controller.json`.
- [x] `selectedRunPresenter.ts` remains the UI dataset builder after extraction. Evidence: `orchestrator/src/cli/control/selectedRunPresenter.ts`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/11-manual-ui-data-controller.json`.
- [x] `/api/v1/*`, auth/session/webhook/control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/08-diff-budget.log`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/09-review.log`, `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/10-pack-smoke.log`.
- [x] Manual mock UI-data artifact captured. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/11-manual-ui-data-controller.json`.
- [x] Elegance review completed. Evidence: `out/1039-coordinator-symphony-aligned-ui-data-controller-extraction/manual/20260307T055059Z-closeout/12-elegance-review.md`.
