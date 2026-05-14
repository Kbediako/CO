# PRD - Coordinator Symphony-Aligned Control Server Public Route and UI Asset Helper Extraction

## Problem Statement

`controlServer.ts` is thinner after the startup, seed-loading, audit/error, request-shell, and request-body extractions, but it still carries the small public-route/UI-asset helper cluster inline. The remaining `/health`, root redirect, UI asset resolution, and static asset serving logic is cohesive and does not need to stay embedded in the same file as authenticated-route orchestration.

## Desired Outcome

Extract the public-route/UI-asset helper cluster behind one bounded control-local module so `controlServer.ts` keeps request-entry orchestration responsibility while basic public-route responses and static asset serving move out of the file.

## Scope

- Extract the public-route helper cluster that covers:
  - `/health` response shaping
  - `/` redirect handling
  - UI asset path resolution
  - static UI asset serving and content-type selection
- Keep `handleRequest(...)` branch ordering unchanged.
- Preserve current route behavior and HTTP response shapes.

## Non-Goals

- UI session admission / loopback authorization changes.
- Authenticated-route changes.
- Linear webhook logic changes.
- Request-shell changes.
- Broad control-server refactors outside the public-route/UI-asset helper boundary.

## Constraints

- Keep the extracted boundary control-local and minimal.
- Do not move the exported `isLoopbackAddress(...)` seam in this slice.
- Preserve current asset lookup semantics and missing-asset fallback behavior.

## Acceptance Criteria

- `controlServer.ts` delegates the public-route/UI-asset helper cluster through one bounded helper module.
- `/health`, `/`, and UI asset responses remain behavior-identical.
- Focused tests cover the extracted helper seam and preserve route-level behavior.
