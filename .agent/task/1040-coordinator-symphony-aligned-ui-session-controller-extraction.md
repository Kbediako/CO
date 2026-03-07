# Task Checklist - 1040-coordinator-symphony-aligned-ui-session-controller-extraction

- MCP Task ID: `1040-coordinator-symphony-aligned-ui-session-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-ui-session-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-session-controller-extraction.md`

> This lane extracts the standalone `/auth/session` route handling into a dedicated controller helper while preserving current loopback/origin/host validation, session issuance, auth ordering, and broader control behavior.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `tasks/tasks-1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `.agent/task/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1040-ui-session-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1040-coordinator-symphony-aligned-ui-session-controller-extraction.md`, `docs/findings/1040-ui-session-controller-extraction-deliberation.md`, `.runs/1040-coordinator-symphony-aligned-ui-session-controller-extraction-boundary-review/cli/2026-03-07T06-14-56-301Z-72103429/manifest.json`.
- [x] docs-review approval/override captured for registered `1040`. Evidence: `.runs/1040-coordinator-symphony-aligned-ui-session-controller-extraction/cli/2026-03-07T06-16-47-065Z-8182ba1e/manifest.json`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T061455Z-docs-first/00-summary.md`.

## UI Session Controller Extraction
- [x] `/auth/session` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/uiSessionController.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Loopback/allowed-host/origin validation and route-local response writing move with the new controller without changing route contracts. Evidence: `orchestrator/src/cli/control/uiSessionController.ts`, `orchestrator/tests/UiSessionController.test.ts`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/11-manual-ui-session-controller.json`.
- [x] Session issuance semantics remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/uiSessionController.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/11-manual-ui-session-controller.json`.
- [x] `/api/v1/*`, webhooks, event stream setup, auth ordering, and mutating control endpoints remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/08-diff-budget.log`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/09-review.log`, `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/10-pack-smoke.log`.
- [x] Manual mock UI-session artifact captured. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/11-manual-ui-session-controller.json`.
- [x] Elegance review completed. Evidence: `out/1040-coordinator-symphony-aligned-ui-session-controller-extraction/manual/20260307T063037Z-closeout/12-elegance-review.md`.
