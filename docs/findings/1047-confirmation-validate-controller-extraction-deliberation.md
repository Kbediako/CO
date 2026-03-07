# Findings - 1047 Confirmation Validate Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1046` removed the standalone `/confirmations/issue` and `/confirmations/consume` branches from `controlServer.ts`, leaving `/confirmations/validate` as the next smallest cohesive HTTP route still inline.
- That route owns one concept: expire old confirmations, validate `confirm_nonce`, normalize `tool` and `params`, validate the nonce against the confirmation store, persist the consumed state, emit the control event, and return the validation payload.
- Extracting it now continues the Symphony-aligned controller thinning without widening into `/confirmations/approve` or the materially higher-authority `/control/action` flow.

## Delegated Boundary Note

- The post-`1046` control-server shape leaves confirmation validate as the next smallest controller boundary that can still be extracted without touching confirmation approval or control-action semantics.
- The key regression surface to preserve is the current missing-confirm-nonce failure contract, tool/params defaulting, consumed-state persistence, and the successful `{ status: 'valid', request_id, nonce_id }` response shape.
