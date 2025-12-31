# Task Checklist - Repo Refactor Simplification (0928)

> Set `MCP_RUNNER_TASK_ID=0928-repo-refactor-simplification` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0928-repo-refactor-simplification.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0928-prd-repo-refactor-simplification.md`, `docs/PRD-repo-refactor-simplification.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-repo-refactor-simplification.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-repo-refactor-simplification.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0928-repo-refactor-simplification.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0928-repo-refactor-simplification/cli/2025-12-31T13-37-33-341Z-84ae525a/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0928-repo-refactor-simplification.md` - Evidence: `docs/TASKS.md`, `.agent/task/0928-repo-refactor-simplification.md`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0928-repo-refactor-simplification-review/cli/2025-12-31T13-36-57-134Z-e6f7152a/manifest.json`.

### Refactor implementation
- [x] codex.orchestrator.json updated for portable dist commands + optional spec-guard.
- [x] User config loader fallback added with source labeling.
- [x] Pipeline resolution simplified; redundant built-in pipeline TS files removed.
- [x] Package files list updated to include codex.orchestrator.json.

### Validation + handoff
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0928-repo-refactor-simplification/cli/2025-12-31T13-53-53-066Z-26a878bb/manifest.json`.

## Relevant Files
- `codex.orchestrator.json`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/pipelines/index.ts`
- `package.json`

## Subagent Evidence
- `.runs/0928-repo-refactor-simplification-review/cli/2025-12-31T13-36-57-134Z-e6f7152a/manifest.json` (review agent docs-review run).
