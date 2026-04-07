# Task Checklist - linear-f71992e3-ddda-4198-b43c-97ccb36908cf

- Linear Issue: `CO-103` / `f71992e3-ddda-4198-b43c-97ccb36908cf`
- MCP Task ID: `linear-f71992e3-ddda-4198-b43c-97ccb36908cf`
- Primary PRD: `docs/PRD-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`
- TECH_SPEC: `tasks/specs/linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` were drafted or refreshed for `CO-103`. Evidence: bootstrap packet created in the current workspace on 2026-04-07.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-f71992e3-ddda-4198-b43c-97ccb36908cf.md`.
- [x] Docs-review delegation evidence was captured, and the repo-wide `docs:freshness` baseline failure was recorded as a truthful manual fallback instead of blocking the lane. Evidence: `/Users/kbediako/Code/CO/.workspaces/linear-f71992e3-ddda-4198-b43c-97ccb36908cf/.runs/linear-f71992e3-ddda-4198-b43c-97ccb36908cf-co-103-docs-review/cli/2026-04-07T02-54-52-283Z-cd6ae8af/manifest.json`, `out/linear-f71992e3-ddda-4198-b43c-97ccb36908cf/manual/20260407T025452Z-docs-review-fallback.md`.

## Implementation
- [ ] `selectedRunProjection.ts` preserves active Linear state verbatim for `STAGE` instead of collapsing started/running state to generic `running`. Evidence: pending.
- [ ] Running `EVENT` truth is promoted upstream out of dashboard-local fallback logic, with richer truthful shared and CO-specific operator text. Evidence: pending.
- [ ] `controlStatusDashboard.ts` renders the compact `Codex ... || Linear ...` rate-limit row using percent-remaining until exhaustion and `resets Xm` only for exhausted buckets. Evidence: pending.
- [ ] `controlStatusDashboard.ts` removes the live `Dashboard:` line and renders a separate `Status controls` section below `Backoff queue`. Evidence: pending.
- [ ] Focused regression coverage was added for projection truth and the bounded STATUS rendering contract. Evidence: pending.

## Validation
- [ ] Proof records the current-main audit truth, including that the exact target budget/backoff strings did not ship before this lane unless that changes during implementation. Evidence: pending.
- [ ] Renderer output plus live payload cross-checks confirm the displayed `STAGE`, `EVENT`, and rate-limit row match authoritative projected values. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` all pass on the branch head. Evidence: pending.
- [ ] Manifest-backed standalone review runs before handoff, and an explicit elegance/minimality pass is recorded after findings are addressed. Evidence: pending.

## Handoff
- [ ] The issue is moved from `Ready` to the live team’s started state after `issue-context` succeeds, and exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: pending shared-budget cooldown reset and helper mutation success.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `Human Review` / `In Review` only after coding stops. Evidence: pending.
