# 1063 Deliberation - Authenticated Route Dispatcher Extraction

## Decision

Proceed with a dedicated authenticated-route dispatcher extraction as the next smallest Symphony-aligned seam after `1062`.

## Why This Slice

- After the authenticated gate extraction, the next remaining concentration in `controlServer.ts` is the protected-route branch table and controller dispatch shell.
- This seam is narrower and safer than a broader server/router rewrite.
- It aligns with Symphony's thin-controller and outer-router shape while preserving CO's stricter authority boundaries.

## Guardrails

- Keep public routes (`/ui` assets, `/auth/session`, `/integrations/linear/webhook`) in `controlServer.ts`.
- Keep the authenticated gate from `1062` in `controlServer.ts`.
- Preserve protected-route behavior and controller-local outcomes exactly.
- Keep side-effect ownership explicit; do not hide mutation authority in a broader abstraction.
