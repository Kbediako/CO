# 1040 Deliberation - UI Session Controller Extraction

## Decision

- Proceed with a bounded `1040-coordinator-symphony-aligned-ui-session-controller-extraction` slice as the next Symphony-aligned controller seam after `1039`.

## Why This Slice

- `1039` removed the last standalone read-only UI data route from `controlServer.ts`, leaving `/auth/session` as the next compact UI-adjacent route branch that is still self-contained.
- The current branch owns only:
  - exact `/auth/session` route matching,
  - loopback-only enforcement,
  - allowed-host and origin checks,
  - session token issuance,
  - no-store JSON response writing.
- Extracting that branch continues controller thinning without broadening into `/api/v1/*`, event streaming, webhooks, or mutating control behavior.

## Boundaries

- Keep route ordering in `controlServer.ts` around static UI assets, `/auth/session`, the Linear webhook, then auth/CSRF-gated routes.
- Keep session issuance semantics unchanged.
- Do not widen the slice into general auth or token-policy refactors.
