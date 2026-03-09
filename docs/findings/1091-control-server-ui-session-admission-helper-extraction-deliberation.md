# 1091 Deliberation Note

## Decision

Proceed with a bounded UI session admission helper extraction as the next Symphony-aligned seam after `1090`.

## Why this seam

- After `1090`, the remaining pre-auth helper cluster in `controlServer.ts` is the `/auth/session` assembly path.
- The current branch wiring, host normalization, and loopback helper ownership are cohesive and can move without changing `uiSessionController.ts` contract behavior.
- This keeps the shell/controller split tightening without prematurely broadening into cross-module host-policy deduplication.
- A bounded `gpt-5.4` scout confirmed the Symphony-aligned move is to keep this policy controller-owned rather than inventing a shared transport-policy layer.

## Explicitly deferred

- internal `uiSessionController.ts` parsing/validation behavior
- `questionChildResolutionAdapter.ts` host normalization
- `delegationServer.ts` host normalization
- authenticated-route and webhook branches
- broader host-policy consolidation across the control surface
