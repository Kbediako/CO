# Task Checklist - 1050-coordinator-symphony-aligned-confirmation-list-controller-extraction

- MCP Task ID: `1050-coordinator-symphony-aligned-confirmation-list-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`

> This lane extracts the inline `GET /confirmations` route into a dedicated controller helper while preserving confirmation expiry, sanitized pending response shaping, response contracts, and leaving broader control policy in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `tasks/specs/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `tasks/tasks-1050-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `.agent/task/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1050-confirmation-list-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`, `docs/findings/1050-confirmation-list-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1050`. Evidence: `.runs/1050/cli/2026-03-07T12-45-07-714Z-57cd4912/manifest.json`, `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124206Z-docs-first/05-docs-review-override.md`.

## Confirmation List Controller Extraction

- [x] `GET /confirmations` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/confirmationListController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Confirmation expiry, pending-list reads, sanitized response shaping, and response writing move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/confirmationListController.ts`, `orchestrator/tests/ConfirmationListController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Confirmation pending-list behavior and response contract remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/confirmationListController.ts`, `orchestrator/tests/ConfirmationListController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/11-manual-confirmation-list-controller.json`.
- [x] Route ordering, auth/runner-only gating, shared runtime/event hooks, `/confirmations/approve`, `/control/action`, and non-list routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/00-summary.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/05-test.log`, `.runs/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction-guard/cli/2026-03-07T12-49-16-419Z-2ab5bdca/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/08-diff-budget.log`, `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/09-review.log`, `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/13-override-notes.md`.
- [x] Manual mock confirmation-list controller artifact captured. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/11-manual-confirmation-list-controller.json`.
- [x] Elegance review completed. Evidence: `out/1050-coordinator-symphony-aligned-confirmation-list-controller-extraction/manual/20260307T124728Z-closeout/12-elegance-review.md`.
