# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Create Controller Extraction

## Scope

- Extract the `/confirmations/create` route from `controlServer.ts` into a dedicated confirmation-create controller.
- Preserve the current action/tool/params normalization, session restriction logic, confirmation creation behavior, persistence, optional auto-pause, `confirmation_required` event emission, and success response contract.
- Leave `/confirmations/approve`, `/confirmations/validate`, `/confirmations/issue`, `/confirmations/consume`, `/control/action`, `/questions*`, `/delegation/register`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated confirmation-create controller module for the `POST /confirmations/create` route.
2. Move route-local confirmation expiry, JSON parsing, action/tool/params normalization, session-only `ui.cancel` restriction handling, confirmation creation invocation, persistence, optional auto-pause behavior, `confirmation_required` control-event emission, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the confirmation-store, control-store, persistence, runtime publish, and event-emission helpers it needs for this creation seam.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/confirmations/approve`,
   - `/confirmations/validate`,
   - `/confirmations/issue` and `/confirmations/consume`,
   - `/control/action`,
   - `/questions*`,
   - `/delegation/register`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`,
   - shared expiry/background helpers and broader runtime/event hooks.

## Constraints

- No `/confirmations/create` contract regressions for required fields, status codes, session restrictions, duplicate-create handling, or response shape.
- No auth, CSRF, or runner-only access-policy changes.
- No confirmation-store model changes.
- No widening into confirmation approval or control-action semantics.

## Validation

- Targeted `ControlServer` regressions covering `/confirmations/create` after extraction.
- Add one direct unit test file for the new controller covering route-local parsing, session restrictions, auto-pause behavior, and event-emission calls.
- Manual mock artifact confirming the extracted controller preserves the confirmation create response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
