# 1062 Deliberation - Authenticated Control Route Gate Extraction

## Decision

Proceed with a dedicated authenticated control-route gate extraction as the next smallest Symphony-aligned seam after `1057`.

## Why This Slice

- After the `/control/action` controller extraction, the remaining shared concentration in `controlServer.ts` is no longer route-local action logic; it is the shared auth/CSRF/runner-only gate for private routes.
- This seam is narrower and safer than a broader router or middleware refactor.
- It aligns with Symphony's thin-controller/dispatcher posture without weakening CO's stricter authority model.

## Guardrails

- Keep public routes (`/ui` assets, `/auth/session`, `/integrations/linear/webhook`) in `controlServer.ts`.
- Preserve the current `unauthorized`, `csrf_invalid`, and `runner_only` responses exactly.
- Keep controller dispatch and all post-gate side effects explicit in `controlServer.ts`.
