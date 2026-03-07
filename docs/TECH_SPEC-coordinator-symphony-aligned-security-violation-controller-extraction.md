# TECH_SPEC - Coordinator Symphony-Aligned Security Violation Controller Extraction

## Scope

- Extract the `/security/violation` route from `controlServer.ts` into a dedicated security-violation controller.
- Preserve the current redacted event payload defaults, emit behavior, and `200 { status: "recorded" }` response contract.
- Leave `/control/action`, `/confirmations*`, `/delegation/register`, `/questions*`, `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*` untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated security-violation controller module for the `/security/violation` route.
2. Move route-local JSON parsing, redacted payload shaping, event emission, and response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the event-emission helper it needs for this route.
4. Keep `controlServer.ts` responsible for:
   - top-level route ordering,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/control/action`,
   - `/confirmations*`,
   - `/delegation/register`,
   - `/questions*`,
   - `/ui`, `/auth/session`, `/events`, `/integrations/linear/webhook`, and `/api/v1/*`,
   - shared expiry/background helpers and broader runtime/event hooks.

## Constraints

- No `/security/violation` contract regressions for payload defaults, redaction posture, or response shape.
- No auth, CSRF, or runner-only access-policy changes.
- No widening into delegation-token issuance, confirmation nonce flow, or transport/idempotency policy.

## Validation

- Targeted `ControlServer` regressions covering `/security/violation` after extraction.
- Add one direct unit test file for the new controller covering route-local parsing and response shaping.
- Manual mock artifact confirming the extracted controller preserves the security-violation response contract.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
