# 1096 Deliberation Note

## Decision

Proceed with a bounded authenticated-route branch shell extraction as the next Symphony-aligned product-code seam after `1095`.

## Why this seam

- `1095` was review-wrapper-only, so the next remaining product-code shell in `controlServer.ts` is still the authenticated-route branch.
- The current authenticated-route choreography is cohesive: admission, auth-failure return, controller dispatch, handled check, and protected `404` fallback.
- The deeper authenticated modules already exist, so this slice can tighten the host-file shell without reopening gate/controller composition work.
- A bounded `gpt-5.4` scout confirmed the correct follow-on is the branch shell from the `1092` next-slice note, not a broader router refactor.

## Explicitly deferred

- `authenticatedControlRouteGate.ts` auth, CSRF, and runner-only policy changes
- `controlAuthenticatedRouteController.ts` route logic
- public-route, UI-session, and Linear webhook ordering
- any broader middleware or router abstraction over `handleRequest(...)`
