# Task Checklist - 1036-coordinator-symphony-aligned-compatibility-issue-index-extraction

- MCP Task ID: `1036-coordinator-symphony-aligned-compatibility-issue-index-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`
- TECH_SPEC: `tasks/specs/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`

> This lane extracts compatibility-only issue presenter policy into a dedicated helper while preserving the `1035` behavior and the selected-run seam.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `tasks/specs/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `tasks/tasks-1036-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `.agent/task/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1036-compatibility-issue-index-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction.md`, `docs/findings/1036-compatibility-issue-index-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1036`. Evidence: `.runs/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/cli/2026-03-07T03-45-12-476Z-7f216ba0/manifest.json`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T034204Z-docs-first/00-summary.md`.

## Compatibility Presenter Extraction
- [x] Compatibility issue aggregation, representative selection, and canonical/alias lookup policy are extracted into a dedicated presenter/helper module. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/11-manual-compatibility-presenter.json`.
- [x] Compatibility route payloads remain behaviorally aligned with `1035` after the extraction. Evidence: `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/05b-targeted-tests.log`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/11-manual-compatibility-presenter.json`.
- [x] The selected-run seam remains current-run-only for `/ui/data.json`, Telegram oversight, and dispatch evaluation. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/11-manual-compatibility-presenter.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/05b-targeted-tests.log`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/05-test.log`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/08-diff-budget.log`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/09-review.log`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/09-review-timeout.txt`, `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1036-coordinator-symphony-aligned-compatibility-issue-index-extraction/manual/20260307T035705Z-closeout/10-pack-smoke.log`.
