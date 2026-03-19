---
id: 20260307-1050-coordinator-symphony-aligned-confirmation-list-controller-extraction
title: Coordinator Symphony-Aligned Confirmation List Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-confirmation-list-controller-extraction.md
risk: medium
owners:
  - Codex
last_review: 2026-03-07
---

# TECH_SPEC - Coordinator Symphony-Aligned Confirmation List Controller Extraction

- Task ID: `1050-coordinator-symphony-aligned-confirmation-list-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-list-controller-extraction.md`

## Scope

- Extract the `GET /confirmations` route from `controlServer.ts` into a dedicated confirmation-list controller.
- Preserve confirmation expiry, pending confirmation listing, sanitized response shaping, and response writing.
- Keep broader control-plane policy and all non-list routes in `controlServer.ts`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated confirmation-list controller module for `GET /confirmations`.
2. Move route-local expiry, pending confirmation listing, sanitized response shaping, and response writing into that module.
3. Keep the controller narrowly parameterized with injected callbacks for confirmation expiry and pending-list reads.
4. Keep `controlServer.ts` responsible for:
   - auth/CSRF/runner-only gating
   - route ordering
   - `/control/action`
   - the other confirmation routes
   - shared runtime/event/control wiring

## Risks / Guardrails

- The extraction must not change the sanitized pending confirmation payload shape.
- Expiry must still run before the list is read.
- The seam should stay route-local and avoid introducing generalized confirmation-view abstractions.

## Acceptance Criteria

- No `GET /confirmations` contract regressions for status code or response shape.
- Pending confirmations are still expired before the list is read and returned.
- `controlServer.ts` is reduced by the extracted route-local list logic only.

## Validation

- Direct controller tests for fallthrough and pending-list response shaping after expiry.
- Targeted `ControlServer` regressions covering `GET /confirmations` after extraction.
- Manual mock confirmation-list controller artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
