# 1146 Deliberation - Telegram Projection Delivery Queue Shell Extraction

- Date: 2026-03-13
- Result: approved

## Why this seam

- After `1145`, the remaining behaviorally non-trivial Telegram bridge shell is the queued projection delivery runtime: queue ownership, closed/push gating, projection-controller callout, `statePatch` application, and persisted-state write-through after delivery.
- This is more truthful than config/env parsing or constructor breakup because it is still production runtime behavior embedded in `telegramOversightBridge.ts`, not just movable DI glue.
- The slice stays bounded by explicitly excluding `next_update_id` persistence and env/config resolution.
