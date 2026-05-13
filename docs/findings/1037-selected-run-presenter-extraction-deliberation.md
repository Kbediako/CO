# Findings - 1037 Selected-Run Presenter Extraction

## Context

- `1036` finished the compatibility presenter extraction.
- The remaining gap is structural: selected-run presentation helpers are still split across `observabilityReadModel.ts`, `observabilitySurface.ts`, and Telegram-facing imports.

## Smallest Next Slice

- Extract a dedicated selected-run presenter/helper module.
- Keep the current `/ui/data.json` behavior unchanged.
- Leave runtime caching, compatibility routes, Telegram rendering/fingerprint helpers, and dispatch seams exactly where they are.

## Why This Is Next

- It tightens the Symphony-style presenter/controller boundary without broadening scope.
- It lowers the cost of future selected-run/UI slices by putting selected-run presentation policy in one dedicated place.
- It avoids letting `observabilityReadModel.ts` and `observabilitySurface.ts` remain the long-term home for mixed presentation concerns.

## Guardrails

- No scheduler or live-provider changes.
- No route contract changes unless backed by a regression fix.
- No migration of selected-run-only consumers onto the compatibility collection surface.
- No Telegram message/fingerprint contract changes in this slice.
