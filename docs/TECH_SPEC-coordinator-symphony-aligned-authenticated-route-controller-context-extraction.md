---
id: 20260308-1064-coordinator-symphony-aligned-authenticated-route-controller-context-extraction
title: Coordinator Symphony-Aligned Authenticated Route Controller Context Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-context-extraction.md
related_tasks:
  - tasks/tasks-1064-coordinator-symphony-aligned-authenticated-route-controller-context-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Route Controller Context Extraction

## Summary

Extract the remaining authenticated-route dispatcher callback assembly from `controlServer.ts` into a dedicated controller-context module. Keep bootstrap/public-route ordering, authenticated admission, dispatcher invocation, and final protected fallback in `controlServer.ts`, and preserve controller-local behavior exactly.

## Scope

- Add a controller-context module under `orchestrator/src/cli/control/`.
- Move the authenticated dispatcher callback assembly out of `controlServer.ts`.
- Preserve explicit controller injection and side-effect ownership.

## Out of Scope

- Public-route ordering changes.
- Auth/CSRF/runner-only logic changes from `1062`.
- Route matching changes from `1063`.
- Controller-local business logic or response-contract changes.
- Broad router/container abstractions.

## Proposed Design

- Introduce an authenticated-route controller-context builder that accepts the live request/response plus the existing `controlServer.ts` request context and presenter/runtime helpers.
- `controlServer.ts` will:
  - keep the public prelude
  - invoke `admitAuthenticatedControlRoute`
  - build the authenticated dispatcher context via the new module
  - hand the resulting context to `handleAuthenticatedRouteDispatcher`
  - write the protected `not_found` fallback only when the dispatcher returns `false`
- The new context builder will:
  - own only authenticated controller callback assembly
  - preserve explicit route-scoped callback names already expected by the dispatcher
  - keep side-effect ownership explicit by accepting persistence/publish/audit/event helpers from `controlServer.ts` inputs instead of introducing hidden globals

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new authenticated route controller-context module under `orchestrator/src/cli/control/`
- direct controller-context test file under `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Risks

- Accidental behavior drift while moving controller-side closures out of `controlServer.ts`.
- Over-extraction into a container pattern that hides authority and side-effect ownership.
- Losing route-scoped callback clarity by collapsing everything into a generic map or registry.

## Validation Plan

- Direct controller-context tests for route-scoped callback assembly and preserved authority forwarding.
- Focused `ControlServer` regressions for dispatcher handoff plus protected fallback behavior.
- Standard validation bundle: delegation/spec/build/lint/test/docs/diff-budget/review.
