# Task Checklist - linear-acc07ffc-06ac-4649-a235-1bf37c13cc51

- Linear Issue: `CO-153` / `acc07ffc-06ac-4649-a235-1bf37c13cc51`
- MCP Task ID: `linear-acc07ffc-06ac-4649-a235-1bf37c13cc51`
- Primary PRD: `docs/PRD-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`
- TECH_SPEC: `tasks/specs/linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id acc07ffc-06ac-4649-a235-1bf37c13cc51`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: `linear transition --state "In Progress"` succeeded at `2026-04-11T07:35:57.132Z`.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: remote comment `e03e13f5-3bbf-4d8c-b3de-e77bd7abd2f6`, local source `out/linear-acc07ffc-06ac-4649-a235-1bf37c13cc51/manual/workpad.md`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: this checklist plus PRD, TECH_SPEC, ACTION_PLAN, and registry updates.
- [ ] Docs-review child-stream evidence recorded before implementation. Evidence: pending.

## Investigation
- [x] Workspace moved from detached `HEAD` onto branch `linear/co-153-archived-issue-admission` before repo edits. Evidence: `git switch -c linear/co-153-archived-issue-admission origin/main`.
- [x] Preserved CO-32 patch and current-main seams were audited before implementation. Evidence: `/Users/kbediako/Code/CO/.runs/local-mcp/manual/co-32-rehome-20260411T071117Z/co-32-linear-issue-not-mutable.patch`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-acc07ffc-06ac-4649-a235-1bf37c13cc51.md` review notes and readiness gate.

## Implementation
- [ ] Carry `archived_at` / `trashed` truth through tracked issue discovery and persisted intake claims.
- [ ] Exclude or explicitly block archived/trashed issues before provider claim/start.
- [ ] Fail `transition` and `upsert-workpad` closed with `linear_issue_not_mutable` while preserving truthful `noop` behavior.
- [ ] Revalidate cached archived state live before allowing restored issues to resume.
- [ ] Suppress same-attempt retries for `linear_issue_not_mutable` in worker prompt and selected-run/proof summaries.

## Validation
- [ ] Audited docs-review child stream or truthful packet-local fallback recorded.
- [ ] Focused `LinearDispatchSource`, `ProviderIssueHandoff`, `ProviderLinearWorkflowFacade`, `ProviderLinearWorkerRunner`, and `SelectedRunProjection` regressions pass.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `DIFF_BUDGET_OVERRIDE_REASON="CO-153 requires a fresh docs-first packet plus bounded source and regression coverage for archived/trashed admission, mutability revalidation, and summary suppression in one reviewable lane." node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review plus explicit elegance review before handoff.
- [ ] `npm run pack:smoke`.

## Handoff
- [ ] Successful same-issue child-lane result is accepted, rejected, or invalidated explicitly so the `parallelize_now` turn remains truthful.
- [ ] PR attached to the issue before review-state transition.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-11: Issue moved to `In Progress`, `parallelize_now` was recorded, the branch was created from fresh `origin/main`, and the single active workpad was created.
- 2026-04-11: Preserved CO-32 patch audit confirmed mutability-side changes to reuse and the missing admission gap to implement on current main.
- 2026-04-11: Fresh CO-153 docs-first packet created without reusing the stale CO-32 docs packet or dropping the `CO-68` task snapshot.

## Relevant Files
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- `orchestrator/tests/LinearDispatchSource.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/SelectedRunProjection.test.ts`

## Notes
- The initial child lane `co-153-docs-packet` was launched under `parallelize_now` for doc-only ownership but appears stalled after runtime selection under appserver; do not stall the lane on that run. Before handoff, ensure a successful bounded child lane finishes on a disjoint slice and is finalized explicitly.
- This lane intentionally excludes auto-unarchive automation, generic workpad redesign, and mutation of archived issue `CO-32`.
