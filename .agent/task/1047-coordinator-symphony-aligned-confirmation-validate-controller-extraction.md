# Task Checklist - 1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction

- MCP Task ID: `1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`

> This lane extracts the inline `/confirmations/validate` route into a dedicated controller helper while preserving current confirmation nonce validation behavior, auth ordering, broader control policy, and leaving `/confirmations/approve` plus the harder authority-bearing routes in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `tasks/specs/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `tasks/tasks-1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `.agent/task/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1047-confirmation-validate-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction.md`, `docs/findings/1047-confirmation-validate-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1047`. Evidence: `.runs/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/cli/2026-03-07T10-41-21-984Z-6881551b/manifest.json`, `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T103452Z-docs-first/05-docs-review-override.md`.

## Confirmation Validate Controller Extraction

- [x] `/confirmations/validate` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/confirmationValidateController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Confirmation expiry, request parsing, missing-confirm-nonce validation, tool and params normalization, nonce validation, persistence, control-event emission, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/confirmationValidateController.ts`, `orchestrator/tests/ConfirmationValidateController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Confirmation validate behavior and response contract remain unchanged after extraction. Evidence: `orchestrator/tests/ConfirmationValidateController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/11-manual-confirmation-validate-controller.json`.
- [x] Route ordering, auth/runner-only gating, shared runtime/event hooks, `/confirmations/approve`, and non-confirmation routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/00-summary.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/05-test.log`, `.runs/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction-guard/cli/2026-03-07T10-51-38-811Z-474212e8/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/08-diff-budget.log`, `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/09-review.log`, `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/10-pack-smoke.log`.
- [x] Manual mock confirmation-validate controller artifact captured. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/11-manual-confirmation-validate-controller.json`.
- [x] Elegance review completed. Evidence: `out/1047-coordinator-symphony-aligned-confirmation-validate-controller-extraction/manual/20260307T104753Z-closeout/12-elegance-review.md`.
