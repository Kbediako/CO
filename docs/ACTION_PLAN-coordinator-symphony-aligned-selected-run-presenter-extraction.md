# ACTION_PLAN - Coordinator Symphony-Aligned Selected-Run Presenter Extraction

## Phase 1 - Docs + Boundary Confirmation

- [ ] Register `1037` across PRD / TECH_SPEC / ACTION_PLAN / task/spec mirrors / freshness registry.
- [ ] Confirm the selected-run presenter boundary against the real Symphony presenter shape before editing runtime code.

## Phase 2 - Selected-Run Presenter Extraction

- [ ] Introduce a dedicated selected-run presenter helper.
- [ ] Move selected-run payload assembly and UI dataset helpers into that module.
- [ ] Keep runtime snapshot reading, compatibility routes, and Telegram rendering/fingerprint helpers on their current seam.

## Phase 3 - Verification + Closeout

- [ ] Add focused server/unit regressions that prove behavior parity after extraction.
- [ ] Capture a manual mock selected-run presenter artifact.
- [ ] Run the standard validation lane and record any honest overrides.
- [ ] Sync `tasks/index.json`, `docs/TASKS.md`, and task mirrors to the terminal status.
