# Task Checklist - 1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction

- MCP Task ID: `1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`

> This lane follows `1100` by extracting only the remaining inline request-route sequencing shell from `handleRequest()` without reopening deeper helper/controller work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `tasks/tasks-1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `.agent/task/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1101-control-request-route-dispatch-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/findings/1101-control-request-route-dispatch-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1101`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022244Z-docs-first/05-docs-review-override.md`.

## Control Request Route Dispatch Shell

- [x] `controlServer.ts` delegates the remaining request-route branch sequencing through one dedicated dispatcher/helper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlRequestRouteDispatch.ts`.
- [x] Public, UI-session, Linear webhook, and authenticated-route helper ownership stays unchanged. Evidence: `orchestrator/src/cli/control/controlRequestRouteDispatch.ts`, `orchestrator/src/cli/control/controlServerPublicRouteHelpers.ts`, `orchestrator/src/cli/control/uiSessionController.ts`, `orchestrator/src/cli/control/linearWebhookController.ts`, `orchestrator/src/cli/control/controlServerAuthenticatedRouteBranch.ts`.
- [x] Focused regression coverage proves the new sequencing seam without reopening deeper controller logic. Evidence: `orchestrator/tests/ControlRequestRouteDispatch.test.ts`, `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/05-targeted-tests.log`, `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/11-manual-request-route-dispatch-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/08-diff-budget.log`, `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/10-pack-smoke.log`.
- [x] Manual request-route dispatch evidence captured. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/11-manual-request-route-dispatch-check.json`.
- [x] Elegance review completed. Evidence: `out/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction/manual/20260310T022901Z-closeout/12-elegance-review.md`.
