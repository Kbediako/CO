# Task Checklist — 0921-docs-freshness-sweep (0921)

> Set `MCP_RUNNER_TASK_ID=0921-docs-freshness-sweep` for orchestrator commands. Mirror status with `tasks/tasks-0921-docs-freshness-sweep.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0921-docs-freshness-sweep/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0921-prd-docs-freshness-sweep.md`, `docs/PRD-docs-freshness-sweep.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-sweep.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-sweep.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0921-docs-freshness-sweep.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-30T23-47-14-831Z-435ea063/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0921-docs-freshness-sweep.md` - Evidence: `docs/TASKS.md`, `.agent/task/0921-docs-freshness-sweep.md`.

## Docs audit + updates
- [x] Docs-hygiene check run and issues triaged - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-31T00-09-56-620Z-9f528ad7/manifest.json`.
- [x] Stale references updated (paths/scripts/placeholders) - Evidence: `docs/TECH_SPEC-agentic-coding-readiness.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/specs/0914-npm-companion-package.md`.
- [x] Spec review metadata refreshed as needed - Evidence: `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/specs/0921-docs-freshness-sweep.md`.

## Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0921-docs-freshness-sweep/cli/2025-12-31T00-09-56-620Z-9f528ad7/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-sweep.md`
- `docs/TECH_SPEC-docs-freshness-sweep.md`
- `docs/ACTION_PLAN-docs-freshness-sweep.md`
- `tasks/specs/0921-docs-freshness-sweep.md`

## Subagent Evidence
- `.runs/0921-docs-freshness-sweep-audit/cli/2025-12-30T23-46-16-546Z-80d99bd8/manifest.json` (docs-review guardrail run).
