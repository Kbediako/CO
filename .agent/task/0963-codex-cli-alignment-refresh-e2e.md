# Task Checklist - Codex CLI Alignment + Refresh E2E (0963)

- MCP Task ID: `0963-codex-cli-alignment-refresh-e2e`
- Primary PRD: `docs/PRD-codex-cli-alignment-refresh-e2e.md`
- TECH_SPEC: `tasks/specs/0963-codex-cli-alignment-refresh-e2e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-cli-alignment-refresh-e2e.md`
- Summary of scope: Align local codex fork to upstream, reduce CLI refresh/setup friction, clarify custom-cli requirement, and validate manually end-to-end.

> Set `MCP_RUNNER_TASK_ID=0963-codex-cli-alignment-refresh-e2e` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0963-codex-cli-alignment-refresh-e2e.md`. Flip `[ ]` to `[x]` only with evidence (manifest/log paths).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0963-codex-cli-alignment-refresh-e2e.md`, `.agent/task/0963-codex-cli-alignment-refresh-e2e.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-codex-cli-alignment-refresh-e2e.md`, `tasks/specs/0963-codex-cli-alignment-refresh-e2e.md`, `docs/ACTION_PLAN-codex-cli-alignment-refresh-e2e.md`, `docs/TECH_SPEC-codex-cli-alignment-refresh-e2e.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0963-codex-cli-alignment-refresh-e2e-scout/cli/2026-02-14T21-12-35-333Z-40114fa3/manifest.json`.
- [x] Standalone review approval captured (pre-implementation). - Evidence: `tasks/specs/0963-codex-cli-alignment-refresh-e2e.md`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0963-codex-cli-alignment-refresh-e2e/cli/2026-02-14T21-15-05-188Z-b9961a19/manifest.json`.

### Implementation
- [x] Local codex fork aligned to upstream/main and status documented. - Evidence: `out/0963-codex-cli-alignment-refresh-e2e/manual/local-codex-alignment.log`.
- [x] Refresh/setup script/docs updates landed for low-friction stock-vs-managed flow. - Evidence: `scripts/codex-cli-refresh.sh`, `README.md`, `docs/guides/upstream-codex-cli-sync.md`, `orchestrator/src/cli/init.ts`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Custom CLI requirement decision documented with rationale. - Evidence: `docs/TECH_SPEC-codex-cli-alignment-refresh-e2e.md`, `README.md`, `out/0963-codex-cli-alignment-refresh-e2e/manual/e2e-validation.log`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0963-codex-cli-alignment-refresh-e2e/cli/2026-02-14T22-06-33-925Z-1460cf12/manifest.json`.
- [x] Manual E2E validation captured (refresh, setup, feature checks, orchestrator smoke). - Evidence: `out/0963-codex-cli-alignment-refresh-e2e/manual/e2e-validation.log`, `.runs/0963-codex-cli-alignment-refresh-e2e-stock-smoke/cli/2026-02-14T21-31-38-878Z-82f5f7ab/manifest.json`.
- [x] Standalone post-implementation elegance review completed (findings resolved). - Evidence: `out/0963-codex-cli-alignment-refresh-e2e/manual/post-implementation-standalone-review.log`.

## Relevant Files
- `scripts/codex-cli-refresh.sh`
- `README.md`
- `docs/guides/upstream-codex-cli-sync.md`
- `orchestrator/src/cli/codexCliSetup.ts`
- `docs/PRD-codex-cli-alignment-refresh-e2e.md`
- `tasks/specs/0963-codex-cli-alignment-refresh-e2e.md`
- `docs/ACTION_PLAN-codex-cli-alignment-refresh-e2e.md`
- `docs/TECH_SPEC-codex-cli-alignment-refresh-e2e.md`
