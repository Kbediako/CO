# Task Checklist - Skills Auto-Install + Release README (0948)

> Set `MCP_RUNNER_TASK_ID=0948-skills-auto-install` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0948-skills-auto-install.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Docs-review manifest captured — Evidence: `.runs/0948-skills-auto-install/cli/2026-01-13T01-26-07-866Z-e6863e7b/manifest.json`.
- [x] Subagent diagnostics captured — Evidence: `.runs/0948-skills-auto-install-subagent/cli/2026-01-13T01-20-41-668Z-d0c091c9/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0948-skills-auto-install.md` — Evidence: `docs/TASKS.md`, `.agent/task/0948-skills-auto-install.md`, `tasks/tasks-0948-skills-auto-install.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

### Implementation
- [x] Auto-install helper for bundled skills — Evidence: `orchestrator/src/cli/skills.ts`, `bin/codex-orchestrator.ts`, `orchestrator/tests/SkillsInstall.test.ts`.
- [x] README release focus + repository guide — Evidence: `README.md`, `docs/README.md`.
- [x] Release notes include overview + bug fixes sections — Evidence: `.github/workflows/release.yml`.

### Validation + handoff
- [x] Implementation-gate manifest captured — Evidence: `.runs/0948-skills-auto-install/cli/2026-01-13T01-36-28-976Z-661613e5/manifest.json`.

## Relevant Files
- `orchestrator/src/cli/skills.ts`
- `bin/codex-orchestrator.ts`
- `orchestrator/tests/SkillsInstall.test.ts`
- `README.md`
- `docs/README.md`
- `.github/workflows/release.yml`
