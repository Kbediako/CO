# Task Checklist - 1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source

- MCP Task ID: `1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`
- TECH_SPEC: `tasks/specs/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`

> This lane moves the compatibility projection off the selected-run runtime snapshot and onto a dedicated compatibility-oriented runtime source while keeping selected-run consumers intact.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `tasks/specs/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `tasks/tasks-1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `.agent/task/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1033-runtime-compatibility-snapshot-source-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source.md`, `docs/findings/1033-runtime-compatibility-snapshot-source-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1033`. Evidence: `.runs/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/cli/<pending>/manifest.json`, `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/00-summary.md`.

## Runtime Compatibility Snapshot Source
- [ ] The compatibility projection is fed by a dedicated runtime compatibility snapshot source rather than `readSelectedRunSnapshot()`. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`.
- [ ] The selected-run seam remains available for UI/Telegram consumers while the compatibility API uses the new source boundary. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`.
- [ ] Regression/manual evidence keeps the compatibility route contract stable while the source boundary becomes more Symphony-aligned. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/11-manual-runtime-compatibility-source.json`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1033-coordinator-symphony-aligned-runtime-compatibility-snapshot-source/manual/<pending>/10-pack-smoke.log`.
