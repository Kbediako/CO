# Findings - 1043 Question Queue Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1042` removed the standalone `/events` branch from `controlServer.ts`, leaving `/questions*` as the next smallest cohesive route cluster still inline.
- The questions subtree is bounded around one domain concept: listing queued questions, enqueuing them, answering them, dismissing them, and resolving individual records.
- Extracting it now continues the Symphony-aligned controller thinning without widening into the higher-risk `/control/action` transport/idempotency logic.

## Delegated Boundary Note

- A delegated read-only seam review confirmed `/questions*` as the next smallest Symphony-aligned extraction target after `1042`.
- The key regression surface to preserve is the queued-question contract: payload shape, status codes, queue mutations, child-question resolution, and the surrounding runtime publish / Telegram projection behavior.
