# 1079 Deliberation - Telegram Bridge Bootstrap Handoff Extraction

## Decision

Proceed with a bounded Telegram bridge bootstrap handoff extraction after `1078`.

## Why this seam is next

- `1078` moved the remaining Telegram read-adapter factory out of `controlServer.ts`, leaving the bootstrap handoff into `createControlServerBootstrapLifecycle(...)` as the next real Telegram/control shell seam still inline.
- Real Symphony keeps the top-level shell thin and lets dedicated helpers assemble transport/bootstrap seams instead of feeding multi-part handoffs inline from the server surface.
- Extracting the remaining bootstrap handoff preserves that direction without broadening into Telegram bridge runtime, polling, or command behavior.

## Out-of-scope guardrails

- Keep Telegram bridge runtime and polling outside the extraction.
- Keep command-routing and mutating control behavior outside the extraction.
- Keep dispatch/question-read semantics outside the extraction.
- Keep top-level server bind/start ownership inside `controlServer.ts`.

## Approval note

Approved for docs-first registration based on the `1078` next-slice note and the same real-Symphony thin-shell guidance used across the current Telegram/control extraction sequence.
