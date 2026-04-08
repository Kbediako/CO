# Task Checklist - 1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery

- MCP Task ID: `1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`
- TECH_SPEC: `tasks/specs/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`

> This lane introduces bounded runtime discovery for compatibility `running` and `retrying` collections while keeping UI/Telegram on the existing selected-run seam.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `tasks/specs/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `tasks/tasks-1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `.agent/task/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1034-runtime-compatibility-collection-discovery-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery.md`, `docs/findings/1034-runtime-compatibility-collection-discovery-deliberation.md`.
- [x] docs-review approval/override captured for registered `1034`. Evidence: `.runs/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/cli/2026-03-07T02-27-59-777Z-f19359d3/manifest.json`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T023357Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Runtime Compatibility Collection Discovery
- [x] The compatibility runtime snapshot discovers bounded `running` and `retrying` entries beyond the selected manifest. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/00-summary.md`.
- [x] The selected-run seam remains available for UI/Telegram consumers while the compatibility API uses discovered runtime collections. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/11-manual-compatibility-collection-discovery.json`.
- [x] Regression/manual evidence keeps the compatibility route contract stable while collection population becomes more Symphony-aligned. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/11-manual-compatibility-collection-discovery.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/04-lint.log`.
- [x] `npm run test` (targeted compatibility regressions plus full suite). Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/05-targeted-tests.log`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/06-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/07-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/08-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/09-diff-budget.log`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/14-override-notes.md`.
- [x] `npm run review` override captured honestly after a diff-budget wrapper failure and timed rerun drift. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/12-review.log`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/12-review-rerun.log`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/12-review-rerun-timeout.txt`, `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/14-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1034-coordinator-symphony-aligned-runtime-compatibility-collection-discovery/manual/20260307T024437Z-closeout/10-pack-smoke.log`.
