# PRD - Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction

## Summary

After `1126` and `1127` extracted the Telegram Bot API transport and `/control/action` write client, the remaining mixed operator surface in `telegramOversightBridge.ts` is the inline mutating operator branch for `/pause` and `/resume`.

## Problem

`telegramOversightBridge.ts` still mixes two different concerns:
- runtime shell ownership:
  - polling lifecycle,
  - update offset persistence,
  - startup/shutdown,
  - push-state transitions;
- mutating operator command execution:
  - `/pause` and `/resume` request shaping,
  - reply generation for mutating outcomes,
  - control-action invocation for mutating commands.

That leaves the bridge thicker than the current Symphony-aligned target and keeps the transport-hardened mutating operator path mixed into the polling shell instead of isolated behind a smaller controller boundary.

## Goals

- Extract the `/pause` and `/resume` execution/reply path into one bounded controller seam.
- Keep `telegramOversightBridge.ts` focused on polling, update sequencing, persistence, push-state lifecycle, and read-command routing.
- Preserve `/pause` and `/resume` behavior through the existing `/control/action` transport client.
- Keep Telegram bot transport and control auth surfaces unchanged.

## Non-Goals

- Changes to polling/update lifecycle or `next_update_id` persistence.
- Changes to the Telegram Bot API transport client extracted in `1126`.
- Changes to the `/control/action` transport client extracted in `1127`.
- Push-state or projection-delta refactors.
- Linear or broader `controlServer.ts` work.

## User Value

- Continues the Symphony-like thinning of the operator/runtime shell without weakening CO’s stricter control model.
- Clarifies the boundary between operator command logic and runtime transport/lifecycle.
- Makes future downstream Telegram command work safer by isolating command behavior behind one smaller controller seam.

## Acceptance Criteria

- `telegramOversightBridge.ts` no longer owns the inline `/pause` and `/resume` request-shaping/reply-generation branch.
- A dedicated control-local helper/controller owns only `/pause` and `/resume` handling.
- `telegramOversightBridge.ts` continues to own command admission, slash-command normalization, and non-mutating read routing.
- `/pause` and `/resume` still flow through the existing `/control/action` client with the same nonce, actor, transport, and traceability behavior.
- Focused Telegram bridge regressions prove the existing operator command surface remains unchanged.
