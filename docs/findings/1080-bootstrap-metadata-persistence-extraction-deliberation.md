# 1080 Deliberation - Bootstrap Metadata Persistence Extraction

## Decision

Proceed with a bounded bootstrap metadata persistence extraction after `1079`.

## Why this seam is next

- `1079` removed the remaining Telegram bridge bootstrap handoff from `controlServer.ts`, leaving `controlServerBootstrapLifecycle.ts` as the next smallest implementation seam in the bootstrap path.
- Inside that lifecycle, metadata persistence is already one cohesive phase separate from expiry start and bridge startup/attach.
- A bounded `gpt-5.4` scout confirmed this is the cleanest next slice and explicitly advised against widening into bridge attach/teardown behavior.

## Out-of-scope guardrails

- Keep Telegram bridge runtime, polling, subscription semantics, and teardown outside the extraction.
- Keep expiry lifecycle ownership and ordering outside the extraction except for preserving the existing `persist -> expiry -> bridge` contract.
- Keep `controlServer.ts` bind/listen/start ownership outside the extraction unless a tiny import-site touch is forced by the helper interface.
- Keep `controlTelegramBridgeBootstrapLifecycle.ts` and Telegram read-adapter assembly outside the extraction; `1079` already closed that seam.

## Approval note

Approved for docs-first registration based on the `1079` next-slice note and the bounded lifecycle-scout recommendation that bootstrap metadata persistence is the smallest clean follow-on seam.
