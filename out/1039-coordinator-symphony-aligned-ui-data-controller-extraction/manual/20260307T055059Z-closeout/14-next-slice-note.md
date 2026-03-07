# Next Slice Note

- Recommended next slice: `Coordinator Symphony-Aligned UI Session Controller Extraction`.
- Why this seam:
  - After `1039`, the remaining standalone UI-adjacent route logic in `controlServer.ts` is the `/auth/session` branch.
  - That branch is bounded and self-contained: loopback enforcement, allowed-host/origin checks, and session token issuance.
  - Extracting it next continues the Symphony-aligned controller thinning without mixing in event-stream, webhook, or mutating control behavior.
- Non-goals for that slice:
  - No token-policy change.
  - No CSRF/auth reordering.
  - No webhook/control/Telegram/Linear behavior changes.
