# ACTION_PLAN - Coordinator Linear Advisory Setup + Runbook Implementation (1010)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1010.
- [x] Create findings document for Linear advisory setup deliberation.
- [x] Capture explicit authority/scope constraints and Discord deferral.

## Phase 2 - Dependency + Boundary Confirmation
- [x] Record Telegram dependency satisfaction from completed task 1009.
- [x] Confirm advisory/non-authoritative scope for Linear setup.
- [x] Confirm no scheduler ownership transfer and no Discord enablement.

## Phase 3 - Implementation Contract Definition
- [x] Define Linear advisory setup/runbook implementation contract.
- [x] Define explicit manual mock test requirements and bridge-safety invariants.
- [x] Define required evidence placeholders for docs-review and implementation-gate manifests.

## Phase 4 - Registry + Snapshot Sync
- [x] Register 1010 in `tasks/index.json` (`items[]` + `specs[]`).
- [x] Add 1010 snapshot line in `docs/TASKS.md`.
- [x] Register 1010 artifacts in `docs/docs-freshness-registry.json`.

## Phase 5 - Docs Validation (This Stream)
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] Mirror parity check for `tasks/tasks-1010...` vs `.agent/task/1010...`

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
