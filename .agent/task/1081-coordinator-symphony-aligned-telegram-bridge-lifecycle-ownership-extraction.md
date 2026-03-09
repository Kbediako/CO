# Task Checklist - 1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction

- MCP Task ID: `1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`
- TECH_SPEC: `tasks/specs/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`

> This lane extracts the remaining Telegram bridge lifecycle ownership so `controlServerBootstrapLifecycle.ts` keeps ordered startup ownership while Telegram-specific bridge state and cleanup move behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `tasks/specs/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `tasks/tasks-1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `.agent/task/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1081-telegram-bridge-lifecycle-ownership-extraction-deliberation.md`, `out/1080-coordinator-symphony-aligned-bootstrap-metadata-persistence-extraction/manual/20260309T061702Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction.md`, `docs/findings/1081-telegram-bridge-lifecycle-ownership-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1081`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T074500Z-docs-first/00-summary.md`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T074500Z-docs-first/05-docs-review-override.md`.

## Telegram Bridge Lifecycle Ownership

- [x] Telegram bridge lifecycle ownership extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlTelegramBridgeLifecycle.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/11-manual-telegram-bridge-lifecycle-check.json`.
- [x] `controlServerBootstrapLifecycle.ts` delegates Telegram bridge runtime ownership while preserving `persist -> expiry -> bridge` startup sequencing. Evidence: `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/11-manual-telegram-bridge-lifecycle-check.json`.
- [x] Lazy adapter creation, subscription attachment, and bridge shutdown behavior remain intact under focused regressions. Evidence: `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`, `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/01-delegation-guard.log`, `.runs/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction-guard/cli/2026-03-09T07-08-45-904Z-7c56f061/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/05-test.log`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/08-diff-budget.log`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/09-review.log`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock Telegram bridge lifecycle evidence captured. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/11-manual-telegram-bridge-lifecycle-check.json`.
- [x] Elegance review completed. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/12-elegance-review.md`.
