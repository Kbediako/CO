# TECH_SPEC: Coordinator Symphony-Aligned Telegram Projection Delivery Queue Shell Extraction

## Context

`1145` extracted bridge startup/shutdown lifecycle choreography into `telegramOversightBridgeRuntimeLifecycle.ts`. The remaining behaviorally non-trivial Telegram bridge seam is the queued projection delivery path in `telegramOversightBridge.ts`: queue ownership, closed/push gating, projection-controller invocation, `statePatch` application, and persisted-state write-through after projection delivery.

## In Scope

- Extract the queued projection delivery runtime shell from `telegramOversightBridge.ts` into one dedicated helper.
- Keep the bridge responsible for whole-state ownership while delegating bounded projection-delivery orchestration.
- Add focused unit coverage for the new helper plus bridge regression coverage for the integrated path.

## Out of Scope

- Env/config parsing
- `next_update_id` persistence and polling offset advancement
- Telegram polling lifecycle
- Telegram command/read surfaces
- Projection notification policy or presenter behavior

## Design

1. Introduce one dedicated helper module that owns:
   - closed/push gating for projection delivery entry
   - serialized notification queue chaining
   - controller-driven projection delivery callout
   - bridge callback-driven `statePatch` application and persisted-state write-through after delivery
2. Keep `telegramOversightBridge.ts` as the public composition entrypoint and owner of:
   - bridge-local whole-state storage
   - `next_update_id` persistence
   - controller/client composition
   - config resolution and startup factory behavior
3. Preserve the current shutdown hookup so lifecycle close still waits for the queued projection work through explicit helper callbacks rather than hidden global state.

## Validation

- Focused Telegram tests for the extracted projection delivery helper and integrated bridge behavior
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
