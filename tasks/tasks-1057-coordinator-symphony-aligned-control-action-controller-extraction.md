# Task Checklist - 1057-coordinator-symphony-aligned-control-action-controller-extraction

- MCP Task ID: `1057-coordinator-symphony-aligned-control-action-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`

> This lane extracts the remaining `/control/action` route-local controller shell into a dedicated controller module while leaving `controlServer.ts` as the route-matching and dependency-injection surface and preserving CO's explicit side-effect boundary.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-extraction.md`, `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `tasks/tasks-1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `.agent/task/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1057-control-action-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1057-coordinator-symphony-aligned-control-action-controller-extraction.md`, `docs/findings/1057-control-action-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1057`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T074536Z-resume/05-docs-review-override.md`.

## Control Action Controller Extraction

- [x] A dedicated `/control/action` controller module is extracted under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlActionController.ts`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/00-summary.md`.
- [x] `controlServer.ts` is reduced to route matching and dependency injection for this surface. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/00-summary.md`.
- [x] Persistence, publish, audit emission, and response/error writes remain explicit and test-covered. Evidence: `orchestrator/tests/ControlActionController.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/05-targeted-tests.log`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/05b-targeted-controlserver.log`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/11-manual-control-action-controller-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/01-delegation-guard.log`, `.runs/1057-coordinator-symphony-aligned-control-action-controller-extraction-guard/cli/2026-03-08T07-56-42-089Z-b05a8492/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/09-review.log`, `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required unless downstream-facing CLI/package/skills/review-wrapper paths change. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/13-override-notes.md`.
- [x] Manual controller artifact captured. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/11-manual-control-action-controller-check.json`.
- [x] Elegance review completed. Evidence: `out/1057-coordinator-symphony-aligned-control-action-controller-extraction/manual/20260308T075555Z-closeout/12-elegance-review.md`.
