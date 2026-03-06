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
- [ ] docs-review approval/override captured for registered `1031`. Evidence: `.runs/1031-coordinator-symphony-aligned-core-compatibility-response-builders/cli/<pending>/manifest.json` or `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/00-summary.md`.

## Core Compatibility Response Builders
- [ ] Core compatibility method-not-allowed, issue-not-found, route-not-found, and refresh-rejection response shaping is extracted from route-local controller assembly. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] `controlServer.ts` keeps route selection, method gating, auth, and final response emission while `/api/v1/dispatch` remains an explicit CO-only extension seam. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] Regression/manual evidence keeps the core-route and dispatch-extension separation explicit. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/11-manual-core-route-builders.json`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1031-coordinator-symphony-aligned-core-compatibility-response-builders/manual/<pending>/10-pack-smoke.log`.
