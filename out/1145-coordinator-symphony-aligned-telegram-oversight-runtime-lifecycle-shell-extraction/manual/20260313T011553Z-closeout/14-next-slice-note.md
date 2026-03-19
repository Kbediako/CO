# 1145 Next Slice Note

After `1145`, the remaining Telegram bridge shell is no longer startup/shutdown lifecycle. The next truthful bounded seam is the bridge-local projection notification queue shell that still lives in `telegramOversightBridge.ts`: closed-state gating, serialized `notificationQueue` chaining, controller-driven `statePatch` application, and the final persisted-state write after projection delivery.

That seam is more truthful than config/env parsing or a broad constructor refactor because it is still production runtime behavior embedded in the bridge, and it can be extracted without moving bridge state authority. If opened, the next lane should keep `telegramOversightBridge.ts` as the public composition entrypoint and keep `next_update_id` authority and whole-state ownership in the bridge, while extracting only the projection notification queue/orchestration shell.
