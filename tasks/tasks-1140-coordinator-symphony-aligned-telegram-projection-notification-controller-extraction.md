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

- [ ] `telegramOversightBridge.ts` delegates the outbound `maybeSendProjectionDelta(...)` shell into one bounded helper seam.
- [ ] The extracted controller owns projection rendering, transition evaluation, skip/pending/send branching, multi-chat send fan-out, and next-state return without moving queue ownership, `next_update_id` persistence, bot identity startup, or bridge lifecycle ownership out of the bridge shell.
- [ ] Existing `ControlTelegramReadController` and `controlTelegramPushState.ts` ownership remains unchanged.
- [ ] Focused Telegram regressions prove the outbound projection-notification surface remains unchanged.

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
- [ ] Manual/mock Telegram projection-notification evidence captured.
- [ ] Elegance review completed.
