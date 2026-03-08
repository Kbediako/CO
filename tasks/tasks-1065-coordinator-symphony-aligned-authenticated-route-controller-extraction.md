# Task Checklist - 1065-coordinator-symphony-aligned-authenticated-route-controller-extraction

- MCP Task ID: `1065-coordinator-symphony-aligned-authenticated-route-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`

> This lane extracts the post-gate authenticated-route handoff while leaving `controlServer.ts` as the outer public-route/admission/fallback surface.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `tasks/tasks-1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `.agent/task/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1065-authenticated-route-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`, `docs/findings/1065-authenticated-route-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1065`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104119Z-docs-first/05-docs-review-override.md`.

## Authenticated Route Controller Extraction

- [x] A dedicated authenticated-route controller module is extracted under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/authenticatedRouteController.ts`.
- [x] `controlServer.ts` is reduced to public-route ordering, authenticated admission, controller handoff, and protected fallback for authenticated routes. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [x] Authenticated-route behavior remains explicit and test-covered. Evidence: `orchestrator/tests/AuthenticatedRouteController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/05-targeted-tests.log`, `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/05b-full-test.log`, `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/09-review.log`, `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/13-override-notes.md`.
- [x] Manual controller-handoff artifact captured. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/11-manual-authenticated-route-controller-check.json`.
- [x] Elegance review completed. Evidence: `out/1065-coordinator-symphony-aligned-authenticated-route-controller-extraction/manual/20260308T104506Z-closeout/12-elegance-review.md`.
