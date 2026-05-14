# PRD: Coordinator Symphony-Aligned Telegram Projection Delivery Queue Shell Extraction

## Problem

After `1145`, `telegramOversightBridge.ts` still owns the queued projection delivery runtime path: closed-state gating, serialized notification queue chaining, projection-controller result application, and the persisted-state write after projection delivery. That runtime behavior is still embedded in the bridge even though adjacent Telegram seams have already been extracted.

## Goal

Extract the queued projection delivery shell into one dedicated helper while keeping `telegramOversightBridge.ts` as the public composition entrypoint and the sole owner of bridge-local whole-state authority.

## Non-Goals

- Reopening Telegram env/config parsing
- Reopening constructor/client/controller composition
- Moving `next_update_id` authority or persistence helpers out of the bridge
- Changing projection notification policy, cooldown semantics, or message rendering

## Requirements

1. One dedicated helper owns the queued projection delivery shell currently embedded in `telegramOversightBridge.ts`.
2. `telegramOversightBridge.ts` remains the public composition entrypoint and authoritative owner of bridge-local persisted state.
3. Closed-state gating, serialized queue chaining, controller-driven patch application, and final persisted-state writes remain behaviorally unchanged.
4. Focused regressions cover the extracted projection delivery seam plus the existing integrated bridge behavior.

## Success Criteria

- The projection delivery runtime is extracted without reopening config or whole-state authority.
- Focused Telegram regressions and the standard closeout gate bundle pass on the final tree.
