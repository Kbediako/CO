# Task Checklist — 0923-docs-freshness-date-validation (0923)

> Set `MCP_RUNNER_TASK_ID=0923-docs-freshness-date-validation` for orchestrator commands. Mirror status with `tasks/tasks-0923-docs-freshness-date-validation.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0923-docs-freshness-date-validation/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0923-prd-docs-freshness-date-validation.md`, `docs/PRD-docs-freshness-date-validation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-date-validation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-date-validation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0923-docs-freshness-date-validation.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0923-docs-freshness-date-validation.md` - Evidence: `docs/TASKS.md`, `.agent/task/0923-docs-freshness-date-validation.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-34-45-786Z-8652d794/manifest.json`.

## Implementation
- [x] Strict `last_review` validation implemented - Evidence: `scripts/docs-freshness.mjs`.
- [x] Docs updated to note strict date validation - Evidence: `docs/TECH_SPEC-docs-freshness-date-validation.md`.
- [x] Docs freshness registry updated for new task docs - Evidence: `docs/docs-freshness-registry.json`.

## Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-40-46-229Z-1f8b81a5/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0923-docs-freshness-date-validation/cli/2025-12-31T02-41-19-365Z-8a773ab1/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0923-docs-freshness-date-validation-review/cli/2025-12-31T02-40-12-873Z-2ef0b53f/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-date-validation.md`
- `docs/TECH_SPEC-docs-freshness-date-validation.md`
- `docs/ACTION_PLAN-docs-freshness-date-validation.md`
- `tasks/specs/0923-docs-freshness-date-validation.md`

## Subagent Evidence
- `.runs/0923-docs-freshness-date-validation-review/cli/2025-12-31T02-40-12-873Z-2ef0b53f/manifest.json` (review agent docs-review run).
