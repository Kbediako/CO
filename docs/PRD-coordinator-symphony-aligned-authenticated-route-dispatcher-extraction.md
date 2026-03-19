# PRD - Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction

## User Request Translation

Continue the Symphony-aligned `controlServer.ts` decomposition after `1062` by extracting the remaining authenticated-route dispatcher shell without weakening CO's explicit authority, route ordering, or controller injection boundaries.

## Problem

After the private-route admission gate extraction, `controlServer.ts` still owns a long authenticated-route branch table:

- protected route matching after admission
- controller invocation ordering
- repeated controller dependency wiring for already-extracted controllers

The shared admission policy is now separated, so the next remaining concentration is the dispatcher shell that sits between the new gate and the extracted controllers.

## Goal

Introduce a dedicated authenticated-route dispatcher module under `orchestrator/src/cli/control/` so `controlServer.ts` keeps bootstrap/public-route ordering plus gate invocation, while the protected-route branch table and controller dispatch move into a narrow dedicated dispatcher.

## Non-Goals

- No change to public-route behavior, ordering, or carveouts.
- No change to auth, CSRF, or runner-only behavior from `1062`.
- No change to controller-local business logic or persistence semantics.
- No broad router/middleware framework introduction.

## Requirements

- Add a dedicated authenticated-route dispatcher module under `orchestrator/src/cli/control/`.
- Move the protected-route branch table out of `controlServer.ts` after the authenticated gate returns.
- Keep `controlServer.ts` responsible for:
  - bootstrap and server lifecycle
  - public-route ordering
  - the authenticated admission gate invocation
- Preserve existing path/method behavior and controller-local outcomes exactly.

## Constraints

- Preserve controller invocation order and response behavior exactly.
- Keep the dispatcher contract narrow; do not move runtime/bootstrap/public-route state into a broader abstraction.
- Keep CO's stricter authority model explicit even if Symphony's Phoenix shape is structurally cleaner.

## Acceptance Criteria

1. A dedicated authenticated-route dispatcher module exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer owns the long protected-route branch table after admission.
3. Public-route ordering and the authenticated gate stay in `controlServer.ts`.
4. Existing protected-route behavior remains unchanged.
5. Direct dispatcher coverage plus targeted `ControlServer` regressions are recorded before closeout.
