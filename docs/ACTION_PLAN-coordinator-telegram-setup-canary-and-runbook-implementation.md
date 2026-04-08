# ACTION_PLAN - Coordinator Telegram Setup + Canary + Runbook Implementation (1009)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1009.
- [x] Create findings document for Telegram setup/canary deliberation.
- [x] Capture explicit authority/scope constraints and Discord deferral.

## Phase 2 - Implementation Contract Definition
- [x] Define Telegram setup/canary implementation contract and runbook deliverables.
- [x] Define exact manual mock test requirements for Telegram and bridge safety invariants.
- [x] Define Linear advisory follow-up linkage as advisory-only continuity.

## Phase 3 - Registry + Snapshot Sync
- [x] Register 1009 in `tasks/index.json` (`items[]` + `specs[]`).
- [x] Add 1009 snapshot line in `docs/TASKS.md`.
- [x] Register 1009 artifacts in `docs/docs-freshness-registry.json`.

## Phase 4 - Docs Validation (This Stream)
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] Mirror parity check for `tasks/tasks-1009...` vs `.agent/task/1009...`

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
- No Discord enablement in this slice.
