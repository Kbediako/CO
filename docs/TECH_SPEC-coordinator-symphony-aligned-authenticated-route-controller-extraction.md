---
id: 20260308-1065-coordinator-symphony-aligned-authenticated-route-controller-extraction
title: Coordinator Symphony-Aligned Authenticated Route Controller Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md
related_tasks:
  - tasks/tasks-1065-coordinator-symphony-aligned-authenticated-route-controller-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Route Controller Extraction

## Summary

Extract the remaining post-gate authenticated-route handoff from `controlServer.ts` into a thin authenticated-route controller module. Keep the public prelude, authenticated admission, and protected fallback response write in `controlServer.ts`, and preserve authenticated controller behavior exactly.

## Scope

- Add an authenticated-route controller module under `orchestrator/src/cli/control/`.
- Move the post-gate authenticated handoff block out of `controlServer.ts`.
- Preserve explicit forwarding of `authKind`, persistence, audit, delegation, and child-resolution helpers by reusing the existing composition/dispatcher seams.

## Out of Scope

- Public-route ordering changes.
- Auth/CSRF/runner-only behavior changes from `1062`.
- Route matching changes from `1063`.
- Controller-context assembly changes from `1064`.
- Controller-local business logic or response-contract changes.
- Broad router/container abstractions.

## Proposed Design

- Introduce `handleAuthenticatedRouteRequest(...)` in a new authenticated-route controller module.
- `controlServer.ts` will:
  - keep the public prelude
  - invoke `admitAuthenticatedControlRoute(...)`
  - call the new authenticated-route controller with the admitted auth result plus the already-available request-scoped dependencies
  - write the protected `not_found` fallback only when the controller returns `false`
- The new controller will:
  - build the authenticated dispatcher context via `createAuthenticatedRouteDispatcherContext(...)`
  - call `handleAuthenticatedRouteDispatcher(...)`
  - return the dispatcher `handled` result without taking ownership of the outer fallback write
- The controller contract remains explicit rather than containerized:
  - live request/response
  - `authKind`
  - shared presenter/runtime helpers
  - control/confirmation/question/delegation stores
  - persistence, audit, and resolution closures

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new authenticated-route controller module under `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/authenticatedRouteComposition.ts`
- `orchestrator/src/cli/control/authenticatedRouteDispatcher.ts`
- direct controller-handoff test file under `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Risks

- Accidental behavior drift while moving the authenticated handoff block out of `controlServer.ts`.
- Over-extraction into a generic controller registry or middleware layer that hides authority boundaries.
- Pulling public-only routes or shared dispatch-audit helpers into the authenticated seam.

## Validation Plan

- Direct controller-handoff tests for dispatcher invocation and handled/not-handled return behavior.
- Focused `ControlServer` regressions for preserved admission/fallback ownership.
- Standard validation bundle: delegation/spec/build/lint/test/docs/diff-budget/review.
