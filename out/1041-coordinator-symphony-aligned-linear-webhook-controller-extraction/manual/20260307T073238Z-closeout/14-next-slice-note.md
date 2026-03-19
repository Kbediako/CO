# 1041 Next Slice Note

- Recommended next slice: `Coordinator Symphony-Aligned Event Stream Controller Extraction`.
- Why this seam:
  - After `1041`, the remaining standalone transport-specific route inside `controlServer.ts` is `/events`.
  - That branch is bounded: SSE bootstrap headers, initial heartbeat, client registration, and disconnect cleanup can move together without changing auth/CSRF ordering or mutating control behavior.
  - Extracting it next continues the Symphony-aligned controller thinning without mixing in the broader pause/resume/question command surface.
- Non-goals for that slice:
  - No auth-token policy changes.
  - No CSRF or runner-only gate reordering.
  - No webhook, Telegram, or Linear behavior changes.
  - No mutation/control-command payload changes.
