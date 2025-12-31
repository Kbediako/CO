# Task Checklist - Docs Freshness Systemization (0922)

> Set `MCP_RUNNER_TASK_ID=0922-docs-freshness-systemization` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0922-docs-freshness-systemization.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0922-prd-docs-freshness-systemization.md`, `docs/PRD-docs-freshness-systemization.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-docs-freshness-systemization.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-docs-freshness-systemization.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0922-docs-freshness-systemization.md`.
- [x] Docs-review manifest captured (pre-change) - Evidence: `.runs/0922-docs-freshness-systemization/cli/2025-12-31T00-42-33-187Z-aad19fd0/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0922-docs-freshness-systemization.md` - Evidence: `docs/TASKS.md`, `.agent/task/0922-docs-freshness-systemization.md`.

### Systemization design
- [ ] Docs registry schema defined and seeded - Evidence: `docs/<docs-freshness-registry>.json`.
- [ ] Freshness audit script implemented - Evidence: `scripts/<docs-freshness>.mjs`.
- [ ] planned npm script `docs:freshness` wired - Evidence: `package.json`.
- [ ] Freshness report output defined - Evidence: `docs/TECH_SPEC-docs-freshness-systemization.md`.

### Pipeline integration
- [ ] `docs-review` includes docs-freshness stage - Evidence: `codex.orchestrator.json`.
- [ ] `implementation-gate` includes docs-freshness stage - Evidence: `codex.orchestrator.json`.
- [ ] Agent docs updated with the new audit step - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`.

### Validation + handoff
- [x] Docs-review manifest captured (post-change) - Evidence: `.runs/0922-docs-freshness-systemization/cli/2025-12-31T00-55-04-017Z-96c4de4c/manifest.json`.
- [ ] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0922-docs-freshness-systemization/cli/<run-id>/manifest.json`.

## Relevant Files
- `docs/PRD-docs-freshness-systemization.md`
- `docs/TECH_SPEC-docs-freshness-systemization.md`
- `docs/ACTION_PLAN-docs-freshness-systemization.md`
- `tasks/specs/0922-docs-freshness-systemization.md`

## Subagent Evidence
- `.runs/0922-docs-freshness-systemization-audit/cli/2025-12-31T00-42-01-230Z-ed54d009/manifest.json` (docs-review guardrail run).
- `.runs/0922-docs-freshness-systemization-review/cli/2025-12-31T01-00-39-132Z-2653b56a/manifest.json` (review agent docs-review run).
