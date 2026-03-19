# 1073 Deliberation - Question Child-Resolution Adapter Extraction

## Decision

Take the child-run question-resolution adapter boundary next.

## Why this seam

- It is the remaining internal autonomy boundary still assembled inline by `controlServer.ts`.
- It is more aligned with the long-term “manage work instead of supervising agents” goal than a Telegram/provider-specific extraction.
- It stays bounded: adapter composition and fallback emission wiring can move without widening into route/controller extraction.

## Keep in `controlServer.ts`

- Request admission and authenticated dispatch.
- Expiry/bootstrap lifecycle ownership.
- Telegram/provider sequencing.
- Higher-level audit emitters outside the child-resolution assembly seam.
