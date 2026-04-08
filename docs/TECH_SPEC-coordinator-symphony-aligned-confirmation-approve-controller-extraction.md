# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Approve Controller Extraction

## Scope

- Extract the `/confirmations/approve` route from `controlServer.ts` into a dedicated confirmation-approve controller.
- Preserve request parsing, actor defaulting, confirmation approval persistence, the `ui.cancel` fast-path, `confirmation_resolved` emission, control-state mutation, runtime publication, and response writing.
- Keep broader control-plane policy and all non-approval routes in `controlServer.ts`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated confirmation-approve controller module for `POST /confirmations/approve`.
2. Move route-local request parsing, actor normalization, confirmation approval invocation, persistence, the optional `ui.cancel` fast-path, `confirmation_resolved` emission, control update, runtime publish, and response writing into that module.
3. Keep the controller narrowly parameterized with injected callbacks for confirmation approval, nonce issuance/validation, persistence, control mutation, runtime publication, and event emission.
4. Keep `controlServer.ts` responsible for:
   - auth/CSRF/runner-only gating
   - route ordering
   - `/control/action`
   - non-approval confirmation routes
   - shared runtime/event/control wiring

## Risks / Guardrails

- The `ui.cancel` fast-path is the primary coupling risk because it crosses confirmation-store, event, control-state, and runtime boundaries.
- The extraction must not reorder confirmation persistence versus control persistence.
- The error contract for fast-path failures must remain `409` with the existing fallback message behavior.

## Acceptance Criteria

- No `/confirmations/approve` contract regressions for required fields, actor defaulting, status codes, or response shape.
- `ui.cancel` approvals still emit `confirmation_resolved`, apply the cancel control action, persist control state, and publish runtime updates.
- `controlServer.ts` is reduced by the extracted route-local approval logic only.

## Validation

- Direct controller tests for fallthrough, missing request id, ordinary approval, and the `ui.cancel` fast-path.
- Targeted `ControlServer` regressions covering `/confirmations/approve` after extraction.
- Manual mock approval-controller artifact.
- Standard closeout lane: delegation guard, spec guard, build, lint, test, docs check, docs freshness, diff budget, review, and `pack:smoke` only if downstream-facing paths change.
