# Task Checklist - 1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters

- MCP Task ID: `1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`
- TECH_SPEC: `tasks/specs/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`

> This lane moves selected-run compatibility/UI presenter ownership out of `ControlRuntime` while preserving `readSelectedRunSnapshot()` as the runtime seam.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `tasks/specs/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `tasks/tasks-1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `.agent/task/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1028-controller-owned-compatibility-and-ui-presenters-deliberation.md`.

## Shared Registry + Review Handoff
- [ ] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters.md`, `docs/findings/1028-controller-owned-compatibility-and-ui-presenters-deliberation.md`.
- [ ] docs-review manifest captured for registered `1028`. Evidence: `.runs/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/cli/<pending>/manifest.json`.

## Presenter / Controller Ownership
- [ ] `ControlRuntimeSnapshot` keeps `readSelectedRunSnapshot()` and stops exporting selected-run compatibility/UI presentation wrappers. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`.
- [ ] `/ui/data.json`, `/api/v1/state`, and `/api/v1/:issue_identifier` payload shaping moves to controller/presenter helpers over `readSelectedRunSnapshot()`. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Existing selected-run payloads remain backward-compatible across state, issue, and UI projections. Evidence: `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/09-review.log`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/10-pack-smoke.log`.
- [ ] Manual simulated/mock selected-run presenter evidence captured. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/11-manual-selected-run-presenter.json`.
- [ ] Explicit elegance review captured. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/12-elegance-review.md`.
- [ ] Coherent `1028` commit recorded. Evidence: `out/1028-coordinator-symphony-aligned-controller-owned-compatibility-and-ui-presenters/manual/<pending>/00-summary.md`, git history for commit `<pending>`.

