# 1090 Deliberation Note

## Decision

Proceed with a bounded public-route/UI-asset helper extraction as the next Symphony-aligned seam after `1089`.

## Why this seam

- After `1089`, the remaining local helpers in `controlServer.ts` naturally split into:
  - public-route/UI-asset handling
  - session/loopback admission wiring
- The public-route/UI-asset cluster is more cohesive and easier to extract without touching exported/duplicated allowed-host logic.

## Explicitly deferred

- `normalizeAllowedHosts(...)`
- exported `isLoopbackAddress(...)`
- `handleUiSessionRequest(...)` wiring

Those remain for a later follow-on if they still represent meaningful control-server surface after this slice.
