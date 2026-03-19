# Task Checklist - 1038-coordinator-symphony-aligned-observability-api-controller-extraction

- MCP Task ID: `1038-coordinator-symphony-aligned-observability-api-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-observability-api-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1038-coordinator-symphony-aligned-observability-api-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-api-controller-extraction.md`

> This lane extracts `/api/v1/*` observability controller policy into a dedicated helper while preserving the current presenter seams, `/ui/data.json`, auth surfaces, and control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `tasks/specs/1038-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `tasks/tasks-1038-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `.agent/task/1038-coordinator-symphony-aligned-observability-api-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1038-observability-api-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1038-coordinator-symphony-aligned-observability-api-controller-extraction.md`, `docs/findings/1038-observability-api-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1038`. Evidence: `.runs/1038-coordinator-symphony-aligned-observability-api-controller-extraction/cli/2026-03-07T04-46-30-758Z-87a0e5f9/manifest.json`, `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T043733Z-docs-first/00-summary.md`.

## Observability API Controller Extraction
- [x] `/api/v1/*` observability route matching is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/observabilityApiController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Core compatibility routes and the CO-only `/api/v1/dispatch` extension remain behaviorally aligned after the extraction. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/11-manual-observability-controller.json`.
- [x] Controller-local response writing and method guards move with the new controller without changing `/api/v1/*` contracts. Evidence: `orchestrator/src/cli/control/observabilityApiController.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/11-manual-observability-controller.json`.
- [x] `/ui/data.json`, auth/session/webhook/control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/08-diff-budget.log`, `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/09-review.log`, `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/10-pack-smoke.log`.
- [x] Manual mock observability API artifact captured. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/11-manual-observability-controller.json`.
- [x] Elegance review completed. Evidence: `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/12-elegance-review.md`.
