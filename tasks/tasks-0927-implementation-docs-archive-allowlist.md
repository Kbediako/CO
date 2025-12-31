# Task Checklist - Implementation Docs Archive Allowlist (0927)

> Set `MCP_RUNNER_TASK_ID=0927-implementation-docs-archive-allowlist` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0927-implementation-docs-archive-allowlist.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0927-prd-implementation-docs-archive-allowlist.md`, `docs/PRD-implementation-docs-archive-allowlist.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-implementation-docs-archive-allowlist.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-implementation-docs-archive-allowlist.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0927-implementation-docs-archive-allowlist.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-34-54-456Z-dfb518d8/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0927-implementation-docs-archive-allowlist.md` - Evidence: `docs/TASKS.md`, `.agent/task/0927-implementation-docs-archive-allowlist.md`.
- [x] Delegation guard override recorded for pre-change docs-review - Evidence: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-34-54-456Z-dfb518d8/manifest.json`.

### Allowlist update
- [x] Policy allowlist fields added - Evidence: `docs/implementation-docs-archive-policy.json`.
- [x] Archiver allowlist logic implemented - Evidence: `scripts/implementation-docs-archive.mjs`.
- [x] Archive policy spec updated for allowlist - Evidence: `docs/TECH_SPEC-implementation-docs-archive-automation.md`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-44-44-267Z-fd2c1a98/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0927-implementation-docs-archive-allowlist/cli/2025-12-31T07-45-19-629Z-0e122538/manifest.json`.
- [x] Review agent run captured (subagent) - Evidence: `.runs/0927-implementation-docs-archive-allowlist-review/cli/2025-12-31T07-44-08-552Z-31e64c57/manifest.json`.

## Relevant Files
- `docs/implementation-docs-archive-policy.json`
- `scripts/implementation-docs-archive.mjs`
- `docs/TECH_SPEC-implementation-docs-archive-automation.md`

## Subagent Evidence
- `.runs/0927-implementation-docs-archive-allowlist-review/cli/2025-12-31T07-44-08-552Z-31e64c57/manifest.json` (review agent docs-review run).
