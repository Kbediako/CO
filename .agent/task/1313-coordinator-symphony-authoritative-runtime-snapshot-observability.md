# Task Checklist - 1313-coordinator-symphony-authoritative-runtime-snapshot-observability

- MCP Task ID: `1313-coordinator-symphony-authoritative-runtime-snapshot-observability`
- Primary PRD: `docs/PRD-coordinator-symphony-authoritative-runtime-snapshot-observability.md`
- TECH_SPEC: `tasks/specs/1313-coordinator-symphony-authoritative-runtime-snapshot-observability.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-authoritative-runtime-snapshot-observability.md`

## Docs-first
- [x] PRD drafted for the backend-authoritative runtime snapshot parity slice after `1312`. Evidence: `docs/PRD-coordinator-symphony-authoritative-runtime-snapshot-observability.md`.
- [x] TECH_SPEC drafted for the backend-authoritative runtime snapshot parity slice. Evidence: `tasks/specs/1313-coordinator-symphony-authoritative-runtime-snapshot-observability.md`, `docs/TECH_SPEC-coordinator-symphony-authoritative-runtime-snapshot-observability.md`.
- [x] ACTION_PLAN drafted for the backend-authoritative runtime snapshot parity slice. Evidence: `docs/ACTION_PLAN-coordinator-symphony-authoritative-runtime-snapshot-observability.md`.
- [x] `tasks/index.json` registers the `1313` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1313` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1313-coordinator-symphony-authoritative-runtime-snapshot-observability.md`. Evidence: `.agent/task/1313-coordinator-symphony-authoritative-runtime-snapshot-observability.md`.
- [x] docs-review evidence recorded for `1313`. Evidence: `.runs/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/cli/2026-03-21T10-51-39-272Z-84d7b8f1/manifest.json`, `out/1313-coordinator-symphony-authoritative-runtime-snapshot-observability/manual/20260321T110919Z-docs-first/05-docs-review-override.md`.
- [x] Current publication posture is explicit: `1312`, `1313`, and `1314` are the integrated implemented slices on this branch, while `1315` remains a separate next slice. Evidence: `docs/TASKS.md`, `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.

## Implementation
- [x] Provider-worker/runtime capture exposes authoritative runtime snapshot fields beyond narrow lineage proof. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Compatibility running payloads stop hardcoding runtime fields to `null` where authoritative data exists. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] `/api/v1/state` exposes authoritative `codex_totals` and latest `rate_limits`. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`.
- [x] `/api/v1/<issue>` exposes authoritative running payloads on the current head, while retry and attempts truthfulness is completed by adjacent slice `1314`. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `docs/TASKS.md`.
- [x] Optional dashboard/TUI/Telegram richness remains explicitly out of scope unless backend/API work forces a companion update. Evidence: `docs/PRD-coordinator-symphony-authoritative-runtime-snapshot-observability.md`, `docs/TECH_SPEC-coordinator-symphony-authoritative-runtime-snapshot-observability.md`, `docs/TASKS.md`.

## Validation
- [x] Focused worker/runtime/API regressions proving authoritative runtime fields. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run build`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run lint`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run test`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run docs:check`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run docs:freshness`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [ ] review. Evidence: pending a current-head rerun in `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh` after the selected-run overridden-runs-root fix and docs truth refresh; older `20260321T124445Z-stacked-closeout` is stale and must not be cited as current-head review/elegance evidence.
- [x] `npm run pack:smoke` if required by touched downstream-facing surfaces. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [ ] Live control-host proof for `/api/v1/state` and `/api/v1/<issue>`.
