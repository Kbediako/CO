# Task Checklist - 1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment

- MCP Task ID: `1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment`
- Primary PRD: `docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
- TECH_SPEC: `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`

> Set `MCP_RUNNER_TASK_ID=1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment` for task-scoped commands. If delegation/docs-review must be overridden before the local compatibility repair lands, record the exact reason in task evidence.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `docs/TECH_SPEC-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `docs/ACTION_PLAN-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `tasks/tasks-1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `.agent/task/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`.
- [x] Compatibility findings captured with local-runtime and official-doc evidence. Evidence: `docs/findings/1012-codex-0111-gpt-5-4-compatibility-deliberation.md`.
- [x] Registry snapshots updated for 1012. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Compatibility Decision
- [x] `gpt-5.4` adoption decision recorded for top-level, review, and high-reasoning subagent surfaces. Evidence: `docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `docs/findings/1012-codex-0111-gpt-5-4-compatibility-deliberation.md`.
- [x] Hold boundaries for `gpt-5.4-codex`, `explorer_fast`, and RLM/alignment are explicit. Evidence: `docs/PRD-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `docs/TECH_SPEC-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`, `tasks/specs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment.md`.

## Local Runtime Repair
- [x] Live local review/custom-role surfaces moved off unsupported `gpt-5.4-codex` and onto `gpt-5.4`, with the live `[agents]` parser workaround applied by removing only `max_depth` / `max_spawn_depth` after the user reproduced the startup failure. Evidence: `~/.codex/config.toml`, `~/.codex/agents/researcher.toml`, `~/.codex/agents/explorer-detailed.toml`, `~/.codex/agents/worker-complex.toml`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/11-after-config-final.toml`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/16-after-live-parser-fix.toml`.
- [x] Before/after local config snapshots captured. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/`.
- [x] Post-repair local smoke confirms supported review/high-reasoning Codex surface selection. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/14-researcher-smoke.txt`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/17-login-status-after-fix.txt`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/18-codex-exec-after-fix.jsonl`.

## Repo Realignment
- [x] Starter config/defaults/doctor/docs/tests updated to the `gpt-5.4` baseline with the `explorer_fast` exception. Evidence: `templates/codex/.codex/config.toml`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/src/cli/doctor.ts`, `README.md`, `AGENTS.md`, `docs/AGENTS.md`, `templates/codex/AGENTS.md`, `orchestrator/tests/CodexDefaultsSetup.test.ts`, `orchestrator/tests/Doctor.test.ts`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Version-policy guidance refreshed from stale `0.107.0` references. Evidence: `AGENTS.md`, `docs/AGENTS.md`, `docs/guides/codex-version-policy.md`, `README.md`.

## Manual Simulated / Mock Usage Checks
- [x] Local `gpt-5.4` probe success captured. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T225918Z-runtime-probes/`.
- [x] Local `gpt-5.4` target-subagent probe success captured. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/14-researcher-smoke.txt`, `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T230358Z-local-compat/15-delegation-smoke-manifest.json`.
- [x] Local `gpt-5.4-codex` unsupported ChatGPT-auth error captured. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T225918Z-runtime-probes/`.

## Exact Validation Gate Order (Policy Reference)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Validation
- [x] docs-review manifest captured. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-05T23-15-08-861Z-75bee347/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-05T23-15-08-861Z-75bee347/manifest.json`, `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment-delegation-smoke/cli/2026-03-05T23-06-24-639Z-925f0f2c/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-05T23-15-08-861Z-75bee347/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-05T23-15-08-861Z-75bee347/manifest.json`.
- [x] Task/.agent mirror parity confirmed. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260305T233229Z-doc-mirror-parity.diff`.
- [x] Authoritative implementation-gate evidence captured. Evidence: `.runs/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/cli/2026-03-06T00-27-39-186Z-2b3367e1/manifest.json`.
- [x] `npm run pack:smoke`. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260306T004500Z-closeout/00-closeout-summary.md`.
- [x] Elegance review note recorded. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260306T004500Z-closeout/00-closeout-summary.md`.
- [x] Closeout review findings triaged: broader dirty-tree control-surface findings remain carry-forward items for the next coordinator slice and do not reopen 1012. Evidence: `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260306T004500Z-closeout/00-closeout-summary.md`.
