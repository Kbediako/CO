# Task Checklist - 1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction

- MCP Task ID: `1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`

> This lane extracts the inline `/confirmations/issue` and `/confirmations/consume` routes into a dedicated controller helper while preserving current confirmation nonce issuance behavior, auth ordering, broader control policy, and leaving `/confirmations/validate` plus the harder authority-bearing routes in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `tasks/specs/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `tasks/tasks-1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `.agent/task/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1046-confirmation-issue-consume-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction.md`, `docs/findings/1046-confirmation-issue-consume-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1046`. Evidence: `.runs/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/cli/2026-03-07T10-16-52-658Z-b427f60a/manifest.json`, `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T101629Z-docs-first/05-docs-review-override.md`.

## Confirmation Issue Consume Controller Extraction

- [x] `/confirmations/issue` and `/confirmations/consume` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/confirmationIssueConsumeController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Confirmation expiry, request parsing, required-field validation, nonce issuance, persistence trigger, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/confirmationIssueConsumeController.ts`, `orchestrator/tests/ConfirmationIssueConsumeController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Confirmation issue and consume validation behavior and response contract remain unchanged after extraction. Evidence: `orchestrator/tests/ConfirmationIssueConsumeController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/11-manual-confirmation-issue-consume-controller.json`.
- [x] Route ordering, auth/runner-only gating, shared runtime/event hooks, `/confirmations/validate`, and non-confirmation routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/00-summary.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/05-test.log`, `.runs/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction-guard/cli/2026-03-07T10-25-00-738Z-fc9147a3/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/08-diff-budget.log`, `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/09-review.log`, `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/10-pack-smoke.log`.
- [x] Manual mock confirmation-issue-consume controller artifact captured. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/11-manual-confirmation-issue-consume-controller.json`.
- [x] Elegance review completed. Evidence: `out/1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction/manual/20260307T102521Z-closeout/12-elegance-review.md`.
