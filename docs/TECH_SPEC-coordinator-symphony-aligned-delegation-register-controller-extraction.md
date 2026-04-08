# TECH_SPEC - Coordinator Symphony-Aligned Delegation Register Controller Extraction

## Scope

- Extract the `/delegation/register` route from `controlServer.ts` into a dedicated delegation-register controller.
- Preserve the current required-field validation, delegation-token registration behavior, persistence trigger, and `200 { status, token_id }` response contract.
- Leave `/control/action`, `/confirmations*`, `/questions*`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/delegationTokens.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated delegation-register controller module for the `/delegation/register` route.
2. Move route-local JSON parsing, required-field validation, token registration invocation, persistence trigger, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the delegation-token helpers it needs for this route.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/control/action`,
   - `/confirmations*`,
   - `/questions*`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`,
   - shared expiry/background helpers and broader runtime/event hooks.

## Constraints

- No `/delegation/register` contract regressions for required fields, status codes, or token registration semantics.
- No auth, CSRF, or runner-only access-policy changes.
- No delegation-token storage or validation model changes.
- No widening into confirmation nonce flow or transport/idempotency policy.

## Validation

- Targeted `ControlServer` regressions covering `/delegation/register` after extraction.
- Add one direct unit test file for the new controller covering route-local parsing and response shaping.
- Manual mock artifact confirming the extracted controller preserves the delegation-register response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
