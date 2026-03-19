# 1030 Deliberation

- Real Symphony’s observability router exposes:
  - `GET /api/v1/state`
  - `POST /api/v1/refresh`
  - `GET /api/v1/:issue_identifier`
  - explicit method-not-allowed / not-found handling
- CO now matches the controller-owned direction after `1028` and `1029`, but still carries `/api/v1/dispatch` inside the same compatibility area even though that route is a CO-only extension, not part of the core Symphony-aligned surface.
- The smallest next slice is therefore:
  - keep `ControlRuntime` transport-neutral,
  - tighten the controller/presenter contract for state/refresh/issue around the real Symphony shape,
  - make `/api/v1/dispatch` an explicit CO extension boundary,
  - preserve current payloads, traceability, and advisory-only behavior.
