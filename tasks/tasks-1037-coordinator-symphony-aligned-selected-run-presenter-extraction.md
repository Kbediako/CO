# Task Checklist - 1037-coordinator-symphony-aligned-selected-run-presenter-extraction

- MCP Task ID: `1037-coordinator-symphony-aligned-selected-run-presenter-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-selected-run-presenter-extraction.md`
- TECH_SPEC: `tasks/specs/1037-coordinator-symphony-aligned-selected-run-presenter-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-presenter-extraction.md`

> This lane extracts selected-run presenter policy into a dedicated helper while preserving the current UI, Telegram, and dispatch seams.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `tasks/specs/1037-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `tasks/tasks-1037-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `.agent/task/1037-coordinator-symphony-aligned-selected-run-presenter-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1037-selected-run-presenter-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1037-coordinator-symphony-aligned-selected-run-presenter-extraction.md`, `docs/findings/1037-selected-run-presenter-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1037`. Evidence: `.runs/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/cli/2026-03-07T04-18-17-394Z-b54f35a1/manifest.json`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T041423Z-docs-first/00-summary.md`.

## Selected-Run Presenter Extraction
- [x] Selected-run payload helpers are extracted into a dedicated presenter module. Evidence: `orchestrator/src/cli/control/selectedRunPresenter.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] `/ui/data.json` assembly remains behaviorally aligned after the extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/11-manual-selected-run-presenter.json`.
- [x] Runtime caching, compatibility routes, and dispatch evaluation stay on their current seams. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/05-test.log`.
- [x] Telegram rendering/fingerprint behavior remains unchanged in this slice. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/05-test.log`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/12-elegance-review.md`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/08-diff-budget.log`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/09-review.log`, `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/10-pack-smoke.log`.
- [x] Manual simulated selected-run presenter artifact captured. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/11-manual-selected-run-presenter.json`.
- [x] Elegance review completed. Evidence: `out/1037-coordinator-symphony-aligned-selected-run-presenter-extraction/manual/20260307T042627Z-closeout/12-elegance-review.md`.
