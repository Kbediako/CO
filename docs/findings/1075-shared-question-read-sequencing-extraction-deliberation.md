# 1075 Deliberation - Shared Question-Read Sequencing Extraction

## Decision

Proceed with a bounded shared-sequencing extraction after `1074`.

## Why this seam is next

- `1074` intentionally left the question-read sequence inline at both call sites after fixing the semantics.
- The authenticated `/questions` route and Telegram oversight `readQuestions()` now share real autonomous coordination logic, not just similar transport behavior.
- Extracting that sequence next reduces drift without widening into Telegram rendering or broad controller work.

## Out-of-scope guardrails

- Keep Telegram message rendering and polling outside the extraction.
- Keep expiry lifecycle ownership unchanged.
- Do not expand into a full question controller/service layer beyond the shared read sequence.

## Approval note

Approved for docs-first registration based on the `1074` next-slice note and the live shared sequencing still present in `questionQueueController.ts` and `controlServer.ts`.
