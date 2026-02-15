# Task Checklist - PR Watch-Merge CLI Command (0964)

- MCP Task ID: `0964-pr-watch-merge-cli-ship`
- Primary PRD: `docs/PRD-pr-watch-merge-cli-ship.md`
- TECH_SPEC: `tasks/specs/0964-pr-watch-merge-cli-ship.md`
- ACTION_PLAN: `docs/ACTION_PLAN-pr-watch-merge-cli-ship.md`
- Summary of scope: ship `codex-orchestrator pr watch-merge` for npm/downstream use with docs/skill harmonization and end-to-end validation.

> Set `MCP_RUNNER_TASK_ID=0964-pr-watch-merge-cli-ship` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0964-pr-watch-merge-cli-ship.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0964-pr-watch-merge-cli-ship.md`, `.agent/task/0964-pr-watch-merge-cli-ship.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-pr-watch-merge-cli-ship.md`, `tasks/specs/0964-pr-watch-merge-cli-ship.md`, `docs/ACTION_PLAN-pr-watch-merge-cli-ship.md`, `docs/TECH_SPEC-pr-watch-merge-cli-ship.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0964-pr-watch-merge-cli-ship-scout/cli/2026-02-14T23-20-11-897Z-41c5d725/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0964-pr-watch-merge-cli-ship/cli/2026-02-14T23-22-03-328Z-b62ad55a/manifest.json`.
- [x] Standalone pre-implementation review captured. - Evidence: `out/0964-pr-watch-merge-cli-ship/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] CLI command `pr watch-merge` implemented with parity behavior. - Evidence: `bin/codex-orchestrator.ts`, `scripts/pr-monitor-merge.mjs`.
- [x] Command-surface tests updated. - Evidence: `tests/cli-command-surface.spec.ts`.
- [x] Docs/skills/SOP guidance updated (shipped command preferred, fallback retained). - Evidence: `.agent/SOPs/review-loop.md`, `.agent/SOPs/agent-autonomy-defaults.md`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0964-pr-watch-merge-cli-ship/cli/2026-02-15T00-39-27-231Z-1fc7514c/manifest.json`.
- [x] Manual E2E validation captured. - Evidence: `out/0964-pr-watch-merge-cli-ship/manual/e2e-validation.log`.
- [ ] Standalone post-implementation elegance review completed.
