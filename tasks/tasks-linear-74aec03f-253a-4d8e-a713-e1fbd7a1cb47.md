# Task Checklist - linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47

- Linear Issue: `CO-159` / `74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- MCP Task ID: `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- Primary PRD: `docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- TECH_SPEC: `tasks/specs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`

## Docs-First
- [x] PRD drafted for the stale review and dead-claim request-burn lane. Evidence: `docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] TECH_SPEC drafted with the bounded stale-claim, review-wait, and bounded-recovery seam. Evidence: `tasks/specs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`, `docs/TECH_SPEC-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, regressions, and handoff. Evidence: `docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`. Evidence: `.agent/task/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`, `tasks/tasks-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [ ] Audited docs-review child stream captured for `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47`. Evidence: pending.

## Implementation
- [ ] Make dead active claims fail closed from local proof or manifest evidence before repeated live issue-by-id refresh. Evidence: pending.
- [ ] Make completed review-handoff wait claims stay local-only without provider retry or repeated helper refresh churn. Evidence: pending.
- [ ] Bound startup and recovery to one live refresh before cached fail-closed behavior when no runnable work exists or reserve is low. Evidence: pending.
- [ ] Attribute stale-claim and review-wait reconciliation burn distinctly from useful runnable work. Evidence: pending.
- [ ] Preserve paused stale workspaces and child-lane artifacts as resumable state. Evidence: pending.

## Validation
- [ ] Focused regressions cover the `CO-139` dead active claim path and the `CO-96` review-wait path. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `npm run repo:stewardship`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `npm run review`. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.

## Handoff
- [ ] Workpad refreshed with docs-review evidence, implementation scope, and current validation truth. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review` or `Human Review`) only after coding stops. Evidence: pending.
