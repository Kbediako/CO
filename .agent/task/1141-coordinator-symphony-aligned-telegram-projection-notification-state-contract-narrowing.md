# Task Checklist - 1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing

- MCP Task ID: `1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`
- TECH_SPEC: `tasks/specs/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`

> This lane resumes the Symphony-aligned Telegram thinning track after `1140` by narrowing the projection-notification controller contract while leaving queue ownership and whole-state assembly in the bridge runtime.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `tasks/specs/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `tasks/tasks-1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `.agent/task/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1141-telegram-projection-notification-state-contract-narrowing-deliberation.md`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing.md`, `docs/findings/1141-telegram-projection-notification-state-contract-narrowing-deliberation.md`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`
- [x] docs-review approval or explicit override captured for registered `1141`. Evidence: `.runs/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/cli/2026-03-12T21-47-16-133Z-d34bab4d/manifest.json`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T214301Z-docs-first/00-summary.md`

## Telegram Projection Notification State Contract

- [x] `controlTelegramProjectionNotificationController.ts` no longer accepts or returns the full `TelegramOversightBridgeState`. Evidence: `orchestrator/src/cli/control/controlTelegramProjectionNotificationController.ts`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/00-summary.md`
- [x] `telegramOversightBridge.ts` remains the owner of whole-state assembly, persistence, and queue ownership. Evidence: `orchestrator/src/cli/control/telegramOversightBridge.ts`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/12-manual-telegram-state-contract-check.md`
- [x] Existing dedupe/cooldown/send semantics remain unchanged. Evidence: `orchestrator/src/cli/control/controlTelegramPushState.ts`, `orchestrator/tests/ControlTelegramPushState.test.ts`, `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/12-manual-telegram-state-contract-check.md`
- [x] Focused controller regressions prove the narrowed state contract remains correct. Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/05-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/06-test.log`
- [x] `npm run docs:check` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/07-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/08-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/09-diff-budget.log`
- [x] `npm run review` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/10-review.log`
- [x] `npm run pack:smoke` Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/11-pack-smoke.log`
- [x] Manual/mock Telegram state-contract evidence captured. Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/12-manual-telegram-state-contract-check.md`
- [x] Elegance review completed. Evidence: `out/1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing/manual/20260312T215652Z-closeout/13-elegance-review.md`
