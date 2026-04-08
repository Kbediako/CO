# ACTION_PLAN - Coordinator Symphony-Aligned Selected-Run Projection + Advisory Context (1015)

## Summary
- Goal: unify selected-run projection so CO control surfaces and Telegram show the same authoritative run and tracked advisory context.
- Scope: one shared selected-run context builder plus the smallest integration changes needed across state/issue/UI/Telegram and live Linear resolution.
- Assumptions:
  - provider secrets remain external/env-scoped,
  - `1014` provider adapters remain the foundation,
  - no new inbound webhook or Linear mutation path is required.

## Milestones & Sequencing
1. Docs-first registration
- Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror.
- Capture the projection-first boundary and the async selected-run context direction.
- Register 1015 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

2. Research + pre-implementation review
- Run bounded delegated read-only review of Symphony and current CO projection paths.
- Capture the approved minimal context-builder shape and update the spec/checklist notes.
- Run docs-review before implementation.

3. Shared projection implementation
- Introduce the shared selected-run context builder.
- Route `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue` through it.
- Keep live Linear refresh bounded and aligned to the same selected-run snapshot.

4. Validation + closeout
- Run targeted tests plus the required repo gate chain for the owned diff.
- Capture manual simulated/mock usage evidence and live Linear verification.
- Run explicit elegance review, sync closeout artifacts, and commit the coherent 1015 slice.

## Dependencies
- Closed foundations:
  - `0998`
  - `1000`
  - `1009`
  - `1010`
  - `1013`
  - `1014`
- External configuration already prepared:
  - Telegram bot token and active chat
  - Linear API token, workspace, team, and project bindings

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if downstream-facing paths are touched
- Rollback plan:
  - remove the shared-builder integration and fall back to the 1014 projection path,
  - disable live Linear advisory env/config to verify fail-closed fallback behavior,
  - confirm Telegram/status surfaces still render the prior adapter-only baseline if needed.

## Risks & Mitigations
- Projection drift:
  - centralize selected-run shaping and test each surface against the same snapshot.
- Async advisory mismatch:
  - keep the builder request-scoped and bounded; do not let stale fetches mutate control state.
- Authority creep:
  - keep all changes read-side only except the pre-existing bounded Telegram controls.
- Over-copying Symphony:
  - carry over only selected-item framing and async refresh discipline, not inventory or looser policy.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
