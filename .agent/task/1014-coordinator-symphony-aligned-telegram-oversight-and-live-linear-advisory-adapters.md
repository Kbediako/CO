# Task Checklist - 1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters

- MCP Task ID: `1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
- TECH_SPEC: `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`

> This lane converts the already-closed Telegram/Linear planning work into real provider adapters while preserving the current CO control-core authority boundaries.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `tasks/tasks-1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`, `.agent/task/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1014-symphony-aligned-telegram-linear-adapter-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] docs-review manifest captured for registered `1014`. Evidence: `.runs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/cli/2026-03-06T04-18-31-811Z-42d25bd1/manifest.json`.

## Runtime Implementation
- [x] Live Linear advisory resolver implemented with fail-closed provider/runtime behavior. Evidence: `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/trackerDispatchPilot.ts`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/10-live-linear-provider-probe.json`.
- [x] Compatibility projections expose tracked live Linear metadata for the active item view. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/09-manual-telegram-linear-mock.json`.
- [x] Telegram polling oversight adapter implemented with bounded read-only commands. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/09-manual-telegram-linear-mock.json`.
- [x] Telegram `/pause` and `/resume` controls are routed through existing transport guardrails. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/09-manual-telegram-linear-mock.json`.

## Validation + Closeout
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/08-diff-budget.log`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/15-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/11-review.log`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/15-override-notes.md`.
- [x] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/12-pack-smoke.log`.
- [x] Manual simulated/mock usage evidence captured for Telegram and Linear. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/09-manual-telegram-linear-mock.json`, `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/10-live-linear-provider-probe.json`.
- [x] Explicit elegance review captured. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/13-elegance-review.md`.
- [x] Coherent 1014 commit recorded. Evidence: `out/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/manual/20260306T051009Z-closeout/16-commit-record.md`.
