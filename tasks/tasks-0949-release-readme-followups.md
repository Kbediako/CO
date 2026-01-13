# Task Checklist - Release README + Notes Follow-ups (0949)

> Set `MCP_RUNNER_TASK_ID=0949-release-readme-followups` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0949-release-readme-followups.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Docs-review manifest captured — Evidence: `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-19-647Z-2684eb72/manifest.json`.
- [x] Subagent diagnostics captured — Evidence: `.runs/0949-release-readme-followups-subagent/cli/2026-01-13T02-22-59-108Z-9d9cde36/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0949-release-readme-followups.md` — Evidence: `docs/TASKS.md`, `.agent/task/0949-release-readme-followups.md`, `tasks/tasks-0949-release-readme-followups.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

### Implementation
- [x] README + repo guide aligned with scoped npx + alias + wording fixes — Evidence: `README.md`, `docs/README.md`.
- [x] Release notes extraction stops at `##` headings — Evidence: `.github/workflows/release.yml`.
- [x] Short CLI alias shipped + version bump — Evidence: `package.json`, `package-lock.json`.

### Validation + handoff
- [x] Implementation-gate manifest captured — Evidence: `.runs/0949-release-readme-followups/cli/2026-01-13T02-26-54-969Z-dd0727c2/manifest.json`.

## Relevant Files
- `README.md`
- `docs/README.md`
- `.github/workflows/release.yml`
- `package.json`
- `package-lock.json`
