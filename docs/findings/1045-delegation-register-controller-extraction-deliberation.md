# Findings - 1045 Delegation Register Controller Extraction Deliberation

- Date: `2026-03-07`
- Decision: approve docs-first planning for the next bounded controller seam.

## Why This Slice

- `1044` removed the standalone `/security/violation` branch from `controlServer.ts`, leaving `/delegation/register` as the next smallest cohesive HTTP route still inline.
- The delegation-register route is bounded around one concept: validate the required registration fields, create the token record, persist it, and return the token id.
- Extracting it now continues the Symphony-aligned controller thinning without widening into the materially larger `/confirmations*` cluster or the high-authority `/control/action` flow.

## Delegated Boundary Note

- The post-`1044` control-server shape leaves `/delegation/register` as the next smallest controller boundary that can still be extracted without touching confirmation or control-action semantics.
- The key regression surface to preserve is the current missing-field failure contract plus the successful registration response shape.
