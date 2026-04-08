---
id: 20260308-1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction
title: Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# TECH_SPEC - Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction

- Task ID: `1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`
- Action Plan: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`

## Scope

- Extract the shared authenticated control-route gate out of `controlServer.ts`.
- Introduce a dedicated module that resolves auth and shared rejections for authenticated routes.
- Preserve `controlServer.ts` as the public-route dispatcher and controller wiring surface.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/uiSessionController.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated authenticated control-route gate module under `orchestrator/src/cli/control/`.
2. Move the shared gate into that module, including:
   - auth token resolution
   - unauthorized rejection mapping
   - CSRF enforcement
   - runner-only gating
3. Keep `controlServer.ts` responsible only for:
   - public-route ordering and dispatch
   - invoking the authenticated gate for private routes
   - passing the resulting auth context into already-extracted controllers
4. Keep the gate boundary narrow through explicit callbacks/helpers instead of passing full `RequestContext`.

## Risks / Guardrails

- Public routes must remain outside the gate exactly as they are today.
- The extraction must not hide or broaden auth authority.
- The gate must preserve the current rejection bodies/status codes exactly.
- Over-extraction into a generic router or middleware stack would be a scope error.

## Acceptance Criteria

- `controlServer.ts` delegates the shared authenticated-route gate to a dedicated module.
- Public-route ordering remains in `controlServer.ts`.
- Auth/CSRF/runner-only behavior remains unchanged and test-covered.

## Validation

- Direct gate tests covering unauthorized, CSRF-invalid, and runner-only flows.
- Targeted `ControlServer` regressions confirming the extracted gate preserves live route behavior.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing surfaces change.

## Review Notes

- 2026-03-08 post-`1057` review identified the remaining shared concentration in `controlServer.ts` as the authenticated control-route gate around auth resolution, CSRF enforcement, and runner-only routing.
