# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Validate Controller Extraction

## Scope

- Extract the `/confirmations/validate` route from `controlServer.ts` into a dedicated confirmation-validate controller.
- Preserve the current missing-confirm-nonce validation, tool/params normalization, confirmation nonce validation behavior, persistence, control-event emission, and success response contract.
- Leave `/confirmations/approve`, `/control/action`, `/questions*`, `/delegation/register`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated confirmation-validate controller module for the `POST /confirmations/validate` route.
2. Move route-local confirmation expiry, JSON parsing, missing-confirm-nonce validation, tool and params normalization, nonce-validation invocation, persistence, control-event emission, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the confirmation-store, persistence, and event-emission helpers it needs for this validation seam.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/confirmations/approve`,
   - `/control/action`,
   - `/questions*`,
   - `/delegation/register`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`,
   - shared expiry/background helpers and broader runtime/event hooks.

## Constraints

- No `/confirmations/validate` contract regressions for required fields, status codes, tool/params defaults, or nonce-validation semantics.
- No auth, CSRF, or runner-only access-policy changes.
- No confirmation-store model changes.
- No widening into confirmation approval or control-action semantics.

## Validation

- Targeted `ControlServer` regressions covering `/confirmations/validate` after extraction.
- Add one direct unit test file for the new controller covering route-local parsing, response shaping, and control-event emission calls.
- Manual mock artifact confirming the extracted controller preserves the confirmation validate response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
