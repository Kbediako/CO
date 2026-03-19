# PRD - Coordinator Symphony-Aligned Authenticated Route Controller Context Extraction

## User Request Translation

Continue the Symphony-aligned `controlServer.ts` decomposition after `1063` by extracting the remaining authenticated-route controller callback assembly without weakening CO's explicit authority, route ordering, or protected fallback behavior.

## Problem

After `1063`, `controlServer.ts` no longer owns the authenticated route table, but it still assembles a large callback object for the dispatcher:

- per-route controller dependency wiring
- persistence/runtime publish closures
- audit/event emission closures
- request-scoped helper plumbing shared across authenticated controllers

That keeps a broad concentration of controller-context wiring inside `controlServer.ts` even though route matching and auth admission are already extracted.

## Goal

Introduce a dedicated authenticated-route controller-context module under `orchestrator/src/cli/control/` so `controlServer.ts` keeps bootstrap/public-route ordering, authenticated admission, dispatcher invocation, and protected fallback behavior while the dispatcher callback assembly moves into a narrower dedicated seam.

## Non-Goals

- No change to public-route behavior, ordering, or carveouts.
- No change to auth, CSRF, or runner-only behavior from `1062`.
- No change to route matching behavior from `1063`.
- No broad container, router, or framework-style dependency injection layer.

## Requirements

- Add a dedicated authenticated-route controller-context module under `orchestrator/src/cli/control/`.
- Move the large dispatcher callback assembly out of `controlServer.ts`.
- Keep `controlServer.ts` responsible for:
  - bootstrap and server lifecycle
  - public-route ordering
  - authenticated admission
  - dispatcher invocation
  - final protected `not_found` fallback
- Preserve existing controller-local outcomes exactly.

## Constraints

- Preserve route ordering and fallback behavior exactly.
- Keep CO's authority boundaries explicit even if Symphony's Phoenix composition is structurally cleaner.
- Keep the extraction bounded to context assembly; do not reopen controller-local logic or route contracts.

## Acceptance Criteria

1. A dedicated authenticated-route controller-context module exists under `orchestrator/src/cli/control/`.
2. `controlServer.ts` no longer owns the large dispatcher callback object.
3. `controlServer.ts` still owns public-route ordering, authenticated admission, dispatcher invocation, and final protected fallback.
4. Existing authenticated-route behavior remains unchanged.
5. Direct context-builder coverage plus targeted `ControlServer` regressions are recorded before closeout.
