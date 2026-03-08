# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Route Controller Context Extraction

## Goal

Open the next bounded Symphony-aligned slice after `1063` by extracting the authenticated-route dispatcher callback assembly out of `controlServer.ts`.

## Steps

1. Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1064`.
2. Register `1064` in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. If `docs/TASKS.md` exceeds the line budget, run the archive workflow and sync the generated 2026 archive payload to the `task-archives` branch.
4. Add a dedicated authenticated-route controller-context module under `orchestrator/src/cli/control/`.
5. Move the dispatcher callback assembly into the new module while keeping public-route ordering, authenticated admission, dispatcher invocation, and final protected fallback in `controlServer.ts`.
6. Add direct controller-context coverage plus focused `ControlServer` regressions.
7. Run the full validation bundle and close out the slice.
