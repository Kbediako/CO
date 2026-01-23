# Task Checklist - Subagents Skill + Codex CLI Refresh Helper (0956)

- MCP Task ID: `0956-subagents-skill-codex-cli-refresh`
- Primary PRD: `docs/PRD-subagents-skill-codex-cli-refresh.md`
- TECH_SPEC: `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`
- ACTION_PLAN: `docs/ACTION_PLAN-subagents-skill-codex-cli-refresh.md`
- Summary of scope: Add a repo-relative Codex CLI refresh helper and global subagent-first guidance.

> Set `MCP_RUNNER_TASK_ID=0956-subagents-skill-codex-cli-refresh` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0956-subagents-skill-codex-cli-refresh.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered — Evidence: `docs/TASKS.md`, `tasks/index.json`, `tasks/tasks-0956-subagents-skill-codex-cli-refresh.md`, `.agent/task/0956-subagents-skill-codex-cli-refresh.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted — Evidence: `docs/PRD-subagents-skill-codex-cli-refresh.md`, `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`, `docs/ACTION_PLAN-subagents-skill-codex-cli-refresh.md`, `docs/TECH_SPEC-subagents-skill-codex-cli-refresh.md`.
- [x] Delegation subagent run captured — Evidence: `.runs/0956-subagents-skill-codex-cli-refresh-scout/cli/2026-01-23T01-54-24-930Z-c7a78118/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) — Evidence: `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`.

### Implementation
- [x] Add repo-relative Codex CLI refresh helper + README entry — Evidence: `scripts/codex-cli-refresh.sh`, `README.md`.
- [x] Create global subagent-first skill + global AGENTS guidance — Evidence: `~/.codex/skills/subagents-first/SKILL.md`, `~/.codex/AGENTS.md`.

### Validation + handoff
- [x] Docs-review manifest captured — Evidence: `.runs/0956-subagents-skill-codex-cli-refresh/cli/2026-01-23T01-56-28-788Z-ee539ceb/manifest.json`.
- [x] Implementation-gate review captured — Evidence: `.runs/0956-subagents-skill-codex-cli-refresh/cli/2026-01-23T01-58-35-130Z-8146c3ea/manifest.json`.

## Relevant Files
- `docs/PRD-subagents-skill-codex-cli-refresh.md`
- `tasks/specs/0956-subagents-skill-codex-cli-refresh.md`
- `docs/ACTION_PLAN-subagents-skill-codex-cli-refresh.md`
- `docs/TECH_SPEC-subagents-skill-codex-cli-refresh.md`
- `scripts/codex-cli-refresh.sh`
- `README.md`
