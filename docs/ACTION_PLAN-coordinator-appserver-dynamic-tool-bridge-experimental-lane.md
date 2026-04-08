# ACTION_PLAN - Coordinator App-Server Dynamic-Tool Bridge Experimental Lane (1001)

## Phase 1 - Docs-First Foundation
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for task 1001.
- [x] Capture deferred lineage from 0998 app-server dynamic-tool bridge row.
- [x] Record hard authority boundary constraints (CO authority unchanged; no scheduler ownership transfer).

## Phase 2 - Security + Control Contract Definition
- [x] Define strict auth/token fail-closed requirements for experimental bridge intake.
- [x] Define idempotency contract for duplicate request/intent envelopes.
- [x] Define canonical traceability mapping and auditable output requirements.
- [x] Define explicit default-off and kill-switch requirements for experimental behavior.

## Phase 3 - Registry + Snapshot Sync
- [x] Add `1001` run entry in `tasks/index.json`.
- [x] Add `20260306-1001-...` spec entry in `tasks/index.json`.
- [x] Add top snapshot line for 1001 in `docs/TASKS.md`.
- [x] Register 1001 docs/spec/task/.agent (+ findings) in `docs/docs-freshness-registry.json`.

## Phase 4 - Docs Validation (This Stream)
- [x] Run `npm run docs:check` and capture log.
- [x] Run `npm run docs:freshness` and capture log.
- [x] Confirm task/.agent checklist mirror parity and capture diff output.

## Phase 5 - Implementation Lane Completion Sync
- [x] Capture docs-review baseline + override summary evidence.
- [x] Capture implementation-gate baseline + override summary evidence and promote authoritative implementation-gate override manifest in `tasks/index.json`.
- [x] Capture runtime targeted logs, ordered chain matrix, supplemental rerun, manual simulation matrix, and elegance review evidence.
- [x] Keep completed state explicit with unchanged authority boundary (CO execution authority unchanged; Coordinator intake/control bridge only; no scheduler ownership transfer).

## Ordered Validation Gates Reference (Implementation/Closeout Lanes)
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
- CO execution authority remains unchanged.
- Coordinator remains intake/control bridge only.
- No scheduler ownership transfer.
- Experimental dynamic-tool bridge remains default-off with explicit kill-switch.
