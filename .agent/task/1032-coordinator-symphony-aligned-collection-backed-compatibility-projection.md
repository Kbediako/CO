# Task Checklist - 1032-coordinator-symphony-aligned-collection-backed-compatibility-projection

- MCP Task ID: `1032-coordinator-symphony-aligned-collection-backed-compatibility-projection`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`
- TECH_SPEC: `tasks/specs/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`

> This lane moves the Symphony-aligned compatibility state/issue readers onto an explicit collection-backed projection while leaving selected-run consumers intact.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `tasks/specs/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `tasks/tasks-1032-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `.agent/task/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1032-collection-backed-compatibility-projection-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection.md`, `docs/findings/1032-collection-backed-compatibility-projection-deliberation.md`.
- [x] docs-review approval/override captured for registered `1032`. Evidence: `.runs/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/cli/2026-03-06T23-27-09-868Z-9572b1b3/manifest.json`, `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/20260306T232904Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Compatibility Projection
- [ ] Compatibility state and issue readers consume a collection-backed projection instead of reading `snapshot.selected` directly. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] The selected-run runtime seam remains available for non-core UI/Telegram consumers while the compatibility API moves onto the new projection. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] Regression/manual evidence keeps the compatibility route contract stable while making the read-model shape more Symphony-aligned. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/11-manual-compatibility-projection.json`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1032-coordinator-symphony-aligned-collection-backed-compatibility-projection/manual/<pending>/10-pack-smoke.log`.
