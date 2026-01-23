# ACTION_PLAN — Subagents Skill + Codex CLI Refresh Helper (0956)

## Summary
- Goal: Provide a repo-relative Codex CLI refresh helper and global subagent-first guidance.
- Scope: Script + README update in repo; global skill + global AGENTS.md outside repo; registry updates.
- Assumptions: Downstream users have a codex repo clone and `codex-orchestrator` available.

## Milestones & Sequencing
1) Draft PRD + TECH_SPEC + ACTION_PLAN + task checklist; update task registry.
2) Add `scripts/codex-cli-refresh.sh` and document usage in README.
3) Create global subagent-first skill and global `~/.codex/AGENTS.md` with required guidance.
4) Run docs-review + guardrail chain; capture evidence in task checklist.

## Dependencies
- `codex-orchestrator` CLI available for rebuilds.
- git + cargo installed for codex CLI builds.

## Validation
- Checks / tests: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.
- Rollback plan: Remove script and docs entries; delete global skill + global AGENTS.md if needed.

## Risks & Mitigations
- Risk: Script defaults don’t match downstream repo location. Mitigation: require `CODEX_REPO`/`CODEX_CLI_SOURCE` overrides and document defaults.
- Risk: Global guidance conflicts with repo AGENTS. Mitigation: keep global AGENTS short and link to specific skills.

## Approvals
- Reviewer:
- Date:
