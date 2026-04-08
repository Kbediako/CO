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
- [x] Compatibility state/refresh/issue routes follow a clearer Symphony-aligned controller/presenter contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/11-manual-route-boundary.json`.
- [x] `/api/v1/dispatch` is isolated as an explicit CO extension boundary without changing advisory-only behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/11-manual-route-boundary.json`.
- [x] Regression coverage distinguishes Symphony-aligned compatibility routes from the CO-specific dispatch extension. Evidence: `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/09-review.log`, `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated/mock route-boundary evidence captured. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/11-manual-route-boundary.json`.
- [x] Explicit elegance review captured. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/12-elegance-review.md`.
- [x] Coherent `1030` commit recorded. Evidence: `out/1030-coordinator-symphony-aligned-compatibility-route-contract-and-dispatch-extension-boundary/manual/20260306T214450Z-closeout/00-summary.md`, git history for the final `1030` commit pair.
