# TECH_SPEC - Coordinator Symphony-Aligned Projection Boundary + Live Linear Refresh (1017)

- Canonical TECH_SPEC: `tasks/specs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: extract the selected-run projection boundary from `controlServer.ts` and keep async live Linear evaluation inside that boundary.
- Boundary: preserve current public behavior and authority limits while reducing concentration in the route host.
- Reference model: borrow real Symphony's layered projection discipline and poll-and-project Linear posture, not its unattended authority model.

## Requirements
- Create docs-first artifacts for `1017`:
  - `docs/PRD-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `tasks/specs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `tasks/tasks-1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `.agent/task/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md`
  - `docs/findings/1017-projection-boundary-and-live-linear-refresh-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1017` `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for `1017`,
  - `docs/docs-freshness-registry.json` entries for all `1017` artifacts.

## Projection Boundary Architecture
### Extraction target
- Move the selected-run projection logic out of `controlServer.ts` into a dedicated module under `orchestrator/src/cli/control/`.
- The extracted boundary should own:
  - selected-run manifest snapshot resolution,
  - question-summary shaping,
  - display-status resolution,
  - latest-event shaping,
  - tracked Linear advisory merge,
  - async dispatch/live Linear evaluation,
  - compatibility state/issue payload construction,
  - UI selected-run payload construction where relevant.

### Route ownership
- `controlServer.ts` should keep:
  - auth/session checks,
  - route dispatch,
  - mutation handling,
  - webhook ingress handling,
  - SSE/client fan-out wiring,
  - bridge startup/teardown.
- It should no longer contain the core selected-run projection builder and public payload formatting helpers once the extraction lands.

### Async live Linear discipline
- The extracted projection boundary must continue to support async live Linear evaluation.
- The boundary should memoize or otherwise reuse the evaluation within one build path so state/issue/UI/dispatch payload assembly does not trigger redundant provider fetches for the same request context.
- The exact-ID tracked issue behavior from `1015`/`1016` must remain fail-closed.

## Interfaces / Contracts
- Public behavior must remain coherent for:
  - `GET /api/v1/state`
  - `GET /api/v1/:issue`
  - `GET /ui/data.json`
  - `GET /api/v1/dispatch`
- Telegram pull/push and Linear webhook ingress may continue to call through existing route flows, but any selected-run payload shaping they rely on should come from the extracted boundary.
- No new mutating endpoint or authority change is allowed in this slice.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Linear remains advisory-only and non-mutating.
- Telegram remains bounded and allowlisted.
- No repo-stored secrets.
- Do not copy Symphony's unattended workflow or tracker-owned authority.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - mirror parity for `tasks/tasks-1017...` vs `.agent/task/1017...`
- Runtime:
  - targeted control-server tests covering `/api/v1/state`, `/api/v1/:issue`, `/api/v1/dispatch`, and `/ui/data.json` coherence after extraction,
  - targeted tests proving bounded async live Linear evaluation remains coherent and does not regress the current fail-closed behavior,
  - manual simulated/mock usage evidence for state/issue/UI/dispatch coherence,
  - full repo validation gate chain for the owned diff.

## Placeholder Gate Manifests (Future)
- delegated scout: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh-scout/cli/<run-id>/manifest.json`
- docs-review: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/<implementation-gate-run-id>/manifest.json`
