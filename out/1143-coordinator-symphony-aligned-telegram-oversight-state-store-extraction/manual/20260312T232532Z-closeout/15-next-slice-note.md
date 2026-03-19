# Next Slice Note

Next truthful bounded seam: extract the inbound Telegram polling/update-offset orchestration from [`telegramOversightBridge.ts`](../../../../orchestrator/src/cli/control/telegramOversightBridge.ts) into a dedicated controller, likely `controlTelegramPollingController.ts`.

Why this is next:
- The bridge now has explicit seams for read rendering, update handling, command handling, projection-notification policy, persisted state storage, and transport clients.
- The remaining unmatched control-path responsibility inside the bridge is the polling loop plus update-offset persistence path.
- Pulling that orchestration into its own controller would leave the bridge closer to a thin Symphony-style composition shell without reopening config parsing, push policy, or controller/client boundaries already extracted.

Expected bounded touch set:
- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- new `orchestrator/src/cli/control/controlTelegramPollingController.ts`
- new `orchestrator/tests/ControlTelegramPollingController.test.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
