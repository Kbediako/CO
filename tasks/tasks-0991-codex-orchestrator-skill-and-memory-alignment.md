# Task Checklist - 0991-codex-orchestrator-skill-and-memory-alignment

- MCP Task ID: `0991-codex-orchestrator-skill-and-memory-alignment`
- Primary PRD: `docs/PRD-codex-orchestrator-skill-and-memory-alignment.md`
- TECH_SPEC: `tasks/specs/0991-codex-orchestrator-skill-and-memory-alignment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-orchestrator-skill-and-memory-alignment.md`

> Set `MCP_RUNNER_TASK_ID=0991-codex-orchestrator-skill-and-memory-alignment` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs --task 0991-codex-orchestrator-skill-and-memory-alignment`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Standalone pre-implementation review of task/spec recorded in spec + checklist notes. - Evidence: `tasks/specs/0991-codex-orchestrator-skill-and-memory-alignment.md`.
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-codex-orchestrator-skill-and-memory-alignment.md`, `docs/TECH_SPEC-codex-orchestrator-skill-and-memory-alignment.md`, `docs/ACTION_PLAN-codex-orchestrator-skill-and-memory-alignment.md`, `tasks/specs/0991-codex-orchestrator-skill-and-memory-alignment.md`, `tasks/tasks-0991-codex-orchestrator-skill-and-memory-alignment.md`, `.agent/task/0991-codex-orchestrator-skill-and-memory-alignment.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated bounded stream captured with durable manifest evidence. - Evidence: `.runs/0991-codex-orchestrator-skill-and-memory-alignment-scout/cli/2026-03-03T00-11-49-758Z-ca31ee02/manifest.json`, `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/delegated-research-summary.md`.

## Implementation
- [x] Bundled `codex-orchestrator` skill added as usage router with related-skill mapping. - Evidence: `skills/codex-orchestrator/SKILL.md`, `README.md`.
- [x] Canonical memory feature naming aligned (`memories`) in policy/guidance/test surfaces where applicable. - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `README.md`, `docs/README.md`, `docs/guides/rlm-recursion-v2.md`, `docs/guides/upstream-codex-cli-sync.md`, `orchestrator/tests/CodexCloudTaskExecutor.test.ts`.
- [x] Codex stable version policy references refreshed to current baseline. - Evidence: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `docs/guides/codex-version-policy.md`.

## Validation
- [x] docs-review manifest captured (pre-implementation). - Evidence: `.runs/0991-codex-orchestrator-skill-and-memory-alignment/cli/2026-03-03T00-35-21-259Z-3759748e/manifest.json`.
- [x] 01 `node scripts/delegation-guard.mjs --task 0991-codex-orchestrator-skill-and-memory-alignment`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-07-docs-freshness.log`, `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/docs-review-pre-implementation.json` (initial fail before registry update), `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/docs-review-postfix.json` (post-fix pass).
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-08-diff-budget.log`.
- [x] 09 `npm run review`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-09-review.log`.
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0991-codex-orchestrator-skill-and-memory-alignment.md`, `.agent/task/0991-codex-orchestrator-skill-and-memory-alignment.md`, `docs/TASKS.md`.
- [x] Final decision note added: codex-orchestrator skill ship/no-ship rationale + why. - Evidence: `out/0991-codex-orchestrator-skill-and-memory-alignment/manual/final-decision.md`.
