# Task Checklist - 1041-coordinator-symphony-aligned-linear-webhook-controller-extraction

- MCP Task ID: `1041-coordinator-symphony-aligned-linear-webhook-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`

> This lane extracts the standalone `/integrations/linear/webhook` route handling into a dedicated controller helper while preserving current validation, advisory-state mutation, auth ordering, and broader control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `tasks/specs/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `tasks/tasks-1041-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `.agent/task/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1041-linear-webhook-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction.md`, `docs/findings/1041-linear-webhook-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1041`. Evidence: `.runs/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/cli/2026-03-07T07-13-53-381Z-1b3f3cde/manifest.json`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T070913Z-docs-first/`.

## Linear Webhook Controller Extraction
- [x] `/integrations/linear/webhook` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/linearWebhookController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Webhook validation, advisory-state mutation, and route-local response writing move with the new controller without changing route contracts. Evidence: `orchestrator/src/cli/control/linearWebhookController.ts`, `orchestrator/tests/LinearWebhookController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/11-manual-linear-webhook-controller.json`.
- [x] Acceptance, duplicate, ignore, and rejection semantics remain unchanged after extraction. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/05b-targeted-tests.log`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/11-manual-linear-webhook-controller.json`.
- [x] UI assets, `/auth/session`, auth ordering, event stream setup, `/api/v1/*`, and mutating control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/05-test.log`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/08-diff-budget.log`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/09-review.log`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/09-review-timeout.txt`, `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/10-pack-smoke.log`.
- [x] Manual mock Linear webhook artifact captured. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/11-manual-linear-webhook-controller.json`.
- [x] Elegance review completed. Evidence: `out/1041-coordinator-symphony-aligned-linear-webhook-controller-extraction/manual/20260307T073238Z-closeout/12-elegance-review.md`.
