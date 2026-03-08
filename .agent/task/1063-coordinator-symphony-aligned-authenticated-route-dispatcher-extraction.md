# Task Checklist - 1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction

- MCP Task ID: `1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`
- TECH_SPEC: `tasks/specs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`

> This lane extracts the remaining post-admission protected-route dispatcher shell while leaving `controlServer.ts` as the bootstrap/public-route/gate surface.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `tasks/specs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `tasks/tasks-1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `.agent/task/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1063-authenticated-route-dispatcher-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`, `docs/findings/1063-authenticated-route-dispatcher-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1063`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T090832Z-docs-first/05-docs-review-override.md`.

## Authenticated Route Dispatcher Extraction

- [x] A dedicated authenticated-route dispatcher module is extracted under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/authenticatedRouteDispatcher.ts`.
- [x] `controlServer.ts` is reduced to public-route ordering, gate invocation, and dispatcher handoff for protected routes. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [x] Protected-route behavior remains explicit and test-covered. Evidence: `orchestrator/tests/AuthenticatedRouteDispatcher.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/11-manual-authenticated-route-dispatcher-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/01-delegation-guard.log`, `.runs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction-guard/cli/2026-03-08T09-15-56-048Z-0e679bd5/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/03-build.log`, `.runs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction-guard/cli/2026-03-08T09-15-56-048Z-0e679bd5/manifest.json`.
- [x] `npm run lint`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/04-lint.log`, `.runs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction-guard/cli/2026-03-08T09-15-56-048Z-0e679bd5/manifest.json`.
- [x] `npm run test`. Evidence: `.runs/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction-guard/cli/2026-03-08T09-15-56-048Z-0e679bd5/manifest.json`, `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/05a-targeted-dispatcher.log`, `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/05b-targeted-control-server.log`, `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/09-review.log`, `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/10-pack-smoke.log`.
- [x] Manual dispatcher artifact captured. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/11-manual-authenticated-route-dispatcher-check.json`.
- [x] Elegance review completed. Evidence: `out/1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction/manual/20260308T091516Z-closeout/12-elegance-review.md`.
