# Task Checklist - linear-0af906c6-1f6c-461b-88f7-da67656bcf1b

- Linear Issue: `CO-118` / `0af906c6-1f6c-461b-88f7-da67656bcf1b`
- MCP Task ID: `linear-0af906c6-1f6c-461b-88f7-da67656bcf1b`
- Primary PRD: `docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- TECH_SPEC: `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `docs/TECH_SPEC-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `docs/ACTION_PLAN-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `tasks/tasks-linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`, `.agent/task/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`.
- [x] docs-review child-stream evidence recorded and spec ambiguity resolved before implementation. Evidence: `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-final/cli/2026-04-09T08-51-33-692Z-295bd5e6/manifest.json` for the original findings, `.runs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b-co-118-docs-review-r2/cli/2026-04-09T09-04-17-041Z-fb44e299/manifest.json` for the corrected rerun (`spec-guard`, `docs:check`, and `docs:freshness` succeeded; forced standalone review failed as `review_outcome=failed-other` because the reviewer model was at capacity), and the same-turn manual docs review recorded in `tasks/specs/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `https://linear.app/asabeko/issue/CO-118/co-add-operator-autopilot-so-queue-shepherding-can-run-outside-a#comment-a234a38c`, `out/linear-0af906c6-1f6c-461b-88f7-da67656bcf1b/manual/workpad.md`.

## Investigation
- [x] Live Linear workflow states were rechecked and the issue was moved from `Ready` to `In Progress` before active coding. Evidence: `linear issue-context`, `linear transition --state "In Progress"`.
- [x] Required same-turn parallelization decision recorded as `stay_serial` / `overlapping_scope`. Evidence: `linear parallelization --decision stay_serial --reason overlapping_scope`.
- [x] The detached workspace was moved onto branch `linear/co-118-operator-autopilot` before repo edits. Evidence: `git switch -c linear/co-118-operator-autopilot`.
- [x] Baseline audit confirmed the bounded remaining seam: current code already covers fresh dispatch, review-to-`Merging`, and deterministic `Merging` closeout, but not backlog promotion, review-to-`Rework`, or explicit pending local rollout actions. Evidence: `linearDispatchSource.ts`, `providerLinearWorkflowStates.ts`, `providerIssueHandoff.ts`, `providerMergeCloseout.ts`.

## Implementation
- [ ] Add a dedicated operator-autopilot control module plus repo-tracked workflow metadata.
- [ ] Reuse the existing dispatch order and blocker truth for safe backlog-head promotion.
- [ ] Reuse existing review-promotion truth to transition actionable review handoffs into `Rework` without sending `REVIEW_REQUIRED` there.
- [ ] Surface the latest operator-autopilot result and append durable audit records for actions and holds.
- [ ] Surface pending local rollout actions after merge-closeout truth lands.
- [ ] Add focused regressions for queue, rework, and pending-action behavior.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-0af906c6-1f6c-461b-88f7-da67656bcf1b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-118-docs-review --format json`, followed by corrected rerun `--stream co-118-docs-review-r2 --format json` and a manual docs-review fallback when forced standalone review failed with reviewer-capacity `review_outcome=failed-other`.
- [ ] Focused regression coverage for operator-autopilot queue and review-handoff behavior.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness` or a truthful repo-baseline fallback note.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review plus explicit elegance review before any review handoff.
- [ ] `npm run pack:smoke` if the final diff touches downstream-facing CLI/runtime surfaces.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
