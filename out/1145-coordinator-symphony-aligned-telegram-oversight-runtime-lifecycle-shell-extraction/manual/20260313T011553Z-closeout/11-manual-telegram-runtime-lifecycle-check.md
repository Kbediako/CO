# 1145 Manual Telegram Runtime Lifecycle Check

## Checked seam

- `telegramOversightBridgeRuntimeLifecycle.ts` now owns:
  - persisted-state load and bridge state bootstrap
  - bot identity fetch for startup logging / polling runtime context
  - polling-controller start and shutdown wait
  - abort-on-close plus queued notification flush swallowing during shutdown
- `telegramOversightBridge.ts` still owns:
  - public composition entrypoint and config resolution
  - bridge-local state authority and persisted-state writes
  - `next_update_id` advancement via `persistNextUpdateId(...)`
  - projection notification queueing and `statePatch` application

## Evidence

- Focused lifecycle + bridge regressions: `05b-targeted-tests.log`
- Final full suite: `05-test.log`
- Bounded review: `09-review.log`

## Verdict

The shipped extraction matches the `1145` scope: runtime lifecycle choreography moved out of the bridge, but bridge state authority and projection notification ownership did not.
