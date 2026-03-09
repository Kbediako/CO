# 1076 Deliberation - Telegram Question-Read Adapter Assembly Extraction

## Decision

Proceed with a bounded Telegram question-read adapter assembly extraction after `1075`.

## Why this seam is next

- `1075` moved the shared question-read sequencing itself out of both shells, so the remaining question-read complexity is now concentrated in Telegram oversight `readQuestions()` inside `controlServer.ts`.
- Real Symphony keeps controller shells thin and lets shared runtime/projection seams answer operator-facing reads; it does not treat HTTP or dashboard surfaces as the source of truth.
- Extracting the remaining Telegram question-read adapter assembly preserves that direction without broadening into queue mutations, Telegram rendering, or runtime rewrites.

## Out-of-scope guardrails

- Keep Telegram rendering and polling outside the extraction.
- Keep authenticated question queue routes outside the extraction.
- Keep expiry lifecycle ownership and child-resolution semantics unchanged.

## Approval note

Approved for docs-first registration based on the `1075` next-slice note plus real-Symphony guidance favoring thin controller shells over inline orchestration details.
