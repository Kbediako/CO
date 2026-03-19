# TECH_SPEC - Coordinator Symphony-Aligned Events SSE Controller Extraction

## Scope

- Extract the `GET /events` SSE controller decision path from `controlServer.ts`.
- Preserve current SSE headers, keep-alive bootstrap comment, client registration, and disconnect cleanup.
- Leave UI assets, `/auth/session`, Linear webhook handling, `/api/v1/*`, and mutating control endpoints untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated events SSE controller module for `/events`.
2. Move route-local SSE response writing, initial keep-alive bootstrap, client registration, and disconnect cleanup into that module.
3. Keep the controller narrowly parameterized so it receives only the request/response plus the connected-client set it needs.
4. Keep `controlServer.ts` responsible for:
   - route selection and GET gating,
   - UI asset serving,
   - `/auth/session`,
   - Linear webhook routing,
   - auth + CSRF ordering,
   - runner-only gating,
   - `/api/v1/*`,
   - mutating control endpoints,
   - shared event emission fanout outside the `/events` route-local branch.

## Constraints

- No `GET /events` contract regressions for status code, SSE headers, or initial bootstrap payload.
- No auth or runner-only access-policy changes.
- No event broadcast payload-shape or broadcast-order changes.
- No reordering of the pre-auth routes relative to UI assets, `/auth/session`, or the Linear webhook.

## Validation

- Targeted `ControlServer` regressions covering successful SSE connection bootstrap and cleanup on close.
- Add one direct unit test file for the new events SSE controller covering successful bootstrap and disconnect cleanup.
- Manual mock artifact confirming the extracted controller preserves the SSE response contract and client lifecycle behavior.
- Standard validation lane before closeout, including `npm run pack:smoke` because packaged CLI paths are touched in this controller-thinning slice.
