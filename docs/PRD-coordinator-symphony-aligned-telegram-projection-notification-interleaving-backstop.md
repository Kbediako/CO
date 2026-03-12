# PRD - Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop

## Summary

After `1141` narrowed the Telegram projection-notification controller contract, the next truthful hardening slice is not another Telegram production refactor. It is an explicit regression backstop for the bridge-owned interleaving semantics between `handleUpdates(...)` and `maybeSendProjectionDelta(...)`.

## Problem

`telegramOversightBridge.ts` now correctly preserves `next_update_id` and keeps top-level `updated_at` monotonic when applying projection-notification state patches. However, that bridge-owned merge story is still proven only indirectly through the existing push-path tests and reasoning about the runtime interleaving. There is no direct backstop that simulates the relevant overlap between:

- update-offset persistence through `handleUpdates(...)`,
- projection-patch application through `maybeSendProjectionDelta(...)`,
- final persisted state ownership in the bridge runtime.

## Goals

- Add direct regression proof that the bridge preserves `next_update_id` when projection notification work overlaps with update processing.
- Add direct regression proof that bridge-level `updated_at` remains monotonic under the same overlap.
- Keep the slice bounded to a backstop/proof seam unless a minimal production fix is required by the new tests.

## Non-Goals

- No new Telegram runtime features.
- No queue/lifecycle redesign.
- No further controller extraction.
- No transport/read-presentation changes.

## Outcome

The Telegram bridge should have an explicit, reviewable regression backstop for the post-1141 merge semantics, so future Symphony-aligned refactors do not rely on implicit reasoning alone.
