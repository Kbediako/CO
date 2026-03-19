# 1100 Deliberation Note

## Decision

Proceed with a bounded Linear webhook branch-shell extraction as the next Symphony-aligned product-code seam after `1099`.

## Why this seam

- `1099` completed the last queued review-reliability follow-on needed before returning to product-code extraction.
- The next remaining inline request-entry shell in `controlServer.ts` is the `/integrations/linear/webhook` branch.
- The current webhook choreography is cohesive: route detection, controller-input assembly, invocation, and early return.
- The deeper Linear webhook controller already exists, so the tightest next seam is a controller-owned branch entrypoint, not another route-helper layer.

## Explicitly deferred

- `linearWebhookController.ts` request validation, advisory-state, persistence, audit, and runtime-publish logic
- public-route, UI-session, and authenticated-route ordering
- any broader router or middleware abstraction over `handleRequest(...)`
- additional review-wrapper reliability work unless it directly blocks this product seam again
