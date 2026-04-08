# ACTION_PLAN - Coordinator Symphony-Aligned Control Request Context Assembly Extraction

## Phase 1 - Docs-first registration

- Add PRD / TECH_SPEC / ACTION_PLAN / findings / checklist / `.agent` mirror for `1072`.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture the local read-only review approval plus docs-review override/evidence.

## Phase 2 - Bounded extraction

- Add a dedicated control request-context builder under `orchestrator/src/cli/control/`.
- Move request-context assembly plus nearby shared composition out of `controlServer.ts`.
- Keep `controlServer.ts` explicit as the outer server shell, route dispatcher, SSE admission owner, and server closer.

## Phase 3 - Validation and closeout

- Run the required guard/build/test/docs/review/pack commands.
- Capture manual/mock evidence for the extracted request-context builder seam.
- Run an explicit elegance review and sync checklist mirrors to completed.
