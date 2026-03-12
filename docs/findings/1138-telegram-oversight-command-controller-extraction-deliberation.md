# 1138 Deliberation - Telegram Oversight Command Controller Extraction

- Date: 2026-03-13
- Task: `1138-coordinator-symphony-aligned-telegram-oversight-command-controller-extraction`

## Why this slice

- `1137` closed the last high-value standalone-review contract mismatch and the parallel scout recommended pausing further review micro-lanes unless a new reproducible wrapper defect appears.
- The next higher-value Symphony-aligned seam is back on the runtime/operator surface: `telegramOversightBridge.ts` still mixes runtime lifecycle with operator command admission, routing, and reply generation.
- After `1126` and `1127`, the remaining Telegram surface is explicitly narrowed to the command cluster, which makes this a truthful bounded follow-on instead of a broader runtime rewrite.

## In Scope

- The inline command cluster currently centered around `handleUpdate`, command routing, and mutating command dispatch in `telegramOversightBridge.ts`.
- A single extracted Telegram command controller/helper.
- Focused Telegram bridge regression coverage for the preserved command behavior.

## Out of Scope

- Polling lifecycle, update offset persistence, startup/shutdown, or push-state sequencing.
- Telegram Bot API transport extracted in `1126`.
- `/control/action` transport client extracted in `1127`.
- Linear webhook or dispatch source refactors.
- Further standalone-review heuristic work unless a new live defect appears.

## Recommendation

- Proceed with one bounded Telegram command controller seam.
- Keep runtime shell ownership in `telegramOversightBridge.ts`.
- Keep `/pause` and `/resume` on the existing `/control/action` transport client so authority and traceability remain unchanged.
