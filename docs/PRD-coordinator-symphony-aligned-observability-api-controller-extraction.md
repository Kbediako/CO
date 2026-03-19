# PRD - Coordinator Symphony-Aligned Observability API Controller Extraction

## Problem

`1036` extracted the compatibility presenter and `1037` extracted the selected-run presenter, but `controlServer.ts` still owns the core `/api/v1/*` observability route tree inline. That leaves the remaining Symphony-misaligned API-controller concentration in the server entrypoint instead of behind a dedicated observability API controller seam.

## Goal

Extract a dedicated observability API controller helper so `/api/v1/*` route matching, method guards, and route-local response writing sit behind one stable controller boundary while auth, webhook, UI, and mutating control semantics stay unchanged.

## User Value

- Future Symphony-aligned observability slices can land in smaller, clearer increments.
- Operators keep the exact same `/api/v1/*` behavior while the implementation becomes easier to reason about and extend safely.
- CO preserves its harder authority model by separating observability routing from auth/session/webhook/control surfaces.

## Scope

- Extract the observability API controller logic out of `controlServer.ts`.
- Move core compatibility `/api/v1/*` route matching, method guards, and route-local response writing behind that controller boundary.
- Keep presenter/read-model builders in `selectedRunPresenter.ts` and `observabilitySurface.ts`.
- Keep the CO-specific `/api/v1/dispatch` extension explicit, but route it through the same dedicated API controller.

## Non-Goals

- No live provider ingestion changes.
- No scheduler ownership changes.
- No Telegram/Linear control-surface expansion.
- No auth/session/token/webhook changes.
- No `/ui/data.json` extraction in this slice.
- No presenter payload contract changes unless a regression test proves a correction is required.

## Constraints

- Preserve HTTP status, headers, and body contracts for `/api/v1/*`.
- Keep `controlServer.ts` responsible for `/ui/data.json`, auth/session/webhook/control endpoints, and the shared runtime snapshot host.
- Keep dispatch pilot audit behavior stable even if the observability routes move behind a controller helper.
- Keep the extraction bounded to API controller concerns and their tests.
