# Task Checklist - linear-e934e6ea-8fdd-480c-9656-22c020cb19cf

- Linear Issue: `CO-156` / `e934e6ea-8fdd-480c-9656-22c020cb19cf`
- MCP Task ID: `linear-e934e6ea-8fdd-480c-9656-22c020cb19cf`
- Primary PRD: `docs/PRD-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`
- TECH_SPEC: `tasks/specs/linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`

## Docs-First
- [x] PRD drafted for the shared request-headroom hard-gate lane. Evidence: `docs/PRD-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`.
- [x] TECH_SPEC drafted with the bounded shared-governor and telemetry seam. Evidence: `tasks/specs/linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`, `docs/TECH_SPEC-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, regressions, and handoff. Evidence: `docs/ACTION_PLAN-linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-e934e6ea-8fdd-480c-9656-22c020cb19cf` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`. Evidence: `.agent/task/linear-e934e6ea-8fdd-480c-9656-22c020cb19cf.md`.
- [ ] Audited docs-review child stream captured for `linear-e934e6ea-8fdd-480c-9656-22c020cb19cf`. Evidence: pending.

## Implementation
- [ ] Extend the shared Linear governor so reserve-aware request-headroom preflight hard-gates nonessential live requests across helper and dispatch consumers. Evidence: pending.
- [ ] Persist shared request-burn telemetry with source, operation, run/process metadata, request id, remaining delta, reset time, and cooldown reason. Evidence: pending.
- [ ] Preserve existing local validation/no-op behavior for `create-follow-up` and unchanged workpads while the new shared reserve gate is active. Evidence: pending.

## Validation
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
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
