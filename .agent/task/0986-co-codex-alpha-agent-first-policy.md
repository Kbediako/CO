# Task Checklist - 0986-co-codex-alpha-agent-first-policy

- MCP Task ID: `0986-co-codex-alpha-agent-first-policy`
- Primary PRD: `docs/PRD-co-codex-alpha-agent-first-policy.md`
- TECH_SPEC: `tasks/specs/0986-co-codex-alpha-agent-first-policy.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-codex-alpha-agent-first-policy.md`

> Set `MCP_RUNNER_TASK_ID=0986-co-codex-alpha-agent-first-policy` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-co-codex-alpha-agent-first-policy.md`, `docs/TECH_SPEC-co-codex-alpha-agent-first-policy.md`, `docs/ACTION_PLAN-co-codex-alpha-agent-first-policy.md`, `tasks/specs/0986-co-codex-alpha-agent-first-policy.md`, `tasks/tasks-0986-co-codex-alpha-agent-first-policy.md`, `.agent/task/0986-co-codex-alpha-agent-first-policy.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated scout stream captured. - Evidence: `.runs/0986-co-codex-alpha-agent-first-policy-scout/cli/2026-02-27T14-10-18-764Z-7fc87dd3/manifest.json`, `out/0986-co-codex-alpha-agent-first-policy/manual/delegated-scout.log`.
- [x] Pre-implementation docs-review manifest captured and mirrored in task evidence. - Evidence: `.runs/0986-co-codex-alpha-agent-first-policy/cli/2026-02-27T14-17-18-253Z-a85dafe7/manifest.json`, `tasks/index.json`, `docs/TASKS.md`, `tasks/tasks-0986-co-codex-alpha-agent-first-policy.md`, `.agent/task/0986-co-codex-alpha-agent-first-policy.md`.

## Implementation
- [x] Add CO Codex version policy section in `AGENTS.md`. - Evidence: `AGENTS.md`.
- [x] Add mirrored CO Codex version policy section in `docs/AGENTS.md`. - Evidence: `docs/AGENTS.md`.
- [x] Add canonical guide `docs/guides/codex-version-policy.md`. - Evidence: `docs/guides/codex-version-policy.md`.
- [x] Align existing 0985 decision language with CO-only alpha policy. - Evidence: `docs/PRD-co-release-0-1-37-codex-0-107-canary.md`, `docs/TECH_SPEC-co-release-0-1-37-codex-0-107-canary.md`, `docs/ACTION_PLAN-co-release-0-1-37-codex-0-107-canary.md`, `tasks/specs/0985-co-release-0-1-37-codex-0-107-canary.md`, `tasks/tasks-0985-co-release-0-1-37-codex-0-107-canary.md`, `.agent/task/0985-co-release-0-1-37-codex-0-107-canary.md`, `out/0985-co-release-0-1-37-codex-0-107-canary/manual/codex-version-canary/compare/decision-go-no-go.md`.

## Validation
- [x] 01 `node scripts/delegation-guard.mjs`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-08-diff-budget.log`.
- [x] 09 `npm run review`. - Evidence: fail `out/0986-co-codex-alpha-agent-first-policy/manual/final-09-review.log` (missing manifest), fix/pass `out/0986-co-codex-alpha-agent-first-policy/manual/final-09-review-rerun.log`.
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0986-co-codex-alpha-agent-first-policy.md`, `.agent/task/0986-co-codex-alpha-agent-first-policy.md`, `docs/TASKS.md`.
- [x] Final policy summary captured with evidence. - Evidence: `docs/guides/codex-version-policy.md`, `out/0986-co-codex-alpha-agent-first-policy/manual/final-09-review-rerun.log`.
- [x] Post-edit guardrails rerun after index/date/status finalization. - Evidence: `out/0986-co-codex-alpha-agent-first-policy/manual/final-postedit-01-delegation-guard.log`, `out/0986-co-codex-alpha-agent-first-policy/manual/final-postedit-02-spec-guard.log`, `out/0986-co-codex-alpha-agent-first-policy/manual/final-postedit-06-docs-check.log`, `out/0986-co-codex-alpha-agent-first-policy/manual/final-postedit-07-docs-freshness.log`, `out/0986-co-codex-alpha-agent-first-policy/manual/final-postedit-08-diff-budget.log`.
