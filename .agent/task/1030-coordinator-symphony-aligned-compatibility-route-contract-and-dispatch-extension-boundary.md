# Task Checklist - 1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary

- MCP Task ID: `1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`
- TECH_SPEC: `tasks/specs/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`

> This lane tightens the remaining compatibility route contract against the real Symphony controller/presenter shape and makes the CO-only dispatch route boundary explicit.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `tasks/specs/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `tasks/tasks-1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `.agent/task/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1030-compatibility-route-contract-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary.md`, `docs/findings/1030-compatibility-route-contract-deliberation.md`.
- [x] docs-review approval/override captured for registered `1030`. Evidence: `.runs/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/cli/2026-03-06T21-38-33-728Z-9c34c407/manifest.json`, `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214215Z-preimpl-review-and-docs-review-override/00-summary.md`.

## Contract Alignment
- [ ] Compatibility state/refresh/issue routes follow a clearer Symphony-aligned controller/presenter contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] `/api/v1/dispatch` is isolated as an explicit CO extension boundary without changing advisory-only behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`.
- [ ] Regression coverage distinguishes Symphony-aligned compatibility routes from the CO-specific dispatch extension. Evidence: `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/<pending>/10-pack-smoke.log`.
