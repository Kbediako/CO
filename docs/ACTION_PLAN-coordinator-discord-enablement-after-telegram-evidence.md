# ACTION_PLAN - Coordinator Discord Enablement After Telegram Evidence (1011)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1011.
- [x] Create findings document for Discord enablement deliberation.
- [x] Capture authority/scope constraints and dependency state.

## Phase 2 - Dependency and Boundary Confirmation
- [x] Record Telegram evidence closure from completed task 1009.
- [x] Record current linear advisory lane status from task 1010.
- [x] Confirm CO execution authority and no scheduler ownership transfer.

## Phase 3 - Implementation Contract Definition
- [x] Define Discord enablement auth/token boundary requirements.
- [x] Define idempotency, traceability, and auditable event output requirements.
- [x] Define explicit manual mock requirements and dependency checks.

## Phase 4 - Registry + Snapshot Sync
- [x] Register 1011 in `tasks/index.json` (`items[]` + `specs[]`).
- [x] Add 1011 snapshot line in `docs/TASKS.md`.
- [x] Register 1011 artifacts in `docs/docs-freshness-registry.json`.

## Phase 5 - Docs Validation (This Stream)
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] Mirror parity check for `tasks/tasks-1011...` vs `.agent/task/1011...`

## Exact Validation Gate Order (Policy Reference)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Boundaries
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- No scheduler ownership transfer.
