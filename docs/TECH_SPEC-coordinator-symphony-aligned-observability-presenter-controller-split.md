# TECH_SPEC - Coordinator Symphony-Aligned Observability Presenter/Controller Split (1019)

- Canonical TECH_SPEC: `tasks/specs/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: convert the current read-only observability surface from a presenter-plus-controller hybrid into a cleaner Symphony-style split.
- Boundary: `observabilitySurface.ts` becomes payload-oriented; `controlServer.ts` owns method/status/header/error mapping for the covered read-only routes.
- Reference model: Symphony’s `ObservabilityApiController` calling `Presenter`, adapted to CO’s current selected-run projection and stricter authority posture.

## Requirements
- Create docs-first artifacts for `1019`:
  - `docs/PRD-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `tasks/specs/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `tasks/tasks-1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `.agent/task/1019-coordinator-symphony-aligned-observability-presenter-controller-split.md`
  - `docs/findings/1019-observability-presenter-controller-split-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1019` `items[]` and spec entry,
  - `docs/TASKS.md` snapshot entry for `1019`,
  - `docs/docs-freshness-registry.json` entries for all `1019` artifacts.

## Presenter / Controller Split
### Presenter responsibilities
- `observabilitySurface.ts` should own payload shaping only:
  - state payload body,
  - issue payload body or semantic not-found outcome,
  - refresh acknowledgement payload or semantic rejection classification,
  - UI dataset payload body.
- It must not require HTTP method strings and must not return `{ status, headers, body }` objects.

### Controller responsibilities
- `controlServer.ts` should own:
  - method gating (`GET`/`POST`),
  - route selection,
  - status-code selection,
  - response headers,
  - compatibility route not-found handling,
  - compatibility error payload assembly/traceability mapping for the covered routes.

### Preserved boundaries
- Keep `SelectedRunProjectionReader` as the selected-run data source.
- Keep `/api/v1/dispatch` local to `controlServer.ts`.
- Keep auth/session, webhooks, mutations, SSE, and bridge lifecycle unchanged.

## Interfaces / Contracts
- Preserve current behavior for:
  - `GET /api/v1/state`
  - `GET /api/v1/:issue`
  - `POST /api/v1/refresh`
  - `GET /ui/data.json`
- Do not add new env vars or persistent state.
- Keep response body semantics unchanged unless the change is strictly internal to the presenter/controller split.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Linear remains advisory-only and non-mutating.
- Telegram remains bounded and allowlisted.
- No repo-stored secrets.
- No migration toward unattended Symphony workflow semantics.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Runtime:
  - targeted `ControlServer` coverage for method/status/error behavior on the covered routes,
  - targeted route-coherence coverage for payload parity after the split,
  - manual simulated/mock usage for state/issue/refresh/UI coherence,
  - full repo validation gate chain for the owned diff,
  - explicit elegance review to confirm the slice reduced controller/presenter coupling rather than moving it sideways.
