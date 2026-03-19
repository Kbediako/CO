---
id: 20260308-1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction
title: Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction
status: draft
owners:
  - Codex
created: 2026-03-08
last_review: 2026-03-08
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md
related_tasks:
  - tasks/tasks-1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction

## Summary

Extract the remaining post-admission protected-route branch table from `controlServer.ts` into a dedicated dispatcher module. Keep bootstrap/public-route ordering and the authenticated admission gate in `controlServer.ts`, and preserve controller-local behavior exactly.

## Scope

- Add a dispatcher module under `orchestrator/src/cli/control/`.
- Move protected route matching and controller dispatch after authenticated admission into that module.
- Preserve explicit dependency injection into the extracted controllers.

## Out of Scope

- Public-route ordering changes.
- Auth/CSRF/runner-only logic changes from `1062`.
- Controller-local policy changes.
- Server bootstrap/runtime refactors outside the dispatcher seam.

## Proposed Design

- Introduce an authenticated-route dispatcher function that accepts:
  - protected `pathname`
  - request `method`
  - authenticated authority class (`control` or `session`)
  - route-scoped controller callbacks already assembled by `controlServer.ts`
- `controlServer.ts` will:
  - keep the public prelude
  - invoke `admitAuthenticatedControlRoute`
  - hand authenticated requests to the dispatcher
  - write the protected `not_found` fallback only when the dispatcher returns `false`
- The dispatcher will:
  - own only post-admission protected route matching
  - forward `authKind` only where controller behavior depends on authority class
  - return whether it handled the request
  - preserve exact per-route behavior and controller ordering

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- new authenticated route dispatcher module under `orchestrator/src/cli/control/`
- new authenticated route dispatcher test file under `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Risks

- Accidental route-order drift between the gate and protected dispatch.
- Over-extraction that hides controller dependency wiring or mutation authority.
- Over-aligning with Symphony into a broader router abstraction instead of a narrow dispatcher seam.

## Validation Plan

- Direct dispatcher tests for handled/non-handled protected routes and preserved delegation to controllers.
- Focused `ControlServer` regressions for public-route carveouts plus protected-route dispatch after the gate.
- Standard validation bundle: delegation/spec/build/lint/test/docs/diff-budget/review.
