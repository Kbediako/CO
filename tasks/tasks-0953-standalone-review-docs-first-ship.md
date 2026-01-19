# Task Checklist - Standalone Review + Docs-First Shipping (0953)

- MCP Task ID: `0953-standalone-review-docs-first-ship`
- Primary PRD: `docs/PRD-standalone-review-docs-first-ship.md`
- TECH_SPEC: `tasks/specs/0953-standalone-review-docs-first-ship.md`
- ACTION_PLAN: `docs/ACTION_PLAN-standalone-review-docs-first-ship.md`
- Summary of scope: Ship standalone review guidance + docs-first workflow updates and bump the patch release.

> Set `MCP_RUNNER_TASK_ID=0953-standalone-review-docs-first-ship` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0953-standalone-review-docs-first-ship.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered — Evidence: `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `tasks/tasks-0953-standalone-review-docs-first-ship.md`, `.agent/task/0953-standalone-review-docs-first-ship.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted — Evidence: `docs/PRD-standalone-review-docs-first-ship.md`, `tasks/specs/0953-standalone-review-docs-first-ship.md`, `docs/ACTION_PLAN-standalone-review-docs-first-ship.md`.
- [x] Delegation subagent runs captured (docs scout + audit) — Evidence: `.runs/0953-standalone-review-docs-first-ship-scout/cli/2026-01-19T02-07-28-947Z-0c393799/manifest.json`, `.runs/0953-standalone-review-docs-first-ship-audit/cli/2026-01-19T05-53-04-728Z-62111065/manifest.json`.
- [x] Conflict audit captured (codex exec) — Evidence: `out/0953-conflict-audit/codex-exec-summary.md`.
- [x] Standalone review approval captured (pre-implementation) — Evidence: `tasks/specs/0953-standalone-review-docs-first-ship.md`.

### Implementation
- [x] Standalone review + docs-first skills shipped — Evidence: `skills/standalone-review/SKILL.md`, `skills/docs-first/SKILL.md`.
- [x] AGENTS guidance updated (delegation vs exec, standalone review, docs-first) — Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.
- [x] Standalone review + delegation docs updated — Evidence: `docs/standalone-review-guide.md`, `docs/delegation-runner-workflow.md`, `docs/guides/instructions.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Specs + autonomy SOPs/templates refreshed — Evidence: `.agent/SOPs/specs-and-research.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/prompts/hotswap-implementation.md`, `.agent/task/templates/tech-spec-template.md`, `.agent/task/templates/action-plan-template.md`, `.agent/task/templates/tasks-template.md`, `.agent/readme.md`, `tasks/specs/README.md`.
- [x] Repo templates and READMEs updated — Evidence: `templates/codex/AGENTS.md`, `README.md`, `docs/README.md`.
- [x] Patch version bump captured — Evidence: `package.json`, `package-lock.json`.

### Validation + handoff
- [x] Docs-review manifest captured — Evidence: `.runs/0953-standalone-review-docs-first-ship/cli/2026-01-19T03-47-02-287Z-5381941a/manifest.json`.
- [x] Implementation-gate manifest captured — Evidence: `.runs/0953-standalone-review-docs-first-ship/cli/2026-01-19T03-47-37-540Z-695cdf81/manifest.json`.

## Relevant Files
- `tasks/specs/0953-standalone-review-docs-first-ship.md`
