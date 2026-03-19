# 1089 Deliberation - Control Server Request Body Helper Extraction

## Why This Slice

- After `1088`, the audit/error helper cluster is gone and `controlServer.ts` is thinner.
- The next cohesive non-shell surface is the shared request-body helper cluster reused by Linear webhook ingress and authenticated-route request parsing.
- That cluster is bounded and testable without broadening into public-route or UI helper work.

## Boundaries

- In scope:
  - extracting `readRawBody(...)` and `readJsonBody(...)`
  - moving any request-body-local `HttpError` support needed by that helper seam
  - rewiring `controlServer.ts` to call the extracted request-body helpers
  - focused request-body regression updates
- Out of scope:
  - UI/public-route helper extraction
  - route/controller behavior changes
  - any reopening of `1088` audit/error helper work

## Risks

- `invalid_json` and `request_body_too_large` behavior could drift if the helper changes error handling.
- Linear webhook ingress and authenticated-route parsing consume different helper entrypoints, so callback wiring must remain unchanged.
- `HttpError` ownership could broaden if the helper is not kept bounded.

## Decision

- Proceed with one bounded request-body helper extraction lane.
- Keep the helper module narrow and avoid combining it with UI/public-route helper work.
