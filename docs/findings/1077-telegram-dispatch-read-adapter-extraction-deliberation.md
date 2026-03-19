# 1077 Deliberation - Telegram Dispatch Read Adapter Extraction

## Decision

Proceed with a bounded Telegram dispatch-read adapter assembly extraction after `1076`.

## Why this seam is next

- `1076` removed the remaining Telegram-local question-read assembly from `controlServer.ts`, leaving the dispatch-read path as the next non-trivial Telegram-local setup seam still inline in the shell.
- Real Symphony keeps shells thin and lets shared runtime/projection seams answer operator-facing reads; it does not treat transport/controller surfaces as the source of truth.
- Extracting the remaining Telegram dispatch-read adapter assembly preserves that direction without broadening into dispatch semantics, polling, or broader Telegram controller rewrites.

## Out-of-scope guardrails

- Keep dispatch evaluation semantics outside the extraction.
- Keep authenticated/API dispatch routes outside the extraction.
- Keep Telegram rendering and polling outside the extraction.
- Keep selected-run read adapter behavior unchanged.

## Approval note

Approved for docs-first registration based on the `1076` next-slice note and the same real-Symphony thin-shell guidance used across the current control-surface extraction sequence.
