# 1092 Deliberation - Authenticated Route Handoff Assembly Extraction

- Follow-up source: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/14-next-slice-note.md`
- Local inspection confirmed the remaining inline mass in `controlServer.ts` is the authenticated-route handoff assembly, not the public/session/webhook branches.
- Bounded `gpt-5.4` scout result aligned with the local read:
  - move the control-specific handoff object passed to `handleAuthenticatedRouteRequest(...)`
  - move `createControlQuestionChildResolutionAdapter(context)`
  - move task-id derivation from `context.paths.manifestPath`
  - move the request-scoped closure/context bag used only by the authenticated-route controller boundary
- Explicitly keep in `controlServer.ts`:
  - public-route, `/auth/session`, and Linear webhook ordering
  - `admitAuthenticatedControlRoute(...)` authority ownership
  - final `404 not_found` fallback
  - current `buildControlPresenterRuntimeContext(context)` timing unless a later slice changes it deliberately
- Explicitly defer:
  - authenticated dispatcher behavior changes
  - shared utility extraction for `resolveTaskIdFromManifestPath(...)`
  - any route-order or authority ownership changes
