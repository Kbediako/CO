# Task Checklist - 1031-coordinator-symphony-aligned-core-compatibility-response-builders

- MCP Task ID: `1031-coordinator-symphony-aligned-core-compatibility-response-builders`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-core-compatibility-response-builders.md`
- TECH_SPEC: `tasks/specs/1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-core-compatibility-response-builders.md`

> This lane moves the remaining Symphony-aligned core compatibility response builders out of route-local controller assembly while keeping the CO dispatch extension separate.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `tasks/specs/1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `tasks/tasks-1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `.agent/task/1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1031-core-compatibility-response-builders-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`, `docs/findings/1031-core-compatibility-response-builders-deliberation.md`.
- [x] docs-review approval/override captured for registered `1031`. Evidence: `.runs/1031-coordinator-symphony-aligned-core-compatibility-response-builders/cli/2026-03-06T22-49-26-015Z-bf2771ea/manifest.json`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225303Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Core Compatibility Response Builders
- [x] Core compatibility method-not-allowed, issue-not-found, route-not-found, and refresh-rejection response shaping is extracted from route-local controller assembly. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [x] `controlServer.ts` keeps route selection, method gating, auth, and final response emission while `/api/v1/dispatch` remains an explicit CO-only extension seam. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [x] Regression/manual evidence keeps the core-route and dispatch-extension separation explicit. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/11-manual-core-route-builders.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/08-diff-budget.log`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/09-review.log`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/20260306T225559Z-closeout/10-pack-smoke.log`.
