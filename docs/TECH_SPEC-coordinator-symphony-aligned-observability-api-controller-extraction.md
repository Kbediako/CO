# TECH_SPEC - Coordinator Symphony-Aligned Observability API Controller Extraction

## Scope

- Extract the `/api/v1/*` observability controller decision tree from `controlServer.ts`.
- Keep compatibility routes and the CO-only `/api/v1/dispatch` extension behavior stable.
- Leave `/ui/data.json` in `controlServer.ts`.
- Preserve the current presenter/read-model split introduced by `1036` and `1037`.

## Files / Modules

- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/selectedRunPresenter.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/tests/ControlServer.test.ts`

## Design

1. Introduce `observabilityApiController.ts` for `/api/v1/*` controller concerns.
2. Move route matching for:
   - `/api/v1/state`
   - `/api/v1/refresh`
   - `/api/v1/dispatch`
   - compatibility issue lookup / compatibility not-found
3. Move controller-local response writing helpers into the new module:
   - shared observability JSON response emission,
   - dispatch method-not-allowed response,
   - compatibility issue path resolution if it stays route-local.
4. Keep payload construction in `selectedRunPresenter.ts` and `observabilitySurface.ts`; do not migrate presenter/read-model policy back into the controller.
5. Keep `/ui/data.json`, auth/session handling, webhook handling, event-stream handling, and runner-only control endpoints in `controlServer.ts`.
6. Keep dispatch pilot audit emission reusable; if the new controller needs it, inject it as a callback instead of coupling the controller to unrelated transport surfaces.

## Constraints

- No route contract regressions for `/api/v1/*` status codes, headers, or body fields.
- No `/ui/data.json` movement in this slice.
- No auth/session/control-surface changes.
- No Telegram/Linear behavior changes.
- No new transport authority or provider semantics.

## Validation

- Targeted `ControlServer` regressions covering compatibility state/issue/refresh/not-found and `/api/v1/dispatch`.
- Add one direct unit test for the new API controller module covering method/path dispatch and method-not-allowed/not-found behavior.
- Manual mock observability API artifact confirming the extracted controller returns the same route-level response shapes as the pre-extraction path.
- Standard validation lane before closeout.
