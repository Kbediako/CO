# TECH_SPEC - Coordinator Symphony-Aligned Selected-Run Projection + Advisory Context (1015)

- Canonical TECH_SPEC: `tasks/specs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: centralize selected-run projection so control APIs, compatibility data, and Telegram render against the same run/advisory snapshot.
- Boundary: projection-only follow-up; keep authority unchanged, retain Telegram's bounded control surface, and keep Linear advisory-only.
- Reference model: borrow Symphony's stable selected-item framing and async refresh discipline, not its inventory or approval posture.

## Requirements
- Create docs-first artifacts for 1015:
  - `docs/PRD-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `tasks/specs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `tasks/tasks-1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `.agent/task/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md`
  - `docs/findings/1015-selected-run-projection-deliberation.md`
- Update registries:
  - `tasks/index.json` with 1015 `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for 1015,
  - `docs/docs-freshness-registry.json` entries for all 1015 artifacts.

## Projection Architecture
### Shared selected-run context
- Introduce one shared builder under `orchestrator/src/cli/control/` that:
  - resolves the authoritative selected CO run/task,
  - preserves stable identity and status framing for `in_progress`, `paused`, `awaiting_input`, `succeeded`, `failed`, and idle-ready states,
  - attaches bounded recent run context and tracked Linear advisory context when available,
  - returns a reusable normalized object that downstream renderers can consume without recomputing status/advisory logic.

### Async advisory resolution
- The builder may be async and may own bounded advisory refresh so state/issue/UI/Telegram all resolve against the same request-scoped advisory snapshot.
- Live Linear fetch must stay bounded by the existing timeout config and fail closed on missing credentials, missing issue resolution, malformed provider responses, or provider errors.
- The async pathway must not widen authority or mutate external state.

### Surface integration
- Reuse the same shared selected-run context in:
  - `/api/v1/state`
  - `/api/v1/:issue`
  - `/ui/data.json`
  - Telegram `/status`
  - Telegram `/issue`
- Keep `/api/v1/dispatch` and transport mutation surfaces authoritative as-is; the new builder only improves the read/projection path.

## Data / Contract Changes
- Define a normalized selected-run context contract with fields for:
  - authoritative run/task identifiers,
  - effective lifecycle status,
  - workspace path,
  - latest summary,
  - latest meaningful control/transport event summary,
  - queued-question metadata,
  - dispatch-pilot summary,
  - tracked Linear issue metadata plus bounded recent activity when available.
- Preserve existing compatibility response fields so current consumers remain valid; new centralized logic should reduce duplication, not rename public payloads without cause.
- Keep Telegram rendering a projection of that shared context rather than owning a separate status formatter.

## Configuration Contract
### Linear env
- `CO_LINEAR_API_TOKEN` or `CO_LINEAR_API_KEY` or `LINEAR_API_KEY`
- `CO_LINEAR_WORKSPACE_ID`
- `CO_LINEAR_TEAM_ID`
- `CO_LINEAR_PROJECT_ID`
- `CO_LINEAR_REQUEST_TIMEOUT_MS` (optional bounded provider timeout override)

### Telegram env
- Reuse existing `1014` bot env/config without broadening command authority.
- No new webhook or router configuration is introduced in 1015.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Linear remains advisory-only and tracked.
- Telegram continues using the existing allowlist and bounded mutation policy.
- One selected item stays authoritative even when the run is not actively executing.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - mirror parity for `tasks/tasks-1015...` vs `.agent/task/1015...`
- Runtime:
  - targeted control-server projection tests for paused/succeeded/failed/awaiting-input runs,
  - targeted Telegram rendering tests for `/status` and `/issue` coherence,
  - targeted live Linear advisory tests for request-scoped alignment and fail-closed behavior,
  - manual simulated/mock usage evidence across state/UI/Telegram with the same selected run,
  - live Linear provider verification with the real workspace/team/project binding.

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/cli/<implementation-gate-run-id>/manifest.json`
