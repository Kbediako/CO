# TECH_SPEC - Coordinator Symphony-Aligned Telegram Oversight + Live Linear Advisory Adapters (1014)

- Canonical TECH_SPEC: `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: implement Telegram and Linear provider adapters on top of the existing CO control core.
- Boundary: adapter-only lane; no new execution authority, no scheduler transfer, and no Linear mutation path.
- Reference model: borrow Symphony's active-item/event-projection UX traits, not its desktop inventory or force-approve posture.

## Requirements
- Create docs-first artifacts for 1014:
  - `docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `tasks/specs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `tasks/tasks-1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `.agent/task/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md`
  - `docs/findings/1014-symphony-aligned-telegram-linear-adapter-deliberation.md`
- Update registries:
  - `tasks/index.json` with 1014 `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for 1014,
  - `docs/docs-freshness-registry.json` entries for all 1014 artifacts.

## Adapter Architecture
### Telegram
- Add a polling bridge module under `orchestrator/src/cli/control/` that:
  - reads bot/config state from env,
  - long-polls Telegram Bot API,
  - filters allowed chat principals,
  - projects command handlers onto the existing local control/compatibility endpoints,
  - persists its update offset under the run directory.
- Keep the command set minimal:
  - `/start`
  - `/help`
  - `/status`
  - `/issue`
  - `/dispatch`
  - `/questions`
  - `/pause`
  - `/resume`
- `/pause` and `/resume` must reuse the existing transport mutation envelope and traceability model.
- Default posture:
  - read-only commands available when bot token + allowed chats are configured,
  - mutating commands require explicit opt-in and still depend on the existing transport policy.

### Linear
- Extend the dispatch pilot with an async provider-backed path that:
  - preserves the current static-source behavior,
  - supports a live Linear mode,
  - uses a real Linear API token from env,
  - resolves one advisory issue for the configured workspace/team/project,
  - synthesizes an advisory recommendation into the existing `DispatchPilotEvaluation`,
  - is invoked from `ControlServer` request/projection evaluation so the selected advisory item stays aligned with the active CO run.
- Compatibility projections should surface tracked live Linear metadata plus a bounded recent-activity slice for the selected advisory issue.

## Configuration Contract
### Telegram env
- `CO_TELEGRAM_BOT_TOKEN`
- `CO_TELEGRAM_ALLOWED_CHAT_IDS`
- `CO_TELEGRAM_POLLING_ENABLED`
- `CO_TELEGRAM_ENABLE_MUTATIONS`
- `CO_TELEGRAM_POLL_INTERVAL_MS` (optional)

### Linear env
- `CO_LINEAR_API_TOKEN` or `CO_LINEAR_API_KEY` or `LINEAR_API_KEY`
- `CO_LINEAR_WORKSPACE_ID`
- `CO_LINEAR_TEAM_ID`
- `CO_LINEAR_PROJECT_ID`
- `CO_LINEAR_REQUEST_TIMEOUT_MS` (optional bounded provider timeout override)

### Control policy interaction
- Existing `transport_mutating_controls` policy remains authoritative for Telegram mutations.
- Existing `dispatch_pilot` policy remains authoritative for whether the Linear advisory pilot is enabled; env values may fill provider credentials/bindings but may not auto-authorize mutation semantics.

## Data / Projection Changes
- Extend dispatch evaluation to optionally include live selected Linear issue metadata.
- Extend compatibility issue payloads to project `tracked.linear` when live Linear issue data is available, including a bounded recent-activity/event slice.
- Preserve current `dispatch_pilot.summary` semantics so existing callers do not lose the advisory-state contract.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Telegram may not bypass nonce/idempotency/principal validation.
- Linear must remain recommendation-only and fail closed.
- No public webhook dependency in 1014.
- No multi-run Telegram router in 1014; the adapter is scoped to one active run.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - mirror parity for `tasks/tasks-1014...` vs `.agent/task/1014...`
- Runtime:
  - targeted unit tests for Telegram polling adapter parsing/routing,
  - targeted unit tests for live Linear advisory resolution and fail-closed paths,
  - targeted control-server compatibility tests for tracked Linear projection,
  - manual simulated usage tests for Telegram oversight flows,
  - explicit elegance review.

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters/cli/<implementation-gate-run-id>/manifest.json`
