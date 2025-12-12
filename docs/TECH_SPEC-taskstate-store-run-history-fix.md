# Technical Spec — TaskStateStore Run History File Fix (Task 0903)

## Objective
Resolve snapshot path conflict between TaskStateStore run history and metrics state snapshots.

## Design
- Change TaskStateStore snapshot filename from `state.json` to `runs.json` under `out/<taskId>/`.
- On read:
  - Prefer `runs.json` when present.
  - If missing, attempt to read legacy `state.json` **only if** it matches TaskStateSnapshot shape (`taskId` string).
  - If legacy file is metrics schema (no `taskId`), ignore and start fresh.
- On write:
  - Write merged snapshot to `runs.json` only; never overwrite `state.json`.

## Files
- `orchestrator/src/persistence/TaskStateStore.ts`
- Update affected tests in `orchestrator/tests/**`.

## Testing
- Update existing TaskStateStore/PersistenceCoordinator tests for new path.
- Add regression ensuring metrics `state.json` does not break TaskStateStore.

## Evidence
- Diagnostics manifest: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
