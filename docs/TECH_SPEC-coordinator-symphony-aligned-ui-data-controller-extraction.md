# TECH_SPEC - Coordinator Symphony-Aligned UI Data Controller Extraction

## Scope

- Extract the `/ui/data.json` controller decision path from `controlServer.ts`.
- Keep selected-run payload building in `selectedRunPresenter.ts`.
- Preserve all `/ui/data.json` route behavior and leave `/api/v1/*`, auth/session, webhooks, and control endpoints untouched.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/selectedRunPresenter.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce a dedicated UI data controller module for `/ui/data.json`.
2. Move the route-local UI method guard and JSON response writing helper into that module.
3. Keep `readUiDataset(presenterContext)` as the payload source; do not move selected-run dataset construction back into the controller.
4. Keep `controlServer.ts` responsible for:
   - route selection,
   - auth/session handling,
   - webhooks,
   - event stream,
   - `/api/v1/*`,
   - mutating control endpoints.
5. Keep the new controller narrowly parameterized so it only depends on the presenter context plus route-local response writing.

## Constraints

- No `/ui/data.json` contract regressions for status codes, headers, or body fields.
- No `/api/v1/*` changes in this slice.
- No auth/session/control-surface changes.
- No Telegram/Linear/provider behavior changes.
- No new transport authority or scheduling semantics.

## Validation

- Targeted `ControlServer` regressions covering `/ui/data.json` success and method-not-allowed behavior.
- Add one direct unit test for the new UI data controller module covering route dispatch and method rejection.
- Manual mock UI-data artifact confirming the extracted controller returns the same route-level response shapes as the pre-extraction path.
- Standard validation lane before closeout, including `npm run pack:smoke` because the packaged CLI control surface changes in this slice.
