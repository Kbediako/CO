# ACTION_PLAN - CO: refresh stale task specs blocking Core Lane spec guard

## Goal
- Remove the current-main stale-spec baseline debt that is stopping unrelated review-ready PRs at `node scripts/spec-guard.mjs`.

## Steps
- [x] Preserve current-main evidence for the exact six stale task specs and the detached-HEAD false extras. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard-current-main.log`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0051Z-child-lane-baseline-note.md`.
- [x] Create the docs-first packet and registry mirrors for `CO-318`. Evidence: `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/TECH_SPEC-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/ACTION_PLAN-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/tasks-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `.agent/task/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Run pre-implementation docs-review evidence for the new packet. Evidence: `.runs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be-docs-review/cli/2026-04-23T01-02-51-949Z-949cc108/manifest.json`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0103Z-docs-review-fallback.md`.
- [x] Re-review and refresh only the six verified stale specs. Evidence: `tasks/specs/0975-codex-cli-capability-adoption-redesign.md`, `tasks/specs/0976-context-alignment-checker-option2.md`, `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`, `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`.
- [x] Re-run `node scripts/spec-guard.mjs` and capture the unblock proof on the blocker-fix branch. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/after/spec-guard.log`, `https://github.com/Kbediako/CO/pull/609`.
- [ ] Refresh the workpad and carry the unblock proof into review handoff after post-review validation, standalone review/elegance, and `pr ready-review --pr 609 --quiet-minutes 15` exit cleanly. Evidence target: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/workpad.md`.

## Validation
- [x] Current-main `spec-guard` reproduction is saved under `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/`. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard-current-main.log`.
- [x] Clean post-fix `node scripts/spec-guard.mjs` is recorded. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/after/spec-guard.log`.
- [ ] Workpad and packet mirrors are updated to match the final review-handoff evidence. Evidence target: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/workpad.md`, `tasks/tasks-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `.agent/task/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`.

## Boundaries
- No `spec-guard` policy weakening.
- No `CO-314` release-workflow changes.
- No edits outside the exact verified stale-spec set unless new evidence requires it.
