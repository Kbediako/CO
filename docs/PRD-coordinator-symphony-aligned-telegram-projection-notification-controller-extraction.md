# PRD - Coordinator Symphony-Aligned Telegram Projection Notification Controller Extraction

## Summary

After `1139` extracted the update-local ingress shell, the remaining non-lifecycle Telegram bridge surface is the outbound projection-notification branch in `telegramOversightBridge.ts`: projection rendering, push-state transition invocation, send/skip/pending handling, and Bot API send orchestration for projection updates.

## Problem

`telegramOversightBridge.ts` still mixes two different concerns:
- runtime shell ownership:
  - poll-loop lifecycle,
  - `next_update_id` persistence,
  - startup/shutdown,
  - queue ownership for projection notifications;
- outbound projection-notification orchestration:
  - projection rendering,
  - projection transition evaluation,
  - skip/pending/send branching,
  - fan-out send delivery to allowed chats,
  - post-send state persistence.

That leaves the bridge thicker than the current Symphony-aligned target even though ingress, mutating command, push-state policy, and transport clients are already isolated.

## Goals

- Extract the outbound Telegram projection-notification orchestration into one bounded helper/controller seam.
- Keep `telegramOversightBridge.ts` focused on poll/update sequencing, queue ownership, persistence shelling, and startup/shutdown.
- Preserve the existing read-controller presentation behavior, push-state transition behavior, and Bot API client behavior exactly.
- Keep Telegram mutation authority, update-ingress handling, and bridge state ownership unchanged.

## Non-Goals

- Changes to poll-loop lifecycle or `next_update_id` persistence.
- Changes to `ControlTelegramReadController` presentation formatting.
- Changes to `controlTelegramPushState.ts`.
- Changes to Telegram Bot API transport or `/control/action` transport.
- Changes to inbound Telegram update handling or Linear runtime behavior.

## User Value

- Continues the Symphony-like thinning of the Telegram runtime shell without weakening CO’s stricter control model.
- Makes outbound Telegram push behavior easier to evolve independently from bridge lifecycle and persistence.
- Sets up a cleaner final Telegram bridge shell for downstream operator and future user-facing surfaces.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns the inline `maybeSendProjectionDelta(...)` orchestration branch.
- A dedicated control-local helper/controller owns projection rendering, transition evaluation, send/skip/pending handling, and multi-chat send-path orchestration for one projection update.
- `telegramOversightBridge.ts` keeps queue ownership, closed checks, poll-loop sequencing, `next_update_id` persistence, startup/shutdown, and bot identity loading.
- Focused Telegram regressions prove projection push behavior remains unchanged.
