# Next Slice Note - 1026

- `1026` closes the Telegram-on-compatibility dependency, but it does not yet complete the broader Symphony-style runtime/presenter split.
- The next justified slice is a transport-neutral runtime snapshot layer for the selected run:
  - introduce one runtime-owned selected-run snapshot type that is not shaped as public snake_case DTOs,
  - make `observabilitySurface.ts` and `telegramOversightBridge.ts` presenter adapters over that runtime snapshot,
  - remove now-redundant runtime helpers such as `resolveIssueIdentifier()` when the presenter adapters no longer need them,
  - keep compatibility HTTP payloads stable while reducing the presenter coupling inside `ControlRuntime`.
- This keeps `1027` narrow: runtime snapshot type + presenter mapping only, not another behavior expansion.
