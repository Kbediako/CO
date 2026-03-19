# ACTION_PLAN - Coordinator Symphony-Aligned Compatibility Issue Presenter Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1036` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the extraction boundary against the real Symphony presenter shape before editing runtime code.

## Phase 2 - Compatibility Presenter Extraction

- [ ] Introduce a dedicated compatibility issue presenter helper.
- [ ] Move aggregation, representative selection, issue payload assembly, and canonical/alias lookup policy into that helper.
- [ ] Keep selected-run payload shaping and selected-run-only consumers on their current seam.

## Phase 3 - Verification + Closeout

- [ ] Add focused runtime/server regressions that prove behavior parity after extraction.
- [ ] Capture a manual mock compatibility artifact.
- [ ] Run the standard validation lane and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
