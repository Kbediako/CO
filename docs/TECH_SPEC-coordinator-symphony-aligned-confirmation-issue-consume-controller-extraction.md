# TECH_SPEC - Coordinator Symphony-Aligned Confirmation Issue Consume Controller Extraction

## Scope

- Extract the `/confirmations/issue` and `/confirmations/consume` routes from `controlServer.ts` into a dedicated confirmation-issue-consume controller.
- Preserve the current request-id validation, confirmation nonce issuance behavior, persistence trigger, and `200` nonce response contract.
- Leave `/confirmations/validate`, `/control/action`, `/questions*`, `/delegation/register`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/confirmations.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated confirmation-issue-consume controller module for the `/confirmations/issue` and `/confirmations/consume` routes.
2. Move route-local confirmation expiry, JSON parsing, missing-request validation, nonce issuance invocation, persistence trigger, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the confirmation-store and persistence helpers it needs for this nonce-issuance seam.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/control/action`,
   - `/confirmations/validate`,
   - `/questions*`,
   - `/delegation/register`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`,
   - shared expiry/background helpers and broader runtime/event hooks.

## Constraints

- No `/confirmations/issue` or `/confirmations/consume` contract regressions for required fields, status codes, or nonce issuance semantics.
- No auth, CSRF, or runner-only access-policy changes.
- No confirmation-store model changes.
- No widening into confirmation validation or control-action semantics.

## Validation

- Targeted `ControlServer` regressions covering `/confirmations/issue` and `/confirmations/consume` after extraction.
- Add one direct unit test file for the new controller covering route-local parsing and response shaping.
- Manual mock artifact confirming the extracted controller preserves the confirmation issue and consume response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
