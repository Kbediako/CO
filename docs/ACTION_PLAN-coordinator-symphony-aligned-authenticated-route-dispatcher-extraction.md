# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction

## Goal

Open the next bounded Symphony-aligned slice after `1062` by extracting the authenticated-route dispatcher shell out of `controlServer.ts`.

## Steps

1. Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1063`.
2. Register `1063` in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. If `docs/TASKS.md` exceeds the line budget, run the archive workflow and sync the generated 2026 archive payload to the `task-archives` branch.
4. Add a dedicated authenticated-route dispatcher module under `orchestrator/src/cli/control/`.
5. Move the post-admission protected-route branch table into the dispatcher while keeping public-route ordering and the authenticated gate in `controlServer.ts`.
6. Add direct dispatcher coverage plus focused `ControlServer` regressions.
7. Run the full validation bundle and close out the slice.
