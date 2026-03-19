# TECH_SPEC - Coordinator Symphony-Aligned UI Session Controller Extraction

## Scope

- Extract the `/auth/session` controller decision path from `controlServer.ts`.
- Preserve current loopback, host-header, origin, and no-store token issuance behavior.
- Leave `/api/v1/*`, webhook handling, event streaming, auth ordering, and mutating control endpoints untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated UI session controller module for `/auth/session`.
2. Move route-local loopback, allowed-host, and origin validation plus response writing into that module.
3. Keep the controller narrowly parameterized so it receives only the request/response plus the exact config/token-issuance hooks it needs.
4. Keep `controlServer.ts` responsible for:
   - route selection,
   - static UI asset serving,
   - webhook handling,
   - event stream setup,
   - auth + CSRF ordering after `/auth/session`,
   - `/api/v1/*`,
   - mutating control endpoints.

## Constraints

- No `/auth/session` contract regressions for status codes, headers, or response fields.
- No token TTL or issuance-policy changes.
- No reordering of the pre-auth routes relative to UI assets or the Linear webhook.
- No new authority or transport semantics.

## Validation

- Targeted `ControlServer` regressions covering `/auth/session` success and rejection cases.
- Add one direct unit test file for the new UI session controller covering route capture, rejection paths, and successful token issuance.
- Manual mock artifact confirming the extracted controller preserves route-level response behavior.
- Standard validation lane before closeout, including `npm run pack:smoke` because the packaged CLI control surface changes in this slice.
