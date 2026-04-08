# PRD - Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction

## User Request Translation

Continue the Symphony-aligned `controlServer.ts` decomposition after `1057` by extracting the shared authenticated control-route gate without weakening CO's explicit authority, auth, CSRF, or runner-only enforcement boundaries.

## Problem

After the controller extraction work, `controlServer.ts` now mostly acts as a dispatcher, but one shared concentration remains inline for authenticated control routes:

- auth token resolution
- unauthorized rejection mapping
- CSRF enforcement
- runner-only rejection mapping
- handing the authenticated request onward to the extracted controllers

That shared gate is now the next clear concentration after the route-local `/control/action` shell was removed.

## Goal

Introduce a dedicated authenticated control-route gate module under `orchestrator/src/cli/control/` so `controlServer.ts` keeps public route ordering and controller wiring, while the shared authenticated-route checks become a typed reusable gate. Preserve CO's stronger authority posture by keeping route order, public-route carveouts, and final controller side effects explicit in `controlServer.ts`.

## Non-Goals

- No change to external auth, CSRF, or runner-only behavior.
- No change to public route behavior for UI assets, `/auth/session`, or `/integrations/linear/webhook`.
- No move of per-route controller logic back into a shared monolith.
- No weakening of CO's stricter auth and mutation authority boundaries in pursuit of Symphony literalism.

## Requirements

- Add a dedicated authenticated control-route gate module under `orchestrator/src/cli/control/`.
- Move the shared post-public-route gate out of `controlServer.ts`, including:
  - auth token resolution
  - `unauthorized` rejection mapping
  - CSRF enforcement / `csrf_invalid`
  - runner-only enforcement / `runner_only`
- Keep `controlServer.ts` responsible for:
  - public route ordering
  - route matching / controller dispatch
  - explicit controller dependency injection
- Return a typed auth result suitable for downstream extracted controllers.

## Constraints

- Preserve the current 401/403 response bodies exactly.
- Preserve route ordering exactly, including all pre-auth public routes.
- Keep the gate contract narrow; do not pass the entire request context/store/runtime through it.
- Treat real Symphony as a structural reference only; CO remains stricter where auth and authority matter.

## Acceptance Criteria

1. A dedicated authenticated control-route gate module exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer owns the inline auth/CSRF/runner-only gate.
3. Public-route ordering stays in `controlServer.ts`.
4. Existing auth, CSRF, and runner-only behavior remain unchanged.
5. Direct gate coverage plus targeted `ControlServer` regressions are recorded before closeout.
