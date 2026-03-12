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

- [ ] `controlTelegramProjectionNotificationController.ts` no longer accepts or returns the full `TelegramOversightBridgeState`.
- [ ] `telegramOversightBridge.ts` remains the owner of whole-state assembly, persistence, and queue ownership.
- [ ] Existing dedupe/cooldown/send semantics remain unchanged.
- [ ] Focused controller regressions prove the narrowed state contract remains correct.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock Telegram state-contract evidence captured.
- [ ] Elegance review completed.
