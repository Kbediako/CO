# 1144 Next Slice Note

After `1144`, the remaining Telegram bridge shell is thin enough that the next truthful seam is no longer update-offset logic. The next bounded candidate is the bridge runtime lifecycle shell that still lives in `telegramOversightBridge.ts`: persisted-state/bootstrap startup, bot identity fetch, polling-controller start/abort wiring, and shutdown ordering against the projection notification queue.

That should stay separate from config/env parsing and separate from push-state policy. If opened, the next lane should keep `telegramOversightBridge.ts` as the public composition entrypoint while extracting only the startup/shutdown runtime choreography into one explicit helper.
