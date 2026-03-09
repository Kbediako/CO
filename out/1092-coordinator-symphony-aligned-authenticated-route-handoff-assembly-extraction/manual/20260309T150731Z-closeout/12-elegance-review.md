# 1092 Elegance Review

- Kept the extraction to one adjacent helper, `createControlAuthenticatedRouteContext(...)`, instead of widening the slice into authenticated-route admission or dispatcher behavior.
- Left request-entry ordering, authenticated admission, and the final `404 not_found` ownership in `controlServer.ts`, so the server still reads as the shell while the large controller context bag moved out.
- Reused the existing `controlQuestionChildResolution` adapter rather than introducing another shared abstraction.
- Kept `resolveTaskIdFromManifestPath(...)` local to the new handoff helper because the only consumers remain control-surface presentation paths, and exporting another shared resolver would have widened scope without immediate benefit.
