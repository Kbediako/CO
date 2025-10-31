# Task List Snapshot — Orchestrator Wrapper

- **Update — 2025-10-31:** Wrapper configured for multi-project usage; first downstream manifests recorded under `.runs/<task-id>/cli/<timestamp>/manifest.json`. Track additional projects by appending new checklist rows with their manifest links.
- **Gate Status:** Wrapper templates ready; downstream onboarding in progress.
- **Notes:** Metrics aggregate per project in `.runs/<task-id>/metrics.json`, and state snapshots live in `out/<task-id>/state.json`.

## Checklist Mirror
Mirror status with `/tasks/<task-id>-<slug>.md` (or the project equivalent) and ensure every `[x]` includes the manifest path that satisfied the acceptance criteria.

- Wrapper Foundation — `[ ]` Docs and SOPs converted to multi-project template; link manifest proving diagnostics run: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- Project Onboarding — `[ ]` First project pipeline configured under `packages/<project>`; attach diagnostics manifest and metrics path when complete.
- Persistence & Telemetry — `[ ]` Compatibility pointers verified (`.runs/<task-id>/mcp/<run-id>/manifest.json`), metrics appended (`.runs/<task-id>/metrics.json`), state snapshot emitted (`out/<task-id>/state.json`).
- Guardrails — `[ ]` `scripts/spec-guard.sh --dry-run`, `npm run lint`, and `npm run test` succeed for the active project; link manifests for each run.
- Reviewer Hand-off — `[ ]` `.agent` briefing updated and `npm run review` (or equivalent) documented for reviewers with latest manifest reference.

Update checklist entries with concrete run ids as projects progress.
