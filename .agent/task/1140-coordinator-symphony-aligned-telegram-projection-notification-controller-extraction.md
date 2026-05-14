# Task Checklist - 1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction

- MCP Task ID: `1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`

> This lane resumes the Symphony-aligned Telegram thinning track after `1139` by extracting the remaining outbound projection-notification shell while leaving queue ownership, bridge-state handling, and upstream helper ownership unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `tasks/specs/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `tasks/tasks-1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `.agent/task/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1140-telegram-projection-notification-controller-extraction-deliberation.md`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction.md`, `docs/findings/1140-telegram-projection-notification-controller-extraction-deliberation.md`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1140`. Evidence: `.runs/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/cli/2026-03-12T21-19-36-700Z-e8efbd12/manifest.json`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-docs-first/00-summary.md`

## Telegram Projection Notification Controller

- [x] `telegramOversightBridge.ts` delegates the outbound `maybeSendProjectionDelta(...)` shell into one bounded helper seam. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/00-summary.md`
- [x] The extracted controller owns projection rendering, transition evaluation, skip/pending/send branching, multi-chat send fan-out, and next-state return without moving queue ownership, `next_update_id` persistence, bot identity startup, or bridge lifecycle ownership out of the bridge shell. Evidence: `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/12-manual-telegram-projection-notification-check.md`
- [x] Existing `ControlTelegramReadController` and `controlTelegramPushState.ts` ownership remains unchanged. Evidence: `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts`, `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/12-manual-telegram-projection-notification-check.md`
- [x] Focused Telegram regressions prove the outbound projection-notification surface remains unchanged. Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/06-test.log`
- [x] `npm run docs:check` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/09-diff-budget.log`
- [x] `npm run review` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/10-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/11-pack-smoke.log`
- [x] Manual/mock Telegram projection-notification evidence captured. Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/12-manual-telegram-projection-notification-check.md`
- [x] Elegance review completed. Evidence: `out/1140-coordinator-symphony-aligned-telegram-projection-notification-controller-extraction/manual/20260312T211318Z-closeout/13-elegance-review.md`
