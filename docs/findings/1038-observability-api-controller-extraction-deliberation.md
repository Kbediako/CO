# Findings - 1038 Observability API Controller Extraction

## Context

- `1036` extracted the compatibility presenter.
- `1037` extracted the selected-run presenter.
- The remaining concentrated observability seam is the `/api/v1/*` controller decision tree in `controlServer.ts`.

## Smallest Next Slice

- Extract a dedicated observability API controller/helper.
- Move core `/api/v1/*` route matching, method guards, and route-local response writing into that helper.
- Keep `/ui/data.json`, auth/session/webhook/control endpoints, presenter builders, and transport-specific surfaces on their current seams.

## Why This Is Next

- It tightens the Symphony-style controller/presenter boundary without broadening into auth or transport refactors.
- It lowers the cost of future observability and compatibility slices by making `controlServer.ts` less overloaded.
- It preserves CO’s harder authority boundary while making the read-only API surface more intentionally isolated.

## Guardrails

- No provider-ingestion, scheduler, or authority changes.
- No `/api/v1/*` contract drift unless backed by a regression fix.
- No `/ui/data.json` movement in this slice.
- No migration of auth/session/webhook logic into the new controller.
- No presenter/read-model logic pulled back into route/controller code.
