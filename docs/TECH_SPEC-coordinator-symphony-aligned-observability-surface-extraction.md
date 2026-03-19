# TECH_SPEC - Coordinator Symphony-Aligned Observability Surface Extraction (1018)

- Canonical TECH_SPEC: `tasks/specs/1018-coordinator-symphony-aligned-observability-surface-extraction.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: extract a presenter-style observability surface from `controlServer.ts` for read-only state/issue/refresh/UI routes.
- Boundary: keep route/auth/mutation/webhook ownership in `controlServer.ts` while moving read-only payload shaping into a dedicated module.
- Reference model: Symphony’s `ObservabilityApiController` + `Presenter`, adapted to CO’s stricter authority and existing projection reader.

## Requirements
- Create docs-first artifacts for `1018`:
  - `docs/PRD-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `tasks/specs/1018-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `tasks/tasks-1018-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `.agent/task/1018-coordinator-symphony-aligned-observability-surface-extraction.md`
  - `docs/findings/1018-observability-surface-extraction-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1018` `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for `1018`,
  - `docs/docs-freshness-registry.json` entries for all `1018` artifacts.

## Observability Surface Architecture
### Extraction target
- Add a dedicated observability-surface module under `orchestrator/src/cli/control/` (tentatively named `observabilitySurface.ts`) to own read-only payload and response decisions for:
  - `GET /api/v1/state`
  - `GET /api/v1/:issue`
  - `POST /api/v1/refresh`
  - `GET /ui/data.json`
- The extracted module should consume:
  - `SelectedRunProjectionReader`,
  - narrow request/context metadata needed for traceability,
  - compatibility route inputs such as issue identifiers and request action names.

### Route ownership
- `controlServer.ts` must keep:
  - auth/session validation,
  - route matching,
  - webhook ingress,
  - mutation endpoints,
  - SSE/client management,
  - bridge startup/teardown.
- It should become a thin caller for the extracted observability-surface handlers/builders on the covered read-only routes.

### Presenter responsibilities
- Build state payloads from the selected-run projection boundary.
- Build issue payloads or explicit not-found decisions without reintroducing route-local projection logic.
- Build refresh acknowledgement payloads for the read-only compatibility surface.
- Build UI dataset payloads from the shared selected-run projection.
- Where helpful, centralize compatibility read-only traceability/error payload construction for the covered routes.

## Interfaces / Contracts
- Preserve current public behavior for the covered routes.
- Preserve `SelectedRunProjectionReader` as the only source of selected-run context for the extracted read-only surface.
- Do not widen Linear or Telegram authority.
- Avoid introducing new persistent state, new env vars, or new secret requirements.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Linear remains advisory-only and non-mutating.
- Telegram remains bounded and allowlisted.
- No repo-stored secrets.
- No Symphony-style unattended workflow adoption.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - mirror parity for `tasks/tasks-1018...` vs `.agent/task/1018...`
- Runtime:
  - targeted `ControlServer` coverage for state/issue/refresh/UI routes after extraction,
  - manual simulated/mock usage coverage for observability-surface coherence,
  - full repo validation gate chain for the owned diff,
  - explicit elegance review to ensure the extraction actually reduces route-host concentration.
