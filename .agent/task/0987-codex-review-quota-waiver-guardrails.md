# Task Checklist - 0987-codex-review-quota-waiver-guardrails

- MCP Task ID: `0987-codex-review-quota-waiver-guardrails`
- Primary PRD: `docs/PRD-codex-review-quota-waiver-guardrails.md`
- TECH_SPEC: `tasks/specs/0987-codex-review-quota-waiver-guardrails.md`
- ACTION_PLAN: `docs/ACTION_PLAN-codex-review-quota-waiver-guardrails.md`

> Set `MCP_RUNNER_TASK_ID=0987-codex-review-quota-waiver-guardrails` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; add `npm run pack:smoke` only if touched paths require it.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-codex-review-quota-waiver-guardrails.md`, `docs/TECH_SPEC-codex-review-quota-waiver-guardrails.md`, `docs/ACTION_PLAN-codex-review-quota-waiver-guardrails.md`, `tasks/specs/0987-codex-review-quota-waiver-guardrails.md`, `tasks/tasks-0987-codex-review-quota-waiver-guardrails.md`, `.agent/task/0987-codex-review-quota-waiver-guardrails.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated scout stream captured. - Evidence: fail `.runs/0987-codex-review-quota-waiver-guardrails-scout/cli/2026-03-02T02-04-45-729Z-f4fd47f1/manifest.json` (`docs/TASKS.md` over line budget), fix/pass `.runs/0987-codex-review-quota-waiver-guardrails-scout/cli/2026-03-02T02-06-07-832Z-2cbfef0d/manifest.json`, logs `out/0987-codex-review-quota-waiver-guardrails/manual/delegated-scout.log`, `out/0987-codex-review-quota-waiver-guardrails/manual/delegated-scout-rerun.log`.
- [x] Pre-implementation docs-review manifest captured and mirrored in task evidence. - Evidence: `.runs/0987-codex-review-quota-waiver-guardrails/cli/2026-03-02T02-06-39-001Z-3af74bce/manifest.json`, `out/0987-codex-review-quota-waiver-guardrails/manual/docs-review-pre-implementation.log`, `tasks/index.json`, `docs/TASKS.md`, `tasks/tasks-0987-codex-review-quota-waiver-guardrails.md`, `.agent/task/0987-codex-review-quota-waiver-guardrails.md`.

## Implementation
- [x] Add quota-aware manual Codex review request policy in `AGENTS.md`. - Evidence: `AGENTS.md`.
- [x] Add mirrored quota-aware policy and waiver language in `docs/AGENTS.md`. - Evidence: `docs/AGENTS.md`.
- [x] Add quota-aware policy notes in `docs/guides/codex-version-policy.md`. - Evidence: `docs/guides/codex-version-policy.md`.

## Validation
- [x] 01 `node scripts/delegation-guard.mjs --task 0987-codex-review-quota-waiver-guardrails`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/01 final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/02 final-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/03 final-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/04 final-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/05 final-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/06 final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/07 final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/08 final-08-diff-budget.log`.
- [x] 09 `npm run review -- --manifest .runs/0987-codex-review-quota-waiver-guardrails/cli/2026-03-02T02-06-39-001Z-3af74bce/manifest.json`. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/09 final-09-review.log`.
- [x] 10 `npm run pack:smoke` (run because downstream template path changed: `templates/codex/.codex/agents/explorer-fast.toml`). - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/10 final-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0987-codex-review-quota-waiver-guardrails.md`, `.agent/task/0987-codex-review-quota-waiver-guardrails.md`, `docs/TASKS.md`.
- [x] Merge gate documented: unresolved actionable review threads must be zero before merge (or waiver recorded with evidence). - Evidence: `AGENTS.md`, `docs/AGENTS.md`.
- [x] Post-edit guardrails rerun after checklist/index/date finalization. - Evidence: `out/0987-codex-review-quota-waiver-guardrails/manual/final-postedit-01-delegation-guard.log`, `out/0987-codex-review-quota-waiver-guardrails/manual/final-postedit-02-spec-guard.log`, `out/0987-codex-review-quota-waiver-guardrails/manual/final-postedit-06-docs-check.log`, `out/0987-codex-review-quota-waiver-guardrails/manual/final-postedit-07-docs-freshness.log`, `out/0987-codex-review-quota-waiver-guardrails/manual/final-postedit-08-diff-budget.log`.
- [ ] PR merged and branch cleanup completed. - Evidence: pending.
