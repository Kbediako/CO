# 1126 Next Slice Note

- Recommended next bounded slice: extract the `/control/action` write client from `telegramOversightBridge.ts` into one dedicated control-transport helper.
- In scope:
  - the direct control POST transport boundary used by `/pause` and `/resume`,
  - `writeControlJson(...)`,
  - control-response parsing and error translation.
- Out of scope:
  - polling lifecycle,
  - update routing,
  - push-state policy,
  - Telegram Bot API transport,
  - broader command/config refactors.
- Why this is next: it removes the remaining inline external protocol dependency from the bridge runtime without broadening into sequencing or policy logic, preserving the current Symphony-aligned seam progression.
