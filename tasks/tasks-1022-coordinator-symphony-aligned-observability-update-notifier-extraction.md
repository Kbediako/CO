# Task Checklist - 1022-coordinator-symphony-aligned-observability-update-notifier-extraction

- MCP Task ID: `1022-coordinator-symphony-aligned-observability-update-notifier-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-observability-update-notifier-extraction.md`
- TECH_SPEC: `tasks/specs/1022-coordinator-symphony-aligned-observability-update-notifier-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-update-notifier-extraction.md`

> This lane removes Telegram-specific observability update coupling after `1021`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `tasks/specs/1022-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `tasks/tasks-1022-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `.agent/task/1022-coordinator-symphony-aligned-observability-update-notifier-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1022-observability-update-notifier-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1022-coordinator-symphony-aligned-observability-update-notifier-extraction.md`, `docs/findings/1022-observability-update-notifier-extraction-deliberation.md`.
- [x] docs-review manifest captured for registered `1022` with a bounded review-wrapper override after guard stages passed. Evidence: `.runs/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/cli/2026-03-06T13-53-52-031Z-eb6d1b53/manifest.json`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T135954Z-docs-review-override/00-summary.md`.

## Runtime Implementation
- [x] Publishers use a generic observability update notifier instead of a Telegram-specific callback contract. Evidence: `orchestrator/src/cli/control/observabilityUpdateNotifier.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Telegram subscribes to the notifier without changing bridge read rendering or `/control/action` write behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`.
- [x] Current question/event-stream/Linear update trigger coverage stays coherent after the notifier extraction. Evidence: `orchestrator/tests/ObservabilityUpdateNotifier.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/09-manual-notifier-check.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/04-lint.log`.
- [x] `npm run test` attempted; targeted notifier/control/Telegram coverage passed and the full-suite quiet-tail override was recorded explicitly. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/05-targeted-tests.log`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/11-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/08-diff-budget.log`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/11-override-notes.md`.
- [x] `npm run review` attempted; the non-interactive prompt-only pass and forced low-signal drift run were both recorded explicitly. Evidence: `.runs/1022-coordinator-symphony-aligned-observability-update-notifier-extraction-scout/cli/2026-03-06T13-58-57-452Z-dd1ba3c9/review/output.log`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/11-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/12-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for notifier-driven Telegram coherence. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/09-manual-notifier-check.json`.
- [x] Explicit elegance review captured. Evidence: `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/10-elegance-review.md`.
- [x] Coherent `1022` commit recorded. Evidence: `137237003`.
