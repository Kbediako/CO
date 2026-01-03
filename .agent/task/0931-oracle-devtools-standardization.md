# Task Checklist - 0931-oracle-devtools-standardization (0931)

> Set `MCP_RUNNER_TASK_ID=0931-oracle-devtools-standardization` for orchestrator commands. Mirror status with `tasks/tasks-0931-oracle-devtools-standardization.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Docs-review manifest captured - Evidence: `.runs/0931-oracle-devtools-standardization/cli/2026-01-03T08-06-02-907Z-96bd7ade/manifest.json`.
- [x] Subagent diagnostics captured - Evidence: `.runs/0931-oracle-devtools-standardization-scout/cli/2026-01-03T07-58-33-122Z-5422cb1b/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `tasks/tasks-0931-oracle-devtools-standardization.md` - Evidence: `docs/TASKS.md`, `tasks/tasks-0931-oracle-devtools-standardization.md`, `tasks/index.json`.

### Documentation update
- [x] Oracle + DevTools SOP published (batching, Chrome DevTools inspection, MCP readiness) - Evidence: `.agent/SOPs/oracle-usage.md`.
- [x] Agent guidance updated to reference the SOP - Evidence: `.agent/AGENTS.md`, `docs/AGENTS.md`.

### Validation + handoff
- [x] DevTools-enabled frontend testing run captured (`CODEX_REVIEW_DEVTOOLS=1`) - Evidence: `.runs/0931-oracle-devtools-standardization/cli/2026-01-03T08-06-38-295Z-e3601ce9/manifest.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0931-oracle-devtools-standardization/cli/2026-01-03T08-14-41-487Z-df2a6972/manifest.json`.

## Relevant Files
- `.agent/SOPs/oracle-usage.md`
- `.agent/AGENTS.md`
- `docs/AGENTS.md`
