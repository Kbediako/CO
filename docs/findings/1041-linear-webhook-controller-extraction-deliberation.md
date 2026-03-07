# 1041 Deliberation - Linear Webhook Controller Extraction

## Decision

- Proceed with a bounded `1041-coordinator-symphony-aligned-linear-webhook-controller-extraction` slice as the next Symphony-aligned controller seam after `1040`.

## Why This Slice

- `1040` removed the standalone `/auth/session` bootstrap branch from `controlServer.ts`, leaving `/integrations/linear/webhook` as the remaining standalone pre-auth provider-ingress route.
- The current branch owns only:
  - exact webhook route matching,
  - signature/timestamp validation,
  - duplicate detection,
  - advisory-state mutation,
  - Linear-provider response writing,
  - route-local audit emission and runtime publish calls.
- Extracting that branch continues controller thinning without broadening into `/api/v1/*`, event streaming, auth/CSRF policy, or mutating control behavior.

## Boundaries

- Keep route ordering in `controlServer.ts` around static UI assets, `/auth/session`, the Linear webhook, then auth/CSRF-gated routes.
- Keep webhook acceptance/ignore/duplicate/rejection semantics unchanged.
- Do not widen the slice into provider-policy rewrites, advisory-binding changes, or broader control-runtime refactors.
