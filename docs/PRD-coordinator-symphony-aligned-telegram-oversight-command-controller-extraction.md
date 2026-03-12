# PRD - Coordinator Symphony-Aligned Telegram Oversight Command Controller Extraction

## Summary

After `1126` and `1127` extracted the Telegram Bot API transport and `/control/action` write client, the remaining mixed operator surface in `telegramOversightBridge.ts` is the inline command admission, routing, and reply-generation cluster.

## Problem

`telegramOversightBridge.ts` still mixes two different concerns:
- runtime shell ownership:
  - polling lifecycle,
  - update offset persistence,
  - startup/shutdown,
  - push-state transitions;
- operator command handling:
  - command admission,
  - `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, `/pause`, `/resume` routing,
  - reply generation,
  - control-action invocation for mutating commands.

That leaves the bridge thicker than the current Symphony-aligned target and makes the downstream operator surface harder to evolve independently from the poll/update runtime shell.

## Goals

- Extract Telegram command admission/routing/reply generation into one bounded controller seam.
- Keep `telegramOversightBridge.ts` focused on polling, update sequencing, persistence, and push-state lifecycle.
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

- `telegramOversightBridge.ts` no longer owns the inline command admission/routing/reply-generation cluster.
- A dedicated control-local helper/controller owns `/help`, `/status`, `/issue`, `/dispatch`, `/questions`, `/pause`, and `/resume` command handling.
- `/pause` and `/resume` still flow through the existing `/control/action` client with the same nonce, actor, transport, and traceability behavior.
- Focused Telegram bridge regressions prove the existing operator command surface remains unchanged.
