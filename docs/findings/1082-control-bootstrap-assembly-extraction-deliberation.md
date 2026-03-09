# 1082 Deliberation - Control Bootstrap Assembly Extraction

## Decision

Proceed with a bounded control bootstrap assembly extraction after `1081`.

## Why this seam is next

- `1081` isolated Telegram bridge lifecycle ownership, leaving `ControlServer.start()` as the remaining place where expiry lifecycle assembly and Telegram bootstrap assembly are still wired inline.
- The next smallest coherent step is one helper that assembles both lifecycle collaborators together and returns ready-to-start pieces.
- Keeping both assembly paths together avoids spreading one bootstrap concern across multiple micro-files.
- A bounded `gpt-5.4` scout confirmed the exact seam: extract only the inline collaborator assembly block around `createControlExpiryLifecycle(...)` and `createControlTelegramBridgeBootstrapLifecycle(...)`, while excluding bind/listen, close sequencing, and deeper lifecycle internals.

## Out-of-scope guardrails

- Keep `persistControlBootstrapMetadata(...)` unchanged.
- Keep HTTP bind/listen and base URL derivation in `ControlServer.start()`.
- Keep deeper lifecycle internals out of scope.
- Avoid splitting expiry assembly and Telegram bridge bootstrap assembly into separate helpers/files.

## Approval note

Approved for docs-first registration based on the `1081` next-slice note, bounded read-only inspection of the remaining `ControlServer.start()` assembly seam, and a bounded `gpt-5.4` scout recommendation.
