# 1056 Control Action Controller Sequencing Deliberation

## Decision

- Approve `1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction` as the next bounded slice after `1055`.

## Why This Slice

- After `1055`, the remaining `/control/action` concentration in `controlServer.ts` is the controller-owned sequencing shell:
  - replay short-circuit before confirmation
  - confirmation-required gating
  - cancel confirmation resolution
  - post-confirm transport re-validation
  - execution/finalization handoff
- Those responsibilities are distinct from the already-extracted helpers and are now the smallest useful seam left in the route.
- A bounded sequencing contract moves CO closer to the real Symphony-style thinner controller boundary without surrendering CO’s harder authority model.

## Delegated Corroboration

- A bounded `gpt-5.4` research stream independently mapped the same remaining seam in `controlServer.ts` and confirmed that the already-extracted helper family is the right composition boundary for the next slice.
- That stream also highlighted the important Symphony alignment constraint for future refactors: copy the structural direction of thinner controllers and typed helper/runtime boundaries, not the literal upstream HTTP surface, because CO’s `/control/action`, confirmation authority, transport nonce durability, and audit-at-the-edge posture are CO-specific.

## Scope Guard

- Keep request reading/normalization, final mutation authority, actual persistence, actual runtime publish, actual audit emission, and raw HTTP writes in `controlServer.ts`.
- Reuse the existing preflight, cancel-confirmation, execution, and finalization helpers instead of re-owning their logic.
- Do not widen into a generic route wrapper or a full `/control/action` controller extraction in this slice.

## Key Risks To Test

- replay-before-confirmation ordering drift
- confirmation-required versus confirmation-resolved branching drift
- canonical request/intent id drift after cancel confirmation resolution
- lost transport mutation re-validation after confirmation resolution
- accidental movement of persistence, publish, or audit side effects out of `controlServer.ts`
