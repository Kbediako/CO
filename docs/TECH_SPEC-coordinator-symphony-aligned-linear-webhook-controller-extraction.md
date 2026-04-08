# TECH_SPEC - Coordinator Symphony-Aligned Linear Webhook Controller Extraction

## Scope

- Extract the `/integrations/linear/webhook` controller decision path from `controlServer.ts`.
- Preserve current signature validation, timestamp validation, duplicate detection, advisory-state mutation, audit-event emission, and response semantics.
- Leave `/api/v1/*`, UI assets, `/auth/session`, event streaming, auth ordering, and mutating control endpoints untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated Linear webhook controller module for `/integrations/linear/webhook`.
2. Move route-local webhook validation, advisory-state recording, audit emission, and provider response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the request/response plus the exact advisory runtime hooks it needs.
4. Keep `controlServer.ts` responsible for:
   - route selection,
   - static UI asset serving,
   - `/auth/session`,
   - auth + CSRF ordering after the webhook path,
   - `/api/v1/*`,
   - event streaming,
   - mutating control endpoints.

## Constraints

- No `/integrations/linear/webhook` contract regressions for status codes, JSON fields, or fail-closed reasons.
- No webhook secret, signature, replay-window, or advisory-policy changes.
- No reordering of the pre-auth routes relative to UI assets or `/auth/session`.
- No new authority or transport semantics.

## Validation

- Targeted `ControlServer` regressions covering accepted, duplicate, ignored, and rejected webhook paths.
- Add one direct unit test file for the new Linear webhook controller covering method rejection, signature/timestamp rejection, duplicate handling, and accepted delivery behavior.
- Manual mock artifact confirming the extracted controller preserves route-level response behavior.
- Standard validation lane before closeout, including `npm run pack:smoke` because the packaged CLI control surface changes in this slice.
