# Task Checklist - linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be

- Linear issue: `CO-318`
- PRD: `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`
- TECH_SPEC: `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, checklist mirror, and registry entries exist for `CO-318`. Evidence: `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/TECH_SPEC-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/ACTION_PLAN-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/tasks-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `.agent/task/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.
- [x] The packet preserves `node scripts/spec-guard.mjs`, `Core Lane`, `last_review`, current `origin/main`, and the exact six stale spec paths. Evidence: `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard-current-main.log`.
- [x] Pre-implementation docs-review evidence is recorded for this packet, with the fallback documented when the rerun stopped on the issue-owned stale-spec freshness seam plus older historical baseline debt. Evidence: `.runs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be-docs-review/cli/2026-04-23T01-02-51-949Z-949cc108/manifest.json`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0103Z-docs-review-fallback.md`.

## Implementation
- [x] Current-main failure evidence for the exact six stale specs is preserved. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard-current-main.log`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0051Z-child-lane-baseline-note.md`.
- [x] The six stale task specs are re-reviewed and refreshed without widening the stale set. Evidence: `tasks/specs/0975-codex-cli-capability-adoption-redesign.md`, `tasks/specs/0976-context-alignment-checker-option2.md`, `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`, `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`.
- [x] The lane keeps `spec-guard` policy and `CO-314` release-workflow behavior unchanged. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/after/spec-guard.log`, `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`.

## Validation
- [x] `node scripts/spec-guard.mjs` passes on the blocker-fix branch. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/after/spec-guard.log`.
- [x] Dependent PR unblock evidence is captured for the same baseline seam. Evidence: `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`, `docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`.
- [x] Workpad and packet mirrors reflect the final validation outcome. Evidence: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/workpad.md`, `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0140Z-post-sync-review-elegance.md`.
