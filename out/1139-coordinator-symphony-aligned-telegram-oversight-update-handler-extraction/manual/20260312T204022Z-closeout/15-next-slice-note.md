# 1139 Next Slice Note

- Next bounded Telegram seam: extract the outbound projection-notification branch centered around `maybeSendProjectionDelta(...)` from `telegramOversightBridge.ts`.
- Why this seam is next:
  - it is the other self-contained Telegram transport branch still living in the bridge runtime,
  - it can be separated without moving poll-loop ownership, startup/shutdown, or update-ingress behavior back across the boundary,
  - it continues the Symphony-aligned bridge thinning track after ingress extraction without broadening into lifecycle/state refactors.
