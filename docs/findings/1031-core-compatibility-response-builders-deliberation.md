# 1031 Deliberation

- Real Symphony’s observability router/controller surface is still centered on:
  - `GET /api/v1/state`
  - `POST /api/v1/refresh`
  - `GET /api/v1/:issue_identifier`
  - shared method-not-allowed / not-found handling
- After `1030`, CO now mirrors that route boundary more cleanly and keeps `/api/v1/dispatch` as an explicit CO extension.
- The remaining local concentration is the core compatibility response assembly in `controlServer.ts`, especially:
  - method-not-allowed
  - issue-not-found
  - route-not-found
  - refresh-rejection
- The smallest next slice is therefore:
  - keep route selection and response emission in `controlServer.ts`,
  - move the remaining core compatibility response shaping into shared builders in `observabilitySurface.ts`,
  - leave `/api/v1/dispatch` unchanged as a CO-only extension seam,
  - preserve payloads and traceability behavior.
