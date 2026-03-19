# Task Checklist - 1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction

- MCP Task ID: `1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`
- TECH_SPEC: `tasks/specs/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`

> This lane extracts the shared authenticated control-route gate into a dedicated module while leaving `controlServer.ts` as the public-route dispatcher and controller wiring surface.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `tasks/specs/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `tasks/tasks-1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `.agent/task/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1062-authenticated-control-route-gate-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`, `docs/findings/1062-authenticated-control-route-gate-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1062`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083500Z-docs-first/05-docs-review-override.md`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083500Z-docs-first/01-spec-guard.log`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083500Z-docs-first/02-docs-check.log`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083500Z-docs-first/03-docs-freshness.log`.

## Authenticated Control Route Gate Extraction

- [x] A dedicated authenticated control-route gate module is extracted under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/authenticatedControlRouteGate.ts`.
- [x] `controlServer.ts` is reduced to public-route ordering, gate invocation, and controller dispatch for authenticated routes. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [x] Auth, CSRF, and runner-only behavior remain explicit and test-covered. Evidence: `orchestrator/tests/AuthenticatedControlRouteGate.test.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/05a-targeted-gate-tests.log`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/05b-targeted-controlserver.log`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/09-review.log`, `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/13-override-notes.md`.
- [x] Manual gate artifact captured. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/11-manual-authenticated-gate-check.json`.
- [x] Elegance review completed. Evidence: `out/1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction/manual/20260308T083345Z-closeout/12-elegance-review.md`.
