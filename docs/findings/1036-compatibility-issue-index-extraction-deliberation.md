# Findings - 1036 Compatibility Issue Presenter Extraction

## Context

- `1035` finished the behavioral correction for issue-centered compatibility identity and alias policy.
- The remaining gap is structural: the compatibility-only presenter policy is still concentrated in `observabilityReadModel.ts`.

## Smallest Next Slice

- Extract a dedicated compatibility issue presenter/helper module.
- Keep the `1035` behavior unchanged.
- Leave selected-run/UI/Telegram/dispatch seams exactly where they are.

## Why This Is Next

- It tightens the Symphony-style presenter/controller boundary without broadening scope.
- It lowers the cost of future compatibility slices by putting the policy in one dedicated place.
- It avoids letting `observabilityReadModel.ts` become the long-term home for unrelated compatibility-only logic.

## Guardrails

- No scheduler or live-provider changes.
- No route contract changes unless backed by a regression fix.
- No migration of selected-run-only consumers onto the compatibility collection surface.
