# 1078 Deliberation - Telegram Oversight Read Adapter Factory Extraction

## Decision

Proceed with a bounded Telegram oversight read-adapter factory extraction after `1077`.

## Why this seam is next

- `1076` and `1077` moved the non-trivial Telegram question and dispatch read assembly into dedicated helpers, leaving the read-adapter factory as the next real Telegram-local shell seam still inline in `controlServer.ts`.
- Real Symphony keeps shells thin and lets transport surfaces consume dedicated helper seams instead of assembling multi-method read adapters inline.
- Extracting the remaining factory preserves that direction without broadening into Telegram polling, commands, or runtime semantics.

## Out-of-scope guardrails

- Keep Telegram polling and command-routing outside the extraction.
- Keep dispatch and question-read semantics outside the extraction.
- Keep authenticated/API route behavior outside the extraction.
- Keep lifecycle/bootstrap/event transport ownership inside `controlServer.ts`.

## Approval note

Approved for docs-first registration based on the `1077` next-slice note and the same real-Symphony thin-shell guidance used across the current Telegram/control extraction sequence.
