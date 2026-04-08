# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Route Controller Extraction

## Goal

Open the next bounded Symphony-aligned slice after `1064` by extracting the remaining post-gate authenticated-route handoff from `controlServer.ts`.

## Steps

1. Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1065`.
2. Register `1065` in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. If `docs/TASKS.md` exceeds the line budget, run the archive workflow and sync the generated 2026 archive payload to the `task-archives` branch.
4. Add a dedicated authenticated-route controller module under `orchestrator/src/cli/control/`.
5. Move the post-gate authenticated handoff block into the new module while keeping public-route ordering, authenticated admission, and protected fallback ownership in `controlServer.ts`.
6. Add direct controller-handoff coverage plus focused `ControlServer` regressions.
7. Run the full validation bundle and close out the slice.
