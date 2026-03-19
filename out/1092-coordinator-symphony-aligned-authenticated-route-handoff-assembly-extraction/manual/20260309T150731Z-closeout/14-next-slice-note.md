# 1092 Next Slice Note

The next bounded Symphony-aligned seam in `controlServer.ts` is the remaining authenticated-route request branch shell:

- `admitAuthenticatedControlRoute(...)`
- the `handleAuthenticatedRouteRequest(...)` handled check
- the final authenticated-route `404 not_found` response

Recommended next slice: extract the authenticated-route branch shell into one adjacent helper while keeping overall request-entry ordering, public/UI/Linear routing, and top-level `handleRequest(...)` ownership in `controlServer.ts`.
