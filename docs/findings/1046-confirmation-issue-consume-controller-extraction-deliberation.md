# Findings - 1046 Confirmation Issue Consume Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1045` removed the standalone `/delegation/register` branch from `controlServer.ts`, leaving `/confirmations/issue` and `/confirmations/consume` as the next smallest cohesive HTTP routes still inline.
- Those two routes share one concept: expire old confirmations, validate `request_id`, issue a confirmation nonce, persist the store, and return the nonce payload.
- Extracting them now continues the Symphony-aligned controller thinning without widening into `/confirmations/validate` or the materially higher-authority `/control/action` flow.

## Delegated Boundary Note

- The post-`1045` control-server shape leaves confirmation issue and consume as the next smallest controller boundary that can still be extracted without touching confirmation validation or control-action semantics.
- The key regression surface to preserve is the current missing-request failure contract plus the successful nonce issuance response shape for both routes.
