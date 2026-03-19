# 1081 Deliberation - Telegram Bridge Lifecycle Ownership Extraction

## Decision

Proceed with a bounded Telegram bridge lifecycle ownership extraction after `1080`.

## Why this seam is next

- `1080` isolated bootstrap metadata persistence behind `persistControlBootstrapMetadata(...)`, leaving Telegram bridge lifecycle ownership as the next remaining mixed concern inside `controlServerBootstrapLifecycle.ts`.
- A bounded `gpt-5.4` scout confirmed that bridge startup, runtime attachment, instance/unsubscribe state, and shutdown belong together as one seam.
- The scout explicitly advised against splitting bridge startup and bridge attachment into separate helpers because they share one cleanup path and would otherwise spread one concern across multiple files for little gain.

## Out-of-scope guardrails

- Keep `persistControlBootstrapMetadata(...)` unchanged.
- Keep expiry lifecycle ordering unchanged outside preserving `persist -> expiry -> bridge`.
- Keep `createControlTelegramReadAdapter(...)` unchanged.
- Keep `telegramOversightBridge.ts` internals outside the extraction.
- Avoid splitting bridge startup and bridge attachment across multiple new helpers/files.

## Approval note

Approved for docs-first registration based on the `1080` next-slice note and the bounded Telegram bridge lifecycle scout recommendation.
