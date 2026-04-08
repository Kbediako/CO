# Task Checklist - linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade

- Linear Issue: `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
- MCP Task ID: `linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade`
- Primary PRD: `docs/PRD-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- Task spec: `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-111`. Evidence: `docs/PRD-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `docs/TECH_SPEC-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `docs/ACTION_PLAN-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/tasks-linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `.agent/task/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade.md`.
- [ ] Docs-review delegation evidence is captured, or a truthful manual fallback is recorded if the wrapper stops on an existing repo baseline rather than a packet-shape defect. Evidence: pending.

## Implementation
- [ ] Deterministic merge closeout can reuse same-run cached issue-context evidence when live `issue-context` reads are cooldown-suppressed. Evidence: pending.
- [ ] Rehydrated active `Merging` recovery no longer preserves `provider_issue_rehydrated_active_run` once attached PR snapshot truth already proves the lane is merged. Evidence: pending.
- [ ] Ordinary open-PR `Merging` merge-shepherding lanes remain active and are not misclassified by the new recovery logic. Evidence: pending.
- [ ] The recovered cooldown-suppressed path persists explicit non-null `merge_closeout` truth and leaves the claim non-running. Evidence: pending.

## Validation
- [ ] Focused regressions cover cached issue-context fallback and active-run merged recovery without regressing open-PR `Merging` behavior. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `TASK=linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade FORCE_CODEX_REVIEW=1 npm run review -- --manifest <manifest>`, and `npm run pack:smoke` all pass on the branch head or record a truthful existing-baseline fallback. Evidence: pending.
- [ ] Local control-host truth proves the stale merged claim no longer remains active `Merging` solely because live Linear rereads are under cooldown. Evidence: pending.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `6ad0b749-8c35-4907-bfcd-1922758ca903`, `out/linear-ff81e5d8-2760-41ec-bdbb-5509ae2faade/manual/workpad.md`.
- [ ] A PR is attached before any review-state handoff. Evidence: pending.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
