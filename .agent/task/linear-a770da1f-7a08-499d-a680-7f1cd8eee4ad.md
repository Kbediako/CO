# Task Checklist - linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad

- Linear Issue: `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
- MCP Task ID: `linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad`
- Primary PRD: `docs/PRD-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`
- TECH_SPEC: `tasks/specs/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`, `docs/TECH_SPEC-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`, `docs/ACTION_PLAN-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`, `tasks/specs/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`, `tasks/tasks-linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`, `.agent/task/linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad.md`.
- [ ] docs-review child-stream evidence recorded, or a truthful unrelated-baseline fallback documented if the packet passes `spec-guard` / `docs:check` and fails only on standing repo debt. Evidence: pending.
- [ ] Exactly one persistent Linear workpad comment is current. Evidence: pending `linear upsert-workpad`.

## Investigation
- [x] Live Linear workflow states were rechecked and the issue was moved from `Ready` to `In Progress` before active coding. Evidence: `linear issue-context`, `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decision recorded as `stay_serial` / `single_bounded_change`. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] The detached workspace was moved onto branch `linear/co-116-review-to-merging-bridge` before repo edits. Evidence: `git switch -c linear/co-116-review-to-merging-bridge`.
- [x] Baseline audit confirmed the bounded seam: review handoff is still non-active, handoff-owned claims are preserved but not promoted, and merge closeout still starts only from `Merging`. Evidence: `providerLinearWorkflowStates.ts`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`, `pr-watch-merge.js`.

## Implementation
- [ ] Add a dedicated persisted review-promotion record for provider-owned review handoffs. Evidence: pending.
- [ ] Reuse the existing attached-PR selector and readiness/blocker classifier to decide promotion or refusal truth. Evidence: pending.
- [ ] Integrate the review-handoff promotion path into provider issue handoff without changing ordinary `Merging` closeout behavior. Evidence: pending.
- [ ] Surface promotion or refusal truth in provider observability/proof artifacts. Evidence: pending.
- [ ] Add focused regressions for promotion success and refusal cases. Evidence: pending.

## Validation
- [ ] `MCP_RUNNER_TASK_ID=linear-a770da1f-7a08-499d-a680-7f1cd8eee4ad node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-116-docs-review --format json`. Evidence: pending.
- [ ] Focused regression coverage for review-handoff promotion success and refusal paths. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness` or a truthful repo-baseline fallback note. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review plus explicit elegance review before any review handoff. Evidence: pending.
- [ ] `npm run pack:smoke` if the final diff touches downstream-facing CLI/runtime surfaces. Evidence: pending.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
