# ACTION_PLAN - Coordinator Symphony-Aligned Telegram In-Process Read Model Reuse (1021)

## Phase 1. Docs-First Registration
- Register `1021` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a short findings note grounding the slice in the `1020` next-slice note, delegated design review, and real Symphony snapshot-first reuse guidance.

## Phase 2. Telegram Read-Seam Refactor
- Introduce a Telegram-facing in-process read adapter for state/issue/dispatch/questions plus issue resolution.
- Repoint Telegram read commands and projection-push hashing to that adapter instead of self-fetching local HTTP read routes.
- Keep `/pause` and `/resume` on the existing `/control/action` HTTP write path.

## Phase 3. Validation
- Run targeted Telegram bridge coverage that exercises the real `ControlServer.start()` wiring path.
- Run manual simulated/mock Telegram verification.
- Run the required validation gates and explicit elegance review.
- Record any diff-budget or review-wrapper overrides explicitly if they persist.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice recommendation only if a concrete remaining Telegram/control seam remains after read-side self-HTTP removal.
- Commit the slice cleanly.
