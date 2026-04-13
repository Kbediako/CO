# Task Checklist - linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba

- Linear Issue: `CO-161` / `d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- MCP Task ID: `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- Primary PRD: `docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- TECH_SPEC: `tasks/specs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`

## Docs-First
- [x] PRD drafted for the released-claim fresh-discovery suppression follow-up lane. Evidence: `docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] TECH_SPEC drafted with the narrow release-only suppression seam and proof-first contract. Evidence: `tasks/specs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`, `docs/TECH_SPEC-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] ACTION_PLAN drafted for proof, minimal implementation, regressions, and review handoff. Evidence: `docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot while keeping the active snapshot file within the line budget by archiving one completed historical entry. Evidence: `docs/TASKS.md`, `docs/TASKS-archive-2026.md`.
- [x] Checklist mirrored to `tasks/tasks-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`. Evidence: `tasks/tasks-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`, `.agent/task/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`.
- [ ] Audited docs-review evidence or explicit fallback captured for `linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba`. Evidence: pending.

## Implementation
- [ ] Reproduce or disprove whether released-only deferred-poll skip reasons suppress discovery of unrelated runnable issues when the retained claim set is fully released. Evidence: pending.
- [ ] If the mixed/unrelated runnable case is real, separate release-only local fail-closed handling from global fresh-discovery suppression without reintroducing retained released direct reads. Evidence: pending.
- [ ] Preserve `CO-160` retained released local-first behavior and keep non-released cached suppression unchanged. Evidence: pending.

## Validation
- [ ] Focused regressions cover both the retained all-released local-first case and the mixed/unrelated runnable discovery case. Evidence: pending.
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
- [ ] Workpad refreshed with proof, implementation scope, validation truth, and review status. Evidence: pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review` or `Human Review`) only after coding stops. Evidence: pending.
